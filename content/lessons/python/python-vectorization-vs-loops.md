---
id: python-vectorization-vs-loops
title: Vectorization vs loops
estimatedMinutes: 10
difficulty: medium
tags: [python, numpy, performance, vectorization]
---

## Why it matters
Replacing Python loops with array operations often gives 10–100× speedups. "This feature computation takes hours; speed it up" is a standard interview and on-the-job task.

## Concept
A Python loop pays interpreter overhead per element (type checks, boxing, dispatch). A vectorized NumPy operation runs one C loop over contiguous memory, often using SIMD instructions.

Translation patterns:

| Loop idea | Vectorized |
|---|---|
| `[x * 2 + 1 for x in a]` | `a * 2 + 1` |
| `if/else` per element | `np.where(cond, a, b)`, `np.select([...], [...])` |
| running total | `np.cumsum(a)` |
| count matches | `(a > t).sum()` / `np.count_nonzero` |
| group sums by integer key | `np.bincount(keys, weights=vals)` |
| clip values | `np.clip(a, lo, hi)` |
| differences | `np.diff(a)` |
| bucket values | `np.digitize(a, bins)` |

- `np.vectorize` is a convenience wrapper, **not** a speedup: it still loops in Python.
- Some recurrences (each step depends on the previous result, e.g. exponential smoothing with custom logic) don't vectorize cleanly; use Numba, Cython, or accept a loop.
- Vectorized code can use more memory (temporary arrays); for huge data, process in chunks.
- Measure with `%timeit` / `time.perf_counter()` before and after.

## Worked example
Label transactions: "high" if amount > 100, "mid" if > 20, else "low".

```python
labels = np.select([amount > 100, amount > 20], ["high", "mid"], default="low")
```
On 10 million rows this is roughly 50× faster than a Python loop with if/elif.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Does `np.vectorize(f)(arr)` run as fast as native NumPy operations?",
  "options": ["Yes, it compiles f to C", "No, it's a convenience wrapper that still calls f in a Python loop", "Only for integer arrays", "Only on GPU"],
  "answer": 1,
  "explanation": "The docs state it's for convenience, not performance."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Rewrite these loops with NumPy (no Python loops): `bucketize(amount)` returning an array of 'low'/'mid'/'high' (> 100 high, > 20 mid), `group_sum(keys, vals, n_groups)` returning per-key sums for integer keys 0..n_groups−1, and `pct_change(prices)` returning (p[t] − p[t−1]) / p[t−1] for t ≥ 1.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef bucketize(amount):\n    pass\n\ndef group_sum(keys, vals, n_groups):\n    pass\n\ndef pct_change(prices):\n    pass\n\nprint(bucketize(np.array([5, 50, 500])), group_sum(np.array([0, 2, 0]), np.array([1., 2., 3.]), 3))",
  "tests": "assert list(bucketize(np.array([5, 50, 500, 20, 100]))) == ['low', 'mid', 'high', 'low', 'mid']\nassert np.allclose(group_sum(np.array([0, 2, 0]), np.array([1., 2., 3.]), 3), [4, 0, 2])\nassert np.allclose(pct_change(np.array([100., 110., 99.])), [0.1, -0.1])\nimport inspect\nsrc = inspect.getsource(bucketize) + inspect.getsource(group_sum) + inspect.getsource(pct_change)\nassert 'for ' not in src",
  "solution": "import numpy as np\n\ndef bucketize(amount):\n    return np.select([amount > 100, amount > 20], ['high', 'mid'], default='low')\n\ndef group_sum(keys, vals, n_groups):\n    return np.bincount(keys, weights=vals, minlength=n_groups)\n\ndef pct_change(prices):\n    return np.diff(prices) / prices[:-1]",
  "hints": ["np.select evaluates conditions in order, like if/elif.", "np.bincount with weights sums values per integer key; minlength pads empty groups."]
}
```

> [!TIP] Interview tips
> - Explain *why* vectorization is faster (per-element interpreter overhead vs C loops).
> - Know a toolkit: where/select, cumsum, bincount, diff, clip, digitize.
> - Note that np.vectorize isn't fast, and mention Numba for loop-carried dependencies.
