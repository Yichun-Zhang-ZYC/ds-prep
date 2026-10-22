---
id: analytics-bi-looker
title: Looker（LookML）
---

## 为什么重要

Looker 是语义层优先的 BI 工具，被许多数据成熟度高的公司使用。面试会问 LookML 是什么、explore 和连接如何工作，以及 Looker 如何避免重复计数。

## 概念

**LookML** 是一种声明式建模语言（存放在 Git 中），用来描述你的数据；Looker 在查询时据此生成 SQL，并在你的数据仓库中运行（没有提取）。

**核心对象**
- **Model**：一个数据库连接加上它暴露的 explore。
- **View**：一张表（或派生表），包含 **dimension**（属性）、**dimension_group**（例如 `type: time` 会展开为 date/week/month）和 **measure**（聚合：`count`、`sum`、`average`、`count_distinct` 或自定义 SQL）。
- **Explore**：用户的入口，由一个基础 view 加上若干 **join** 定义，每个 join 有 `type`（`left_outer` 等）、`sql_on` 和 `relationship`（`many_to_one`、`one_to_many` 等）。
- **仪表板**（界面或 LookML）、**Look**、定时发送、嵌入和 API 都建立在其上。

**正确的聚合**：声明 `primary_key` 和正确的 `relationship`。之后 Looker 会使用**对称聚合（symmetric aggregates）**，使一对多连接上的 `SUM` 和 `COUNT` 不会被扇出放大。

**派生表**：SQL 或原生派生表；**PDT**（持久化派生表）会在数据仓库中物化，并按 **datagroup**（`persist_with`）重建，datagroup 同时控制缓存时长。

**治理**：Git 分支、开发与生产模式、内容校验器、用于行级安全的 `access_filter` 和用户属性、用于复用的 refinement 和 `extends`、用于动态 SQL 的 Liquid 模板。

## 示例讲解

一个最小的模型：

```lookml
view: orders {
  sql_table_name: analytics.orders ;;

  dimension: order_id {
    primary_key: yes
    type: number
    sql: ${TABLE}.order_id ;;
  }
  dimension_group: created {
    type: time
    timeframes: [date, week, month]
    sql: ${TABLE}.created_at ;;
  }
  dimension: status { type: string  sql: ${TABLE}.status ;; }

  measure: order_count { type: count }
  measure: total_revenue {
    type: sum
    sql: ${TABLE}.amount ;;
    value_format_name: usd
  }
}

explore: orders {
  join: users {
    type: left_outer
    relationship: many_to_one
    sql_on: ${orders.user_id} = ${users.id} ;;
  }
}
```

如果一笔订单（金额 \$100）在关联的 `order_items` view 中有 2 行，连接后朴素的 `SUM(amount)` 会返回 \$200。把 `order_id` 设为主键后，Looker 的对称聚合返回 \$100。用户在 explore 中选择 *Created Month*、*Status* 和 *Total Revenue*；Looker 生成 SQL，只有选了 `users` 的字段才会连接它，并按 datagroup 缓存结果。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么在 view 的 id 维度上声明 primary_key: yes 很重要？",
  "options": [
    "它会创建数据库索引，使查询更快",
    "Looker 用它计算对称聚合，使求和与计数不会被连接扇出放大",
    "它会对用户隐藏该字段",
    "每个维度都必须声明"
  ],
  "explanation": "有了主键和正确的 relationship，Looker 在跨连接聚合时会对行去重（对称聚合），避免重复计数。"
}
```

```quiz
{
  "id": "q2",
  "question": "在某个 explore 中，orders 连接到 order_items。order_items 的 join 上应声明什么 relationship？",
  "options": [
    "many_to_one",
    "one_to_many",
    "one_to_one",
    "many_to_many"
  ],
  "explanation": "从基础 view（orders）到 order_items，一个订单有多个商品行：one_to_many。relationship 是从 explore 的基础 view 朝向被连接的 view 来读的。"
}
```

## 动手练习

```reveal
{
  "prompt": "解释 Looker 与典型的以仪表板为先的 BI 工具有何不同，并说明用户在 explore 中点击“Run”时发生了什么。",
  "answer": "**Looker 以模型为先。**分析师在 **LookML** 中一次性定义业务逻辑（view = 表/字段、dimension、measure，explore = 连接图，model = 连接），并存放在 **Git** 中，支持代码评审和开发/生产模式。用户在这个受治理的模型上构建查询，所以“收入”在任何地方含义一致。\n\n**点击 Run 时发生了什么**\n1. 用户在 explore 中选择字段（维度、度量、筛选）。\n2. Looker 的生成器把选择与 LookML 转换为**针对具体方言的 SQL**（BigQuery、Snowflake 等），只加入必要的连接、`GROUP BY`，并在可能出现扇出时加入对称聚合逻辑。\n3. SQL **在数据库中**运行（没有提取）；结果按模型的 `persist_with` datagroup 缓存，所以重复查询在数据变化前直接走缓存。\n4. 结果渲染为表格/可视化，可保存为 Look 或仪表板、定时发送，或通过 API/嵌入访问。\n\n**可以提到的相关功能**：用于昂贵转换的派生表和 PDT、用于行级安全的 `access_filter` + 用户属性、用于复用的 refinement/`extends`、用于动态 SQL 的 Liquid。\n\n**取舍**：需要 LookML 技能和性能良好的数据仓库；比桌面工具的自由度低。"
}
```

> [!TIP] 面试技巧
> - 开头就说“模型优先：逻辑存在 Git 里的 LookML 中，SQL 在数据仓库中运行”。
> - 被问到重复计数时，说出 `primary_key` + `relationship` + 对称聚合。
> - 陷阱：把大量繁重逻辑放进许多临时派生表却没有 PDT/datagroup 持久化；缓慢且未缓存的查询每次点击都会打到数据仓库。
