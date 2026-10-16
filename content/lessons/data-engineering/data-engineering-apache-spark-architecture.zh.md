---
id: data-engineering-apache-spark-architecture
title: Apache Spark 架构（driver、executor、DAG）
---

## 为什么重要
Spark 是大规模批处理的默认引擎（Databricks 也构建于其上）。面试官会问一个 Spark 任务是如何执行的，以及当它变慢或失败时，如何分析 stage、task、分区和内存。

## 概念
组件：
- **Driver**：运行你的程序（`SparkSession`），构建逻辑计划，对其优化（Catalyst），拆分成 stage 和 task 并调度它们。`collect()` 的结果会回到这里，所以不要 collect 大数据。
- **集群管理器**：YARN、Kubernetes、standalone 或 Databricks；负责分配资源。
- **Executor**：运行在工作节点上的 JVM 进程，负责执行 task、缓存数据和写 shuffle 文件。每个 executor 有若干个 **core**（并行的 task 槽位）和内存。

执行层次：
- **应用** → **job**（每个 action 一个，例如 `count()`、`write`）→ **stage** → **task**。
- 一个 **stage** 是一串可以流水线执行的**窄转换**（map、filter、select，即每个输出分区只依赖一个输入分区）。
- **宽转换**（groupBy、join、distinct、repartition）需要 **shuffle**，从而形成一个 **stage 边界**。
- 一个 **task** 在 stage 内处理一个**分区**。一个 stage 中的 task 数 = 分区数。

性能基础：
- 并行度：总 core 数 = executor 数 × 每个 executor 的 core 数；目标是每个 core 2–4 个分区，每个分区约 100–200 MB。
- `spark.sql.shuffle.partitions`（默认 200）控制 shuffle 之后的分区数；**自适应查询执行（AQE）**可以合并分区并自动处理倾斜。
- 用 **Spark UI** 找出耗时长的 stage、倾斜的 task（某个 task 比其他慢得多）、溢写到磁盘以及 GC 时间。
- 常见故障：`collect()`/过大的广播导致 driver OOM，倾斜或巨大的分区导致 executor OOM。

## 示例讲解
`df.filter(...).select(...).groupBy("country").agg(sum("amount")).write.parquet(...)`：
- 一个 action（`write`）→ 一个 job。
- Stage 1：读取 + filter + select + 部分聚合（窄转换，流水线执行），400 个输入分区对应 400 个 task。
- 按 `country` 进行 shuffle。
- Stage 2：最终聚合 + 写入，200 个 task（shuffle 分区数），如果 AQE 合并了分区则会更少。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 Spark 任务中，什么会产生新的 stage？",
  "options": ["每个 filter", "需要 shuffle 的宽转换（例如 groupBy、join）", "select 中的每一列", "调用 cache()"],
  "explanation": "窄转换在一个 stage 内流水线执行；shuffle 标志着 stage 的边界。"
}
```

```quiz
{
  "id": "q2",
  "question": "在一个 50 GB 的 DataFrame 上执行 `df.collect()` 后，driver 因 OutOfMemoryError 崩溃。应该怎么修？",
  "options": ["增加更多 executor", "不要把大数据 collect 到 driver；把它写出去，或者先聚合", "增加 shuffle 分区数", "改用 RDD"],
  "explanation": "collect() 会把每一行都拉进 driver 的内存。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "为 Spark 的 stage 规划建模。一个计划是操作名的列表。窄操作：'read'、'filter'、'select'、'map'、'withColumn'。宽操作：'groupBy'、'join'、'distinct'、'repartition'、'orderBy'。编写 `count_stages(plan)` = 1 + 宽操作的个数。编写 `count_tasks(plan, input_partitions, shuffle_partitions)` = 第一个 stage 的 input_partitions，加上之后每个 stage 的 shuffle_partitions。编写 `partitions_for(total_gb, target_mb=128)` = ceil(total_gb × 1024 / target_mb)。",
  "hints": ["每个宽操作都会结束一个 stage 并开始一个新的 stage。", "每个 stage 的 task 数 = 该 stage 的分区数。"]
}
```

> [!TIP] 面试技巧
> - 描述 driver、executor 和集群管理器的分工，以及 job → stage → task 的层次。
> - 窄转换 vs 宽转换、shuffle 是 stage 边界，这是最关键的洞察。
> - 展示排查问题的直觉：Spark UI、倾斜的 task、溢写、分区大小、AQE，永远不要 collect 大数据。
