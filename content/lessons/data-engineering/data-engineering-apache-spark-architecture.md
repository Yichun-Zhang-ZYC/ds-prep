---
id: data-engineering-apache-spark-architecture
title: Apache Spark architecture (driver, executors, DAG)
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, spark, distributed-processing]
---

## Why it matters
Spark is the default engine for large-scale batch processing (and Databricks is built on it). Interviewers ask how a Spark job executes and how to reason about stages, tasks, partitions and memory when it's slow or failing.

## Concept
Components:
- **Driver**: runs your program (`SparkSession`), builds the logical plan, optimizes it (Catalyst), splits it into stages and tasks, and schedules them. Results from `collect()` come back here, so don't collect big data.
- **Cluster manager**: YARN, Kubernetes, standalone, or Databricks; allocates resources.
- **Executors**: JVM processes on worker nodes that run tasks, cache data and write shuffle files. Each has a number of **cores** (parallel task slots) and memory.

Execution hierarchy:
- **Application** → **jobs** (one per action, e.g. `count()`, `write`) → **stages** → **tasks**.
- A **stage** is a sequence of **narrow transformations** (map, filter, select, where each output partition depends on one input partition) that can be pipelined.
- **Wide transformations** (groupBy, join, distinct, repartition) need a **shuffle**, which creates a **stage boundary**.
- A **task** processes one **partition** within a stage. #tasks in a stage = #partitions.

Performance basics:
- Parallelism: total cores = executors × cores per executor; aim for 2–4 partitions per core, partitions of ~100–200 MB.
- `spark.sql.shuffle.partitions` (default 200) controls post-shuffle partitions; **Adaptive Query Execution (AQE)** can coalesce them and handle skew automatically.
- Use the **Spark UI** to find long stages, skewed tasks (one task much slower), spills to disk, and GC time.
- Common failures: driver OOM from `collect()`/large broadcasts, executor OOM from skew or huge partitions.

## Worked example
`df.filter(...).select(...).groupBy("country").agg(sum("amount")).write.parquet(...)`:
- One action (`write`) → one job.
- Stage 1: read + filter + select + partial aggregation (narrow, pipelined), 400 tasks for 400 input partitions.
- Shuffle by `country`.
- Stage 2: final aggregation + write, 200 tasks (shuffle partitions), or fewer if AQE coalesces them.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What creates a new stage in a Spark job?",
  "options": ["Every filter", "A wide transformation that requires a shuffle (e.g. groupBy, join)", "Each column in select", "Calling cache()"],
  "answer": 1,
  "explanation": "Narrow transformations are pipelined within a stage; shuffles mark stage boundaries."
}
```

```quiz
{
  "id": "q2",
  "question": "The driver crashes with OutOfMemoryError after `df.collect()` on a 50 GB DataFrame. What's the fix?",
  "options": ["Add more executors", "Don't collect large data to the driver; write it out or aggregate first", "Increase shuffle partitions", "Use RDDs"],
  "answer": 1,
  "explanation": "collect() brings every row to the driver's memory."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Model Spark's stage planning. A plan is a list of operation names. Narrow ops: 'read', 'filter', 'select', 'map', 'withColumn'. Wide ops: 'groupBy', 'join', 'distinct', 'repartition', 'orderBy'. Write `count_stages(plan)` = 1 + number of wide ops. Write `count_tasks(plan, input_partitions, shuffle_partitions)` = input_partitions for the first stage plus shuffle_partitions for each later stage. Write `partitions_for(total_gb, target_mb=128)` = ceil(total_gb × 1024 / target_mb).",
  "starterCode": "import math\n\nWIDE = {'groupBy', 'join', 'distinct', 'repartition', 'orderBy'}\n\ndef count_stages(plan):\n    pass\n\ndef count_tasks(plan, input_partitions, shuffle_partitions):\n    pass\n\ndef partitions_for(total_gb, target_mb=128):\n    pass\n",
  "tests": "plan = ['read', 'filter', 'select', 'groupBy', 'withColumn']\nassert count_stages(plan) == 2\nassert count_tasks(plan, 400, 200) == 600\nassert count_stages(['read', 'join', 'groupBy', 'orderBy']) == 4\nassert count_tasks(['read', 'filter'], 50, 200) == 50\nassert partitions_for(50) == 400\nassert partitions_for(1, 100) == 11",
  "solution": "import math\n\nWIDE = {'groupBy', 'join', 'distinct', 'repartition', 'orderBy'}\n\ndef count_stages(plan):\n    return 1 + sum(1 for op in plan if op in WIDE)\n\ndef count_tasks(plan, input_partitions, shuffle_partitions):\n    return input_partitions + (count_stages(plan) - 1) * shuffle_partitions\n\ndef partitions_for(total_gb, target_mb=128):\n    return math.ceil(total_gb * 1024 / target_mb)",
  "hints": ["Each wide op ends a stage and starts a new one.", "Tasks per stage = partitions in that stage."]
}
```

> [!TIP] Interview tips
> - Describe driver vs executors vs cluster manager, and the job → stage → task hierarchy.
> - Narrow vs wide transformations and shuffles as stage boundaries is the key insight.
> - Show debugging instincts: Spark UI, skewed tasks, spills, partition sizing, AQE, never collect big data.
