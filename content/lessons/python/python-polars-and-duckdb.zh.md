---
id: python-polars-and-duckdb
title: Polars 与 DuckDB（现代替代方案）
---

## 为什么重要
当 pandas 太慢或数据装不进内存时，越来越多的团队会先选择 **Polars** 和 **DuckDB**，然后才考虑上集群。面试官会问你什么时候用它们，以及惰性执行/列式执行有什么帮助。

## 概念
**Polars**：一个用 Rust 编写、基于 Apache Arrow 的 DataFrame 库。
- 默认多线程；没有索引；类型严格。
- **表达式 API**：`pl.col("x")` 表达式可以组合并被优化。
- **惰性模式**（`scan_parquet`、`.lazy()` … `.collect()`）：先构建查询计划，然后应用**谓词下推**（读取时就筛选）、**投影下推**（只读取需要的列），并且可以流式处理超出内存的数据。

```python
import polars as pl
out = (pl.scan_parquet("orders/*.parquet")
         .filter(pl.col("status") == "paid")
         .group_by("region")
         .agg(pl.col("amount").sum().alias("revenue"),
              pl.col("user_id").n_unique().alias("users"))
         .sort("revenue", descending=True)
         .collect())
```

**DuckDB**：一个进程内的分析型（OLAP）SQL 数据库（“分析领域的 SQLite”）。
- 列式、向量化、多线程；对超出内存的查询会溢写到磁盘。
- 用 SQL **直接**查询 Parquet/CSV 文件以及 pandas/Polars 的 DataFrame：

```python
import duckdb
duckdb.sql("""
    SELECT region, SUM(amount) AS revenue
    FROM 'orders/*.parquet'
    WHERE status = 'paid'
    GROUP BY region ORDER BY revenue DESC
""").df()
```

什么时候用什么：
- **pandas**：中小型数据、生态兼容性、快速探索性分析。
- **Polars**：更快的 DataFrame 流水线、惰性优化、单机大任务。
- **DuckDB**：以 SQL 为主的本地文件分析、大规模 Parquet 集合上的连接、数据仓库查询的原型开发。
- **Spark / 数据仓库（BigQuery、Snowflake）**：超出单机的数据、共享的生产流水线。

三者通过 Arrow 互通（`pl.from_pandas`、`duckdb.sql(...).pl()`），通常无需复制。

## 示例讲解
在 16 GB 内存的笔记本上处理 30 GB 的 Parquet 数据集：pandas 的 `read_parquet` 因内存不足失败。`pl.scan_parquet(...).filter(...).group_by(...).collect(streaming=True)` 或一条 DuckDB SQL 查询只读取需要的列和行组，在几秒到几分钟内完成。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Polars 惰性模式中的谓词下推做了什么？",
  "options": ["在筛选前先排序数据", "在扫描文件时就应用筛选条件，从而读入内存的数据更少", "把结果推送到数据库", "把 SQL 转换为 Python"],
  "explanation": "有了查询计划，筛选条件就能下移到扫描阶段，尽早跳过行/行组。"
}
```

```quiz
{
  "id": "q2",
  "question": "你需要在不搭建服务器的情况下，对 200 个本地 Parquet 文件做临时的 SQL 连接。最合适的是？",
  "options": ["在循环中用 pandas read_csv", "DuckDB", "Spark 集群", "SQLite"],
  "explanation": "DuckDB 在进程内直接查询 Parquet，使用专为分析设计的列式引擎。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "这个浏览器沙箱中没有 Polars 和 DuckDB，所以请用纯 Python 实现惰性查询计划的核心思想。`LazyFrame(rows)` 存储由字典行组成的列表；`.filter(fn)` 和 `.select(*cols)` 返回新的 LazyFrame，只**记录**步骤；`.collect()` 执行它们。同时记录读取了多少行：`collect()` 应在对数据的单次遍历中应用所有筛选条件，因此即使有多个筛选，`rows_scanned` 也等于输入的大小。",
  "hints": ["filter/select 返回一个多记录了一个步骤的新 LazyFrame。", "在 collect 中，把所有筛选条件合并成对每一行的一次检查。"]
}
```

> [!TIP] 面试技巧
> - 给它们定位：pandas 图方便，Polars 用于快速/惰性的 DataFrame，DuckDB 用于在本地文件上跑 SQL，超出单机时用 Spark/数据仓库。
> - 用谓词下推和投影下推来解释惰性求值。
> - 提到 Arrow 和 Parquet 是让它们互通的通用列式格式。
