---
id: data-engineering-airflow
title: Airflow（DAG、算子、调度）
---

## 为什么重要
Apache Airflow 是使用最广泛的工作流编排器。面试官会问 DAG、算子、调度语义（逻辑日期！）、重试、回填以及常见的反模式。

## 概念
- **DAG**：用 Python 定义的、带调度计划的有向无环任务图。
- **算子（Operator）**定义任务做什么：`BashOperator`、`PythonOperator` / `@task`（TaskFlow API）、`SQLExecuteQueryOperator`、各 provider 的算子（BigQuery、Snowflake、Spark、dbt、Databricks、KubernetesPodOperator）。
- **传感器（Sensor）**等待某个条件（文件落地、上游 DAG 完成）；优先使用可延迟（deferrable）的传感器，以免占用 worker 槽位。
- **依赖**：`extract >> transform >> load`。
- **调度**：每次运行覆盖一个**数据区间**。区间 [2024-06-01, 2024-06-02) 的运行在区间**结束之后**才开始（6 月 2 日午夜刚过），它的**逻辑日期**（`{{ ds }}`，以前叫 `execution_date`）是 2024-06-01。在查询中使用 `{{ ds }}`/`data_interval_start`，让运行幂等、可回填。
- `catchup=True` 会为 `start_date` 以来所有错过的区间创建运行；`airflow dags backfill` 重跑某个范围。
- **重试**（`retries`、`retry_delay`）、`execution_timeout`、SLA/告警（`on_failure_callback`）、`max_active_runs`、用于限制并发的资源池（pool）。
- **XCom** 在任务之间传递少量元数据（不是数据：把数据放进存储，传递路径）。
- 架构：调度器、Web 服务器、元数据库、执行器（Local、Celery、Kubernetes）和 worker。

反模式：在 Airflow worker 内做重型计算（应推给 Spark/数据仓库）、DAG 文件中有每次解析都会执行的顶层代码（拖慢调度器）、用 `datetime.now()` 而不是逻辑日期、非幂等的任务、巨大的 XCom、动态变化的 `start_date`。

## 示例讲解
```python
from airflow.decorators import dag, task
import pendulum

@dag(schedule="@daily", start_date=pendulum.datetime(2024, 1, 1, tz="UTC"), catchup=False,
     default_args={"retries": 2})
def daily_revenue():
    @task
    def load(ds=None):
        run_sql(f"INSERT OVERWRITE fct_revenue PARTITION (ds='{ds}') SELECT ... WHERE dt = '{ds}'")
    load()

daily_revenue()
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个 @daily DAG 的某次运行逻辑日期为 2024-06-01。它实际上什么时候开始，应该处理什么数据？",
  "options": ["6 月 1 日 00:00，处理 6 月 1 日到目前为止产生的数据", "区间结束后不久（大约 6 月 2 日 00:00），处理完整的 6 月 1 日区间", "6 月 1 日中午", "调度器重启的任何时候"],
  "explanation": "运行在其数据区间结束时触发；逻辑日期是区间的起点。"
}
```

```quiz
{
  "id": "q2",
  "question": "下面哪个是 Airflow 的反模式？",
  "options": ["在 SQL 中使用 {{ ds }}", "通过 XCom 在任务之间传递一个 2 GB 的 DataFrame", "给不稳定的任务设置重试", "通过算子运行 Spark 任务"],
  "explanation": "XCom 用于少量元数据；应把数据写入存储并传递路径。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `topo_order(deps)`，其中 deps 把任务映射到其上游任务列表；返回一个合法的执行顺序（每一步都选择按字母顺序最小的就绪任务），如果有环则抛出 `ValueError`。再编写 `daily_intervals(start, end)`，对每个结束时间 ≤ `end` 的每日区间返回 (logical_date, run_after) 对，均为 ISO 日期字符串（两个参数都是 'YYYY-MM-DD'）；使用 `datetime.date`。",
  "hints": ["Kahn 算法：反复运行所有上游都已完成的任务。", "区间 [d, d+1) 的运行只能在 d+1 到来之后开始。"]
}
```

> [!TIP] 面试技巧
> - 解释 DAG、算子/TaskFlow、传感器和依赖关系，然后讲清数据区间 / 逻辑日期的语义。
> - 展示可靠性实践：使用 {{ ds }} 的幂等任务、重试、超时、告警、catchup/回填。
> - 提到反模式：在 worker 中做重型计算、大型 XCom、DAG 顶层代码、now()。
