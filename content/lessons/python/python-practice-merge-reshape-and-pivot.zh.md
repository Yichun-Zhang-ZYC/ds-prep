---
id: python-practice-merge-reshape-and-pivot
title: "练习：合并、重塑与透视"
---

## 为什么重要

真实的表从来不是你需要的形状。面试题会要求你在不悄悄复制行的前提下连接两张表、找出未匹配的键，并在长表与宽表之间转换。最常见的失误是连接悄悄让行数膨胀。

## 概念

**合并检查清单**（基础见 merge/join/concat 课）：

1. 先说明每张表的**粒度**（每行代表什么？）。结果的粒度取决于两侧键的唯一性：1:1、m:1 或 m:m（行爆炸）。
2. 连接前检查键是否唯一：`customers["cust"].is_unique`；或传入 `validate="m:1"`，违反时 pandas 会报错。
3. 根据问题选择连接类型：保留所有订单用 `how="left"`，只要匹配的用 `how="inner"`。**反连接**（找没有匹配的行）用 `indicator=True` 并过滤 `_merge == "left_only"`。
4. 比较连接前后的行数；这是最便宜的测试。
5. 重叠的非键列会得到 `_x`/`_y` 后缀；传入 `suffixes=` 或先选好列。

**重塑**：

- `pivot_table(index, columns, values, aggfunc, fill_value)` 会聚合重复项；普通 `pivot` 遇到重复会报错。
- `melt(id_vars, value_vars, var_name, value_name)` 把宽表变长表；`stack`/`unstack` 在列层级与索引之间移动。
- 透视后列带有名称（如 `quarter`）；设置 `out.columns.name = None` 并 `reset_index()` 得到扁平的表。
- 宽表中缺失的组合会变成 NaN，只有当“没有行”确实意味着 0 时才使用 `fill_value=0`。

## 示例讲解

订单：编号 1-4，客户分别为 a、b、z、a。客户表：`a` 出现一次，`b` 出现两次（Bo 和 Bo2，属于数据质量缺陷）。

```python
o.merge(c, on="cust", how="left")                       # 5 rows: order 2 duplicated
o.merge(c, on="cust", how="left", validate="m:1")       # raises MergeError
c1 = c.drop_duplicates("cust", keep="last")
m = o.merge(c1, on="cust", how="left", indicator=True)  # 4 rows
m.loc[m["_merge"] == "left_only", "order_id"]           # order 3 (customer z)
```

朴素的左连接用 4 笔订单得到 5 行，因此之后计算的任何 `sum(amount)` 都会因订单 2 而偏大。`validate="m:1"` 把这个悄无声息的错误变成报错。去重后，`indicator=True` 把订单 3 标记为 `left_only`，这就是“哪些订单没有对应客户？”的答案。务必把行数检查说出来：进 4 行，出 4 行。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "把 `orders`（1,000 行）与 `customers` 左连接后，结果有 1,040 行。最可能的原因是什么？",
  "options": [
    "部分订单没有匹配的客户",
    "`customers` 中有重复的键",
    "`orders` 中有重复的键",
    "本应使用内连接"
  ],
  "explanation": "左连接不会丢失左表的行；多出的行说明某些左键匹配了多个右表行，即右表有重复。未匹配的键只会产生 NaN，而不是多余的行。"
}
```

```quiz
{
  "id": "q2",
  "question": "当同一个 (region, quarter) 组合出现两次时，哪个调用会失败？",
  "options": [
    "`pivot_table(..., aggfunc=\"sum\")`",
    "`df.pivot(index=\"region\", columns=\"quarter\", values=\"amount\")`",
    "`df.melt(id_vars=\"region\")`",
    "`df.groupby([\"region\", \"quarter\"]).sum()`"
  ],
  "explanation": "`pivot` 不能聚合，会抛出“Index contains duplicate entries”。`pivot_table` 用 `aggfunc` 聚合重复项。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "`orders` 含有 `order_id`、`cust`；`customers` 含有 `cust`、`name`，且可能有重复的 `cust` 行。编写 `orphan_orders(orders, customers)`，返回其客户不在 `customers` 中的 **order_id 排序列表**。结果不应受 `customers` 中重复行的影响。",
  "hints": [
    "先对右表的键去重，保证 merge 不会让行数膨胀。",
    "使用 `indicator=True` 并保留 `_merge == \"left_only\"` 的行。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "`sales` 含有 `region`、`quarter`（如 \"Q1\"）、`amount`，每个组合可能有多行。编写 `wide_sales(sales)`，每个区域一行，每个季度一列（已排序），值为金额之和，缺失的组合填 0。结果列为扁平的 `region, Q1, Q2, ...`（列无名称），索引为 0..n-1，区域已排序。",
  "hints": [
    "`pivot_table` 配合 `aggfunc=\"sum\"` 和 `fill_value=0` 可同时处理重复和空缺。",
    "在 `reset_index()` 之前清除列名称，使结果拥有普通的列标签。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "`scores` 是宽表：列为 `student`、`math`、`art`、`pe`，学生没选的科目为 NaN。编写 `scores_long(scores)`，返回列为 `student`、`subject`、`score` 的长表，去掉 NaN 行，按 student 再按 subject 排序，索引重置。再编写 `best_subject(long_df)`，返回 学生 -> 得分最高科目 的字典（并列时取字母序最前的科目）。",
  "hints": [
    "`melt(id_vars=\"student\", var_name=\"subject\", value_name=\"score\")`，然后 `dropna(subset=[\"score\"])`。",
    "并列时按 score 降序、subject 升序排序，并取每个学生的第一行。"
  ]
}
```

> [!TIP] 面试技巧
> - 连接前说明两张表的粒度和预期行数，连接后再检查。
> - 用 `validate=`、`indicator=True` 和 `drop_duplicates` 证明连接是安全的；这是资深度的信号。
> - 了解 `pivot` 与 `pivot_table`（聚合）的区别以及 `melt` 与 `stack` 的区别；透视后要把列展平。
