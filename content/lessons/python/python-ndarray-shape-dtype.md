---
id: python-ndarray-shape-dtype
title: ndarray, shape, dtype
estimatedMinutes: 10
difficulty: easy
tags: [python, numpy, arrays]
---

## Why it matters
NumPy arrays underlie pandas, scikit-learn and PyTorch. Shape and dtype bugs ("operands could not be broadcast", silent integer overflow, float precision) are the most common numeric errors, and interviewers expect fluency with them.

## Concept
An `ndarray` is a block of memory with a fixed **dtype** (all elements the same type) plus a **shape** describing its dimensions.

```python
import numpy as np
a = np.array([[1, 2, 3], [4, 5, 6]])
a.shape      # (2, 3)   rows, columns
a.ndim       # 2
a.size       # 6
a.dtype      # int64
a.astype(np.float32)          # convert (copies)
np.zeros((3, 4)); np.ones(5); np.arange(0, 1, 0.25); np.linspace(0, 1, 5)
a.reshape(3, 2); a.reshape(-1)   # -1 = infer that dimension
a.T                              # transpose → (3, 2)
a[:, None].shape                 # (2, 1, 3): add an axis
```

- **Axis** semantics: `a.sum(axis=0)` collapses rows (one result per column) → shape (3,); `axis=1` collapses columns → shape (2,).
- **dtype matters**: `int8` overflows silently past 127; `float32` halves memory vs `float64` but has ~7 significant digits; mixing ints and floats upcasts to float.
- `reshape` returns a view when possible; `flatten()` always copies; `ravel()` returns a view when possible.
- A 1-D array of shape `(n,)` is neither a row nor a column; use `(n, 1)` or `(1, n)` when orientation matters.
- Memory: `a.nbytes` = size × itemsize. 10M float64 values = 80 MB.

## Worked example
```python
x = np.arange(12).reshape(3, 4)
x.sum(axis=0)   # array([12, 15, 18, 21])  (column sums)
x.mean(axis=1)  # array([1.5, 5.5, 9.5])   (row means)
np.array([200], dtype=np.int8)  # overflow: the value can't be represented in int8
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`a` has shape (100, 5). What shape does `a.mean(axis=0)` have?",
  "options": ["(100,)", "(5,)", "(100, 5)", "()"],
  "answer": 1,
  "explanation": "axis=0 aggregates over the rows, leaving one value per column."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `describe(a)` returning a dict with `'shape'`, `'ndim'`, `'dtype'` (as a string) and `'mb'` (nbytes / 1e6). Write `col_means(a)` returning the per-column mean of a 2-D array, and `to_column(v)` turning a 1-D array of shape (n,) into shape (n, 1).",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef describe(a):\n    pass\n\ndef col_means(a):\n    pass\n\ndef to_column(v):\n    pass\n\nx = np.arange(12).reshape(3, 4)\nprint(describe(x), col_means(x), to_column(np.arange(3)).shape)",
  "tests": "x = np.arange(12).reshape(3, 4)\nd = describe(x)\nassert d['shape'] == (3, 4) and d['ndim'] == 2 and d['dtype'] == str(x.dtype)\nassert abs(d['mb'] - x.nbytes / 1e6) < 1e-12\nassert np.allclose(col_means(x), [4, 5, 6, 7])\nassert to_column(np.arange(3)).shape == (3, 1)\nassert describe(np.zeros(10, dtype=np.float32))['mb'] == 40 / 1e6",
  "solution": "import numpy as np\n\ndef describe(a):\n    return {'shape': a.shape, 'ndim': a.ndim, 'dtype': str(a.dtype), 'mb': a.nbytes / 1e6}\n\ndef col_means(a):\n    return a.mean(axis=0)\n\ndef to_column(v):\n    return v.reshape(-1, 1)",
  "hints": ["Column means aggregate over axis 0.", "reshape(-1, 1) infers the number of rows."]
}
```

> [!TIP] Interview tips
> - Say shapes out loud while writing NumPy code; most bugs are shape bugs.
> - Know axis semantics: axis=0 collapses rows, axis=1 collapses columns.
> - Mention dtype choices for memory (float32, smaller ints) and their overflow/precision risks.
