---
id: python-groupby-agg-transform
title: groupby / agg / transform
---

## 为什么重要
`groupby` 是 pandas 中考得最多的功能：按细分计算指标、按用户构造特征、占总体的比例、组内排名。是否清楚 `agg`、`transform` 与 `apply` 的区别，能把熟练的候选人和吃力的候选人区分开。

## 概念
拆分 → 应用 → 合并。

```python
g = df.groupby("region")
g["revenue"].sum()                                  # Series indexed by region
g.agg(total=("revenue", "sum"),                     # named aggregation
      orders=("order_id", "nunique"),
      avg=("revenue", "mean")).reset_index()
df.groupby(["region", "month"], as_index=False)["revenue"].sum()
```

- **agg** 对**每组返回一行**（聚合）。
- **transform** 返回与**原始行对齐**的结果（长度相同）。非常适合“相对于组的值”：
```python
df["share"] = df["revenue"] / df.groupby("region")["revenue"].transform("sum")
df["z"] = df.groupby("region")["x"].transform(lambda s: (s - s.mean()) / s.std())
df["rank"] = df.groupby("region")["revenue"].rank(ascending=False, method="first")
df["cum"] = df.groupby("user")["amount"].cumsum()
df["prev"] = df.groupby("user")["amount"].shift(1)
```
- **filter** 保留满足条件的整个组：`df.groupby("user").filter(lambda g: len(g) >= 3)`。
- **apply** 是灵活的兜底方案（对每组执行任意函数），但很慢；优先使用内置方法。
- `size()` 统计行数（包括 NaN）；`count()` 统计每列的非空值个数。
- 默认会丢弃键为 NaN 的组（用 `dropna=False` 保留）。

## 示例讲解
| region | revenue |
|---|---|
| East | 100 |
| East | 300 |
| West | 200 |

`groupby("region")["revenue"].agg("sum")` → East 400，West 200（2 行）。
`groupby("region")["revenue"].transform("sum")` → 400、400、200（3 行），所以 `share` = 0.25、0.75、1.0。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你想把每一行的收入除以它所在地区的平均收入。哪个方法合适？",
  "options": ["先 groupby().agg('mean')，再直接相除", "groupby()['revenue'].transform('mean')", "groupby().filter()", "df.pivot_table()"],
  "explanation": "transform 把组统计量广播回每一行，保持原始形状。"
}
```

```quiz
{
  "id": "q2",
  "question": "groupby 上的 `size()` 和 `count()` 有什么区别？",
  "options": ["没有区别", "size 统计每组的所有行；count 统计每列的非空值", "count 包括 NaN；size 不包括", "size 只适用于数值列"],
  "explanation": "size() → 每组的行数；count() → 每列中非缺失值的个数。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "订单表有 `user`、`region`、`amount` 三列。编写 `region_summary(df)`，返回包含 `region`、`total`、`orders`、`users`（去重用户数）列的 DataFrame，按 total 降序排列。编写 `add_group_features(df)`，返回一个副本，新增 `region_share`（金额 / 所在地区总额）和 `user_order_num`（每个用户内按原始行顺序编号 1、2、3……）。",
  "hints": ["命名聚合：agg(total=('amount', 'sum'), ...)。", "groupby('user').cumcount() 在每组内从 0 开始给行编号。"]
}
```

> [!TIP] 面试技巧
> - 说出“agg 聚合，transform 保持形状”，并据此选择。
> - 用命名聚合得到可读的输出列名。
> - 当内置方法（transform、cumsum、rank、shift、cumcount）能完成任务时，避免使用 groupby.apply；内置方法快得多。
