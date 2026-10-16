---
id: python-iterators-and-generators
title: Iterators & generators
estimatedMinutes: 12
difficulty: medium
tags: [python, core, generators, memory]
---

## Why it matters
Generators let you process data that doesn't fit in memory (log files, streams, batches for model training). Interviewers ask how `yield` works, the iterator protocol, and lazy vs eager evaluation.

## Concept
- An **iterable** has `__iter__()` returning an iterator (lists, dicts, files, ranges).
- An **iterator** has `__next__()` returning the next item and raising `StopIteration` when done. `for` loops call these for you. Iterators are **one-shot**: once exhausted, they're empty.
- A **generator function** contains `yield`. Calling it returns a generator object; each `next()` runs until the next `yield`, pausing with local state intact.

```python
def read_batches(rows, size):
    batch = []
    for r in rows:
        batch.append(r)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch
```

- **Lazy**: values are produced on demand; memory stays O(batch), not O(n).
- `yield from sub()` delegates to another iterable.
- Generator expressions: `(x * x for x in nums)`.
- **itertools**: `islice`, `chain`, `groupby` (needs sorted input), `accumulate`, `product`, `combinations`, `count`, `tee`.

Pitfalls: iterating a generator twice yields nothing the second time; `len()` doesn't work on generators; materialize with `list()` only when you really need all items.

## Worked example
```python
from itertools import islice
def fib():
    a, b = 0, 1
    while True:          # infinite, but lazy
        yield a
        a, b = b, a + b

list(islice(fib(), 8))   # [0, 1, 1, 2, 3, 5, 8, 13]
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`g = (x for x in [1, 2, 3]); sum(g); sum(g)` returns what for the second sum?",
  "options": ["6", "0", "Error", "12"],
  "answer": 1,
  "explanation": "Generators are one-shot; the first sum exhausted it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write a generator `chunked(iterable, size)` yielding lists of up to `size` items (the last may be shorter). Write a generator `running_mean(iterable)` yielding the mean of all items seen so far. Both must work on infinite iterators (don't call `list()` on the input).",
  "starterCode": "from itertools import count, islice\n\ndef chunked(iterable, size):\n    pass\n\ndef running_mean(iterable):\n    pass\n\nprint(list(chunked(range(7), 3)), list(running_mean([2, 4, 6])))",
  "tests": "from itertools import count, islice\nimport types\nassert list(chunked(range(7), 3)) == [[0, 1, 2], [3, 4, 5], [6]]\nassert list(chunked([], 2)) == []\nassert isinstance(chunked([1], 1), types.GeneratorType)\nassert list(islice(chunked(count(), 2), 2)) == [[0, 1], [2, 3]]\nassert list(running_mean([2, 4, 6])) == [2.0, 3.0, 4.0]\nassert list(islice(running_mean(count(1)), 3)) == [1.0, 1.5, 2.0]",
  "solution": "def chunked(iterable, size):\n    batch = []\n    for x in iterable:\n        batch.append(x)\n        if len(batch) == size:\n            yield batch\n            batch = []\n    if batch:\n        yield batch\n\ndef running_mean(iterable):\n    total = 0\n    for n, x in enumerate(iterable, start=1):\n        total += x\n        yield total / n",
  "hints": ["Accumulate into a batch and yield when full; flush the remainder at the end.", "Keep a running total and count; yield total / count each step."]
}
```

> [!TIP] Interview tips
> - Explain iterable vs iterator vs generator, and that generators keep state between `yield`s.
> - Pitch generators for streaming large files and batching data with constant memory.
> - Know a few itertools helpers; `groupby` needing sorted input is a common gotcha.
