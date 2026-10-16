---
id: data-engineering-data-catalog
title: 数据目录
---

## 为什么重要
“哪张表里有官方的收入数字？”在一家有 2 万张表的公司里，没有数据目录就没人知道。面试官会问你如何让数据可被发现、值得信任并且受到治理。

## 概念
**数据目录**是数据资产及其元数据的可搜索清单。

元数据类型：
- **技术元数据**：模式、列类型、分区、存储位置、行数、新鲜度（通常从数据仓库、数据湖、BI 工具中自动采集）。
- **业务元数据**：描述、术语表（“活跃用户”的定义）、经过认证的/“黄金”表、示例查询。
- **运维元数据**：负责人、SLA、血缘、质量检查结果、使用量/热度。
- **治理元数据**：分类/标签（PII、机密）、访问策略、保留期。

两个相关的层次：
- 供引擎查找表的**技术元存储**：Hive Metastore、AWS Glue Data Catalog、Unity Catalog、Iceberg REST catalog。
- 面向人的**发现/治理目录**：DataHub、OpenMetadata、Amundsen、Atlan、Alation、Collibra。

让它真正有用：自动采集（不要依赖手写文档）、为每张表指定**负责人**、标记**经过认证**的数据集、展示质量和新鲜度、与人们工作的地方集成（dbt docs、BI 工具、Slack），并给 PII 打标签以驱动访问控制。

## 示例讲解
一位分析师搜索 “revenue”，找到了 37 张表。目录把 `analytics.fct_revenue` 排在第一位：有认证标志，负责人 = 财务数据团队，描述中有指标定义，2 小时前刚刷新，所有质量检查都通过，上个月有 120 人使用。看起来相似的已弃用表都被标记了出来。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "下面哪个是业务元数据的例子？",
  "options": ["列的数据类型", "S3 上的分区位置", "附在某一列上的“活跃客户”术语定义", "查询执行时间"],
  "explanation": "业务元数据解释含义；技术元数据描述结构。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "在由资产字典（`name`、`description`、`certified` 布尔值、`deprecated` 布尔值、`monthly_users` 整数）组成的列表上编写 `search(catalog, term)`。当 `term`（不区分大小写）出现在 name 或 description 中时视为匹配；排除已弃用的资产；排序时认证资产在前，然后按 monthly_users 降序，再按名称。返回排好序的名称列表。",
  "hints": ["先筛选，再按一个元组 key 排序。", "`not certified` 会让 True（已认证）排在 False 之前。"]
}
```

> [!TIP] 面试技巧
> - 描述技术、业务、运维和治理四类元数据。
> - 区分引擎使用的元存储（Glue、Hive、Unity）与发现类数据目录（DataHub、Atlan）。
> - 强调自动化、负责人、认证和 PII 标签，而不是手写文档。
