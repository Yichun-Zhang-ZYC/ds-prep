---
id: data-engineering-case-cdc-pipeline
title: "案例：变更数据捕获流水线"
---

## 为什么重要
“把我们的 Postgres 订单表以分钟级延迟复制到数据仓库，包括删除”是经典案例题。它考察你是否理解基于日志的 CDC、顺序、快照、模式变更和故障模式。“增量加载与 CDC”讲了基础知识；本课构建端到端的流水线。

## 概念
参考架构：**Postgres WAL、Debezium（Kafka Connect）、每张表一个 Kafka 主题、写入 bronze、MERGE 进 silver**。

关键设计点：
- **先做初始快照，再接流。** 连接器先做一致性快照（`op = r`），记录日志位置（LSN），然后从该位置开始流式读取变更。下游把 `r` 当作插入处理。
- **事件结构**：`op`（c/u/d/r）、`before`、`after`、`source.lsn`、`ts_ms` 以及主键。Kafka 主题按主键作为 key，使同一分区内每行的顺序得以保留。
- **应用规则**：对每个键保留 LSN（或 Kafka 偏移量）最大的事件；`d` 删除该行或设置 `_deleted = true`。连同 LSN 保留一个**墓碑**，这样较旧的迟到事件就无法让该行复活。
- **投递是至少一次**，所以应用步骤必须幂等：忽略 LSN <= 已应用 LSN 的事件。
- **bronze 保存原始变更日志**，silver 保存合并后的状态。该日志还可用于构建 SCD Type 2 历史和审计，并支持重放。
- **模式演进**：使用带兼容性规则的 schema registry；新增可空列是安全的，重命名和类型变更需要迁移方案。
- **运维**：未被消费的**复制槽**会让 Postgres 持续保留 WAL，可能写满磁盘，因此要对复制槽延迟告警。监控连接器状态、消费者延迟、端到端新鲜度，以及与源端的行数对账。

替代方案：基于 `updated_at` 的查询式增量加载（看不到物理删除，会漏掉时间戳相同的更新），或对小表定期全量刷新。托管方案：DMS、Fivetran、Datastream。

## 示例讲解
订单表，示意负载：每天 2000 万次变更（平均每秒 230 次，峰值可能 1,500 次），每个事件约 500 字节，因此 Kafka 上每天约 10 GB；3 个分区足以应对峰值。

订单 7 的事件序列（LSN 是递增的日志位置）：
1. `r` lsn 100：状态 `new`（快照）
2. `u` lsn 140：状态 `paid`
3. `u` lsn 180：状态 `shipped`
4. `d` lsn 220：该行被删除（欺诈清理）

如果事件 2 和 3 的到达顺序被交换（重试或多个分区），应用规则会保留 lsn 180，所以状态是 `shipped`，而不是 `paid`。合并进 silver 的 `MERGE`：

```sql
MERGE INTO silver.orders t
USING (SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) rn
         FROM bronze.orders_cdc WHERE batch_id = :batch) WHERE rn = 1) s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'd' AND s.lsn > t.lsn THEN DELETE
WHEN MATCHED AND s.lsn > t.lsn THEN UPDATE SET *
WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT *
```

先在批次内去重至关重要：同一个键对应两条源行的 MERGE 是有歧义的（在大多数引擎中会报错）。由于有 `lsn >` 条件，重跑该批次不会产生任何变化。如果删除需要可审计，请使用软删除而不是 `DELETE`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么基于日志的 CDC 优于轮询 `WHERE updated_at > :last`？",
  "options": [
    "配置更简单",
    "在目标端占用的存储更少",
    "它能以较低的源端负载捕获删除和每一次中间变更",
    "它保证精确一次投递"
  ],
  "explanation": "读取事务日志能看到每一次已提交的变更，包括删除，而无需查询表。投递通常仍是至少一次，因此消费者必须幂等。"
}
```

```quiz
{
  "id": "q2",
  "question": "下游消费者两次收到同一个 CDC 事件，并且同一个键的两次更新乱序到达。哪种应用规则是安全的？",
  "options": [
    "按到达顺序应用事件",
    "只有当事件的 LSN 大于该键已应用的 LSN 时才应用",
    "总是取最新的到达时间戳",
    "丢弃重复，但接受任意顺序"
  ],
  "explanation": "比较源端日志位置能让应用步骤既幂等又不受顺序影响。到达时间反映的是传输情况，而不是源端变更的顺序。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `apply_cdc(events, state=None)`，其中 events 是形如 `{'key','op','lsn','after'}` 的字典，op 为 `c`、`u`、`d`，`state` 把键映射到 `(lsn, row_or_None)`。对每个事件，如果 state 中已有 LSN >= 该事件的 LSN，则忽略；否则存入 `(lsn, after)`，删除则存入 `(lsn, None)`（墓碑）。返回新的 state（不要修改输入）。再编写 `visible(state)`，返回未删除行的键到行的映射。结果不得依赖于事件顺序或重复。",
  "hints": [
    "覆盖之前，先比较已存的 LSN 与事件的 LSN。",
    "保留墓碑可以防止较旧的 create 让已删除的键复活。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "编写 `bootstrap(snapshot, snapshot_lsn, events)`：从在 `snapshot_lsn` 处获取的快照字典（键到行）开始，把每一行快照视为具有该 LSN，用同样的规则应用事件（LSN 小于等于快照 LSN 的事件已过时，被忽略），并返回可见的键到行字典。",
  "hints": [
    "把 state 初始化为 `{k: (snapshot_lsn, row)}`。",
    "lsn <= snapshot_lsn 的事件已经体现在快照中。"
  ]
}
```

```reveal
{
  "prompt": "面试题：“设计一条流水线，在 5 分钟内把 200 张 Postgres 表镜像到数据仓库，并处理删除和模式变更。”概述你的回答。",
  "answer": "**捕获**：在 Postgres 逻辑复制槽（pgoutput）上部署 Debezium，每张表一个 Kafka 主题，以主键为 key，使用 Avro 加 schema registry。在只读副本上运行，或每个连接器使用独立的复制槽；对复制槽延迟和 WAL 磁盘占用设置告警。\n\n**快照**：对每张表做初始增量快照（分块，避免大表阻塞），并记录 LSN；之后可按需做临时重新快照用于修复。\n\n**落地**：Kafka Connect sink（或 Spark 流处理）把原始变更事件写入按接入小时分区的 bronze Iceberg/Delta 表，只追加，包含 op、lsn、ts_ms 和完整的 `after` 镜像。\n\n**应用**：每 5 分钟对每张表执行一次 MERGE：先按键取最大 LSN 对批次去重，再带 `lsn >` 守卫合并进 silver（幂等），用 DELETE 或软删除标志处理删除。\n\n**模式变更**：registry 使用 BACKWARD 兼容性；新增列自动流入（开启表模式演进）；破坏性变更触发告警并需要迁移/回填，通过数据契约沟通。\n\n**质量**：抽样核对源端与 silver 的行数和校验和；新鲜度 SLA 监控（最大 `ts_ms` 延迟）；无法解析的事件进入死信主题。\n\n**成本与安全**：避免复制 PII 列（列排除列表），在连接器处脱敏，合并 bronze 表的小文件。\n\n**权衡**：Debezium vs 托管方案（DMS/Fivetran）：控制力 vs 运维负担；每 5 分钟 MERGE vs 只追加加读时合并视图；物理删除 vs 软删除。"
}
```

> [!TIP] 面试技巧
> - 描述完整路径：先快照再接流、按主键作 key 的主题、bronze 里的原始日志、带 LSN 守卫的 MERGE 进 silver。
> - 说明投递是至少一次，并展示应用步骤如何做到幂等且不受顺序影响。
> - 提到运维风险：复制槽延迟写满源端磁盘、模式变更，以及与源端的对账。
