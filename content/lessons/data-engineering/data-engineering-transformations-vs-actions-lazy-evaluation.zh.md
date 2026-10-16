---
id: data-engineering-transformations-vs-actions-lazy-evaluation
title: 转换与行动、惰性求值
---

## 为什么重要
“为什么我的 Spark 任务把同一个昂贵的步骤跑了三遍？”和“为什么我运行这个单元格什么也没发生？”都源于惰性求值。面试官会检查你是否知道 Spark 什么时候才真正执行，以及什么时候该缓存。

## 概念
- **转换（Transformation）**（`select`、`filter`、`withColumn`、`join`、`groupBy().agg()`）返回一个新的 DataFrame，只是往**逻辑计划**中添加步骤。此时什么都不会运行。
- **行动（Action）**（`count`、`collect`、`show`、`take`、`write`、`toPandas`）会触发执行：Spark 优化整个计划并运行一个 job。

惰性的好处：优化器在运行任何东西之前就能看到整个流水线（下推筛选、裁剪列、合并步骤）。

后果：
- 错误（列名错误在分析阶段会立即被发现，但运行时的数据错误）可能要到行动时才会出现。
- **重复计算**：除非数据被缓存，否则每个行动都会从数据源重新计算整个计划。如果你先调用 `df.count()` 再调用 `df.write`，上游的工作会运行两次。
- **`cache()` / `persist()`** 在 DataFrame 第一次计算后把它保存在内存/磁盘中；当它被多个行动复用且重新计算代价很高时值得这么做。用完后 `unpersist()`。什么都缓存会浪费内存，还可能拖慢任务。
- `explain()` 会打印物理计划，但不会运行它。

## 示例讲解
```python
clean = raw.filter(F.col("valid")).join(users, "user_id")    # transformation: instant
clean.count()            # action #1: reads raw + users, joins
clean.write.parquet(p)   # action #2: reads and joins AGAIN
```
在第一个行动之前加上 `clean = clean.cache()`，第二个行动就会从内存中读取。或者干脆去掉用于调试的 `count()`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "下面哪个会触发一个 Spark job？",
  "options": ["df.filter(df.x > 1)", "df.withColumn('y', df.x * 2)", "df.select('x')", "df.count()"],
  "explanation": "count() 是一个行动；其余都是惰性的转换。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "构建一个极简的惰性 DataFrame。`Lazy(source)` 接收一个返回行列表的函数；`filter(fn)` 和 `map(fn)` 返回新的 Lazy 对象，只记录步骤而不运行。`collect()` 运行数据源和各个步骤并返回列表；`count()` 返回其长度。用共享计数器 `self.stats['source_runs']`（由派生对象共享）记录数据源运行了多少次。`cache()` 返回一个 Lazy，它在第一次行动时保存结果，之后的行动不再重新运行数据源。",
  "hints": ["转换只是往 steps 中追加步骤。", "每个未缓存的行动都会再次调用数据源；缓存会保存第一次的结果。"]
}
```

> [!TIP] 面试技巧
> - 用例子定义转换（惰性、构建计划）与行动（触发 job）。
> - 解释惰性让整个计划都能被优化，以及除非缓存，否则每个行动都会重新计算。
> - 有选择地缓存（被复用且代价高的），并从生产任务中移除 count() 之类的调试行动。
