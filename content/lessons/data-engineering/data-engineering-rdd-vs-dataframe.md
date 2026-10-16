---
id: data-engineering-rdd-vs-dataframe
title: RDD vs DataFrame
estimatedMinutes: 8
difficulty: easy
tags: [data-engineering, spark, apis]
---

## Why it matters
"Why should you use DataFrames instead of RDDs?" is a quick Spark screening question. The answer reveals whether you understand Spark's optimizer.

## Concept
- **RDD (Resilient Distributed Dataset)**: Spark's low-level API, a distributed collection of arbitrary objects with functional operations (`map`, `filter`, `reduceByKey`). Fault tolerance comes from **lineage** (recompute lost partitions from parents).
  - Opaque to Spark: it can't see inside your lambdas, so it can't optimize.
  - In PySpark, every record is serialized between the JVM and Python workers, which is slow.
- **DataFrame**: distributed table with named, typed columns (a **schema**). Same underlying engine, but:
  - Operations are declarative (`select`, `filter`, `groupBy`, SQL), so the **Catalyst optimizer** rewrites the plan: predicate pushdown, column pruning, join reordering, constant folding.
  - **Tungsten** execution: compact binary memory format, whole-stage code generation.
  - In PySpark, DataFrame operations run in the JVM; Python is only the client, so performance is near Scala's (unless you use Python UDFs).
- **Dataset** (Scala/Java): typed DataFrame (`Dataset[Order]`) with compile-time type safety.

When to drop down to RDDs: rare today. Very custom low-level partition processing, or legacy code. Prefer built-in functions; if needed, use **pandas UDFs** (Arrow-vectorized) rather than row-by-row Python UDFs.

## Worked example
```python
# RDD: Spark can't optimize; Python lambdas run per record
rdd.map(lambda r: (r["country"], r["amount"])).reduceByKey(lambda a, b: a + b)
# DataFrame: Catalyst prunes columns, pushes filters into the Parquet scan
df.groupBy("country").agg(F.sum("amount"))
```
The DataFrame version is typically several times faster in PySpark.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why are DataFrame operations usually faster than equivalent RDD operations in PySpark?",
  "options": ["DataFrames use more memory", "Catalyst can optimize declarative plans and execution stays in the JVM, avoiding per-row Python serialization", "RDDs don't support filtering", "DataFrames skip fault tolerance"],
  "answer": 1,
  "explanation": "Optimization plus JVM-side execution are the two big wins."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Mimic Catalyst's predicate pushdown and column pruning. A plan is a list of steps: `('scan', table)`, `('select', [cols])`, `('filter', col)` (a filter uses one column). Write `optimize(plan)` that returns a new plan: the scan step becomes `('scan', table, sorted_cols_needed, sorted_filter_cols)` where cols_needed = columns in the final select plus filter columns; all filters are removed from later steps (pushed into the scan), and the final select is kept. Assume the plan is scan, then any filters/selects, ending with one select.",
  "starterCode": "def optimize(plan):\n    pass\n\nplan = [('scan', 'events'), ('filter', 'event_date'), ('select', ['user_id', 'amount'])]\nprint(optimize(plan))",
  "tests": "plan = [('scan', 'events'), ('filter', 'event_date'), ('select', ['user_id', 'amount'])]\nassert optimize(plan) == [('scan', 'events', ['amount', 'event_date', 'user_id'], ['event_date']), ('select', ['user_id', 'amount'])]\nplan2 = [('scan', 't'), ('select', ['a', 'b', 'c']), ('filter', 'b'), ('filter', 'c'), ('select', ['a'])]\nassert optimize(plan2) == [('scan', 't', ['a', 'b', 'c'], ['b', 'c']), ('select', ['a'])]",
  "solution": "def optimize(plan):\n    table = plan[0][1]\n    filters = sorted({s[1] for s in plan if s[0] == 'filter'})\n    final_select = [s for s in plan if s[0] == 'select'][-1]\n    needed = sorted(set(final_select[1]) | set(filters))\n    return [('scan', table, needed, filters), final_select]",
  "hints": ["Collect filter columns and the last select's columns.", "Only the scan and the final select remain."]
}
```

> [!TIP] Interview tips
> - DataFrames win because of the schema-aware Catalyst optimizer and Tungsten execution.
> - In PySpark, avoid RDDs and row-wise Python UDFs; prefer built-ins or pandas UDFs.
> - Mention lineage as the fault-tolerance mechanism shared by both.
