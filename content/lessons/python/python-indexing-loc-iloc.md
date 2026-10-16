---
id: python-indexing-loc-iloc
title: "Indexing: loc / iloc"
estimatedMinutes: 10
difficulty: easy
tags: [python, pandas, indexing]
---

## Why it matters
`loc` vs `iloc` confusion causes off-by-one errors, wrong rows and `SettingWithCopyWarning`. Interviewers check that you select and update data explicitly and correctly.

## Concept
- `.loc[rows, cols]`: **label**-based. Slices are **inclusive** of the end label. Accepts boolean masks.
- `.iloc[rows, cols]`: **integer position**-based. Slices are end-**exclusive** (like Python).
- `.at[row, col]` / `.iat[i, j]`: fast scalar access.

```python
df = df.set_index("user")
df.loc["b"]                       # one row (Series)
df.loc["a":"c", ["age", "plan"]]  # rows a..c INCLUSIVE
df.iloc[0:2, 0]                   # first two rows, first column
df.loc[df["age"] > 30, "plan"]    # mask + column
df.loc[df["age"] > 30, "segment"] = "senior"   # safe in-place update
df.reset_index()                  # index back to a column
```

- `df["col"]` selects a column; `df[mask]` filters rows; `df[0:3]` slices rows by position. This overloading is why explicit `loc`/`iloc` is clearer.
- **Chained indexing** (`df[df.age > 30]["plan"] = "x"`) may modify a temporary copy and silently do nothing; use a single `.loc[mask, col] = value`.
- After filtering, the index has gaps: `iloc[0]` is the first remaining row, `loc[0]` is the row labeled 0 (which may be gone).

## Worked example
```python
df = pd.DataFrame({"x": [10, 20, 30, 40]})
sub = df[df.x > 15]       # index is [1, 2, 3]
sub.iloc[0]               # x = 20 (first row by position)
sub.loc[1]                # x = 20 (row labeled 1)
sub.loc[0]                # KeyError: label 0 was filtered out
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "With a default RangeIndex, how many rows does `df.loc[0:3]` return, vs `df.iloc[0:3]`?",
  "options": ["3 and 3", "4 and 3", "3 and 4", "4 and 4"],
  "answer": 1,
  "explanation": "loc slices include the end label (0,1,2,3); iloc excludes the end position (0,1,2)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Given a DataFrame with columns `user`, `age`, `plan`: write `ages_for(df, users)` returning a Series of ages for the given user names (set `user` as the index and use `.loc`). Write `first_n_cols(df, n)` returning the first n columns by position. Write `flag_seniors(df, min_age)` returning a copy with a new column `senior` that is True where age ≥ min_age (use `.loc` assignment on the copy).",
  "setup": "import pandas as pd",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\n\ndef ages_for(df, users):\n    pass\n\ndef first_n_cols(df, n):\n    pass\n\ndef flag_seniors(df, min_age):\n    pass\n\ndf = pd.DataFrame({'user': ['a', 'b', 'c'], 'age': [25, 32, 41], 'plan': ['free', 'pro', 'pro']})\nprint(ages_for(df, ['c', 'a']))",
  "tests": "df = pd.DataFrame({'user': ['a', 'b', 'c'], 'age': [25, 32, 41], 'plan': ['free', 'pro', 'pro']})\nassert list(ages_for(df, ['c', 'a'])) == [41, 25]\nassert list(first_n_cols(df, 2).columns) == ['user', 'age']\nout = flag_seniors(df, 32)\nassert list(out['senior']) == [False, True, True]\nassert 'senior' not in df.columns",
  "solution": "import pandas as pd\n\ndef ages_for(df, users):\n    return df.set_index('user').loc[users, 'age']\n\ndef first_n_cols(df, n):\n    return df.iloc[:, :n]\n\ndef flag_seniors(df, min_age):\n    out = df.copy()\n    out['senior'] = False\n    out.loc[out['age'] >= min_age, 'senior'] = True\n    return out",
  "hints": ["`.loc[list_of_labels, 'age']` returns rows in the order of the list.", "iloc[:, :n] selects all rows and the first n columns."]
}
```

> [!TIP] Interview tips
> - Say "loc = labels, inclusive; iloc = positions, exclusive".
> - Use a single `.loc[mask, col] = value` to avoid chained-assignment bugs.
> - Remember that filtering leaves index gaps; reset_index when positions matter.
