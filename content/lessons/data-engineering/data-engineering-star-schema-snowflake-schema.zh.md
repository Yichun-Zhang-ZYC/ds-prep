---
id: data-engineering-star-schema-snowflake-schema
title: 星型模型与雪花模型
---

## 为什么重要
“为我们的销售仪表盘设计数据模型”是 DE/分析工程面试的标准题目。星型模型（Kimball 维度建模）是预期的起点，你还应该知道什么时候雪花模型更合适。

## 概念
**星型模型**：一张中心**事实表**（以固定粒度记录的事件/度量），周围是**维度表**（描述性的上下文），各自通过代理键连接。

```
                dim_date
                   |
dim_customer — fact_sales — dim_product
                   |
               dim_store
```

- 维度表是**反规范化**的：`dim_product` 在一张表中包含商品名称、品牌、类别和部门。
- 查询很简单：把事实表连接到几个维度表，按维度属性筛选，聚合事实度量。
- BI 工具和列式数据仓库都能很好地处理这种形态。

**雪花模型**：维度表被**规范化**拆分为子维度（`dim_product → dim_brand → dim_category`）。
- 冗余更少，共享层级更容易维护。
- 连接更多、查询更复杂，通常也更慢。
- 现代列式数据仓库让存储变得便宜、压缩效果很强，所以通常更推荐星型模型；当某个层级很大、被共享或独立变化时，才使用雪花模型。

设计步骤（Kimball）：1）选择**业务过程**（销售），2）声明**粒度**（每个订单行一行），3）确定**维度**，4）确定**事实**（数量、金额）。

## 示例讲解
“美国各商品类别每月的收入”：

```sql
SELECT d.year_month, p.category, SUM(f.amount) AS revenue
FROM fact_sales f
JOIN dim_date d     ON d.date_key = f.date_key
JOIN dim_product p  ON p.product_key = f.product_key
JOIN dim_store s    ON s.store_key = f.store_key
WHERE s.country = 'US'
GROUP BY d.year_month, p.category;
```
在雪花模型中，`category` 需要额外经过 `dim_subcategory → dim_category` 的连接。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "星型模型和雪花模型的主要区别是什么？",
  "options": ["星型模型没有事实表", "雪花模型把维度表规范化为子维度；星型模型保持维度表反规范化", "雪花模型只能在 Snowflake 中使用", "星型模型不能超过 4 个维度"],
  "explanation": "事实表是一样的；区别在于维度表是扁平化的还是规范化的。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "使用下面的星型模型，返回 **2024-02** 订单中各商品 `category` 的收入（`revenue`），按收入降序排列。",
  "hints": ["按键把事实表连接到两个维度表。", "按 dim_date.year_month 筛选，按 dim_product.category 分组。"]
}
```

> [!TIP] 面试技巧
> - 总是先说明事实表的粒度（“每个订单行一行”）。
> - 在列式数据仓库中默认使用星型模型；如要雪花化，给出具体理由。
> - 提到代理键和日期维度；这能体现你对维度建模的熟练程度。
