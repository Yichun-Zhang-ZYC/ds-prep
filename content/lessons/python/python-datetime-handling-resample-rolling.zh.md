---
id: python-datetime-handling-resample-rolling
title: 日期时间处理、resample、rolling
---

## 为什么重要
日活用户、周收入、7 日移动平均、距上次购买的时间：大多数产品指标都是基于时间的。面试官会考察解析、时区、重采样和滚动窗口。

## 概念
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

- `resample` = 按时间桶做 groupby；需要 DatetimeIndex（或 `on="ts"`）。
- `groupby(date)` 之后缺失的日期不会出现；resample/asfreq 会补全日历，这样滚动窗口才不会失真。
- `rolling(7)` 按**行**计数；`rolling("7D")` 按**时间**计算（对不规则数据才正确）。`min_periods` 控制预热期。
- 时间戳以 UTC 存储；只在展示或计算本地日指标时才转换为本地时间。

## 示例讲解
每日注册数：[5, 0（缺失的一天）, 7]。`groupby(date).size()` 只返回 2 天，所以“2 日平均”混合了不相邻的日子。用 `resample("D").size()` 后得到 [5, 0, 7]，2 日滚动均值为 [NaN, 2.5, 3.5]。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "事件到达的时间不规则。哪个方法能为每个事件给出真正的过去 7 天总和？",
  "options": ["rolling(7).sum()", "在 DatetimeIndex 上用 rolling('7D').sum()", "resample('W').sum()", "shift(7)"],
  "explanation": "rolling(7) 不管时间，只使用最后 7 行；'7D' 使用时间窗口。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "事件有 `ts`（字符串）和 `amount` 两列。编写 `daily_totals(df)`，返回按天汇总的 Series（索引为日期），包括首尾日期之间的零值日。编写 `moving_avg(daily, window)`，返回 `min_periods=1` 的滚动均值。编写 `days_between_orders(df)`：把行按 `user` 再按 `ts` 排序后，返回每行距离该用户上一笔订单的天数（第一笔为 NaN）。",
  "hints": ["resample('D').sum() 会把缺失的日子填为 0。", "相减前先把时间戳归一化到午夜，这样计算的是日历天数。"]
}
```

> [!TIP] 面试技巧
> - 用 to_datetime 解析，保持 UTC，并有意识地转换时区。
> - 计算滚动指标之前先补全日历（resample/asfreq）；提到 rolling(n) 与 rolling("7D") 的区别。
> - 了解用 shift/pct_change 计算周环比，用 groupby diff 计算事件间隔。
