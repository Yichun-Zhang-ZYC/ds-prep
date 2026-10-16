---
id: python-pivot-table-melt-stack-unstack
title: pivot_table、melt、stack / unstack
---

## 为什么重要
数据要么是“长格式”（每个观测一行），要么是“宽格式”（每个类别一列）。仪表盘、留存表和模型特征需要其中某一种，所以数据重塑是常见的面试任务。

## 概念
- **长 → 宽**：`pivot_table`（会聚合重复项）或 `pivot`（遇到重复项报错）。

```python
wide = df.pivot_table(index="user", columns="month", values="revenue",
                      aggfunc="sum", fill_value=0)
```

- **宽 → 长**：`melt`。

```python
long = wide.reset_index().melt(id_vars="user", var_name="month", value_name="revenue")
```

- **stack / unstack** 在行索引和列之间移动层级（MultiIndex）：
  - `df.unstack()` 把最内层的行索引层级移到列上（长 → 宽）。
  - `df.stack()` 把列移到最内层的行索引层级（宽 → 长）。
  - `groupby([a, b]).size().unstack(fill_value=0)` 是快速的交叉表。
- `pd.crosstab(df.a, df.b, normalize="index")` 给出计数或行比例。
- `pivot_table(margins=True)` 会加上行/列合计。
- 透视之后，列可能是 MultiIndex；用 `df.columns = [f"{a}_{b}" for a, b in df.columns]` 展平。

## 示例讲解
同期群留存表：

```python
cohort = (events.groupby(["signup_month", "months_since_signup"])["user"].nunique()
                .unstack(fill_value=0))
retention = cohort.div(cohort[0], axis=0)   # divide each row by its month-0 size
```
行 = 注册同期群，列 = 注册后的月数，值 = 留存率。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`df.pivot(index='user', columns='month', values='rev')` 报错 “Index contains duplicate entries”。应该用什么？",
  "options": ["melt", "带 sum 之类 aggfunc 的 pivot_table", "stack", "concat"],
  "explanation": "pivot 要求 (索引, 列) 对唯一；pivot_table 会聚合重复项。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "每一行有 `user`、`month`、`revenue`（同一个用户-月份可能有多行）。编写 `to_wide(df)`，返回以用户为索引、月份为列、收入求和、缺失为 0 的透视表。编写 `to_long(wide)`，把它转换回 `user`、`month`、`revenue` 三列，先按 user 再按 month 排序，并生成新的索引。编写 `row_shares(wide)`，把每一行除以该行的合计。",
  "hints": ["pivot_table(aggfunc='sum', fill_value=0) 能处理重复项和空缺。", "div(..., axis=0) 用 Series 中对应的值去除每一行。"]
}
```

> [!TIP] 面试技巧
> - 说出形状：“这是长格式；我会用 pivot_table 转成宽格式”（或用 melt 转回去）。
> - 可能有重复项时用 pivot_table，用 fill_value 填补空缺。
> - 同期群留存表（groupby + unstack + 除以第一列）是经典练习。
