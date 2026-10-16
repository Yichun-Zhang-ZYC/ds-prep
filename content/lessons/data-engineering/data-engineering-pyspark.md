---
id: data-engineering-pyspark
title: PySpark
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, spark, pyspark]
---

## Why it matters
Many DE and MLE coding rounds ask you to write PySpark: dedupe events, compute daily metrics, top-N per group, sessionize clicks. You need the DataFrame API and window functions at your fingertips.

## Concept
```python
from pyspark.sql import SparkSession, functions as F, Window
spark = SparkSession.builder.getOrCreate()

df = spark.read.parquet("s3://lake/events/")                 # lazy
daily = (df.filter(F.col("event_type") == "purchase")
           .withColumn("event_date", F.to_date("ts"))
           .groupBy("event_date", "country")
           .agg(F.count("*").alias("orders"),
                F.sum("amount").alias("revenue"),
                F.countDistinct("user_id").alias("buyers")))

w = Window.partitionBy("user_id").orderBy(F.col("ts").desc())
latest = (df.withColumn("rn", F.row_number().over(w))
            .filter("rn = 1").drop("rn"))                      # latest event per user

df.dropDuplicates(["event_id"])
df.join(F.broadcast(dim_country), "country", "left")
F.when(F.col("amount") > 100, "big").otherwise("small")
F.lag("ts").over(Window.partitionBy("user_id").orderBy("ts"))
spark.sql("SELECT country, SUM(amount) FROM events GROUP BY country")   # after createOrReplaceTempView
daily.write.mode("overwrite").partitionBy("event_date").parquet("s3://lake/gold/daily/")
```

Good practice:
- Prefer built-in `F.*` functions over Python UDFs; if needed, use `pandas_udf`.
- Filter and select early; broadcast small dimensions.
- Use `mode("overwrite")` with dynamic partition overwrite (`spark.sql.sources.partitionOverwriteMode=dynamic`) for idempotent daily writes.
- Avoid `collect()` / `toPandas()` on big data.
- Schema on read: pass explicit schemas for JSON/CSV to avoid expensive inference.

Many PySpark questions map 1:1 to SQL window functions, so think in SQL and translate.

## Worked example
Sessionization (new session after 30 minutes of inactivity):
```python
w = Window.partitionBy("user_id").orderBy("ts")
s = (df.withColumn("prev_ts", F.lag("ts").over(w))
       .withColumn("new_session", (F.col("ts").cast("long") - F.col("prev_ts").cast("long") > 1800) | F.col("prev_ts").isNull())
       .withColumn("session_id", F.sum(F.col("new_session").cast("int")).over(w)))
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which PySpark pattern returns each user's most recent event?",
  "options": ["df.groupBy('user_id').max('ts') then nothing else", "row_number() over a window partitioned by user_id ordered by ts desc, then filter rn = 1", "df.orderBy('ts').limit(1)", "df.dropDuplicates()"],
  "answer": 1,
  "explanation": "groupBy max returns only the timestamp; the window pattern keeps the whole row."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "This is the Spark SQL equivalent of the PySpark window pattern. For each user, return their **latest** event (by `ts`) with columns `user_id`, `event_type`, `ts`, sorted by user_id. Use ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... DESC).",
  "setup": "CREATE TABLE events (event_id INTEGER, user_id INTEGER, event_type TEXT, ts TEXT); INSERT INTO events VALUES (1,1,'view','2024-06-01 10:00'),(2,1,'purchase','2024-06-01 10:05'),(3,2,'view','2024-06-01 09:00'),(4,2,'view','2024-06-02 08:00'),(5,3,'signup','2024-06-01 12:00');",
  "starterCode": "WITH ranked AS (\n  SELECT *\n  FROM events\n)\nSELECT user_id, event_type, ts FROM ranked\n",
  "solution": "WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts DESC) AS rn\n  FROM events\n)\nSELECT user_id, event_type, ts\nFROM ranked\nWHERE rn = 1\nORDER BY user_id;",
  "hints": ["Number each user's events from newest to oldest.", "Keep rn = 1."]
}
```

```reveal
{
  "prompt": "Write PySpark for: daily active users (DAU) per country from an `events` table with user_id, country, ts, keeping only the last 30 days, written as Parquet partitioned by date.",
  "answer": "```python\nfrom pyspark.sql import functions as F\n\nevents = spark.read.parquet(\"s3://lake/silver/events/\")\ndau = (events\n    .filter(F.col(\"ts\") >= F.date_sub(F.current_date(), 30))\n    .withColumn(\"event_date\", F.to_date(\"ts\"))\n    .groupBy(\"event_date\", \"country\")\n    .agg(F.countDistinct(\"user_id\").alias(\"dau\")))\n\n(dau.write\n    .mode(\"overwrite\")\n    .partitionBy(\"event_date\")\n    .parquet(\"s3://lake/gold/dau/\"))\n```\n\nPoints to mention: filter early so partition pruning applies (if events are partitioned by date, filter on that column), `countDistinct` is exact but costly (use `approx_count_distinct` for huge data), and use dynamic partition overwrite so reruns are idempotent. In a scheduled job, pass the run date instead of `current_date()`."
}
```

> [!TIP] Interview tips
> - Be fluent in filter/withColumn/groupBy/agg, joins (with broadcast), and Window functions (row_number, lag, running sums).
> - Translate from SQL when stuck; most questions are window-function problems.
> - Mention built-ins over UDFs, explicit schemas, idempotent partitioned writes, and never collecting big data.
