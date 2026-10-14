---
id: sql-bigquery-snowflake-spark-sql-differences
title: BigQuery、Snowflake 与 Spark SQL 的差异
---

## 为什么重要
大多数数据岗位查询的是云数仓或 Spark，而不是 Postgres。面试官想听到你了解这些引擎在计费模式、语法和功能上的差异，并且写 SQL 时会把这些因素考虑进去。

## 概念
| 主题 | BigQuery | Snowflake | Spark SQL |
|---|---|---|---|
| 计费模式 | 扫描字节数（按需）或 slot | 虚拟仓库计算时长（credits） | 集群运行时长 |
| 按窗口函数结果过滤 | `QUALIFY` | `QUALIFY` | 子查询 / CTE |
| 日期截断 | `DATE_TRUNC(d, MONTH)` | `DATE_TRUNC('month', d)` | `DATE_TRUNC('month', d)` |
| 相隔天数 | `DATE_DIFF(d2, d1, DAY)` | `DATEDIFF(day, d1, d2)` | `DATEDIFF(d2, d1)` |
| 安全除法 | `SAFE_DIVIDE(a, b)` | `DIV0(a, b)` | `a / NULLIF(b, 0)` |
| 数组 / 嵌套数据 | `ARRAY`、`STRUCT`、`UNNEST` | `VARIANT`、`FLATTEN` | `ARRAY`、`STRUCT`、`EXPLODE` |
| 近似去重计数 | `APPROX_COUNT_DISTINCT` | `APPROX_COUNT_DISTINCT` | `approx_count_distinct` |
| 数据跳过 | 分区 + 聚簇 | 微分区 + 聚簇键 | 分区、文件裁剪、Z-ordering（Delta） |

三者都是列式存储，所以 `SELECT *` 比只选需要的列更贵，而 `LIMIT` 一般不会减少扫描的数据量。

## 示例讲解
“每个用户最新一行”：用 `QUALIFY`（BigQuery / Snowflake）和不用它（Spark）的写法：

```sql
-- BigQuery / Snowflake
SELECT *
FROM events
QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts DESC) = 1;

-- Spark SQL
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts DESC) AS rn
  FROM events
) t
WHERE rn = 1;
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 BigQuery 按需计费模式下，哪种改动通常最能降低成本？",
  "options": ["加上 LIMIT 100", "只选需要的列，并在分区列上过滤", "加 ORDER BY", "把 JOIN 换成子查询"],
  "explanation": "费用取决于扫描的字节数。列式存储只读取选中的列，分区过滤可以跳过整个分区。LIMIT 不会减少扫描的字节数。"
}
```

```reveal
{
  "prompt": "某个 Spark SQL 连接非常慢，其中一个任务比其他任务慢得多。发生了什么？你能怎么做？",
  "answer": "这是**数据倾斜**：少数几个连接键（例如 NULL 键，或某个特别大的客户）占了大部分行，所以某一个分区的工作量远超其他分区。\n\n解决办法：单独过滤或处理 NULL 键；如果一侧能放进内存，就**广播**小表（`/*+ BROADCAST(small) */`）；对倾斜键**加盐**（在大表一侧加随机后缀，小表一侧复制多份）；或者在 Spark 3 中开启自适应查询执行（AQE）的倾斜连接处理。"
}
```

> [!TIP] 面试技巧
> - 把语法和成本联系起来：“BigQuery 按扫描字节数计费，所以我只选这几列，并按分区日期过滤。”
> - 在 BigQuery 或 Snowflake 上时提一下 `QUALIFY`，这说明你有实际使用经验。
> - 对于 Spark，要考虑 shuffle、数据倾斜和广播连接，而不只是 SQL 文本本身。
