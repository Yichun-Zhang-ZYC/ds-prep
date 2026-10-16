---
id: python-indexing-boolean-masks
title: Indexing, boolean masks
estimatedMinutes: 10
difficulty: easy
tags: [python, numpy, indexing]
---

## Why it matters
Filtering, selecting and updating subsets of arrays is constant in data work. Boolean masks are also exactly how pandas filtering works under the hood, so interviewers expect you to use them fluently.

## Concept
```python
a = np.arange(10)
a[2:8:2]            # slicing (view): [2, 4, 6]
a[-3:]              # last three
M = a.reshape(2, 5)
M[1, 2]; M[:, 0]; M[0, ::2]

a[[1, 5, 7]]        # fancy (integer array) indexing → copy
mask = (a > 3) & (a % 2 == 0)   # use & | ~ with parentheses, not and/or/not
a[mask]             # [4, 6, 8]
a[mask] = 0         # assignment through a mask modifies a in place
np.where(a > 5)     # indices where true
np.argsort(a)[::-1][:3]  # indices of the top 3 values
```

- Use `&`, `|`, `~` (elementwise) with **parentheses** around each comparison; `and`/`or` raise "truth value of an array is ambiguous".
- Basic slices return **views**; fancy and boolean indexing return **copies** (but assignment through them writes into the original).
- For 2-D fancy indexing, `M[[0, 1], [2, 3]]` picks elements (0,2) and (1,3); use `np.ix_` for submatrices.
- NaNs: `np.isnan(a)` to build masks; `a == np.nan` is always False.

## Worked example
Cap outliers at the 99th percentile and count how many were capped:

```python
cap = np.percentile(x, 99)
n_capped = (x > cap).sum()
x = np.where(x > cap, cap, x)      # or x[x > cap] = cap
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does `a[(a > 2) and (a < 5)]` raise an error?",
  "options": ["Arrays can't be compared", "`and` needs a single True/False, but the comparison gives an array; use `&`", "Parentheses are wrong", "Boolean masks aren't allowed"],
  "answer": 1,
  "explanation": "Python's `and` calls bool() on the array, which is ambiguous. `&` works elementwise."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `filter_range(a, lo, hi)` returning values with lo ≤ x < hi, `replace_nan(a, value)` returning a copy with NaNs replaced, and `top_k_indices(a, k)` returning the indices of the k largest values in descending order of value.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef filter_range(a, lo, hi):\n    pass\n\ndef replace_nan(a, value):\n    pass\n\ndef top_k_indices(a, k):\n    pass\n\nprint(filter_range(np.arange(10), 3, 6), top_k_indices(np.array([5, 1, 9, 3]), 2))",
  "tests": "assert list(filter_range(np.arange(10), 3, 6)) == [3, 4, 5]\na = np.array([1.0, np.nan, 3.0])\nr = replace_nan(a, 0)\nassert list(r) == [1.0, 0.0, 3.0] and np.isnan(a[1])\nassert list(top_k_indices(np.array([5, 1, 9, 3]), 2)) == [2, 0]",
  "solution": "import numpy as np\n\ndef filter_range(a, lo, hi):\n    return a[(a >= lo) & (a < hi)]\n\ndef replace_nan(a, value):\n    out = a.copy()\n    out[np.isnan(out)] = value\n    return out\n\ndef top_k_indices(a, k):\n    return np.argsort(a)[::-1][:k]",
  "hints": ["Wrap each comparison in parentheses and combine with &.", "Copy first so the input isn't modified; use np.isnan for the mask."]
}
```

> [!TIP] Interview tips
> - Use `&`/`|`/`~` with parentheses; mention why `and`/`or` fail.
> - Know views (slices) vs copies (fancy/boolean indexing).
> - For top-k on big arrays, mention `np.argpartition` for O(n) instead of a full sort.
