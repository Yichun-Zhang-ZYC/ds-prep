---
id: data-engineering-lakehouse
title: 湖仓（Delta Lake、Iceberg）
---

## 为什么重要
湖仓表格式（Delta Lake、Apache Iceberg、Apache Hudi）如今已成为 Databricks、Snowflake、AWS 以及许多大型科技公司的标准配置。面试官会问它们解决了什么问题，以及如何在普通文件之上提供 ACID 事务。

## 概念
**湖仓** = 数据湖存储（对象存储上的 Parquet 等开放文件）+ 类似数据仓库的功能，这些功能由带有**事务日志 / 元数据层**的**开放表格式**提供。

工作原理：一张表是一组不可变的 Parquet 数据文件加上元数据（Delta：`_delta_log/` 中的 JSON 提交记录 + 检查点；Iceberg：元数据文件 → manifest 列表 → manifest）。一次写入会创建新的数据文件，然后原子地提交一个新的元数据版本，列出哪些文件属于这张表。读取方总是看到一致的快照。

功能：
- **ACID 事务**和并发写入（乐观并发控制）。
- **时间旅行**：查询旧版本（`VERSION AS OF 12`、`TIMESTAMP AS OF ...`），用于审计、可复现的 ML 训练集和回滚。
- **模式约束与演化**（安全地新增/重命名列）。
- 在数据湖数据上执行 **MERGE / UPDATE / DELETE**（upsert、CDC、GDPR 删除）。
- 用于数据跳过的**文件级统计信息**；文件合并（`OPTIMIZE`）、Z-order/聚簇。
- Iceberg 的额外功能：**隐藏分区**（按 `day(ts)` 分区，而无需用户在单独的列上筛选）以及分区演化。
- **开放**：多种引擎（Spark、Trino、Flink、Snowflake、DuckDB）都能读取同一张表，避免厂商锁定。

维护：旧文件会一直保留，直到被**清理（vacuum）/过期**，这限制了时间旅行的范围，也会占用存储成本。

## 示例讲解
一个 GDPR 请求要求删除用户 123 的事件。在普通的 Parquet 数据湖中，你需要手动重写分区，并且读取方可能看到写了一半的文件。使用 Delta/Iceberg：`DELETE FROM events WHERE user_id = 123` 只重写受影响的文件并原子地提交；保留期过后，`VACUUM` 再物理删除旧文件。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Delta Lake 和 Iceberg 如何在对象存储上实现原子提交？",
  "options": ["锁住整个存储桶", "写入方添加新的不可变数据文件，然后原子地发布一个定义表文件集合的新元数据/日志版本", "把 Parquet 转换成 CSV", "把数据存进关系型数据库"],
  "explanation": "元数据层是唯一的事实来源；一次提交通过一个原子步骤切换到新版本。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟一个极简的事务日志。`TableLog()` 维护一个版本列表；每个版本是数据文件名的 frozenset。`commit(add, remove)` 基于最新版本创建一个新版本（版本 0 是空表），并返回新版本号。`files(version=None)` 返回某个版本的文件列表（排序后，默认最新版本）——这就是时间旅行。`vacuum(keep_last)` 返回不被最近 `keep_last` 个版本中任何一个引用的文件（排序后的列表，可以安全删除）。",
  "hints": ["每次提交先复制最新的文件集合，再移除，再添加。", "被最近版本引用的文件必须保留，以支持时间旅行。"]
}
```

> [!TIP] 面试技巧
> - 把湖仓定义为开放文件 + 事务性元数据层，从而带来 ACID、时间旅行、模式演化和 MERGE。
> - 解释提交机制（不可变文件 + 原子的元数据切换）。
> - 简要比较各格式（Delta：Databricks 生态；Iceberg：引擎中立、隐藏分区），并提到 VACUUM/文件合并。
