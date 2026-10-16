---
id: data-engineering-shuffle-data-skew-broadcast-join
title: Shuffle、数据倾斜、广播连接
---

## 为什么重要
“你的 Spark 任务卡在 199/200 个 task 上一个小时了。发生了什么？”是经典的 Spark 性能问题。答案涉及 shuffle、数据倾斜和连接策略。

## 概念
**Shuffle**：按键在各 executor 之间重新分布数据（用于 groupBy、join、distinct、repartition）。数据会被序列化、写入本地磁盘，再通过网络拉取。它通常是任务中代价最高的部分。减少 shuffle 的方法：尽早筛选和选择列、预聚合、避免不必要的重新分区。

**数据倾斜**：少数几个键的行数远多于其他键（空的 user_id、超大客户、“unknown” 国家）。shuffle 之后，某个分区巨大，于是一个 task 要跑一个小时，而其他 task 几秒钟就完成了，它还可能溢写或 OOM。
解决办法：
- **筛选掉或单独处理垃圾键**（空值、默认值）。
- 如果另一侧很小，使用**广播连接**。
- **加盐（salting）**：在大表一侧给热点键追加 0..N−1 的随机后缀，把小表一侧复制 N 份并分别带上每个后缀，按 (键, 盐) 连接，然后再聚合。这样能把一个热点键分散到 N 个 task 上。
- **两阶段聚合**：先按 (键, 盐) 聚合，再按键聚合。
- **AQE 倾斜连接**（`spark.sql.adaptive.skewJoin.enabled`）会自动拆分倾斜的分区。

**连接策略**：
- **广播哈希连接**：把小表发送到每个 executor；大表无需 shuffle。当一侧能放进内存时效果很好（默认阈值 `spark.sql.autoBroadcastJoinThreshold` = 10 MB；可以用 `F.broadcast(df)` 提示）。广播过大可能导致 driver/executor OOM。
- **排序合并连接**：两侧都按键 shuffle、排序、合并。两张大表连接时的默认策略。
- **Shuffle 哈希连接**：两侧都 shuffle，在每个分区内构建哈希表。

## 示例讲解
把 20 亿条点击事件与一张 50 MB 的 `dim_campaign` 连接：排序合并连接会 shuffle 20 亿行。用 `clicks.join(F.broadcast(campaigns), "campaign_id")`，大表根本不需要移动：任务从 40 分钟降到 6 分钟。另一个聚合中有 30% 的行 `user_id = NULL`，导致出现一个巨大的 task；筛选掉空值（或加盐）就能解决。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个连接 stage 中有 199 个 task 在 30 秒内完成，而有一个要跑 45 分钟。最可能的原因是？",
  "options": ["executor 太少", "数据倾斜：某个键（例如空值或超大客户）全部映射到一个分区", "Parquet 文件是压缩的", "driver 太小"],
  "explanation": "单个拖后腿的 task 输入远多于其他 task，这是数据倾斜的典型特征。"
}
```

```quiz
{
  "id": "q2",
  "question": "什么时候适合使用广播连接？",
  "options": ["两张表都有 5 TB", "其中一张表小到能放进每个 executor 的内存", "需要对两张巨大的表做全外连接", "在 Spark 中永远不适合"],
  "explanation": "广播小的一侧，就避免了 shuffle 大的一侧。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `partition_sizes(keys, n_partitions)`，用 `hash_fn(key) = sum(map(ord, str(key))) % n_partitions` 返回每个分区的行数列表。编写 `skew_ratio(sizes)` = 最大值 / 平均值。再编写 `salt_keys(keys, hot_keys, n_salts)`，返回新的键列表：热点键的每次出现都变成 f'{key}#{i % n_salts}'（i 是该热点键到目前为止出现的次数），其他键保持不变；加盐应当降低倾斜比。",
  "hints": ["倾斜比为 1 表示各分区完全均匀。", "加盐把一个热点键分散成 n_salts 个不同的键，它们会被哈希到不同的分区。"]
}
```

> [!TIP] 面试技巧
> - 从 Spark UI 诊断：一个拖后腿的 task = 倾斜；巨大的 shuffle 读写 = 移动的数据太多。
> - 按顺序给出解决办法：筛选/处理空键、广播小表、加盐或两阶段聚合、AQE 倾斜处理。
> - 了解连接策略（广播哈希 vs 排序合并）、广播阈值及其 OOM 风险。
