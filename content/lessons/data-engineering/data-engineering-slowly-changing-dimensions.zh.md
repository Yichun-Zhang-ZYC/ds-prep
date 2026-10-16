---
id: data-engineering-slowly-changing-dimensions
title: 缓慢变化维度（SCD 类型 1/2）
---

## 为什么重要
客户会搬家，商品会换类别，销售代表会调整负责区域。“你如何保留历史，让去年的收入仍然归到去年的区域？”是最常见的 DE 面试题之一。

## 概念
- **类型 0**：永不改变（最初的注册日期）。
- **类型 1**：**覆盖**旧值。不保留历史。用于更正错误（修改拼写）或历史无关紧要的属性。
- **类型 2**：每次变化都**新增一行**，并带有有效期列。保留完整历史。
  - 列：代理键、自然键（如 `customer_id`）、属性、`valid_from`、`valid_to`（当前行为 NULL / `9999-12-31`）、`is_current`。
  - 事实表存储事件发生时有效的**代理键**，因此会一直指向当时的历史版本。
- **类型 3**：为旧值增加一列（`prev_region`）。历史有限（只能回溯一次变化）。
- **类型 4 / 6**：把历史拆分到单独的表 / 1+2+3 的混合。

类型 2 中某条记录发生变化时的更新步骤：
1. 关闭当前行：设置 `valid_to = 变更日期`、`is_current = false`。
2. 插入一行新数据，使用新的代理键和新属性，`valid_from = 变更日期`、`valid_to = NULL`、`is_current = true`。

时点查询：按自然键连接，条件为 `event_date >= valid_from AND (event_date < valid_to OR valid_to IS NULL)`。

在 dbt 中，**快照（snapshots）**会自动实现类型 2（按时间戳或检查列的变化）。

## 示例讲解
客户 42 在 2024-06-01 从波士顿（East）搬到丹佛（West）。

| sk | customer_id | region | valid_from | valid_to | is_current |
|---|---|---|---|---|---|
| 101 | 42 | East | 2022-01-10 | 2024-06-01 | false |
| 187 | 42 | West | 2024-06-01 | NULL | true |

2024 年 3 月的订单指向 sk 101，算作 East 的收入；7 月的订单指向 sk 187（West）。如果用类型 1，所有历史都会被错误地移到 West。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "客户的区域发生了变化，而你需要历史报表保留旧的区域。应该用哪种 SCD 类型？",
  "options": ["类型 0", "类型 1", "类型 2", "不需要维度表"],
  "explanation": "类型 2 为每个版本保留一行，并带有有效期日期。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "`dim_customer` 是 SCD 类型 2（当前行的 `valid_to` 为 NULL）。把 `orders` 中的每笔订单归属到**订单日期当天有效**的区域，返回每个 `region` 的收入（`revenue`），按 region 排序。（当 order_date >= valid_from 且 (order_date < valid_to 或 valid_to 为 NULL) 时，该行有效。）",
  "hints": ["把有效期窗口加到 JOIN 条件中，而不是只用 customer_id。", "valid_to 是不包含的，所以 2024-06-01 的订单属于新的那一行。"]
}
```

> [!TIP] 面试技巧
> - 用一个具体例子解释类型 1 和类型 2 的区别，以及类型 2 需要哪些列。
> - 说明事实表引用的是事件发生时有效的代理键，并展示时点连接。
> - 提到用 dbt 快照或 MERGE 语句来实现。
