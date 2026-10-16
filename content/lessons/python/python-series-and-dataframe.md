---
id: python-series-and-dataframe
title: Series & DataFrame
estimatedMinutes: 10
difficulty: easy
tags: [python, pandas, dataframe]
---

## Why it matters
pandas is the default tool for tabular data in Python, and most DS coding interviews include a pandas question. Understanding the data model (index + columns + dtypes) prevents the alignment and dtype surprises that trip people up.

## Concept
- A **Series** is a 1-D labeled array: values + an **index**.
- A **DataFrame** is a table of Series sharing one index; each column has its own dtype.

```python
import pandas as pd
df = pd.DataFrame({
    "user": ["a", "b", "c"],
    "age": [25, 32, 41],
    "plan": ["free", "pro", "pro"],
})
df.shape; df.dtypes; df.columns; df.index
df.head(); df.info(); df.describe()
df["age"]                 # Series
df[["user", "age"]]       # DataFrame
df["age_next"] = df["age"] + 1        # new column (vectorized)
df = df.assign(is_pro=df["plan"].eq("pro"))
df["plan"].value_counts()
df.rename(columns={"user": "user_id"}); df.drop(columns=["age_next"])
```

- **Index alignment**: arithmetic between Series aligns on index labels, not position. Mismatched labels produce NaN.
- dtypes: `int64`, `float64`, `bool`, `object` (Python objects/strings), `string`, `category`, `datetime64[ns]`. An int column with a missing value becomes `float64` (or use nullable `Int64`).
- Read/write: `pd.read_csv`, `read_parquet`, `to_parquet` (columnar, typed, much faster than CSV).

## Worked example
```python
s1 = pd.Series([1, 2, 3], index=["a", "b", "c"])
s2 = pd.Series([10, 20, 30], index=["b", "c", "d"])
s1 + s2
# a     NaN
# b    12.0
# c    23.0
# d     NaN
```
Alignment by label is powerful but surprising if you expected positional addition; use `.to_numpy()` or `reset_index(drop=True)` to add by position.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An integer column gets one missing value after a merge. What happens to its dtype by default?",
  "options": ["Stays int64", "Becomes float64 (NaN is a float)", "Becomes object", "Raises an error"],
  "answer": 1,
  "explanation": "NumPy ints can't hold NaN, so pandas upcasts to float64 unless you use the nullable Int64 dtype."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `build_users()` returning a DataFrame with columns `user` = ['a','b','c'], `age` = [25, 32, 41], `plan` = ['free','pro','pro']. Write `add_features(df)` returning a new DataFrame with `is_pro` (bool) and `age_group` ('<30' or '30+'), without modifying the input. Write `plan_share(df)` returning a Series of plan proportions (value_counts normalized).",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef build_users():\n    pass\n\ndef add_features(df):\n    pass\n\ndef plan_share(df):\n    pass\n\nprint(add_features(build_users()))",
  "tests": "df = build_users()\nassert list(df.columns) == ['user', 'age', 'plan'] and df.shape == (3, 3)\nout = add_features(df)\nassert list(out['is_pro']) == [False, True, True]\nassert list(out['age_group']) == ['<30', '30+', '30+']\nassert 'is_pro' not in df.columns\ns = plan_share(df)\nassert abs(s['pro'] - 2 / 3) < 1e-12 and abs(s['free'] - 1 / 3) < 1e-12",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef build_users():\n    return pd.DataFrame({'user': ['a', 'b', 'c'], 'age': [25, 32, 41], 'plan': ['free', 'pro', 'pro']})\n\ndef add_features(df):\n    return df.assign(\n        is_pro=df['plan'].eq('pro'),\n        age_group=np.where(df['age'] < 30, '<30', '30+'),\n    )\n\ndef plan_share(df):\n    return df['plan'].value_counts(normalize=True)",
  "hints": ["df.assign returns a new DataFrame and leaves the original untouched.", "value_counts(normalize=True) gives proportions."]
}
```

> [!TIP] Interview tips
> - Start pandas questions by checking `df.shape`, `df.dtypes`, `df.head()`, and missing values.
> - Remember index alignment in arithmetic; it explains many surprise NaNs.
> - Prefer vectorized column operations and `assign` over row loops.
