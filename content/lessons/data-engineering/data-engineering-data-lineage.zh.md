---
id: data-engineering-data-lineage
title: 数据血缘
---

## 为什么重要
“某个源列下周要改类型，哪些仪表盘会坏？”和“这个 KPI 看起来不对，它是从哪里来的？”是数据血缘每天都在回答的问题。面试官会问你如何采集和使用血缘。

## 概念
**数据血缘**记录数据如何流动：哪些数据源、任务和转换生成了每张表（最好细到每一列），以及哪些下游资产使用了它。

粒度：
- **表级**：`raw.orders → stg_orders → fct_orders → revenue_dashboard`。
- **列级**：`fct_orders.revenue` 来源于 `raw.orders.amount × fx.rate`。

用途：
- **影响分析**：在修改或弃用某一列之前，找出所有下游的模型、仪表盘和 ML 特征。
- **根因分析**：把一个错误的指标向上游追溯到出问题的数据源或任务。
- **合规**：展示 PII 流向哪里（GDPR/CCPA），支持删除请求和审计。
- **信任与发现**：分析师能看到数据从哪里来、有多新鲜。

如何采集：
- **解析 SQL / 代码**：dbt 的 DAG（`ref`），用 SQL 解析器（sqlglot）得到列级血缘。
- **运行时埋点**：Airflow、Spark、dbt、Flink 发出 **OpenLineage** 事件，发送到 Marquez 之类的后端。
- **数据目录平台**（DataHub、OpenMetadata、Atlan、Unity Catalog、Collibra）把血缘与负责人和元数据结合在一起。

## 示例讲解
财务部门想把 `orders.amount` 重命名为 `orders.amount_usd`。血缘显示有 14 个下游 dbt 模型、3 个 Looker 仪表盘和 1 个 ML 特征视图依赖它。团队先添加一个弃用别名，迁移所有依赖方，最后才删除旧列，没有出现意外的故障。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在数据血缘的语境下，什么是影响分析？",
  "options": ["测量查询速度", "找出受上游某张表或某一列变化影响的所有下游资产", "统计表的行数", "估算存储成本"],
  "explanation": "血缘图让你在修改之前就能看到谁在使用什么。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "`edges` 是 (上游, 下游) 对的列表。编写 `impact(edges, node)`，返回所有传递性下游节点（排序后的列表）；以及 `root_sources(edges, node)`，返回 `node` 的上游节点中本身没有上游的那些（最初的数据源），按排序后的列表返回。",
  "hints": ["按你想遍历的方向构建邻接表。", "根数据源是那些自身没有上游的祖先节点。"]
}
```

> [!TIP] 面试技巧
> - 区分表级和列级血缘，并说出它的用途（影响分析、根因分析、合规）。
> - 解释采集方式：SQL 解析、dbt DAG、OpenLineage 运行时事件、DataHub 之类的数据目录。
> - 讲一个用血缘做变更管理的具体故事。
