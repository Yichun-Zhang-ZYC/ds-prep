---
id: python-practice-datetime-and-resampling
title: "练习：日期、时间与重采样"
---

## 为什么重要

时间序列题的大部分难度都藏在细节里：缺失的日期、时区、窗口定义、会话间隔。面试官会检查你是否只解析一次、按时间建立索引，并清楚自己用的是哪种日历和窗口语义。

## 概念

**解题套路**（基础见日期/重采样/滚动课）：

1. 只解析一次：`pd.to_datetime(col, utc=True)` 或指定 `format=`；检查 `NaT` 的数量。
2. 在 `resample` 或基于时间的 `rolling` 之前，先把时间放进 `DatetimeIndex`（`set_index("ts").sort_index()`）。
3. `resample("D").sum()` 会创建**空桶**：`sum` 得 0，`mean` 得 NaN。要决定哪个正确，因为“没有数据”和“零”不同。
4. 月度日历桶使用起始锚点的 `"MS"`，以避免不同 pandas 版本的别名差异；小时用小写 `"h"`。
5. `rolling("3D")` 是**时间**窗口（半开区间 `(t - 3D, t]`），而 `rolling(3)` 是三行。只要有缺失日期，两者就不同。
6. 会话切分：排序，在每个实体内 `diff()`，标记超过阈值的间隔，再对标记做 `cumsum()` 得到会话编号。
7. 时区：以 UTC 存储，显示时转换（`tz_convert`）；`tz_localize` 只是给无时区的时间附上时区。按天分桶取决于时区，所以要说明用哪个。

**常见陷阱**：比较字符串而非时间戳；`df.groupby(df.ts.dt.date)` 返回 Python 日期且不会补齐空缺；跨夏令时做整天的算术；`.dt.dayofweek` 以周一为 0。

## 示例讲解

每日收入事件：03-01 有 5 和 3，03-02 没有，03-03 为 4，03-04 为 2。

```python
s = df.set_index("ts")["v"].resample("D").sum()      # 8, 0, 4, 2
s.rolling("3D").mean()                               # 8.0, 4.0, 4.0, 2.0
s.rolling(3, min_periods=1).mean()                   # 8.0, 4.0, 4.0, 2.0 (same here)
```

`resample("D").sum()` 把空的 03-02 填成 0。对于 03-03，时间窗口 `(02-29, 03-03]` 包含 03-01、03-02、03-03，因此均值为 $(8 + 0 + 4)/3 = 4$。如果丢掉空日期（不做 resample），`rolling("3D")` 只会对窗口内实际存在的行取平均，03-03 得到 $(8 + 4)/2 = 6$，而 `rolling(3)` 会悄悄向前跨越缺口。选择窗口之前，一定先说明缺失的日期是零还是未知。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某个日度序列缺少 2024-03-02。`s.rolling(3).mean()` 与 `s.rolling(\"3D\").mean()` 有何区别？",
  "options": [
    "没有区别，只是别名",
    "`rolling(3)` 用最近 3 行，可能跨越超过 3 天；`rolling(\"3D\")` 用最近 3 个日历日",
    "`rolling(\"3D\")` 需要的是列而不是索引",
    "`rolling(3)` 忽略 NaN"
  ],
  "explanation": "整数窗口按行数计；字符串偏移量是时间窗口，需要 DatetimeIndex。有缺口时两者结果不同。"
}
```

```quiz
{
  "id": "q2",
  "question": "时间戳以无时区的 UTC 时间存储，你想按 US/Pacific 做日度分桶。正确顺序是什么？",
  "options": [
    "直接对无时区序列 `tz_convert(\"US/Pacific\")`",
    "先 `tz_localize(\"UTC\")`，再 `tz_convert(\"US/Pacific\")`，然后重采样",
    "先 `tz_localize(\"US/Pacific\")` 再重采样",
    "先重采样再转换"
  ],
  "explanation": "无时区的时间没有时区信息：先用 `tz_localize` 附上 UTC，再转换到目标时区，然后分桶。直接本地化为 Pacific 会让所有时间戳错位。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "`df` 含有列 `ts`（形如 \"2024-03-01 10:00\" 的字符串）和 `v`。编写 `daily_totals(df)`，返回以日历日（零点的 DatetimeIndex）为索引的 Series，值为每天 `v` 之和，从第一个到最后一个事件日，没有事件的日子填 0。",
  "hints": [
    "用 `pd.to_datetime` 转换 `ts`，然后 `set_index(\"ts\")`。",
    "`resample(\"D\").sum()` 会把缺失的日期填成 0。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "输入形状同上。编写 `monthly_growth(df)`，返回以月初（`\"MS\"` 桶）为索引的 Series，值为 `v` 月度总和的环比增长率：$(m_t / m_{t-1}) - 1$。第一个月为 NaN。",
  "hints": [
    "用 `\"MS\"` 重采样，再除以平移后的序列。",
    "测试数据中 1 月 = 150，2 月 = 120，3 月 = 60。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "`events` 含有 `user` 和 `ts`（字符串）。当与同一用户上一个事件的间隔**超过** 30 分钟时开始新会话。编写 `sessions_per_user(events)`，返回字典 `{user: 会话数}`。行可能是乱序到达的。",
  "hints": [
    "按用户和时间排序，然后 `groupby(\"user\")[\"ts\"].diff()`；每个用户的第一个事件为 NaT，比较结果为 False。",
    "“新会话”标记的累计和就是会话序号；会话数 = 最大序号 + 1。"
  ]
}
```

> [!TIP] 面试技巧
> - 编码前先问清时区、缺失日期和窗口语义；这些是隐藏的需求。
> - 按时间建立索引并排序，然后使用 `resample`、基于时间的 `rolling` 和 `diff`，而不是 Python 循环。
> - 会话切分：排序、在实体内 `diff`、标记间隔、`cumsum`。要烂熟于心。
