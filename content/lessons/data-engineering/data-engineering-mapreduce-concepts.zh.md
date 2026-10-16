---
id: data-engineering-mapreduce-concepts
title: MapReduce 概念
---

## 为什么重要
Hadoop MapReduce 基本已经退役，但它的模型（map → shuffle → reduce）仍然是 Spark、SQL 引擎以及“你会如何在 10 TB 数据上统计 X？”这类面试题的基础。

## 概念
1. **Map**：每个工作节点读取输入的一块（分片），并发出 **(键, 值)** 对。例如词频统计：`("data", 1)`。
2. **Shuffle 与排序**：框架按键把所有值分组，并把每个键的值发送到同一个 reducer（`hash(key) % n_reducers`）。这一步需要通过网络移动数据，通常是代价最高的一步。
3. **Reduce**：每个 reducer 聚合其负责的键的值：`("data", [1, 1, 1]) → ("data", 3)`。

优化和思想：
- **Combiner**：在 map 端本地做的小型 reduce（在 shuffle 之前先按 mapper 汇总计数），能减少网络流量。适用于满足结合律、交换律的运算（求和、计数、最大值），不适用于中位数。
- **数据本地性**：把计算移动到数据块所在的位置（HDFS）。
- **容错**：失败的任务会从输入重新执行；中间结果写入磁盘。
- **倾斜**：一个热点键会压垮一个 reducer（见 shuffle/倾斜那一课）。

为什么 Spark 取代了它：MapReduce 在每个阶段之间都把中间结果写入磁盘，表达多步任务也很笨拙；Spark 把数据保存在内存中，构建包含多个阶段的 DAG，并提供高层 API（DataFrame、SQL）。

## 示例讲解
从 10 TB 日志中统计每个 URL 的浏览量。Map：解析每一行，发出 `(url, 1)`。Combiner：在每个 mapper 上按 URL 求和（一个有 100 万行但只有 2 万个不同 URL 的 mapper，只需发送 2 万对而不是 100 万对）。Shuffle：同一个 URL 的所有键值对都发往同一个 reducer。Reduce：求和，输出 `(url, total)`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 SUM 可以用 combiner，而 MEDIAN 不行？",
  "options": ["MEDIAN 太慢", "SUM 满足结合律和交换律，所以部分和可以正确地合并；各部分的中位数无法得到整体的中位数", "combiner 只适用于字符串", "MEDIAN 需要在 mapper 上排序"],
  "explanation": "部分聚合结果必须能够无损地合并。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 MapReduce 的方式实现词频统计。`map_phase(lines)` 返回 (单词, 1) 对的列表（转为小写，按空白分割）。`combine(pairs)` 返回本地汇总后的 (单词, 计数) 对，按单词排序。`shuffle(pairs_lists, n_reducers)` 接收多个 mapper 的输出列表，返回由 `n_reducers` 个字典（单词 → 计数列表）组成的列表，用 `sum(map(ord, word)) % n_reducers` 分配每个单词。`reduce_phase(partitions)` 返回一个字典：单词 → 总数。",
  "hints": ["分区函数决定由哪个 reducer 负责某个键。", "每个键只会落在一个分区中，所以各 reducer 之间不会冲突。"]
}
```

> [!TIP] 面试技巧
> - 用词频统计解释 map → shuffle → reduce，并指出 shuffle 是代价最高的步骤。
> - 提到 combiner（只适用于可合并的聚合）、数据本地性以及通过重新执行实现容错。
> - 说明 Spark 为什么取代了它：基于内存的 DAG 执行和更高层的 API。
