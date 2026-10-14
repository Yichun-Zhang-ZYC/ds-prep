---
id: sql-transactions-and-acid-isolation-levels
title: 事务、ACID 与隔离级别
---

## 为什么重要
数据工程师和偏后端的岗位常被问到“ACID 是什么意思？”和“两个事务同时运行会出什么问题？”。能叫出各种隔离异常的名字，回答才有说服力。

## 概念
**事务**把多条语句打包，让它们一起成功或一起失败（`BEGIN … COMMIT`，或 `ROLLBACK`）。

**ACID**：
- **原子性（Atomicity）**：要么全部完成，要么全部不做。
- **一致性（Consistency）**：事务前后约束都成立。
- **隔离性（Isolation）**：并发事务看不到彼此做了一半的工作（程度可选）。
- **持久性（Durability）**：一旦提交，即使崩溃也不会丢失。

隔离级别在安全性和并发性之间权衡：

| 级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| 读未提交（Read Uncommitted） | 可能 | 可能 | 可能 |
| 读已提交（Read Committed，Postgres 默认） | 避免 | 可能 | 可能 |
| 可重复读（Repeatable Read，MySQL InnoDB 默认） | 避免 | 避免 | 标准中可能出现（Postgres 中可避免） |
| 可串行化（Serializable） | 避免 | 避免 | 避免 |

- **脏读**：读到了另一个事务尚未提交的修改。
- **不可重复读**：同一行读两次，值不一样。
- **幻读**：重新执行范围查询，多出了新的行。
- **丢失更新**：两个事务读同一个值后都写入，其中一次写入被覆盖。

## 示例讲解
原子地转账，并用行锁避免丢失更新：

```sql
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;   -- lock the row
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;   -- both updates apply, or neither (ROLLBACK on error)
```

写 `balance = balance - 100`（而不是写入在应用里算好的值）也能避免丢失更新，因为数据库是基于当前值计算的。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "事务 A 读了一行，B 修改了这一行并提交，然后 A 再次读同一行，看到了新值。这是哪种异常？",
  "options": ["脏读", "不可重复读", "幻读", "丢失更新"],
  "explanation": "同一行读两次，得到不同的已提交值：不可重复读。可重复读或可串行化级别可以避免。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么分析型数仓通常不像 OLTP 数据库那样关注隔离级别？",
  "options": ["它们根本不支持事务", "负载主要是批量加载加读取；它们通常用快照隔离，让读者看到一致的版本", "隔离级别只用于 NoSQL", "它们总是运行在读未提交级别"],
  "explanation": "Snowflake、BigQuery 和 Delta Lake 给读者提供一致的快照；与 OLTP 相比，并发的行级更新很少。"
}
```

> [!TIP] 面试技巧
> - 用一句简短的话定义 ACID 的每个字母，不要过度展开。
> - 举一个具体的异常例子（重复预订或转账），表明你理解其中的风险。
> - 谈到数据管道时，把它和幂等性联系起来：加载中途失败时，事务（或原子替换）可以避免出现加载了一半的表。
