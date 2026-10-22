---
id: python-practice-generators-and-iterators
title: "Practice: Generators and iterators"
estimatedMinutes: 14
difficulty: medium
tags: [python, coding-interview, generators, iterators, practice]
---

## Why it matters

Generator questions test whether you can process data larger than memory, build lazy pipelines, and explain exactly when code runs. Typical asks: batching, sliding windows, merging streams, reading a huge file record by record.

## Concept

**Mental model** (see the iterators and generators lesson for the protocol):

- A generator function returns a generator object **without running any body code**; code runs on each `next()` until the next `yield`. Exceptions in the body appear at the first `next`, not at the call.
- A generator is a one-shot iterator: after exhaustion it yields nothing. Iterating it twice (for example a second `sum`) silently gives 0 or empty. Use a function that returns a fresh generator, or `itertools.tee` when you need a bounded replay.
- Pipelines compose lazily: `(f(x) for x in src if p(x))` holds one item at a time, so memory is $O(1)$ in the stream length.
- Delegate with `yield from sub()`; it also forwards `send` and returns the sub-generator's `return` value.
- `itertools.islice(it, n)` takes the first n without consuming more; `next(it, default)` avoids `StopIteration`.

**Patterns to know cold**:

1. **Batching**: pull `n` items with `islice` until the result is empty.
2. **Sliding window**: `collections.deque(maxlen=k)`; yield a tuple once the deque is full.
3. **Grouping a stream**: keep a buffer, yield it at each separator, and flush the remainder at the end (the classic off-by-one).
4. **Merging sorted streams**: `heapq.merge(*iters)` keeps one head item per stream.

**Pitfalls**: building a list "to be safe" defeats the purpose; mutating the yielded buffer (yield a copy or reset to a new list); a generator that holds an open file must be closed (use `with` inside it, and `gen.close()` triggers cleanup).

## Worked example

Sum the squares of the first four multiples of 3 from an **infinite** stream:

```python
from itertools import count, islice

def squares_of_multiples(k):
    for x in count():
        if x % k == 0:
            yield x * x

print(sum(islice(squares_of_multiples(3), 4)))   # 0 + 9 + 36 + 81 = 126
```

`count()` never ends, yet the program terminates: `islice` stops pulling after four items, and the generator is suspended at its fourth `yield`, having examined only $x = 0, \dots, 9$. Nothing was materialized. A list-based version (`[x*x for x in range(10**9) if ...]`) would allocate gigabytes first. The same shape handles a 50 GB log file: `lines = open(path)` is itself a lazy iterator, `errors = (l for l in lines if "ERROR" in l)` filters lazily, and `next(errors, None)` reads only until the first hit.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does this print?\n\n```python\ng = (x * 2 for x in range(3))\nprint(sum(g), sum(g))\n```",
  "options": [
    "6 6",
    "6 0",
    "0 6",
    "Error"
  ],
  "answer": 1,
  "explanation": "A generator expression is exhausted after the first pass, so the second `sum` sees nothing and returns 0."
}
```

```quiz
{
  "id": "q2",
  "question": "A generator function body raises `ValueError` on its first line. When does the error surface?",
  "options": [
    "When the function is called",
    "On the first `next()` / first iteration step",
    "Only when the generator is exhausted",
    "Never"
  ],
  "answer": 1,
  "explanation": "Calling a generator function only creates the generator object; no body code runs until the first `next()`."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write a generator `chunked(iterable, n)` that yields lists of up to `n` items from any iterable (including generators), with the last chunk possibly shorter. Raise `ValueError` for `n < 1` (when iteration starts is fine). It must not read more of the source than needed.",
  "starterCode": "from itertools import islice\n\ndef chunked(iterable, n):\n    pass",
  "tests": "assert list(chunked(range(7), 3)) == [[0, 1, 2], [3, 4, 5], [6]]\nassert list(chunked([], 3)) == []\nassert list(chunked(\"abcd\", 2)) == [[\"a\", \"b\"], [\"c\", \"d\"]]\ng = chunked((i for i in range(10**12)), 2)\nassert next(g) == [0, 1] and next(g) == [2, 3]\ntry:\n    list(chunked([1], 0))\n    raise SystemExit(\"expected ValueError\")\nexcept ValueError:\n    pass",
  "solution": "from itertools import islice\n\ndef chunked(iterable, n):\n    if n < 1:\n        raise ValueError(\"n must be >= 1\")\n    it = iter(iterable)\n    while True:\n        chunk = list(islice(it, n))\n        if not chunk:\n            return\n        yield chunk",
  "hints": [
    "Call `iter(iterable)` once, then repeatedly `list(islice(it, n))`.",
    "Stop when a chunk comes back empty."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write a generator `sliding_window(iterable, k)` that yields tuples of `k` consecutive items (so `list(sliding_window(\"abcd\", 2))` is `[(\"a\",\"b\"), (\"b\",\"c\"), (\"c\",\"d\")]`). If there are fewer than `k` items it yields nothing. Then write `running_max(iterable)`, a generator yielding the running maximum after each item.",
  "starterCode": "from collections import deque\n\ndef sliding_window(iterable, k):\n    pass\n\ndef running_max(iterable):\n    pass",
  "tests": "assert list(sliding_window(\"abcd\", 2)) == [(\"a\", \"b\"), (\"b\", \"c\"), (\"c\", \"d\")]\nassert list(sliding_window(range(3), 3)) == [(0, 1, 2)]\nassert list(sliding_window(range(2), 3)) == []\nassert list(running_max([3, 1, 4, 1, 5, 2])) == [3, 3, 4, 4, 5, 5]\nassert list(running_max([])) == []\nw = sliding_window((i for i in range(10**12)), 3)\nassert next(w) == (0, 1, 2) and next(w) == (1, 2, 3)",
  "solution": "from collections import deque\n\ndef sliding_window(iterable, k):\n    window = deque(maxlen=k)\n    for x in iterable:\n        window.append(x)\n        if len(window) == k:\n            yield tuple(window)\n\ndef running_max(iterable):\n    best = None\n    first = True\n    for x in iterable:\n        if first or x > best:\n            best, first = x, False\n        yield best",
  "hints": [
    "`deque(maxlen=k)` drops the oldest element automatically.",
    "Yield `tuple(window)` (a copy), not the deque itself. For running_max, track a \"first item\" flag instead of using a sentinel like `-inf`."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "A text feed has records separated by one or more blank lines. Write a generator `records(lines)` that lazily yields each record as a list of its non-blank lines (stripped of the trailing newline). Handle leading/trailing/multiple blank lines and flush the final record. It must work on an infinite line stream: `next(records(stream))` must return after reading only the first record plus its separator.",
  "starterCode": "def records(lines):\n    pass",
  "tests": "text = \"a\\nb\\n\\n\\nc\\n\\nd\\ne\\nf\"\nassert list(records(text.split(\"\\n\"))) == [[\"a\", \"b\"], [\"c\"], [\"d\", \"e\", \"f\"]]\nassert list(records([\"\\n\", \"x\\n\", \"\\n\", \"\\n\"])) == [[\"x\"]]\nassert list(records([])) == []\npulled = []\ndef stream():\n    i = 0\n    while True:\n        pulled.append(i)\n        yield [\"r1a\", \"r1b\", \"\", \"r2\"][i % 4] if i < 4 else \"z\"\n        i += 1\nfirst = next(records(stream()))\nassert first == [\"r1a\", \"r1b\"]\nassert len(pulled) == 3",
  "solution": "def records(lines):\n    buf = []\n    for line in lines:\n        line = line.rstrip(\"\\n\")\n        if line.strip():\n            buf.append(line)\n        elif buf:\n            yield buf\n            buf = []\n    if buf:\n        yield buf",
  "hints": [
    "Keep a buffer; on a blank line, yield it only if it is non-empty, then start a new list.",
    "After the loop, flush the buffer if it still has lines."
  ]
}
```

> [!TIP] Interview tips
> - Say "lazy, O(1) memory" and prove it with `islice` or `next` on an infinite source.
> - Know that generators are one-shot and that no body code runs until the first `next()`.
> - Handle the final partial batch or record (the classic off-by-one) and yield copies of mutable buffers.
