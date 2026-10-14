---
id: sql-postgresql-mysql
title: PostgreSQL / MySQL
---

## 为什么重要
大多数面试平台运行的是 Postgres 或 MySQL。了解几处会导致查询出错的差异，能让你在时间压力下少犯语法错误。

## 概念
| 功能 | PostgreSQL | MySQL（8.0+） |
|---|---|---|
| 字符串拼接 | `a \|\| b` | `CONCAT(a, b)`（默认 `\|\|` 是逻辑或） |
| 不区分大小写匹配 | `ILIKE` | 默认排序规则下 `LIKE` 本身不区分大小写 |
| 整数除法 | `5 / 2 = 2` | `5 / 2 = 2.5000`（整数除法用 `DIV`） |
| 日期截断 | `DATE_TRUNC('month', d)` | `DATE_FORMAT(d, '%Y-%m-01')` |
| 相隔天数 | `d2 - d1` | `DATEDIFF(d2, d1)` |
| 每个键保留一行 | `DISTINCT ON (key)` | `ROW_NUMBER()` |
| 插入或更新（upsert） | `INSERT ... ON CONFLICT (k) DO UPDATE` | `INSERT ... ON DUPLICATE KEY UPDATE` |
| 全外连接 | 支持 | 不支持（用 `LEFT JOIN UNION RIGHT JOIN` 模拟） |
| 中位数 | `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY x)` | 没有内置函数，用窗口函数 |
| 严格的 GROUP BY | 是 | 8.0 是（`ONLY_FULL_GROUP_BY`），老版本较宽松 |

两者都支持 CTE、递归 CTE 和窗口函数（MySQL 从 8.0 开始）。

## 示例讲解
同样是“按月第一天”分桶，两种写法：

```sql
-- PostgreSQL
SELECT DATE_TRUNC('month', created_at)::date AS month, COUNT(*) FROM orders GROUP BY 1;

-- MySQL
SELECT DATE_FORMAT(created_at, '%Y-%m-01') AS month, COUNT(*) FROM orders GROUP BY month;
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 MySQL 中，`SELECT 7 / 2;` 返回什么？",
  "options": ["3", "3.5000", "4", "报错"],
  "explanation": "MySQL 的 / 总是返回小数。Postgres 和 SQLite 对整数做整数除法。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 MySQL 中需要全外连接，通常怎么绕过？",
  "options": ["用 CROSS JOIN", "LEFT JOIN UNION（RIGHT JOIN 中没匹配上的行）", "MySQL 从 5.7 开始就支持", "用 INTERSECT"],
  "explanation": "用 UNION 把 LEFT JOIN 的结果和 RIGHT JOIN 中未匹配的行（或者交换两表后的第二个 LEFT JOIN）合并起来。"
}
```

> [!TIP] 面试技巧
> - 先问清平台用的是哪种方言，然后坚持使用它。
> - 忘记函数名时，说出你想做什么（“截断到月”），再用标准 SQL 写出来；面试官更关心逻辑。
> - 整数除法和 `||` 的差异最容易造成隐蔽的 bug；切换方言时要提到它们。
