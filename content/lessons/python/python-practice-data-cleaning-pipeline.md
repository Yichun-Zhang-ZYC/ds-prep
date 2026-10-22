---
id: python-practice-data-cleaning-pipeline
title: "Practice: Building a data-cleaning pipeline"
estimatedMinutes: 15
difficulty: medium
tags: [python, coding-interview, pandas, cleaning, pipeline, practice]
---

## Why it matters

The take-home or live "clean this messy file" task rewards structure: small pure functions, a visible audit trail of rows in and out, and rejected rows quarantined with a reason. A tangle of in-place edits is the usual way candidates lose points.

## Concept

**Design rules** (the data cleaning tasks lesson has the checklist; this lesson is about structure):

1. **One function per rule**, each taking a DataFrame and returning a new one (`df.copy()` or assign-based). No in-place mutation of the caller's data.
2. Chain them with `df.pipe(f).pipe(g)` or a list of `(name, fn)` steps so the order is explicit and testable.
3. **Log every step**: name, rows in, rows out. A step that removes more rows than expected is the first thing to investigate.
4. **Quarantine, don't delete**: split into `valid` and `rejected`, and record a `reason` column. Rules are applied in a fixed priority order, so each row gets its first failing reason.
5. Make parsing explicit: `pd.to_numeric(errors="coerce")`, `pd.to_datetime(errors="coerce")`, then count the new NaN/NaT.
6. **Idempotent**: running the pipeline twice must give the same result as running it once. This catches steps that depend on earlier mutation.
7. Don't rely on the string dtype: use `.str` accessors and `isna()`, not `dtype == object`. Handle NaN explicitly (`.str` methods propagate it).
8. Validate at the end with assertions: key is unique, no nulls in required columns, values in range.

## Worked example

A signup export with 1,000 rows (illustrative numbers). The pipeline and its audit log:

```
step                 rows_in  rows_out
trim_and_lower_text     1000      1000
drop_invalid_email      1000       963     # 37 rows without a valid address
dedupe_latest_by_email   963       900     # 63 older duplicates
quarantine_bad_age       900       888     # 12 rows with age outside 0-120 -> rejected
```

Reading the log tells the whole story: the text step must never change the count, 3.7% invalid emails is plausible, and 63 duplicates means about 7% of addresses signed up twice. If `quarantine_bad_age` had removed 300 rows, you would suspect a unit or parsing bug (ages stored in months, say) before blaming the data. The 12 rejected rows go to a `rejected` table with `reason="bad_age"` so someone can fix the source. Final assertions: `df["email"].is_unique`, `df["age"].between(0, 120).all()`, 888 + 12 + 37 + 63 = 1,000 rows accounted for.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why should a cleaning step return a new DataFrame instead of mutating its argument?",
  "options": [
    "It is faster",
    "The caller's raw data stays intact, so steps are re-runnable, testable and the audit log is trustworthy",
    "pandas forbids in-place edits",
    "It reduces memory use"
  ],
  "answer": 1,
  "explanation": "Pure steps make the pipeline reproducible and idempotent, and let you compare before/after row counts."
}
```

```quiz
{
  "id": "q2",
  "question": "A step meant to normalize text removes 40% of the rows. What is the best first reaction?",
  "options": [
    "Accept it; dirty data is common",
    "Check the step for a bug, e.g. NaN comparison or an over-aggressive filter, using the row-count log",
    "Rerun the pipeline until counts change",
    "Fill the missing rows with zeros"
  ],
  "answer": 1,
  "explanation": "A normalization step should be count-preserving. A large unexpected drop points to a bug (for instance a filter on a column that is NaN) rather than to dirty data."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `clean_text_cols(df, cols)` returning a copy where each column in `cols` is stripped, internal whitespace runs collapsed to one space, and lower-cased; empty strings become missing (NaN). Missing values stay missing. Columns not in `cols` are untouched, and the input is not modified.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef clean_text_cols(df, cols):\n    pass",
  "tests": "df = pd.DataFrame({\"name\": [\"  Ann   LEE \", \"BO\", \"   \", None], \"city\": [\" NYC\", \"la \", \"SF\", \"x\"], \"n\": [1, 2, 3, 4]})\nout = clean_text_cols(df, [\"name\"])\nassert out.loc[0, \"name\"] == \"ann lee\" and out.loc[1, \"name\"] == \"bo\"\nassert pd.isna(out.loc[2, \"name\"]) and pd.isna(out.loc[3, \"name\"])\nassert list(out[\"city\"]) == [\" NYC\", \"la \", \"SF\", \"x\"]\nassert list(out[\"n\"]) == [1, 2, 3, 4]\nassert df.loc[0, \"name\"] == \"  Ann   LEE \"",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef clean_text_cols(df, cols):\n    out = df.copy()\n    for c in cols:\n        s = out[c].str.strip().str.replace(r\"\\s+\", \" \", regex=True).str.lower()\n        out[c] = s.where(s != \"\", np.nan)\n    return out",
  "hints": [
    "Chain `.str.strip().str.replace(r\"\\s+\", \" \", regex=True).str.lower()`.",
    "`s.where(s != \"\", np.nan)` turns empty strings into missing values."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "`df` has `id`, `age` (strings or numbers), `start`, `end` (ISO date strings). Write `split_valid(df)` returning `(valid, rejected)`. A row is rejected with `reason=\"bad_age\"` if age is not numeric or outside 0-120, otherwise with `reason=\"bad_dates\"` if `end` is earlier than `start`. `valid` keeps the original columns, `rejected` has an extra `reason` column; both keep row order and get a fresh 0..n-1 index.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef split_valid(df):\n    pass",
  "tests": "df = pd.DataFrame({\n    \"id\": [1, 2, 3, 4, 5],\n    \"age\": [\"30\", \"abc\", 130, 45, -2],\n    \"start\": [\"2024-01-01\", \"2024-01-01\", \"2024-01-01\", \"2024-03-01\", \"2024-01-01\"],\n    \"end\": [\"2024-02-01\", \"2024-02-01\", \"2024-02-01\", \"2024-02-01\", \"2024-02-01\"],\n})\nvalid, rej = split_valid(df)\nassert list(valid[\"id\"]) == [1] and list(valid.columns) == [\"id\", \"age\", \"start\", \"end\"]\nassert list(rej[\"id\"]) == [2, 3, 4, 5]\nassert list(rej[\"reason\"]) == [\"bad_age\", \"bad_age\", \"bad_dates\", \"bad_age\"]\nassert list(rej.index) == [0, 1, 2, 3] and list(valid.index) == [0]\nassert len(valid) + len(rej) == len(df)",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef split_valid(df):\n    age = pd.to_numeric(df[\"age\"], errors=\"coerce\")\n    bad_age = ~age.between(0, 120)\n    bad_dates = pd.to_datetime(df[\"end\"]) < pd.to_datetime(df[\"start\"])\n    reason = pd.Series(np.select([bad_age, bad_dates], [\"bad_age\", \"bad_dates\"], default=\"\"), index=df.index)\n    valid = df[reason == \"\"].reset_index(drop=True)\n    rejected = df[reason != \"\"].assign(reason=reason[reason != \"\"]).reset_index(drop=True)\n    return valid, rejected",
  "hints": [
    "`pd.to_numeric(errors=\"coerce\")` makes \"abc\" NaN, and `between(0, 120)` is False for NaN.",
    "`np.select` takes conditions in priority order, so the first failing rule wins."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `run_pipeline(df, steps)` where `steps` is a list of `(name, fn)` and each `fn` maps a DataFrame to a DataFrame. Apply them in order and return `(result, log)` where `log` is a list of dicts `{\"step\": name, \"rows_in\": int, \"rows_out\": int}`. Do not mutate the input. Raise `ValueError` mentioning the step name if a step returns something that is not a DataFrame.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef run_pipeline(df, steps):\n    pass",
  "tests": "df = pd.DataFrame({\"x\": [1, 2, 2, 3, None]})\nsteps = [(\"dropna\", lambda d: d.dropna()), (\"dedupe\", lambda d: d.drop_duplicates()), (\"double\", lambda d: d.assign(x=d[\"x\"] * 2))]\nout, log = run_pipeline(df, steps)\nassert list(out[\"x\"]) == [2.0, 4.0, 6.0]\nassert log == [{\"step\": \"dropna\", \"rows_in\": 5, \"rows_out\": 4}, {\"step\": \"dedupe\", \"rows_in\": 4, \"rows_out\": 3}, {\"step\": \"double\", \"rows_in\": 3, \"rows_out\": 3}]\nassert len(df) == 5 and df[\"x\"].isna().sum() == 1\ntry:\n    run_pipeline(df, [(\"bad\", lambda d: None)])\n    raise SystemExit(\"expected ValueError\")\nexcept ValueError as e:\n    assert \"bad\" in str(e)",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef run_pipeline(df, steps):\n    cur = df.copy()\n    log = []\n    for name, fn in steps:\n        nxt = fn(cur)\n        if not isinstance(nxt, pd.DataFrame):\n            raise ValueError(f\"step {name!r} did not return a DataFrame\")\n        log.append({\"step\": name, \"rows_in\": len(cur), \"rows_out\": len(nxt)})\n        cur = nxt\n    return cur, log",
  "hints": [
    "Record `len(cur)` before and `len(nxt)` after each step.",
    "Validate the return type inside the loop so the error names the failing step."
  ]
}
```

> [!TIP] Interview tips
> - Narrate the structure: pure step functions, an audit log of rows in/out, quarantine with reasons, final assertions.
> - Never drop rows silently; a rejected table with a reason is the senior move.
> - Mention idempotency and testing each step on a tiny frame; say what you would monitor in production.
