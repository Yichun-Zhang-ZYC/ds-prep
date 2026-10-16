---
id: data-engineering-airflow
title: Airflow (DAG, operators, scheduling)
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, orchestration, airflow]
---

## Why it matters
Apache Airflow is the most widely used workflow orchestrator. Interviewers ask about DAGs, operators, scheduling semantics (logical date!), retries, backfills and common anti-patterns.

## Concept
- **DAG**: a Python-defined directed acyclic graph of tasks with a schedule.
- **Operators** define what a task does: `BashOperator`, `PythonOperator` / `@task` (TaskFlow API), `SQLExecuteQueryOperator`, provider operators (BigQuery, Snowflake, Spark, dbt, Databricks, KubernetesPodOperator).
- **Sensors** wait for a condition (file lands, upstream DAG finishes); prefer deferrable sensors so they don't hog worker slots.
- **Dependencies**: `extract >> transform >> load`.
- **Scheduling**: each run covers a **data interval**. The run for interval [2024-06-01, 2024-06-02) starts **after** the interval ends (just after midnight on June 2), and its **logical date** (`{{ ds }}`, formerly `execution_date`) is 2024-06-01. Use `{{ ds }}`/`data_interval_start` in queries for idempotent, backfillable runs.
- `catchup=True` creates runs for all missed intervals since `start_date`; `airflow dags backfill` reruns a range.
- **Retries** (`retries`, `retry_delay`), `execution_timeout`, SLAs/alerts (`on_failure_callback`), `max_active_runs`, pools for concurrency limits.
- **XCom** passes small metadata between tasks (not data: put data in storage and pass paths).
- Architecture: scheduler, web server, metadata DB, executor (Local, Celery, Kubernetes) and workers.

Anti-patterns: heavy computation inside the Airflow worker (push it to Spark/warehouse), top-level code in DAG files that runs on every parse (slow scheduler), using `datetime.now()` instead of the logical date, non-idempotent tasks, huge XComs, dynamic `start_date`.

## Worked example
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

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A @daily DAG run has logical date 2024-06-01. When does it actually start, and what data should it process?",
  "options": ["At 00:00 on June 1, processing June 1 data generated so far", "Just after the interval ends (around 00:00 on June 2), processing the full June 1 interval", "At noon on June 1", "Whenever the scheduler restarts"],
  "answer": 1,
  "explanation": "Runs fire at the end of their data interval; the logical date is the interval start."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is an Airflow anti-pattern?",
  "options": ["Using {{ ds }} in SQL", "Passing a 2 GB DataFrame between tasks via XCom", "Setting retries on flaky tasks", "Running Spark jobs via an operator"],
  "answer": 1,
  "explanation": "XCom is for small metadata; write data to storage and pass a path."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `topo_order(deps)` where deps maps task → list of upstream tasks; return a valid execution order (at each step pick the alphabetically smallest ready task), or raise `ValueError` if there's a cycle. Then write `daily_intervals(start, end)` returning (logical_date, run_after) pairs as ISO date strings for each daily interval whose end ≤ `end` (both args are 'YYYY-MM-DD'); use `datetime.date`.",
  "starterCode": "from datetime import date, timedelta\n\ndef topo_order(deps):\n    pass\n\ndef daily_intervals(start, end):\n    pass\n",
  "tests": "deps = {'extract': [], 'validate': ['extract'], 'transform': ['validate'], 'load': ['transform'], 'notify': ['load'], 'docs': []}\nassert topo_order(deps) == ['docs', 'extract', 'validate', 'transform', 'load', 'notify']\ntry:\n    topo_order({'a': ['b'], 'b': ['a']})\n    assert False\nexcept ValueError:\n    pass\nassert daily_intervals('2024-06-01', '2024-06-03') == [('2024-06-01', '2024-06-02'), ('2024-06-02', '2024-06-03')]\nassert daily_intervals('2024-06-01', '2024-06-01') == []",
  "solution": "from datetime import date, timedelta\n\ndef topo_order(deps):\n    remaining = {t: set(u) for t, u in deps.items()}\n    order = []\n    while remaining:\n        ready = sorted(t for t, u in remaining.items() if not u)\n        if not ready:\n            raise ValueError('cycle detected')\n        t = ready[0]\n        order.append(t)\n        del remaining[t]\n        for u in remaining.values():\n            u.discard(t)\n    return order\n\ndef daily_intervals(start, end):\n    d = date.fromisoformat(start)\n    stop = date.fromisoformat(end)\n    out = []\n    while d + timedelta(days=1) <= stop:\n        out.append((d.isoformat(), (d + timedelta(days=1)).isoformat()))\n        d += timedelta(days=1)\n    return out",
  "hints": ["Kahn's algorithm: repeatedly run a task whose upstreams are all done.", "A run for interval [d, d+1) can only start once d+1 has arrived."]
}
```

> [!TIP] Interview tips
> - Explain DAGs, operators/TaskFlow, sensors and dependencies, then nail the data-interval / logical-date semantics.
> - Show reliability practices: idempotent tasks using {{ ds }}, retries, timeouts, alerts, catchup/backfill.
> - Mention anti-patterns: heavy compute in workers, big XComs, top-level DAG code, now().
