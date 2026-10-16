---
id: python-merge-join-concat
title: merge / join / concat
---

## 为什么重要
合并表格是隐蔽数据 bug 的藏身之处：多对多连接导致行重复、内连接丢掉行、键的类型不匹配。面试官希望看到你有意识地做连接并加以验证。

## 概念
```python
pd.merge(orders, users, on="user_id", how="left")        # SQL-style join
orders.merge(users, left_on="uid", right_on="user_id", how="inner")
orders.merge(users, on="user_id", how="left", validate="many_to_one", indicator=True)
pd.concat([df_jan, df_feb], ignore_index=True)            # stack rows
pd.concat([features_a, features_b], axis=1)               # side by side, aligned on index
left.join(right, how="left")                              # join on index
```

- `how`：`inner`（只保留匹配的）、`left`、`right`、`outer`、`cross`。
- `validate="one_to_one" | "one_to_many" | "many_to_one"` 会在键不符合预期的唯一性时报错；能及早发现**行数爆炸**。
- `indicator=True` 会添加 `_merge` 列，取值为 `left_only` / `right_only` / `both`，可用于反连接和检查匹配率。
- 重叠的非键列会加上后缀（`_x`、`_y`；用 `suffixes=` 自定义）。
- 键的数据类型必须一致（"123" 和 123 永远连接不上）。在 pandas 中 NaN 键会相互匹配，这与 SQL 不同。
- **反连接**（在 A 中但不在 B 中的行）：`A[~A.key.isin(B.key)]`，或者带 indicator 合并后保留 `left_only`。
- `pd.merge_asof` 按最近的更早时间戳连接，适用于时点正确的特征。

## 示例讲解
订单表（1,000 行）左连接一个不小心含有重复用户行的 `users` 表，结果返回 1,037 行；收入被重复计算了。`validate="many_to_one"` 会立即报错。连接前后一定要比较行数。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "执行 `orders.merge(users, on='user_id', how='left')` 后，行数增加了。为什么？",
  "options": ["左连接总会增加行", "users 中有些 user_id 出现了不止一次，所以匹配的订单被重复了", "缺失的用户被丢弃了", "索引没对齐"],
  "explanation": "左连接保留左表的每一行，但会为右表中每个匹配行重复一次。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `enrich_orders(orders, users)`：按 `user_id` 把 users 左连接到 orders 上，使用 `validate='many_to_one'`，并把缺失的 `country` 填为 'unknown'。编写 `orders_without_user(orders, users)`，返回 user_id 不在 users 中的订单（反连接，重置索引）。编写 `stack_months(*dfs)`，把多个 DataFrame 纵向拼接并生成新的索引。",
  "hints": ["如果 users 中有重复的键，validate='many_to_one' 会抛出 MergeError。", "反连接：~isin(...)。"]
}
```

> [!TIP] 面试技巧
> - 说明连接类型和预期的基数关系；使用 `validate=` 并比较行数。
> - 用 `indicator=True` 检查匹配率，并确认键的数据类型一致。
> - 了解 concat（堆叠）与 merge（按键连接）的区别，并提到基于时间连接的 merge_asof。
