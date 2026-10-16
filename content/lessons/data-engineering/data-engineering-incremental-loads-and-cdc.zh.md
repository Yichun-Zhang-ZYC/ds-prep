---
id: data-engineering-incremental-loads-and-cdc
title: 增量加载与 CDC（变更数据捕获）
---

## 为什么重要
每晚重新加载一张 20 亿行的表既慢又贵。面试官会问你如何只移动发生变化的数据，以及如何正确捕获更新和删除。

## 概念
**增量加载策略**：
- **只追加**：新行的 ID 或时间戳单调递增；加载 `WHERE id > last_max_id`。
- **基于 `updated_at` 的高水位线**：加载 `updated_at > last_watermark` 的行，然后按主键 **upsert（MERGE）**到目标表。加载成功后再保存水位线。注意事项：删除操作不可见，`updated_at` 必须被可靠地维护，时钟偏差或长事务可能导致漏行（使用一个小的重叠窗口并去重）。
- **全量刷新**：最简单，适用于小表。

**变更数据捕获（CDC）**读取数据库的**事务日志**（PostgreSQL WAL、MySQL binlog），把每一次插入/更新/删除作为事件发出，通常使用 **Debezium → Kafka** 之类的工具，或托管服务（Fivetran、AWS DMS）。
- 能捕获**删除**和每一次中间变化，延迟低，对源库的负载也小。
- 事件携带操作类型（`c`、`u`、`d`）、变更前后的镜像，以及用于排序的日志位置（LSN）。
- 把 CDC 应用到目标表：对每个键，保留**日志位置最新的事件**；删除事件会移除该行（或设置软删除标记）。在湖仓中：`MERGE INTO target USING changes ON key WHEN MATCHED AND op='d' THEN DELETE WHEN MATCHED THEN UPDATE WHEN NOT MATCHED THEN INSERT`。
- 保留变更流还能让你构建 SCD 类型 2 的历史。

## 示例讲解
水位线方法：上次运行的水位线 = `2024-06-01 00:00`。查询源表 `WHERE updated_at > '2024-05-31 23:55'`（5 分钟重叠），按 `order_id` MERGE，然后把水位线设为看到的最大 `updated_at`。一笔在源库中被硬删除的取消订单永远不会出现，所以数据仓库仍然会统计它。CDC 会发出一个删除事件，修正这个问题。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "与基于日志的 CDC 相比，基于 updated_at 的增量加载有什么关键局限？",
  "options": ["无法处理插入", "无法捕获源库中的硬删除", "需要 Kafka", "只适用于 Parquet"],
  "explanation": "被删除的行直接消失了；没有任何 updated_at 更新的东西可供加载。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `apply_cdc(target, events)`，其中 `target` 是“键 → 行”的字典，`events` 是字典列表，包含 `op`（'c'、'u' 或 'd'）、`key`、`lsn`（日志位置）和 `row`（删除时为 None）。事件可能乱序到达：对每个键只应用 `lsn` 最大的事件。返回一个新字典（不要修改输入）。再编写 `next_watermark(rows, current)`，返回 rows 中最大的 `updated_at`，如果 rows 为空则返回 `current`。",
  "hints": ["先把事件归约为每个键按 lsn 最新的那一个。", "删除事件移除该键；创建和更新事件设置该行。"]
}
```

> [!TIP] 面试技巧
> - 比较只追加、updated_at 水位线 + MERGE 以及基于日志的 CDC；说出各自会遗漏什么。
> - 谈 CDC 时，提到 Debezium/Kafka、按日志位置排序，以及删除的处理。
> - 谈到重叠窗口、去重，以及只在加载成功后才保存水位线。
