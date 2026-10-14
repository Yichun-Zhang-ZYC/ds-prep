---
id: sql-union-vs-union-all
title: UNION 与 UNION ALL
---

## 为什么重要
把多个来源的数据堆叠起来（网页 + App 事件、今年 + 去年）是日常操作。习惯性地用 `UNION` 会悄悄丢掉合理的重复行，还要额外排序。

## 概念
- `UNION ALL` 原样堆叠结果。速度快，保留重复行。
- `UNION` 堆叠之后再去掉重复行（相当于对整个结果做 `DISTINCT`），更慢。

两者共同的规则：
- 列数相同、顺序相同、类型兼容。
- 列名取自**第一个**查询。
- 只能在最后写一个 `ORDER BY`，作用于合并后的结果。

## 示例讲解
统计两个平台的总事件数。这里用 `UNION` 就是 bug，因为同一天两个相同的事件都是真实发生的：

```sql
SELECT event_date, user_id, 'web' AS platform FROM web_events
UNION ALL
SELECT event_date, user_id, 'app' AS platform FROM app_events;
```

加一个字面量列 `platform` 可以记录每行的来源，也让行本身可以区分。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "查询 A 返回 5 行，查询 B 返回 3 行，其中 B 有 2 行与 A 中的行完全相同（A、B 内部各自没有重复）。`A UNION B` 和 `A UNION ALL B` 分别返回几行？",
  "options": ["6 和 8", "8 和 6", "6 和 6", "8 和 8"],
  "explanation": "UNION ALL 保留全部 8 行。UNION 去掉 2 行重复：5 + 3 − 2 = 6。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回每个 `user_id` 的登录总次数 `logins`，要同时统计 `web_logins` 和 `app_logins` **两个表**。同一用户可能在同一天两边都登录，两次都要算。",
  "hints": ["UNION 会把用户 1 在 2024-05-01 的网页和 App 登录合并成一行。", "先用 UNION ALL 堆叠，再分组。"]
}
```

> [!TIP] 面试技巧
> - 默认用 `UNION ALL` 并说明原因；只有确实需要去重时才用 `UNION`。
> - 堆叠时加一个来源列，便于调试和后续分组。
> - 类型不一致时（例如 `INT` 和 `TEXT` 类型的 id）要显式转换，各引擎的隐式转换规则不同。
