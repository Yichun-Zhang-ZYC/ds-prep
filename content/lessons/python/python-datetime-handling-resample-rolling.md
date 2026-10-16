---
id: python-datetime-handling-resample-rolling
title: Datetime handling, resample, rolling
estimatedMinutes: 14
difficulty: medium
tags: [python, pandas, time-series, datetime]
---

## Why it matters
Daily active users, weekly revenue, 7-day moving averages, time since last purchase: most product metrics are time-based. Interviewers test parsing, time zones, resampling and rolling windows.

## Concept
```python
df["ts"] = pd.to_datetime(df["ts"], utc=True)          # parse (handle tz explicitly)
df["ts_local"] = df["ts"].dt.tz_convert("America/New_York")
df["date"] = df["ts"].dt.date; df["dow"] = df["ts"].dt.dayofweek; df["hour"] = df["ts"].dt.hour
df["week"] = df["ts"].dt.to_period("W").dt.start_time
df["days_since"] = (pd.Timestamp("2024-06-30", tz="UTC") - df["ts"]).dt.days
pd.Timedelta(days=7); df["ts"] + pd.DateOffset(months=1)

daily = df.set_index("ts").resample("D")["amount"].sum()      # time buckets ("W", "MS", "h")
daily = daily.asfreq("D", fill_value=0)                        # ensure every day exists
daily.rolling(7).mean()                                        # 7-row moving average
df.set_index("ts")["amount"].rolling("7D").sum()               # time-based window
daily.shift(7); daily.pct_change(7)                            # week-over-week
df.groupby("user")["ts"].diff()                                # time between events per user
```

- `resample` = groupby on time buckets; requires a DatetimeIndex (or `on="ts"`).
- Missing days don't appear after `groupby(date)`; resample/asfreq fill the calendar, so rolling windows aren't skewed.
- `rolling(7)` counts **rows**; `rolling("7D")` counts **time** (correct with irregular data). `min_periods` controls the warm-up.
- Store timestamps in UTC; convert to local time only for display or local-day metrics.

## Worked example
Daily signups: [5, 0 (missing day), 7]. `groupby(date).size()` returns only 2 days, so a "2-day average" mixes non-adjacent days. After `resample("D").size()` you get [5, 0, 7], and the 2-day rolling mean is [NaN, 2.5, 3.5].

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Events arrive irregularly. Which gives a true trailing 7-day sum per event?",
  "options": ["rolling(7).sum()", "rolling('7D').sum() on a DatetimeIndex", "resample('W').sum()", "shift(7)"],
  "answer": 1,
  "explanation": "rolling(7) uses the last 7 rows regardless of time; '7D' uses a time window."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Events have `ts` (strings) and `amount`. Write `daily_totals(df)` returning a daily Series (index = dates) including zero days between the first and last date. Write `moving_avg(daily, window)` returning the rolling mean with `min_periods=1`. Write `days_between_orders(df)` returning, for rows sorted by `user` then `ts`, the number of days since that user's previous order (NaN for the first).",
  "setup": "import pandas as pd\nimport numpy as np",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\nimport numpy as np\n\ndef daily_totals(df):\n    pass\n\ndef moving_avg(daily, window):\n    pass\n\ndef days_between_orders(df):\n    pass\n",
  "tests": "df = pd.DataFrame({'user': ['a', 'a', 'b', 'a'], 'ts': ['2024-01-01 10:00', '2024-01-03 09:00', '2024-01-03 12:00', '2024-01-08 08:00'], 'amount': [5, 7, 3, 1]})\nd = daily_totals(df)\nassert len(d) == 8 and list(d.iloc[:4]) == [5, 0, 10, 0] and d.iloc[-1] == 1\nm = moving_avg(pd.Series([5, 0, 7]), 2)\nassert list(m) == [5.0, 2.5, 3.5]\ng = days_between_orders(df)\nassert list(g.fillna(-1)) == [-1, 2.0, 5.0, -1]",
  "solution": "import pandas as pd\nimport numpy as np\n\ndef daily_totals(df):\n    s = df.assign(ts=pd.to_datetime(df['ts'])).set_index('ts')['amount']\n    return s.resample('D').sum()\n\ndef moving_avg(daily, window):\n    return daily.rolling(window, min_periods=1).mean()\n\ndef days_between_orders(df):\n    d = df.assign(ts=pd.to_datetime(df['ts'])).sort_values(['user', 'ts'])\n    d['date'] = d['ts'].dt.normalize()\n    return d.groupby('user')['date'].diff().dt.days.reset_index(drop=True)",
  "hints": ["resample('D').sum() fills missing days with 0.", "Normalize timestamps to midnight before diffing so you count calendar days."]
}
```

> [!TIP] Interview tips
> - Parse with to_datetime, keep UTC, and convert time zones deliberately.
> - Fill the calendar (resample/asfreq) before rolling metrics; mention rolling(n) vs rolling("7D").
> - Know shift/pct_change for week-over-week and groupby diff for time between events.
