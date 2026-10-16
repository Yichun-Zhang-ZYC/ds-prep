---
id: python-filtering-sorting
title: 筛选与排序
---

## 为什么重要
“找出每个地区 2024 年注册、收入排名前 5 的客户”就是 pandas 筛选加排序。这些是 pandas 面试题的基本功。

## 概念
```python
df[df["amount"] > 100]
df[(df["country"] == "US") & (df["amount"] > 100)]     # & | ~ with parentheses
df[df["country"].isin(["US", "CA"])]
df[df["amount"].between(10, 50)]                       # inclusive both ends
df[df["email"].str.endswith("@gmail.com", na=False)]
df[df["coupon"].notna()]
df.query("amount > 100 and country == 'US'")           # string expression

df.sort_values("amount", ascending=False)
df.sort_values(["region", "amount"], ascending=[True, False])
df.nlargest(5, "amount"); df.nsmallest(3, "price")
df.drop_duplicates(subset=["user_id"], keep="last")
df.sort_values("ts").groupby("user_id").tail(1)        # latest row per user
```

- 使用 `kind="stable"`（归并排序）时排序是稳定的；这对平局时保持顺序很有用。
- `na_position="first"/"last"` 控制 NaN 放在哪里。
- `str` 方法加上 `na=False` 能避免布尔掩码中出现 NaN。
- 每组取前 N 个：先排序再 `groupby(...).head(n)`，或用 `groupby(...)[col].nlargest(n)`。

## 示例讲解
每个客户金额最大的 2 笔订单：

```python
(orders.sort_values(["customer", "amount"], ascending=[True, False])
       .groupby("customer")
       .head(2))
```
等价于 SQL 中的 `ROW_NUMBER() OVER (PARTITION BY customer ORDER BY amount DESC) <= 2`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪个表达式能正确筛选出国家为 US 或 CA 且金额 > 50 的行？",
  "options": ["df[df.country == 'US' or 'CA' and df.amount > 50]", "df[df.country.isin(['US', 'CA']) & (df.amount > 50)]", "df[df.country in ['US', 'CA'] & df.amount > 50]", "df.filter(country=['US', 'CA'], amount=50)"],
  "explanation": "用 isin 判断成员关系，用带括号的 & 组合掩码。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "订单表有 `customer`、`country`、`amount` 三列。编写 `big_na_orders(df, min_amount)`，返回来自 US 或 CA 且金额 ≥ min_amount 的行，按金额降序排列（重置索引）。编写 `top_n_per_customer(df, n)`，返回每个客户金额最大的 n 笔订单，先按客户、再按金额降序排列（重置索引）。",
  "hints": ["用 & 把 isin 与比较组合起来。", "先排序，再用 groupby(...).head(n) 保留每组前几行。"]
}
```

> [!TIP] 面试技巧
> - 使用 isin、between、带 na=False 的 str 方法，以及带括号的 & / | 掩码。
> - 每组前 N 个 = 排序 + groupby.head；把它和 SQL 窗口函数联系起来。
> - 如果下游代码依赖位置，在筛选/排序后重置索引。
