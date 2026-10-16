---
id: data-engineering-data-validation
title: 数据校验（Great Expectations）
---

## 为什么重要
悄无声息地流入仪表盘和模型的坏数据，比一个失败的任务更糟糕。面试官会问你检查什么、在流水线的哪个位置检查，以及检查失败时会发生什么。

## 概念
数据质量的维度：**完整性**（空值、缺失的分区）、**唯一性**（重复的键）、**有效性**（类型、范围、允许的取值、格式）、**一致性**（引用完整性、与数据源的合计能对上）、**及时性/新鲜度**（数据按时到达）、**准确性**（与现实一致，通常与可信的数据源对比）。

常见检查：
- 模式：预期的列和类型。
- `not_null`、`unique`、`accepted_values`、取值范围（`0 <= age <= 120`）、正则格式。
- 与历史相比的行数和数据量异常；分布漂移（均值、空值率）。
- 引用完整性（每个 `customer_id` 都存在于 `dim_customer` 中）。
- 对账：数据仓库中的收入总和 = 源系统的总额。
- 新鲜度：max(updated_at) 在 SLA 之内。

工具：**Great Expectations**（声明式的“期望”套件、数据文档）、**dbt 测试**、Soda、Deequ（Spark）、Pandera（pandas），以及能自动学习基线的数据可观测性平台（Monte Carlo 等）。

在哪里检查、如何处理：
- 在**接入**（原始层）、**转换**之后以及**发布**之前进行校验。
- 严重级别：**error** → 停止流水线 / 不发布（写入-审核-发布模式：先写入暂存区，运行检查，再切换）；**warn** → 告警但继续。
- **隔离**坏数据行，而不是悄悄删掉；跟踪其比例。
- 把告警发给负责人；调整阈值以避免告警疲劳。

## 示例讲解
针对 `orders` 的 Great Expectations 风格的检查套件：
- `expect_column_values_to_not_be_null("order_id")`
- `expect_column_values_to_be_unique("order_id")`
- `expect_column_values_to_be_between("amount", 0, 100000)`
- `expect_column_values_to_be_in_set("status", ["placed", "paid", "shipped", "cancelled"])`
- `expect_table_row_count_to_be_between(0.8 × avg_7d, 1.2 × avg_7d)`

上游的一次部署开始以“分”为单位发送金额：范围检查失败，流水线在收入仪表盘更新之前就停了下来，负责人收到了告警。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "什么是写入-审核-发布（write-audit-publish）模式？",
  "options": ["直接写入生产环境，每月审核一次", "把输出写入暂存位置，运行校验检查，只有通过后才发布（切换）到生产环境", "先发布，再写日志", "只审核源系统"],
  "explanation": "使用方永远不会看到未通过校验的数据。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写一个迷你的期望检查运行器。`run_checks(rows, checks)` 接收行字典和检查字典列表，每个检查包含 `type`（取值为 {'not_null', 'unique', 'between', 'in_set'}）、`column`、`severity`（'error' 或 'warn'）以及参数（between 用 `min`/`max`，in_set 用 `values`）。返回结果字典的列表 `{'type', 'column', 'severity', 'failed'}`，其中 failed 是违规的行数（对 unique 来说：值之前已经出现过的行）。再编写 `should_publish(results)`：只要有任何 error 级别的检查失败就返回 False。",
  "hints": ["分别处理每种检查类型；在 unique 和 between 中忽略 None。", "只有 error 级别的失败才会阻止发布。"]
}
```

> [!TIP] 面试技巧
> - 列出数据质量的维度和具体检查（空值、唯一性、范围、引用完整性、数据量、新鲜度、对账）。
> - 说明检查在哪里运行（接入、转换、发布前），以及失败时会怎样（阻断 vs 告警、隔离）。
> - 提到相关工具（Great Expectations、dbt 测试、Soda、Deequ）和写入-审核-发布模式。
