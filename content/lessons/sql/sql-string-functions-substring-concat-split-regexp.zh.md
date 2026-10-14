---
id: sql-string-functions-substring-concat-split-regexp
title: 字符串函数：SUBSTRING、CONCAT、SPLIT、REGEXP
---

## 为什么重要
真实数据很乱：邮箱大小写混用、URL 带着追踪参数、全名挤在一列里。字符串函数常出现在数据清洗题，以及“按邮箱域名统计用户数”这类热身题中。

## 概念
| 任务 | 标准 SQL / Postgres | BigQuery | SQLite（本站使用） |
|---|---|---|---|
| 截取子串 | `SUBSTRING(s FROM 2 FOR 3)` | `SUBSTR(s, 2, 3)` | `substr(s, 2, 3)` |
| 拼接 | `s1 \|\| s2`、`CONCAT(s1, s2)` | `CONCAT(s1, s2)` | `s1 \|\| s2` |
| 查找位置 | `POSITION('@' IN s)` | `STRPOS(s, '@')` | `instr(s, '@')` |
| 拆分 | `SPLIT_PART(s, '@', 2)` | `SPLIT(s, '@')[OFFSET(1)]` | `substr` + `instr` |
| 正则 | `s ~ 'pattern'`、`REGEXP_REPLACE` | `REGEXP_CONTAINS`、`REGEXP_EXTRACT` | 不内置 |
| 清洗 | `LOWER`、`UPPER`、`TRIM`、`REPLACE`、`LENGTH` | 相同 | 相同 |

SQL 中字符串下标从 1 开始。在大多数数据库里，`||` 遇到 NULL 会返回 NULL，而 `CONCAT` 通常把 NULL 当作空字符串。

## 示例讲解
规范化后的每个用户的邮箱域名：

```sql
SELECT id,
       LOWER(TRIM(substr(email, instr(email, '@') + 1))) AS domain
FROM users;
```

在 Postgres 中同样的写法是 `LOWER(SPLIT_PART(email, '@', 2))`；在 BigQuery 中是 `LOWER(SPLIT(email, '@')[OFFSET(1)])` 或 `REGEXP_EXTRACT(email, r'@(.+)$')`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`substr('interview', 1, 5)` 返回什么？",
  "options": ["'nterv'", "'inter'", "'interv'", "'view'"],
  "explanation": "位置从 1 开始，第三个参数是长度：'inter'。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "返回每个邮箱**域名**（`@` 后面的部分，转为小写）作为 `domain`，以及使用该域名的用户数 `users`。",
  "hints": ["instr(email, '@') 给出 @ 的位置，域名从下一个字符开始。", "分组前先转小写，否则 Gmail.com 和 gmail.com 会分成两组。"]
}
```

> [!TIP] 面试技巧
> - 分组前先规范化（`LOWER`、`TRIM`）；即使样例数据看起来很干净也要提一句。
> - 有正则可用时，它通常比嵌套的 `substr`/`instr` 更清晰。说出你所用方言里的函数名。
> - 解析复杂内容（URL、JSON）时，提一下 `JSON_EXTRACT`、`NET.HOST` 这类内置解析函数，而不是手写字符串逻辑。
