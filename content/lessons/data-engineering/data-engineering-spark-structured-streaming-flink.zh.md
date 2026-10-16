---
id: data-engineering-spark-structured-streaming-flink
title: Spark Structured Streaming / Flink
---

## 为什么重要
事件进入 Kafka 之后，必须有东西去处理它们：聚合、连接、补充信息、写入下游。Spark Structured Streaming 和 Apache Flink 是两大主流引擎，面试官会问它们如何工作以及有什么区别。

## 概念
**Spark Structured Streaming**
- 把流当作一张**无界表**；你写和批处理相同的 DataFrame/SQL 代码，Spark 增量地运行它。
- 默认执行方式：**微批**（例如每隔几秒）；延迟通常在 1 秒左右或更多。（存在连续模式，但功能有限。）
- **输出模式**：append（只输出新的最终行）、update（输出变化的行）、complete（输出整张结果表）。
- **检查点**（偏移量 + 状态写入持久存储）支持故障恢复，并在配合幂等/事务性写入端（例如 Delta）时实现精确一次。
- 有状态操作：带**水位线**的窗口聚合、流与流的连接、`mapGroupsWithState` / `transformWithState`。
- 如果你已经在用 Spark/Databricks，并希望批处理和流处理使用同一套代码，它是很好的选择。

**Apache Flink**
- 真正**逐事件**的流处理，延迟很低（毫秒级）。
- 丰富的**事件时间**支持：水位线、窗口（滚动、滑动、会话）、定时器、允许的延迟。
- 大规模托管的**键控状态**（RocksDB 后端），通过周期性的**分布式快照**（检查点，Chandy-Lamport 算法）实现精确一次。
- API：DataStream、Table API/Flink SQL。用于欺诈检测、实时特征、告警、复杂事件处理。

如何选择：需要亚秒级延迟或复杂的有状态事件时间逻辑 → Flink。在 Spark 湖仓上统一批流、秒级延迟即可 → Structured Streaming。简单的 Kafka 到 Kafka 转换 → Kafka Streams。托管选项：Databricks、Confluent Flink、AWS Managed Flink、Dataflow（Apache Beam）。

## 示例讲解
```python
orders = (spark.readStream.format("kafka").option("subscribe", "orders").load()
          .select(F.from_json(F.col("value").cast("string"), schema).alias("o")).select("o.*"))
per_min = (orders.withWatermark("event_ts", "10 minutes")
           .groupBy(F.window("event_ts", "1 minute"), "country")
           .agg(F.sum("amount").alias("revenue")))
(per_min.writeStream.format("delta").outputMode("append")
        .option("checkpointLocation", "s3://chk/per_min").start("s3://gold/revenue_per_min"))
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Spark Structured Streaming（默认模式）和 Flink 在架构上的一个关键区别是什么？",
  "options": ["Spark 不能读取 Kafka", "Spark 处理微批；Flink 逐个处理事件，延迟更低", "Flink 不支持状态", "Spark 没有检查点"],
  "explanation": "微批用一些延迟换取了简单性以及批流统一。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟一个带检查点的有状态流式聚合。`StreamAgg()` 在 `self.state` 中保存每个键的累计值，在 `self.offset` 中保存最后处理的偏移量（初始为 −1）。`process(batch)` 接收 `(offset, key, amount)` 记录的列表，跳过偏移量 ≤ self.offset 的记录（已经处理过：崩溃后的重放不应重复计算），更新状态并推进偏移量。`checkpoint()` 返回副本 `(offset, dict(state))`；`restore(cp)` 加载它。",
  "hints": ["跳过已经应用过的偏移量，能让重放变得安全。", "检查点要复制状态，这样之后的更新不会改变已保存的快照。"]
}
```

> [!TIP] 面试技巧
> - Spark Structured Streaming：无界表、微批、输出模式、检查点、水位线。
> - Flink：逐事件处理、丰富的事件时间语义、大规模键控状态、分布式快照。
> - 根据延迟需求和现有技术栈选择；提到检查点 + 幂等/事务性写入端实现精确一次。
