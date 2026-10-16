---
id: data-engineering-mapreduce-concepts
title: MapReduce concepts
estimatedMinutes: 10
difficulty: easy
tags: [data-engineering, distributed-processing, mapreduce]
---

## Why it matters
Hadoop MapReduce is mostly retired, but its model (map → shuffle → reduce) still underlies Spark, SQL engines and "how would you count X over 10 TB?" interview questions.

## Concept
1. **Map**: each worker reads a chunk (split) of input and emits **(key, value)** pairs. E.g., for word count: `("data", 1)`.
2. **Shuffle & sort**: the framework groups all values by key and sends each key's values to one reducer (`hash(key) % n_reducers`). This moves data across the network and is usually the most expensive step.
3. **Reduce**: each reducer aggregates the values for its keys: `("data", [1, 1, 1]) → ("data", 3)`.

Optimizations and ideas:
- **Combiner**: a local, map-side mini-reduce (sum counts per mapper before shuffling) cuts network traffic. Works for associative, commutative operations (sum, count, max), not for median.
- **Data locality**: move computation to where the data blocks live (HDFS).
- **Fault tolerance**: failed tasks are re-executed from the input; intermediate results are written to disk.
- **Skew**: one hot key overloads one reducer (see shuffle/skew lesson).

Why Spark replaced it: MapReduce writes intermediate results to disk between every stage and expresses multi-step jobs awkwardly; Spark keeps data in memory, builds a DAG of many stages, and offers high-level APIs (DataFrames, SQL).

## Worked example
Count page views per URL from 10 TB of logs. Map: parse each line, emit `(url, 1)`. Combiner: sum per URL on each mapper (a mapper with 1M lines but 20k unique URLs sends 20k pairs instead of 1M). Shuffle: all pairs for a URL go to the same reducer. Reduce: sum, output `(url, total)`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can a combiner be used for SUM but not for MEDIAN?",
  "options": ["MEDIAN is too slow", "SUM is associative and commutative, so partial sums combine correctly; medians of partial groups don't give the overall median", "Combiners only work on strings", "MEDIAN requires sorting on the mapper"],
  "answer": 1,
  "explanation": "Partial aggregates must be mergeable without loss."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a word count in MapReduce style. `map_phase(lines)` returns a list of (word, 1) pairs (lowercase, split on whitespace). `combine(pairs)` returns locally summed (word, count) pairs sorted by word. `shuffle(pairs_lists, n_reducers)` takes a list of mapper outputs and returns a list of `n_reducers` dicts word → list of counts, assigning each word with `sum(map(ord, word)) % n_reducers`. `reduce_phase(partitions)` returns one dict word → total.",
  "starterCode": "from collections import defaultdict\n\ndef map_phase(lines):\n    pass\n\ndef combine(pairs):\n    pass\n\ndef shuffle(pairs_lists, n_reducers):\n    pass\n\ndef reduce_phase(partitions):\n    pass\n",
  "tests": "m1 = map_phase(['Data data big', 'big data'])\nassert m1 == [('data', 1), ('data', 1), ('big', 1), ('big', 1), ('data', 1)]\nc1 = combine(m1)\nassert c1 == [('big', 2), ('data', 3)]\nc2 = combine(map_phase(['data pipelines']))\nparts = shuffle([c1, c2], 2)\nassert len(parts) == 2\nassert parts[sum(map(ord, 'data')) % 2]['data'] == [3, 1]\nassert reduce_phase(parts) == {'big': 2, 'data': 4, 'pipelines': 1}",
  "solution": "from collections import defaultdict\n\ndef map_phase(lines):\n    return [(w.lower(), 1) for line in lines for w in line.split()]\n\ndef combine(pairs):\n    acc = defaultdict(int)\n    for w, c in pairs:\n        acc[w] += c\n    return sorted(acc.items())\n\ndef shuffle(pairs_lists, n_reducers):\n    parts = [defaultdict(list) for _ in range(n_reducers)]\n    for pairs in pairs_lists:\n        for w, c in pairs:\n            parts[sum(map(ord, w)) % n_reducers][w].append(c)\n    return [dict(p) for p in parts]\n\ndef reduce_phase(partitions):\n    out = {}\n    for p in partitions:\n        for w, counts in p.items():\n            out[w] = sum(counts)\n    return out",
  "hints": ["The partition function decides which reducer owns a key.", "Each key lands in exactly one partition, so reducers never conflict."]
}
```

> [!TIP] Interview tips
> - Explain map → shuffle → reduce with word count, and point to shuffle as the costly step.
> - Mention combiners (only for mergeable aggregates), data locality and re-execution for fault tolerance.
> - Say why Spark superseded it: in-memory DAG execution and higher-level APIs.
