---
id: python-practice-collections-and-itertools
title: "Practice: collections and itertools recipes"
estimatedMinutes: 14
difficulty: medium
tags: [python, coding-interview, collections, itertools, practice]
---

## Why it matters

Many "implement X" interview problems collapse to one stdlib tool: `Counter` for frequencies, `defaultdict` for grouping, `deque` for queues and windows, `heapq` for top-k, `itertools` for combinations and runs. Reaching for the right one, and knowing its tie-breaking and complexity, is the signal.

## Concept

**Which tool when**:

| Need | Tool | Note |
| --- | --- | --- |
| Frequencies, top-k | `Counter`, `most_common(k)` | Ties come out in first-seen order; sort by `(-count, key)` for a deterministic answer |
| Group items by key | `defaultdict(list)` | Reading a missing key *creates* it; use `.get` or `in` to test |
| Queue / BFS / window | `deque` | `append`/`popleft` are $O(1)$; `list.pop(0)` is $O(n)$ |
| Top-k of a stream | `heapq.nlargest(k, it)` | $O(n \log k)$; a min-heap of size k |
| Merge sorted inputs | `heapq.merge` | Lazy, $O(\log m)$ per item for m streams |
| Runs of equal items | `itertools.groupby` | Groups only **consecutive** equal keys; sort first to group globally |
| Combinations / products | `combinations`, `permutations`, `product` | Index-based, so duplicate values give duplicate tuples |
| Prefix sums | `itertools.accumulate` | Also takes a function, e.g. `max` for running max |

**Pitfalls**:

- `groupby` yields lazy sub-iterators that are invalidated when you advance; consume each group (`list(g)`) immediately.
- `Counter` arithmetic drops non-positive counts; `c1 - c2` is not a signed difference.
- `most_common()` on ties is stable by insertion, not alphabetical.
- `defaultdict` silently inserts keys on lookup; convert to `dict` before returning or printing.
- Sets are unordered: sort before comparing or returning.
- Combinatorial functions grow fast: $\binom{n}{k}$ for `combinations`, $n!$ for `permutations`. State the cost.

## Worked example

Top 3 words in `"b a b c a d"`, ties broken alphabetically.

```python
from collections import Counter
words = "b a b c a d".split()
c = Counter(words)                    # b:2, a:2, c:1, d:1
c.most_common(3)                      # [('b', 2), ('a', 2), ('c', 1)]   first-seen order
sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
                                      # [('a', 2), ('b', 2), ('c', 1)]
```

`most_common` is correct on counts but `b` appears before `a` only because `b` was seen first; an interviewer who asks for "alphabetical on ties" expects the explicit sort key. For counts that are cheap to compute but huge in number of distinct words, `heapq.nsmallest(k, c.items(), key=lambda kv: (-kv[1], kv[0]))` gives the same answer in $O(n \log k)$ instead of sorting all $n$ distinct items. Complexity of the Counter build is $O(N)$ for $N$ tokens.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `[(k, len(list(g))) for k, g in itertools.groupby(\"aabaa\")]` return?",
  "options": [
    "[(\"a\", 4), (\"b\", 1)]",
    "[(\"a\", 2), (\"b\", 1), (\"a\", 2)]",
    "[(\"a\", 2), (\"b\", 1)]",
    "An error"
  ],
  "answer": 1,
  "explanation": "`groupby` groups only consecutive equal items, so the two runs of \"a\" stay separate. Sort first if you want a global grouping."
}
```

```quiz
{
  "id": "q2",
  "question": "You need a FIFO queue for BFS on a graph with 10 million nodes. Which is right?",
  "options": [
    "`list` with `pop(0)`",
    "`collections.deque` with `popleft()`",
    "`heapq`",
    "`set`"
  ],
  "answer": 1,
  "explanation": "`deque.popleft` is $O(1)$; `list.pop(0)` shifts every element and is $O(n)$, making the BFS quadratic."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `top_k_words(text, k)`: lower-case the text, take words as runs of `[a-z']+`, and return the `k` most frequent as a list of `(word, count)` sorted by count descending, then word ascending.",
  "starterCode": "import re\nfrom collections import Counter\n\ndef top_k_words(text, k):\n    pass",
  "tests": "assert top_k_words(\"b a b c a d\", 3) == [(\"a\", 2), (\"b\", 2), (\"c\", 1)]\nassert top_k_words(\"The cat. THE dog! the end, don't\", 2) == [(\"the\", 3), (\"cat\", 1)]\nassert top_k_words(\"\", 3) == []\nassert top_k_words(\"x y\", 5) == [(\"x\", 1), (\"y\", 1)]",
  "solution": "import re\nfrom collections import Counter\n\ndef top_k_words(text, k):\n    words = re.findall(r\"[a-z']+\", text.lower())\n    c = Counter(words)\n    return sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:k]",
  "hints": [
    "`re.findall(r\"[a-z']+\", text.lower())` tokenizes.",
    "Sort `counter.items()` with key `(-count, word)` instead of relying on `most_common`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `group_anagrams(words)` returning a list of groups (each a sorted list of words) of words that are anagrams of each other, with the groups themselves sorted by their first word. Words are lower-case. Singletons are included.",
  "starterCode": "from collections import defaultdict\n\ndef group_anagrams(words):\n    pass",
  "tests": "ws = [\"eat\", \"tea\", \"tan\", \"ate\", \"nat\", \"bat\"]\nassert group_anagrams(ws) == [[\"ate\", \"eat\", \"tea\"], [\"bat\"], [\"nat\", \"tan\"]]\nassert group_anagrams([]) == []\nassert group_anagrams([\"a\", \"a\"]) == [[\"a\", \"a\"]]",
  "solution": "from collections import defaultdict\n\ndef group_anagrams(words):\n    groups = defaultdict(list)\n    for w in words:\n        groups[\"\".join(sorted(w))].append(w)\n    return sorted(sorted(g) for g in groups.values())",
  "hints": [
    "The sorted letters of a word are a canonical key.",
    "Use `defaultdict(list)`, then sort each group and the list of groups."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `rle(xs)` returning run-length encoding as a list of `(value, count)` using `itertools.groupby` (e.g. `\"aabccc\"` -> `[(\"a\", 2), (\"b\", 1), (\"c\", 3)]`), and `unrle(pairs)` that inverts it into a list. Then write `subsets_with_sum(nums, target)` returning the sorted list of distinct tuples (each tuple sorted ascending) from any non-empty subset of `nums` (chosen by position) whose sum equals `target`.",
  "starterCode": "from itertools import groupby, combinations, chain, repeat\n\ndef rle(xs):\n    pass\n\ndef unrle(pairs):\n    pass\n\ndef subsets_with_sum(nums, target):\n    pass",
  "tests": "assert rle(\"aabccc\") == [(\"a\", 2), (\"b\", 1), (\"c\", 3)]\nassert rle([]) == []\nassert rle([1, 1, 2, 1]) == [(1, 2), (2, 1), (1, 1)]\nassert unrle(rle(\"aabccc\")) == list(\"aabccc\")\nassert unrle([]) == []\nassert subsets_with_sum([1, 2, 3, 4, 5], 6) == [(1, 2, 3), (1, 5), (2, 4)]\nassert subsets_with_sum([1, 1, 2], 3) == [(1, 2)]\nassert subsets_with_sum([5, 7], 3) == []",
  "solution": "from itertools import groupby, combinations, chain, repeat\n\ndef rle(xs):\n    return [(k, sum(1 for _ in g)) for k, g in groupby(xs)]\n\ndef unrle(pairs):\n    return list(chain.from_iterable(repeat(v, n) for v, n in pairs))\n\ndef subsets_with_sum(nums, target):\n    found = set()\n    for r in range(1, len(nums) + 1):\n        for combo in combinations(nums, r):\n            if sum(combo) == target:\n                found.add(tuple(sorted(combo)))\n    return sorted(found)",
  "hints": [
    "Count a group with `sum(1 for _ in g)` and consume it before advancing.",
    "Loop `r` from 1 to `len(nums)` with `combinations(nums, r)`; collect sorted tuples in a set to deduplicate."
  ]
}
```

> [!TIP] Interview tips
> - Name the stdlib tool and its complexity (`deque` O(1) ends, `heapq` O(n log k), `Counter` O(n)) before writing code.
> - Make tie-breaking explicit with a sort key; do not rely on `most_common` or set order.
> - Remember `groupby` needs sorted input for global groups and `defaultdict` creates keys on read.
