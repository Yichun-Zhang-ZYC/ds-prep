---
id: python-shallow-vs-deep-copy
title: Shallow vs deep copy
estimatedMinutes: 8
difficulty: easy
tags: [python, core, copy, mutability]
---

## Why it matters
"I copied the config and changed it, but the original changed too!" Shallow-copy bugs are common with nested dicts/lists, and pandas has its own version (`SettingWithCopyWarning`). Interviewers test whether you can predict what gets shared.

## Concept
- **Assignment** (`b = a`): no copy; same object.
- **Shallow copy** (`a.copy()`, `list(a)`, `a[:]`, `dict(a)`, `copy.copy(a)`): new outer container, but its elements are the **same objects**. Nested mutable objects are shared.
- **Deep copy** (`copy.deepcopy(a)`): recursively copies everything; fully independent. Slower, handles cycles.

```python
import copy
cfg = {"model": "gbm", "params": {"depth": 6}}
shallow = cfg.copy()
deep = copy.deepcopy(cfg)
shallow["params"]["depth"] = 10    # also changes cfg["params"]!
deep["params"]["depth"] = 3        # cfg untouched
```

In **pandas/NumPy**:
- NumPy slicing returns a **view** (shares memory); fancy/boolean indexing returns a **copy**. Use `.copy()` when you need independence.
- pandas: `df2 = df[df.x > 0]` may be a view or a copy; modifying it can trigger `SettingWithCopyWarning`. Use `df.loc[mask, "col"] = value` on the original, or `df2 = df[mask].copy()`. (pandas Copy-on-Write, default in 3.0, makes this behave like a copy.)

## Worked example
```python
import numpy as np
a = np.arange(5)
v = a[1:3]          # view
v[0] = 99
a                   # array([ 0, 99,  2,  3,  4])
c = a[[1, 2]]       # copy (fancy indexing)
c[0] = -1           # a unchanged
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`a = [[1], [2]]; b = a.copy(); b[0].append(9)`. What is `a`?",
  "options": ["[[1], [2]]", "[[1, 9], [2]]", "[[9], [2]]", "Error"],
  "answer": 1,
  "explanation": "The shallow copy shares the inner lists, so mutating b[0] mutates a[0]."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `with_override(config, path, value)` that returns a new config dict with the nested key path (a list of keys) set to `value`, **without** modifying the original (use `copy.deepcopy`). Then write `is_view(arr)` that returns True if a NumPy array shares memory with a base array (hint: `arr.base is not None`).",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import copy\nimport numpy as np\n\ndef with_override(config, path, value):\n    pass\n\ndef is_view(arr):\n    pass\n\ncfg = {'model': {'params': {'depth': 6}}}\nprint(with_override(cfg, ['model', 'params', 'depth'], 8), cfg)",
  "tests": "cfg = {'model': {'params': {'depth': 6}}, 'tags': ['a']}\nnew = with_override(cfg, ['model', 'params', 'depth'], 8)\nassert new['model']['params']['depth'] == 8\nassert cfg['model']['params']['depth'] == 6\nnew['tags'].append('b')\nassert cfg['tags'] == ['a']\na = np.arange(10)\nassert is_view(a[2:5]) is True\nassert is_view(a[[1, 2]]) is False\nassert is_view(a[a > 3]) is False",
  "solution": "import copy\nimport numpy as np\n\ndef with_override(config, path, value):\n    new = copy.deepcopy(config)\n    node = new\n    for key in path[:-1]:\n        node = node[key]\n    node[path[-1]] = value\n    return new\n\ndef is_view(arr):\n    return arr.base is not None",
  "hints": ["Deep-copy first, then walk down the path on the copy.", "Basic slicing gives views; fancy and boolean indexing give copies."]
}
```

> [!TIP] Interview tips
> - Distinguish assignment, shallow and deep copy with a nested example.
> - Know NumPy views vs copies and how that shows up as SettingWithCopyWarning in pandas.
> - Default to `.copy()` on DataFrame subsets you plan to modify.
