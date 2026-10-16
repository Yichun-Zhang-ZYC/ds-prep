---
id: python-data-cleaning-tasks
title: Data cleaning tasks
estimatedMinutes: 15
difficulty: medium
tags: [python, coding-interview, pandas, cleaning]
---

## Why it matters
Live-coding rounds for DS/DA roles often hand you a messy table: inconsistent strings, mixed date formats, duplicates, bad numeric values. You're judged on systematic cleaning, validation and not silently losing rows.

## Concept
A checklist to talk through and apply:

1. **Inspect**: `shape`, `dtypes`, `head()`, `isna().mean()`, `nunique()`, `describe()`, value counts of categoricals.
2. **Standardize column names**: `df.columns = df.columns.str.strip().str.lower().str.replace(r"\W+", "_", regex=True)`.
3. **Fix strings**: `.str.strip().str.lower()`, unify spellings with a mapping (`{"usa": "US", "u.s.": "US"}`), regex extraction (`.str.extract(r"(\d+)")`).
4. **Parse types**: `pd.to_numeric(s.str.replace(r"[$,]", "", regex=True), errors="coerce")`, `pd.to_datetime(s, errors="coerce", format=...)`. `errors="coerce"` turns unparseable values into NaN, so **count how many** became NaN.
5. **Handle missing and sentinel values** (see the missing-values lesson).
6. **Deduplicate**: exact (`drop_duplicates()`) and by key, keeping the latest (`sort_values("updated_at").drop_duplicates("id", keep="last")`).
7. **Validate ranges and rules**: ages 0–120, end ≥ start, totals match, keys unique. Quarantine bad rows rather than dropping them silently.
8. **Report**: rows in → rows out, how many fixed/dropped per rule.

## Worked example
Raw `price` values: `["$1,200", "950", " 30.5 ", "N/A", "free"]`. Strip, remove `$` and `,`, then `to_numeric(errors="coerce")` → `[1200, 950, 30.5, NaN, NaN]`. Two values failed: report them and decide (was "free" really 0?).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why count NaNs right after `pd.to_numeric(..., errors='coerce')`?",
  "options": ["It's required by pandas", "Coerce silently turns bad values into NaN; counting shows how much data the parsing lost", "It speeds up parsing", "It removes duplicates"],
  "answer": 1,
  "explanation": "Silent coercion can hide a format problem affecting many rows."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `clean_customers(df)` for columns `' Customer ID'`, `'Country'`, `'Price'`, `'Updated'`. Return `(clean, report)` where `clean` has snake_case columns `customer_id`, `country`, `price`, `updated`; country is stripped, lower-cased and mapped with {'usa': 'US', 'u.s.': 'US', 'us': 'US', 'canada': 'CA', 'ca': 'CA'} (others → 'OTHER'); price is parsed from strings like '$1,200' (bad values → NaN); updated is parsed as datetime; duplicates by customer_id keep the latest `updated`; rows are sorted by customer_id with a fresh index. `report` is a dict with `rows_in`, `rows_out`, `bad_price`.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef clean_customers(df):\n    pass\n",
  "tests": "raw = pd.DataFrame({' Customer ID': [1, 2, 2, 3], 'Country': [' USA', 'canada', 'Canada ', 'U.S.'], 'Price': ['$1,200', '950', 'N/A', ' 30.5 '], 'Updated': ['2024-01-01', '2024-01-01', '2024-03-01', '2024-02-01']})\nclean, rep = clean_customers(raw)\nassert list(clean.columns) == ['customer_id', 'country', 'price', 'updated']\nassert list(clean['customer_id']) == [1, 2, 3]\nassert list(clean['country']) == ['US', 'CA', 'US']\nassert clean['price'].iloc[0] == 1200 and np.isnan(clean['price'].iloc[1]) and clean['price'].iloc[2] == 30.5\nassert str(clean['updated'].dtype).startswith('datetime64')\nassert rep == {'rows_in': 4, 'rows_out': 3, 'bad_price': 1}\nassert list(raw.columns)[0] == ' Customer ID'",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef clean_customers(df):\n    out = df.copy()\n    out.columns = out.columns.str.strip().str.lower().str.replace(r'\\W+', '_', regex=True)\n    mapping = {'usa': 'US', 'u.s.': 'US', 'us': 'US', 'canada': 'CA', 'ca': 'CA'}\n    out['country'] = out['country'].str.strip().str.lower().map(mapping).fillna('OTHER')\n    raw_price = out['price'].astype(str).str.strip().str.replace(r'[$,]', '', regex=True)\n    out['price'] = pd.to_numeric(raw_price, errors='coerce')\n    bad_price = int(out['price'].isna().sum())\n    out['updated'] = pd.to_datetime(out['updated'], errors='coerce')\n    out = (out.sort_values('updated')\n              .drop_duplicates('customer_id', keep='last')\n              .sort_values('customer_id')\n              .reset_index(drop=True))\n    report = {'rows_in': len(df), 'rows_out': len(out), 'bad_price': bad_price}\n    return out[['customer_id', 'country', 'price', 'updated']], report",
  "hints": ["Normalize column names with .str methods on df.columns.", "Count bad prices before deduplicating; sort by updated then drop_duplicates(keep='last')."]
}
```

> [!TIP] Interview tips
> - Narrate a checklist: inspect → names → strings → types → missing → duplicates → validation → report.
> - Use errors="coerce" but always count what got coerced.
> - Never drop rows silently; report rows in/out and reasons.
