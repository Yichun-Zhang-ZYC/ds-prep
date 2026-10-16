---
id: data-engineering-data-lake
title: 数据湖
---

## 为什么重要
原始日志、图片、JSON 事件和 ML 训练数据很少能整齐地放进数据仓库的表里。数据湖以低成本存储它们，面试官会问数据湖与数据仓库有什么不同，以及如何避免变成“数据沼泽”。

## 概念
**数据湖**把任何类型的数据（结构化、半结构化、非结构化）以原生格式存放在便宜的**对象存储**上（Amazon S3、Google Cloud Storage、Azure Data Lake Storage）。

- **读时模式（schema-on-read）**：写入时不强制模式；读取方（Spark、Trino/Presto、Athena、DuckDB）在查询时施加结构。数据仓库则是**写时模式（schema-on-write）**。
- 存储非常便宜且持久；可扩展到 PB 级；不绑定任何一种计算引擎。
- 适用于：原始事件归档、日志、ML 数据集（图片、音频、文本）、数据科学探索、长期留存。

典型布局按区域组织（“奖牌架构”）：
- **Bronze / 原始层**：按接入时的样子保存，不可变。
- **Silver / 清洗层**：去重、带类型、统一口径，通常为 Parquet。
- **Gold / 精选层**：聚合后、可直接用于业务的表。

路径按分区组织以便剪枝：`s3://lake/events/event_date=2024-06-01/part-0001.parquet`。

风险（“数据沼泽”）：没有目录或负责人、模式不一致、小文件爆炸、没有 ACID 保证（失败的任务会留下部分文件；并发写入会冲突）、为满足 GDPR 而进行的硬删除很困难。解决办法：**数据目录**（AWS Glue、Hive Metastore、Unity Catalog）、命名规范、文件合并，以及**表格式**（Delta Lake、Iceberg、Hudi），它们把数据湖变成了湖仓。

## 示例讲解
一个移动应用每天产生 20 亿条 JSON 事件。它们以压缩 JSON 的形式落到 `bronze/events/dt=…/`。每晚一个 Spark 任务解析、去重，并把数据按日期分区写成 Parquet 到 `silver/events/`；日活用户的 Gold 表供给数据仓库和仪表盘。数据科学家用 Athena 或 DuckDB 直接查询 Silver 层。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "对数据湖来说，“读时模式”是什么意思？",
  "options": ["数据写入前必须符合某个模式", "数据按原样存储，由引擎在查询时施加结构", "模式存放在文件名中", "没有 DBA 就不允许读取"],
  "explanation": "数据湖接收原始数据；查询引擎在读取时解释它。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `partition_path(base, table, date)`，返回 Hive 风格的路径，例如 `s3://lake/silver/events/event_date=2024-06-01/`。再编写 `prune(paths, start, end)`，只保留 `event_date=YYYY-MM-DD` 的值落在 [start, end]（包含两端，对 ISO 日期直接比较字符串即可）的路径；以及 `small_files(sizes_mb, threshold_mb=32)`，返回小于阈值的文件个数（这是需要合并文件的信号）。",
  "hints": ["Hive 风格的分区在路径中编码 key=value。", "ISO 日期字符串按字符串排序就是正确的顺序。"]
}
```

> [!TIP] 面试技巧
> - 对比数据湖（读时模式、任意格式、便宜的对象存储）与数据仓库（写时模式、SQL 表）。
> - 描述 bronze/silver/gold 分区和按分区组织的 Parquet 布局。
> - 说出沼泽化的风险及解决办法：数据目录、治理、文件合并、表格式。
