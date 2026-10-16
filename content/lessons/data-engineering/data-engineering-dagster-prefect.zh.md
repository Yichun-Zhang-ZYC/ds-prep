---
id: data-engineering-dagster-prefect
title: Dagster / Prefect
---

## 为什么重要
较新的编排器解决了 Airflow 的一些痛点，现在很多团队会选择 Dagster 或 Prefect。面试官可能会问它们与 Airflow 有什么不同，以及你会在什么情况下选择哪一个。

## 概念
**Dagster**：**以资产为中心**的编排。
- 你定义**软件定义资产**（表、文件、ML 模型），以及如何从上游资产计算出每个资产；Dagster 由此推导出依赖图。
- 内置**分区**（按天、按地区）和感知分区的**回填**、资产**血缘**、新鲜度策略、数据质量的**资产检查**。
- 本地开发和测试体验好（资源可注入、易于单元测试），带类型的 I/O 管理器。
- 与 dbt 深度集成（每个 dbt 模型都成为一个资产）。

**Prefect**：**Pythonic、动态的工作流**。
- 用 `@flow` 和 `@task` 装饰普通函数；控制流就是普通的 Python（循环、条件、运行时动态的任务数量）。
- 重试、缓存、并发限制，以及混合模式：你的代码运行在你自己的基础设施中，控制面由平台托管。
- 仪式感低；适合 ML 流水线和事件驱动的自动化。

**Airflow**：以任务为中心，拥有庞大的 provider 生态，是行业默认选择；较新的版本（2.x/3.x）加入了 TaskFlow、数据集/资产、可延迟算子。

| 选择 | 适用情况 |
|---|---|
| Airflow | 已有庞大的生态、需要大量集成、团队已经熟悉它 |
| Dagster | 你以数据资产的方式思考，想要血缘、分区、测试和 dbt 集成 |
| Prefect | 你想要最少的样板代码和动态的 Python 工作流 |

无论用哪个工具：幂等的任务、逻辑日期分区、重试、告警和可观测性，都比编排器的选择更重要。

## 示例讲解
```python
from dagster import asset, DailyPartitionsDefinition

daily = DailyPartitionsDefinition(start_date="2024-01-01")

@asset(partitions_def=daily)
def raw_orders(context):
    return extract_orders(context.partition_key)

@asset(partitions_def=daily)
def daily_revenue(raw_orders):
    return raw_orders.groupby("country")["amount"].sum()
```
Dagster 知道 `daily_revenue` 依赖于 `raw_orders`，会在 UI 中显示血缘，并且可以回填任意日期范围的分区。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Dagster 的核心抽象与 Airflow 有什么区别？",
  "options": ["Dagster 没有调度功能", "Dagster 以数据资产及其血缘为中心；Airflow 以 DAG 中的任务为中心", "Dagster 只能运行 SQL", "Airflow 不能运行 Python"],
  "explanation": "以资产为中心 vs 以任务为中心，是概念上的关键区别。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "为基于资产的编排建模。`assets` 把资产名映射到上游资产名的列表。编写 `downstream_of(assets, changed)`，返回当 `changed` 更新后需要重新物化的资产（所有传递性的下游资产，不包括 `changed` 本身），按排序后的列表返回。再编写 `backfill_plan(assets, changed, partitions)`，返回 `(asset, partition)` 对的列表：对每个分区（按顺序），先是 `changed`，然后是排序后的下游资产。",
  "hints": ["把上游映射反转为子节点映射，然后遍历。", "对每个分区，先列出被修改的资产，再列出它的下游资产。"]
}
```

> [!TIP] 面试技巧
> - 对比以任务为中心的 Airflow、以资产为中心的 Dagster，以及 Pythonic/动态的 Prefect。
> - 根据团队需求选择：生态（Airflow）、血缘/分区/测试（Dagster）、低样板的动态流程（Prefect）。
> - 强调幂等性、分区和可观测性比工具本身更重要。
