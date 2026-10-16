---
id: python-memory-and-performance
title: 内存与性能（category 类型、分块处理）
---

## 为什么重要
“CSV 有 20 GB，而我的笔记本只有 16 GB 内存”是一个经典的实践问题。知道如何缩小 DataFrame、分块处理数据（或者换工具），能体现真实的工作经验。

## 概念
先测量：`df.memory_usage(deep=True)` / `df.info(memory_usage="deep")`。

缩小：
- **数值向下转换**：`pd.to_numeric(s, downcast="integer")`，精度允许时 `float64 → float32`。
- 低基数字符串用 **category 类型**：存储小整数编码，外加每个标签的一份拷贝。一个 1000 万行的 `country` 列可以从约 600 MB（object）降到约 10 MB。
- 只读取需要的部分：`read_csv(usecols=[...], dtype={...}, parse_dates=[...])`。
- 使用 **Parquet**（列式、压缩、带类型）：只读取需要的列，比 CSV 快得多。
- 删除中间结果（`del df_tmp`），避免不必要的复制。

分块处理：
- `for chunk in pd.read_csv(path, chunksize=1_000_000): ...`，并合并部分聚合结果（各块的和相加、计数相加，最后再相除；除非各块计数相等，否则不能对平均值求平均）。
- 尽早筛选，尽早聚合。

速度：
- 向量化；避免 `apply(axis=1)`/`iterrows`。
- 重复查找时设置索引；`merge_asof` 之前先排序。
- `pyarrow` 字符串类型（`dtype="string[pyarrow]"`）比 object 字符串更快、更小。
- 当 pandas 不够用时：**Polars**（多线程、惰性执行）、**DuckDB**（在 Parquet/DataFrame 上跑 SQL，支持超出内存的数据）、集群上用 Dask/Spark。

## 示例讲解
分块计算一个 5000 万行文件中每个国家的平均订单金额：

```python
sums, counts = {}, {}
for ch in pd.read_csv("orders.csv", usecols=["country", "amount"], chunksize=2_000_000):
    g = ch.groupby("country")["amount"].agg(["sum", "count"])
    for c, row in g.iterrows():          # small: one row per country
        sums[c] = sums.get(c, 0) + row["sum"]; counts[c] = counts.get(c, 0) + row["count"]
aov = {c: sums[c] / counts[c] for c in sums}
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪一列从 category 类型中获益最大？",
  "options": ["唯一的交易 ID 字符串", "1000 万行中只有 50 个不同取值的 'country' 字符串列", "浮点数价格列", "布尔标志列"],
  "explanation": "当少数几个不同取值被大量重复时，category 的优势最明显。"
}
```

```quiz
{
  "id": "q2",
  "question": "你对每个块计算均值，然后对各块的均值求平均。什么时候这是错的？",
  "options": ["永远不会错", "当各块中每组的行数不同时；应合并和与计数", "只对整数错", "只在有 NaN 时错"],
  "explanation": "对平均值求平均是给每个块相同的权重，而不是给每一行相同的权重。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `shrink(df)`，返回一个副本：唯一值比例低于 50% 的 object 列转为 `category`，int64 列用 `pd.to_numeric(..., downcast='integer')` 向下转换，float64 列转为 float32。编写 `chunked_mean(chunks, key, value)`：接收由 DataFrame 组成的可迭代对象，返回字典 key → value 的均值，均值由合并后的和与计数计算（而不是对均值求平均）。",
  "hints": ["用 s.nunique() / len(s) 决定是否转为 category。", "对 'a'：(1 + 3 + 8) / 3 = 4，而不是各块均值（2 和 8）的平均。"]
}
```

> [!TIP] 面试技巧
> - 先测量（`memory_usage(deep=True)`），再调整数据类型，然后选取列，最后分块。
> - 提到 category 类型、Parquet，以及读取时的 usecols/dtype。
> - 知道何时换工具：数据超出内存或需要更快的单机处理时，用 Polars 或 DuckDB。
