---
id: sql-partitioning-and-clustering
title: 分区与聚簇
---

## 为什么重要
在数仓里你按扫描的字节数付费，而在几十亿行上的查询要保持快速，就必须跳过绝大部分数据。分区和聚簇就是跳过数据的手段，在 DE 和分析工程师面试中经常出现。

## 概念
- **分区**按某一列把表切成独立的块，通常按日期（`event_date`）。在这一列上过滤时，引擎只读取匹配的分区：这叫**分区裁剪**。
- **聚簇**（BigQuery、Snowflake）或**排序键**（Redshift）在存储块内部按一列或多列排序，引擎可以跳过那些 min/max 范围不可能匹配过滤条件的块。

| | 分区 | 聚簇 |
|---|---|---|
| 典型列 | 日期 / 时间戳 | 最常用的过滤列（`user_id`、`country`） |
| 粒度 | 粗（每天一个） | 细（分区内的数据块） |
| 陷阱 | 分区过多、过小 | 在低基数列上收益很小 |

只有直接在分区列上过滤才会触发裁剪。在按 `event_date` 分区的表上写 `WHERE DATE(event_ts) = ...`，可能会扫描全部数据。

## 示例讲解
BigQuery 建表语句，以及一个能触发裁剪的查询：

```sql
CREATE TABLE analytics.events
PARTITION BY event_date
CLUSTER BY user_id, event_name AS
SELECT * FROM raw.events;

-- Reads only 7 partitions, and within them only blocks for this user
SELECT event_name, COUNT(*)
FROM analytics.events
WHERE event_date BETWEEN '2024-06-01' AND '2024-06-07'
  AND user_id = 123
GROUP BY event_name;
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一张表按 `event_date` 分区。哪个查询扫描的数据最少？",
  "options": ["`WHERE user_id = 5`", "`WHERE event_date >= '2024-06-01'`", "`WHERE EXTRACT(YEAR FROM event_date) = 2024`", "没有过滤条件，但加了 `LIMIT 10`"],
  "explanation": "直接在分区列上过滤才能裁剪分区。在大多数数仓里 LIMIT 不会减少扫描的字节数，对列套函数也可能阻止裁剪。"
}
```

```reveal
{
  "prompt": "对一张 20 亿行的事件表，你会如何选择分区列和聚簇列？",
  "answer": "看这张表是怎么被查询的。\n\n- **分区**：选几乎每个查询都会过滤的列，通常是事件日期，粒度要让每个分区足够大（按天最常见）。\n- **聚簇**：选其次最常用的过滤列或连接键（`user_id`、`event_name`、`country`），按使用频率排序。\n- 对超大表强制要求分区过滤（BigQuery 的 `require_partition_filter`），防止意外的全表扫描。\n- 之后查看查询日志再调整：每个查询扫描的字节数，以及裁剪的效果。"
}
```

> [!TIP] 面试技巧
> - 把选择和查询模式联系起来：“大多数查询都按日期和用户过滤，所以……”。
> - 提到成本：在 BigQuery 按需计费模式下，扫描的字节数就是账单。
> - Postgres 也有分区（声明式分区），主要用于删除旧数据之类的运维操作。
