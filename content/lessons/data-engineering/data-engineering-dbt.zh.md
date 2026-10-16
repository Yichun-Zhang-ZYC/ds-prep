---
id: data-engineering-dbt
title: dbt
---

## 为什么重要
dbt（data build tool）是在数据仓库中构建转换的标准方式。分析工程师和 DE 面试经常会问到模型、物化方式、测试、增量模型和项目结构。

## 概念
dbt 把 `SELECT` 语句变成表和视图，管理依赖关系，并增加测试和文档功能。

- **模型**：包含一条 `SELECT` 的 `.sql` 文件。`{{ ref('stg_orders') }}` 引用另一个模型，从而构建出 **DAG**，让 dbt 按依赖顺序运行模型。`{{ source('stripe', 'charges') }}` 引用原始表。
- **物化方式**：`view`（便宜、总是最新、查询慢）、`table`（每次运行都重建）、`incremental`（只处理新行）、`ephemeral`（作为 CTE 内联）。
- **增量模型**：

```sql
{{ config(materialized='incremental', unique_key='order_id') }}
SELECT * FROM {{ ref('stg_orders') }}
{% if is_incremental() %}
  WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}
```

- **测试**：在 YAML 中声明的通用测试（`unique`、`not_null`、`accepted_values`、`relationships`），以及返回行即失败的自定义 SQL 测试。dbt-expectations 等包提供了更多测试。
- **快照**：为可变的源表保存 SCD 类型 2 的历史。
- **种子**（小型 CSV）、**宏**（Jinja 函数）、**文档**和血缘图、**exposures**（依赖于模型的仪表盘）。
- 典型分层：`staging`（与数据源一一对应，做重命名/类型转换）→ `intermediate`（连接、业务逻辑）→ `marts`（供使用方使用的事实表和维度表）。
- 命令：`dbt run`、`dbt test`、`dbt build`（按 DAG 顺序运行 + 测试）、`dbt run --select +fct_orders`（一个模型及其上游）、`--full-refresh`。
- 生产环境：在拉取请求上跑 CI（用 `state:modified+` 实现精简 CI），通过 Airflow/Dagster/dbt Cloud 调度。

## 示例讲解
`stg_orders` 对原始列做重命名和类型转换；`int_order_items_joined` 把订单与订单项和商品连接起来；`fct_orders` 聚合到每个订单一行，并对 `order_id` 做 `unique` 和 `not_null` 测试，对 `dim_customer` 做 `relationships` 测试。一个破坏唯一性的 PR 会在进入生产之前就在 CI 中失败。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 dbt 模型中，`{{ ref('stg_orders') }}` 起什么作用？",
  "options": ["运行一个测试", "解析为 stg_orders 对应的表/视图，并记录一个依赖，让 dbt 按正确的顺序构建模型", "创建一个种子", "定义一个快照"],
  "explanation": "ref() 会处理不同环境下的 schema 名称，并构建 DAG。"
}
```

```quiz
{
  "id": "q2",
  "question": "什么时候增量物化最有用？",
  "options": ["小型查找表", "大型、以追加为主的表，每次都全部重建太慢或太贵", "必须总是最新的视图", "ephemeral 类型的 CTE"],
  "explanation": "增量模型只处理新增/变化的行，代价是额外的复杂度（迟到数据、全量刷新）。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "写出 dbt 的 `fct_orders` 模型编译后的 SQL（把 ref 替换为表名）：基于 `stg_orders` 和 `stg_order_items`，每个订单返回一行，包含 `order_id`、`customer_id`、`n_items`（数量之和）和 `order_total`（数量 × 单价之和），**只包含 status 为 'completed' 的订单**，按 order_id 排序。",
  "hints": ["把订单项连接到订单，筛选 completed，按订单分组。", "order_total = SUM(quantity * unit_price)。"]
}
```

> [!TIP] 面试技巧
> - 解释 ref/source 和 DAG，以及各种物化方式（view/table/incremental/ephemeral）的适用场景。
> - 提到 YAML 中的测试、用于 SCD2 的快照，以及 staging → intermediate → marts 的分层。
> - 展示生产经验：PR 上的 CI、`dbt build`、选择器，以及在增量模型中处理迟到数据。
