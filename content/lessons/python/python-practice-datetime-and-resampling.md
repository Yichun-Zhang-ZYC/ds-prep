---
id: python-practice-datetime-and-resampling
title: "Practice: Dates, times and resampling"
estimatedMinutes: 15
difficulty: medium
tags: [python, coding-interview, pandas, datetime, resample, practice]
---

## Why it matters

Time-series questions hide most of their difficulty in details: missing days, time zones, window definitions, session gaps. Interviewers check that you parse once, index by time, and know which calendar and window semantics you are using.

## Concept

**Playbook** (see the datetime/resample/rolling lesson for the basics):

1. Parse once: `pd.to_datetime(col, utc=True)` or with `format=`; check `NaT` count.
2. Put the time in a `DatetimeIndex` (`set_index("ts").sort_index()`) before `resample` or time-based `rolling`.
3. `resample("D").sum()` creates **empty bins**: `sum` gives 0, `mean` gives NaN. Decide which is right, because "no data" and "zero" differ.
4. Use start-anchored calendar bins for months (`"MS"`) to avoid alias differences between pandas versions; use lowercase `"h"` for hours.
5. `rolling("3D")` is a **time** window (the half-open interval `(t - 3D, t]`), while `rolling(3)` is three rows. They differ whenever dates are missing.
6. Sessionization: sort, `diff()` within each entity, flag gaps above a threshold, then `cumsum()` of the flags gives a session id.
7. Time zones: store UTC, convert for display (`tz_convert`); `tz_localize` only attaches a zone to naive times. Daily buckets depend on the zone, so state which.

**Pitfalls**: comparing strings instead of timestamps; `df.groupby(df.ts.dt.date)` returns Python dates with no gap filling; integer-day arithmetic across DST; `.dt.dayofweek` has Monday = 0.

## Worked example

Daily revenue events: 03-01 has 5 and 3, nothing on 03-02, 03-03 has 4, 03-04 has 2.

```python
s = df.set_index("ts")["v"].resample("D").sum()      # 8, 0, 4, 2
s.rolling("3D").mean()                               # 8.0, 4.0, 4.0, 2.0
s.rolling(3, min_periods=1).mean()                   # 8.0, 4.0, 4.0, 2.0 (same here)
```

`resample("D").sum()` inserts the empty 03-02 as 0. For 03-03 the time window `(02-29, 03-03]` holds 03-01, 03-02, 03-03, so the mean is $(8 + 0 + 4)/3 = 4$. If you had dropped empty days (no resample), `rolling("3D")` would still average only the rows that exist inside the window, giving $(8 + 4)/2 = 6$ for 03-03, and `rolling(3)` would silently stretch back across the gap. Always say whether missing days are zeros or unknowns before choosing the window.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A daily series is missing 2024-03-02. What is the difference between `s.rolling(3).mean()` and `s.rolling(\"3D\").mean()`?",
  "options": [
    "None, they are aliases",
    "`rolling(3)` uses the last 3 rows, which can span more than 3 days; `rolling(\"3D\")` uses the last 3 calendar days",
    "`rolling(\"3D\")` requires a column, not an index",
    "`rolling(3)` ignores NaN"
  ],
  "answer": 1,
  "explanation": "An integer window counts rows; a string offset is a time window and needs a DatetimeIndex. With gaps they give different results."
}
```

```quiz
{
  "id": "q2",
  "question": "Timestamps are stored as naive UTC times and you want daily buckets in US/Pacific. What is the right order?",
  "options": [
    "`tz_convert(\"US/Pacific\")` directly on the naive series",
    "`tz_localize(\"UTC\")` then `tz_convert(\"US/Pacific\")` then resample",
    "`tz_localize(\"US/Pacific\")` then resample",
    "Resample first, then convert"
  ],
  "answer": 1,
  "explanation": "Naive times have no zone: first attach UTC with `tz_localize`, then convert to the target zone, then bucket. Localizing straight to Pacific would shift every timestamp wrongly."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`df` has columns `ts` (strings like \"2024-03-01 10:00\") and `v`. Write `daily_totals(df)` returning a Series indexed by calendar day (DatetimeIndex at midnight) with the sum of `v` per day, including days without events as 0, from the first to the last event day.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef daily_totals(df):\n    pass",
  "tests": "df = pd.DataFrame({\"ts\": [\"2024-03-01 10:00\", \"2024-03-03 08:00\", \"2024-03-01 23:30\", \"2024-03-04 09:00\"], \"v\": [5, 4, 3, 2]})\ns = daily_totals(df)\nassert [str(d.date()) for d in s.index] == [\"2024-03-01\", \"2024-03-02\", \"2024-03-03\", \"2024-03-04\"]\nassert list(s) == [8, 0, 4, 2]",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef daily_totals(df):\n    d = df.assign(ts=pd.to_datetime(df[\"ts\"]))\n    return d.set_index(\"ts\")[\"v\"].sort_index().resample(\"D\").sum()",
  "hints": [
    "Convert `ts` with `pd.to_datetime`, then `set_index(\"ts\")`.",
    "`resample(\"D\").sum()` fills the missing days with 0."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Same input shape as before. Write `monthly_growth(df)` returning a Series indexed by month start (`\"MS\"` bins) with the month-over-month growth of the summed `v`: $(m_t / m_{t-1}) - 1$. The first month is NaN.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef monthly_growth(df):\n    pass",
  "tests": "df = pd.DataFrame({\"ts\": [\"2024-01-15\", \"2024-01-20\", \"2024-02-10\", \"2024-03-05\"], \"v\": [100, 50, 120, 60]})\ng = monthly_growth(df)\nassert [str(d.date()) for d in g.index] == [\"2024-01-01\", \"2024-02-01\", \"2024-03-01\"]\nassert np.isnan(g.iloc[0])\nassert abs(g.iloc[1] - (-0.2)) < 1e-9 and abs(g.iloc[2] - (-0.5)) < 1e-9",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef monthly_growth(df):\n    d = df.assign(ts=pd.to_datetime(df[\"ts\"]))\n    m = d.set_index(\"ts\")[\"v\"].sort_index().resample(\"MS\").sum()\n    return m / m.shift(1) - 1",
  "hints": [
    "Resample with `\"MS\"`, then divide by the shifted series.",
    "Jan = 150, Feb = 120, Mar = 60 in the test data."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "`events` has `user` and `ts` (strings). A new session starts when the gap to the same user's previous event is **more than** 30 minutes. Write `sessions_per_user(events)` returning a dict `{user: number_of_sessions}`. Rows may arrive unsorted.",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": [
    "pandas",
    "numpy"
  ],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef sessions_per_user(events):\n    pass",
  "tests": "ev = pd.DataFrame({\n    \"user\": [\"a\", \"b\", \"a\", \"a\", \"a\", \"b\"],\n    \"ts\": [\"2024-03-01 10:55\", \"2024-03-01 09:00\", \"2024-03-01 10:00\", \"2024-03-01 10:20\", \"2024-03-01 12:00\", \"2024-03-01 09:30\"],\n})\nassert sessions_per_user(ev) == {\"a\": 3, \"b\": 1}\none = pd.DataFrame({\"user\": [\"z\"], \"ts\": [\"2024-01-01 00:00\"]})\nassert sessions_per_user(one) == {\"z\": 1}",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef sessions_per_user(events):\n    d = events.assign(ts=pd.to_datetime(events[\"ts\"])).sort_values([\"user\", \"ts\"])\n    gap = d.groupby(\"user\")[\"ts\"].diff()\n    new = (gap > pd.Timedelta(minutes=30)).astype(int)\n    d[\"session\"] = new.groupby(d[\"user\"]).cumsum()\n    return {str(u): int(n) + 1 for u, n in d.groupby(\"user\")[\"session\"].max().items()}",
  "hints": [
    "Sort by user and time, then `groupby(\"user\")[\"ts\"].diff()`; the first event per user has NaT, which compares as False.",
    "The cumulative sum of \"new session\" flags is the session index; sessions = max index + 1."
  ]
}
```

> [!TIP] Interview tips
> - Ask about time zone, missing days and window semantics before coding; these are the hidden requirements.
> - Index by time and sort, then use `resample`, time-based `rolling` and `diff`, not Python loops.
> - For sessionization: sort, `diff` within entity, flag gaps, `cumsum`. Know it by heart.
