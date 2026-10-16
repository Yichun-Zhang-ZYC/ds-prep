---
id: data-engineering-data-vault-basics
title: Data Vault 基础
---

## 为什么重要
拥有众多源系统和审计要求的大型企业，常在集成层使用 Data Vault。面试官可能会问它与维度建模有什么不同，以及什么时候值得付出这份复杂度。

## 概念
Data Vault 2.0 把数据拆分为三种表：
- **Hub（中心表）**：每个唯一的**业务键**一行（客户编号、商品 SKU）。列：哈希键、业务键、加载时间戳、记录来源。Hub 很少变化。
- **Link（链接表）**：Hub 之间的关系（客户–订单、订单–商品），以参与关系的各 Hub 键的哈希作为键。天生支持多对多。
- **Satellite（卫星表）**：附属于 Hub 或 Link 的描述性属性及其**历史**（客户姓名、地址、状态），带有加载时间戳。新版本只插入、从不更新（只插入）。

特性：
- **可审计性**：每一行都记录了何时从哪个来源加载；任何数据都不会被覆盖。
- **可扩展性和并行加载**：哈希键让 Hub、Link 和 Satellite 可以独立并行地加载。
- **灵活性**：增加新的数据源或属性只需增加一个 Satellite，而不必重构表。
- **缺点**：表和连接都很多；对分析师来说不便于查询。团队会在其上构建一个**维度（星型）层**用于报表（“原始 Vault → 业务 Vault → 数据集市”）。

何时使用：源系统多且多变、有严格的审计/合规要求、大型企业集成。对于只有几个数据源的初创公司，用暂存层加星型模型（常配合 dbt）更简单。

## 示例讲解
一家银行合并两个都有客户数据的 CRM 系统。Hub_Customer 把每个不同的客户编号存一次；Sat_Customer_CRM_A 和 Sat_Customer_CRM_B 分别保存两个系统的属性及完整历史；Link_Customer_Account 把客户和账户连接起来。报表读取的是一个由 Hub 和最新 Satellite 行构建的 `dim_customer` 视图。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 Data Vault 中，客户不断变化的属性（地址、客群）存放在哪里？",
  "options": ["Hub", "Link", "Satellite", "事实表"],
  "explanation": "Satellite 保存描述性属性及其历史；Hub 只保存业务键。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "用一个 Hub 和一个只插入的 Satellite 构建当前客户视图。返回每个客户的 `customer_number` 和**最新**的 `segment`（按 `load_ts`），按 customer_number 排序。",
  "hints": ["Satellite 保留了每个版本；你需要每个哈希键下 load_ts 最大的那一行。", "相关子查询或 ROW_NUMBER() 都可以。"]
}
```

> [!TIP] 面试技巧
> - 说出 Hub（键）、Link（关系）、Satellite（属性 + 历史）。
> - 讲清它的优势（可审计、并行加载、新数据源易于接入），也承认其代价（查询复杂）。
> - 说明你仍然会在其上为分析师提供星型模型的数据集市。
