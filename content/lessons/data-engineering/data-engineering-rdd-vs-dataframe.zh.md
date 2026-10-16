---
id: data-engineering-rdd-vs-dataframe
title: RDD vs DataFrame
---

## 为什么重要
“为什么应该用 DataFrame 而不是 RDD？”是一道快速的 Spark 筛选题。答案能反映出你是否理解 Spark 的优化器。

## 概念
- **RDD（弹性分布式数据集）**：Spark 的底层 API，是由任意对象组成的分布式集合，支持函数式操作（`map`、`filter`、`reduceByKey`）。容错来自**血缘（lineage）**（从父 RDD 重新计算丢失的分区）。
  - 对 Spark 来说是不透明的：它看不到你的 lambda 内部，因此无法优化。
  - 在 PySpark 中，每条记录都要在 JVM 和 Python worker 之间序列化，速度很慢。
- **DataFrame**：带有命名、类型化列（**schema**）的分布式表。底层引擎相同，但是：
  - 操作是声明式的（`select`、`filter`、`groupBy`、SQL），所以 **Catalyst 优化器**能改写执行计划：谓词下推、列裁剪、连接重排、常量折叠。
  - **Tungsten** 执行：紧凑的二进制内存格式、全阶段代码生成。
  - 在 PySpark 中，DataFrame 操作在 JVM 中运行；Python 只是客户端，所以性能接近 Scala（除非你使用 Python UDF）。
- **Dataset**（Scala/Java）：带类型的 DataFrame（`Dataset[Order]`），提供编译期类型安全。

什么时候退回到 RDD：如今很少。非常定制化的底层分区处理，或者遗留代码。优先使用内置函数；如有需要，使用 **pandas UDF**（基于 Arrow 的向量化）而不是逐行的 Python UDF。

## 示例讲解
```python
# RDD: Spark can't optimize; Python lambdas run per record
rdd.map(lambda r: (r["country"], r["amount"])).reduceByKey(lambda a, b: a + b)
# DataFrame: Catalyst prunes columns, pushes filters into the Parquet scan
df.groupBy("country").agg(F.sum("amount"))
```
在 PySpark 中，DataFrame 版本通常快好几倍。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么在 PySpark 中，DataFrame 操作通常比等价的 RDD 操作更快？",
  "options": ["DataFrame 使用更多内存", "Catalyst 能优化声明式的计划，并且执行留在 JVM 中，避免了逐行的 Python 序列化", "RDD 不支持过滤", "DataFrame 跳过了容错"],
  "explanation": "优化加上在 JVM 端执行，是两大优势。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模仿 Catalyst 的谓词下推和列裁剪。一个计划是步骤列表：`('scan', table)`、`('select', [cols])`、`('filter', col)`（一个筛选只用一列）。编写 `optimize(plan)`，返回新的计划：scan 步骤变为 `('scan', table, 排序后的所需列, 排序后的筛选列)`，其中所需列 = 最终 select 中的列加上筛选列；后续步骤中的所有筛选都被移除（下推到 scan 中），保留最终的 select。假设计划以 scan 开始，中间是若干筛选/选择，最后以一个 select 结束。",
  "hints": ["收集筛选列和最后一个 select 的列。", "只保留 scan 和最终的 select。"]
}
```

> [!TIP] 面试技巧
> - DataFrame 的优势来自感知 schema 的 Catalyst 优化器和 Tungsten 执行。
> - 在 PySpark 中避免使用 RDD 和逐行的 Python UDF；优先使用内置函数或 pandas UDF。
> - 提到血缘是两者共享的容错机制。
