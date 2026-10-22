---
id: analytics-bi-tableau
title: Tableau（计算字段、LOD 表达式）
---

## 为什么重要

Tableau 是另一个主流 BI 工具。面试官会问何时使用 LOD 表达式、筛选器如何与计算交互，以及提取与实时连接有何区别。

## 概念

**字段**：*维度*（分类，用于切分数据）和*度量*（数值，被聚合）；*离散*（蓝色，作为表头）与*连续*（绿色，作为坐标轴）。视图的**详细级别**就是视图上的维度集合。

**计算字段**有三种：
- **行级**：逐条记录计算（`IF [Sales] > 100 THEN 'Big' END`）。
- **聚合**：`SUM([Profit]) / SUM([Sales])`；总是先聚合再相除，永远不要对比率求平均。
- **表计算**：作用于视图中已聚合的结果（累计、排名、占总计的百分比、`WINDOW_AVG`）；依赖寻址/分区。

**LOD 表达式**在与视图不同的级别上计算：
- `{ FIXED [dims] : agg }`：恰好这些维度，忽略视图。
- `{ INCLUDE [dim] : agg }`：视图维度加上 `dim`。
- `{ EXCLUDE [dim] : agg }`：视图维度去掉 `dim`。
典型用途：每位客户的首次购买日期（队列）、客户级总额再按地区求平均、固定粒度下的占比。

**运算顺序**（简化）：提取筛选器 → 数据源筛选器 → 上下文筛选器 → **FIXED LOD** → 维度筛选器 → INCLUDE/EXCLUDE LOD → 度量筛选器 → 表计算。所以普通的维度筛选器*不会*影响 FIXED；如果需要影响，请把它添加到上下文。

**数据**：*实时*连接（始终最新，取决于数据库速度）与**提取**（.hyper 快照，快，定时刷新）。优先使用*关系*（逻辑表，查询时连接）而不是物理连接，以避免扇出；不同数据源之间用*混合（blending）*。发布到 Server/Cloud 并设置权限。

## 示例讲解

```text
// Row-level calculated field
[Profit Ratio] = SUM([Profit]) / SUM([Sales])

// FIXED: ignores the view's dimensions
{ FIXED [Customer ID] : MIN([Order Date]) }

// INCLUDE adds a dimension to the view's level; EXCLUDE removes one
{ INCLUDE [Customer ID] : SUM([Sales]) }
{ EXCLUDE [Sub-Category] : SUM([Sales]) }
```

数据：East 有客户 A（订单 100 和 300）和客户 B（100）；West 有客户 C（50 和 150）。East 的 `[Sales]` 普通平均值为 $500/3 \approx 166.7$（平均订单额）。使用 `{ FIXED [Customer] : SUM([Sales]) }` 后，每位客户都有一个总额（A 400、B 100、C 200）；按地区平均，East 为 $(400+100)/2 = 250$，West 为 200：即*每位客户的平均收入*。同一个字段，不同的问题，由详细级别决定。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "视图上应用了一个维度筛选器（不在上下文中）。哪种计算会忽略它？",
  "options": [
    "表计算",
    "INCLUDE LOD",
    "FIXED LOD",
    "度量筛选器"
  ],
  "explanation": "在 Tableau 的运算顺序中，FIXED LOD 先于维度筛选器计算（除非筛选器被添加到上下文），所以筛选器不会改变它们。"
}
```

```quiz
{
  "id": "q2",
  "question": "East 地区在 3 笔订单中有客户 A（总销售额 400）和 B（总销售额 100）。AVG({FIXED [Customer]: SUM([Sales])}) 在 East 的结果是多少？",
  "options": [
    "166.7",
    "250",
    "500",
    "300"
  ],
  "explanation": "FIXED 步骤先按客户求和（400 和 100），然后视图对这两个值求平均：250。平均订单额则是 500/3 = 166.7。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 pandas 复现 Tableau 的 LOD 表达式。`fixed_region_total(df)` 返回与 `df` 对齐的 Series，等于 `{FIXED [Region]: SUM([Sales])}`。`first_order_date(df)` 在每一行返回 `{FIXED [Customer]: MIN([Order Date])}`（ISO 日期字符串可以直接比较大小）。`avg_customer_sales_by_region(df)` 返回以地区为索引的 Series，值为各客户总销售额的平均值（嵌套聚合，而不是平均订单额）。",
  "hints": [
    "保留行级别的 FIXED LOD 就是 groupby(...).transform(...)。",
    "嵌套聚合先聚合到每个 (region, customer) 一行，再按 region 再聚合一次。"
  ]
}
```

```reveal
{
  "prompt": "在 Tableau 中，你想得到每位客户的队列月份（首单所在月份）以及每个队列的收入占比。你会怎么构建？为什么用 FIXED 而不是表计算？",
  "answer": "**队列月份**：`[Cohort Month] = DATETRUNC('month', { FIXED [Customer ID] : MIN([Order Date]) })`。它是该客户每笔订单上的行级属性，所以可以像普通维度一样放到行/列上。\n\n**收入占比**：把 `[Cohort Month]` 放到行，把 `SUM([Sales])` 放到文本；添加表计算 *Percent of Total*，或使用 `SUM([Sales]) / SUM({ FIXED : SUM([Sales]) })`。\n\n**为什么用 FIXED**：它在客户级别计算，与视图中有什么无关，并且先于维度筛选执行，因此筛选到 2024 年订单不会改变哪个月算作客户的首单月。表计算只能看到视图中已有（且已筛选）的行，所以筛选后的视图会得到错误的首单。如果需要筛选影响 FIXED 的结果，请把筛选器添加到上下文。\n\n**性能提示**：LOD 会生成子查询；数据量很大时，优先在数仓或提取中预先计算队列。"
}
```

> [!TIP] 面试技巧
> - 要说“FIXED 在维度筛选器之前计算；把筛选器添加到上下文可改变这一点”。
> - 区分 LOD（改变数据的粒度）与表计算（聚合之后，依赖视图布局）。
> - 陷阱：对行级比率求平均；应改为计算 `SUM(a)/SUM(b)`。
