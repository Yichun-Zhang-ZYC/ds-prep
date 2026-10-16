---
id: data-engineering-pyspark
title: PySpark
---

## 为什么重要
很多 DE 和 MLE 的编码面试会让你写 PySpark：事件去重、计算每日指标、每组前 N 个、对点击做会话切分。你需要对 DataFrame API 和窗口函数信手拈来。

## 概念
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

良好实践：
- 优先使用内置的 `F.*` 函数，而不是 Python UDF；如有需要，使用 `pandas_udf`。
- 尽早筛选和选择列；广播小的维度表。
- 使用 `mode("overwrite")` 配合动态分区覆盖（`spark.sql.sources.partitionOverwriteMode=dynamic`），实现幂等的每日写入。
- 不要对大数据使用 `collect()` / `toPandas()`。
- 读时模式：为 JSON/CSV 显式传入 schema，避免代价高昂的类型推断。

很多 PySpark 问题都能一一对应到 SQL 窗口函数，所以先用 SQL 思考，再翻译过来。

## 示例讲解
会话切分（30 分钟没有活动后开启新会话）：
```python
w = Window.partitionBy("user_id").orderBy("ts")
s = (df.withColumn("prev_ts", F.lag("ts").over(w))
       .withColumn("new_session", (F.col("ts").cast("long") - F.col("prev_ts").cast("long") > 1800) | F.col("prev_ts").isNull())
       .withColumn("session_id", F.sum(F.col("new_session").cast("int")).over(w)))
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪种 PySpark 写法能返回每个用户最近的一条事件？",
  "options": ["df.groupBy('user_id').max('ts')，然后什么都不做", "在按 user_id 分区、按 ts 降序排序的窗口上用 row_number()，然后筛选 rn = 1", "df.orderBy('ts').limit(1)", "df.dropDuplicates()"],
  "explanation": "groupBy max 只返回时间戳；窗口写法能保留整行。"
}
```

## 动手练习

```sql-exercise
{
  "id": "ex1",
  "prompt": "这是 PySpark 窗口写法对应的 Spark SQL 版本。对每个用户，返回其**最新**的一条事件（按 `ts`），列为 `user_id`、`event_type`、`ts`，按 user_id 排序。使用 ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ... DESC)。",
  "hints": ["把每个用户的事件从新到旧编号。", "保留 rn = 1。"]
}
```

```reveal
{
  "prompt": "用 PySpark 实现：从包含 user_id、country、ts 的 `events` 表中计算每个国家的日活用户（DAU），只保留最近 30 天，并按日期分区写成 Parquet。",
  "answer": "```python\nfrom pyspark.sql import functions as F\n\nevents = spark.read.parquet(\"s3://lake/silver/events/\")\ndau = (events\n    .filter(F.col(\"ts\") >= F.date_sub(F.current_date(), 30))\n    .withColumn(\"event_date\", F.to_date(\"ts\"))\n    .groupBy(\"event_date\", \"country\")\n    .agg(F.countDistinct(\"user_id\").alias(\"dau\")))\n\n(dau.write\n    .mode(\"overwrite\")\n    .partitionBy(\"event_date\")\n    .parquet(\"s3://lake/gold/dau/\"))\n```\n\n要提到的要点：尽早筛选，让分区剪枝生效（如果 events 按日期分区，就在该列上筛选）；`countDistinct` 精确但代价高（数据巨大时用 `approx_count_distinct`）；使用动态分区覆盖，让重跑保持幂等。在定时任务中，传入运行日期，而不是使用 `current_date()`。"
}
```

> [!TIP] 面试技巧
> - 熟练掌握 filter/withColumn/groupBy/agg、连接（配合广播）以及窗口函数（row_number、lag、累计和）。
> - 卡住时从 SQL 翻译过来；大多数问题都是窗口函数问题。
> - 提到优先使用内置函数而不是 UDF、显式 schema、幂等的分区写入，以及永远不要 collect 大数据。
