---
id: data-engineering-design-a-data-warehouse-for-an-e-commerce
title: 为电商公司设计数据仓库
---

## 为什么重要
“为一家网店设计分析用的数据仓库”考察数据建模（事实表、维度表、SCD）、数据接入、分层和服务层。这是 DE 和分析工程面试的必考题。

## 概念
做法：
1. **业务问题优先**：按天/类别/渠道统计的收入、转化漏斗、客户 LTV 与留存、库存、营销 ROI、退货。
2. **数据源**：应用数据库（orders、order_items、customers、products、inventory）通过 CDC 接入；支付（Stripe）；营销/广告 API；点击流；CRM/客服工单。
3. **接入**：托管连接器 / Debezium CDC 把数据接入数据仓库或湖仓的原始层；事件来自点击流流水线。
4. **分层**：原始层 → 暂存层（清洗、带类型、与数据源一一对应）→ 中间层（业务逻辑）→ 数据集市层（维度模型）→ 语义层/指标。
5. **维度模型**（Kimball）：
   - `fct_order_items`（粒度：每个订单行一行）：order_id、line、date_key、customer_key、product_key、promotion_key、quantity、gross_amount、discount、tax、net_amount。
   - `fct_orders`（粒度：每个订单一行），用于运费等订单级事实。
   - `fct_payments`、`fct_returns`、`fct_inventory_daily`（周期快照）、来自点击流的 `fct_sessions`/漏斗事实表。
   - 维度表：`dim_date`、`dim_customer`（客群/区域用 SCD2）、`dim_product`（类别/价格档位用 SCD2）、`dim_store/channel`、`dim_promotion`、`dim_geography`。
6. 在一处统一**定义指标**（dbt 语义层/指标）：净收入、AOV、转化率（存储分子和分母）、复购率。
7. **运维**：dbt + 编排、测试（unique/not_null/relationships，与支付数据对账）、增量模型、按日期分区/聚簇、PII 的访问控制、文档和数据目录。

## 示例讲解
问题：“按商品在销售当时所属的类别，统计每月的净收入。”`fct_order_items` 存储的是下单时有效的 `product_key`（来自 SCD2 `dim_product` 的代理键），所以一个在 6 月从 “Gadgets” 移到 “Electronics” 的商品，5 月的销售仍然归在 Gadgets 下。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "运费按订单收取，但大多数分析是在订单行级别进行的。应该如何建模？",
  "options": ["在每个订单行上重复完整的运费", "放在订单粒度的事实表（fct_orders）中，或者显式地分摊到各订单行", "丢弃运费", "存放在 dim_product 中"],
  "explanation": "把订单级金额重复放在订单行级别的行上，求和时就会被重复计算。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "使用这个迷你星型模型，计算每月每个类别的净收入（`year_month`、`category`、`net_revenue`），其中净收入 = SUM(net_amount) 减去 `fct_returns` 中同一订单行的退款。按 year_month、再按 category 排序。",
  "hints": ["按 (order_id, line) LEFT JOIN 退货表，这样没有退款的订单行也会保留。", "商品 100 出现在两个类别下，因为 dim_product 是 SCD2。"]
}
```

```reveal
{
  "prompt": "面试题：“为一家中等规模的电商公司设计数据仓库。管理层想要每日收入、营销 ROI 和客户留存的仪表盘。”概述你的回答。",
  "answer": "**1. 问题与 SLA**：按渠道和类别统计的每日收入/AOV/订单数（早上 8 点前就绪）、营销花费与归因收入（ROAS）、同期群留存和 LTV；数据每日更新，部分运营指标每小时更新。\n\n**2. 数据源与接入**：Postgres（订单、订单项、客户、商品、库存）通过 CDC（Debezium/Fivetran）→ 原始层；Stripe 支付、广告平台（Google/Meta）通过连接器接入；点击流来自事件流水线。落地到 Snowflake/BigQuery（或 Delta/Iceberg 湖仓）。\n\n**3. 分层（dbt）**：`stg_`（重命名、类型转换、把 CDC 去重为最新状态）、`int_`（分摊了折扣的订单行、归因逻辑）、数据集市。\n\n**4. 模型**：事实表 `fct_order_items`（订单行粒度）、`fct_orders`（订单粒度：运费、合计）、`fct_payments`、`fct_returns`、`fct_ad_spend_daily`（广告活动 × 天）、`fct_sessions`；维度表 `dim_date`、`dim_customer`（SCD2：客群、区域）、`dim_product`（SCD2：类别、价格档位）、`dim_channel`、`dim_campaign`、`dim_promotion`。一致性维度让收入和花费能够连接起来计算 ROAS。\n\n**5. 指标**：在语义层中集中定义（净收入 = 总收入 − 折扣 − 退款；AOV；转化率 = 订单数 / 会话数；按首单同期群计算留存），让各仪表盘口径一致。\n\n**6. 质量**：dbt 测试（unique/not_null/relationships），每日收入与 Stripe 对账误差在 0.5% 以内，新鲜度检查，对数据量异常告警。\n\n**7. 性能与成本**：增量模型，事实表按日期分区、按客户/商品聚簇，为仪表盘准备聚合数据集市，数据仓库自动挂起。\n\n**8. 治理**：PII（邮箱、地址）放在带脱敏的受限表中；基于角色的访问控制；带负责人和认证数据集市的数据目录；GDPR 删除流程。\n\n**可以提到的权衡**：以星型模型为核心，为了 BI 的便利提供大宽表式的数据集市；只在历史有意义的地方使用 SCD2；迟到的事实数据，以及维度表中的未知成员行。"
}
```

> [!TIP] 面试技巧
> - 从业务问题和 SLA 开始，然后是数据源、分层，以及标明粒度的维度模型。
> - 在历史有意义的地方展示 SCD2、跨事实表的一致性维度，以及集中的指标定义。
> - 最后讲测试/对账、性能（增量、分区）和治理。
