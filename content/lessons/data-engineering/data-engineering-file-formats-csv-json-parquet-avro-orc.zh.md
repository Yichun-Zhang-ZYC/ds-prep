---
id: data-engineering-file-formats-csv-json-parquet-avro-orc
title: 文件格式：CSV、JSON、Parquet、Avro、ORC
---

## 为什么重要
文件格式的选择会让存储成本、查询速度和流水线可靠性相差 10 倍甚至更多。“X 场景你会用什么格式，为什么？”是常见的 DE 筛选题。

## 概念

| 格式 | 布局 | 模式 | 优点 | 缺点 | 典型用途 |
|---|---|---|---|---|---|
| **CSV** | 行式，文本 | 无（最多有表头） | 通用、人类可读 | 没有类型、引号/转义 bug、体积大、解析慢 | 小型导出、电子表格 |
| **JSON / JSONL** | 行式，文本 | 每条记录自描述 | 支持嵌套、灵活、可读 | 冗长、慢、模式漂移 | API、原始事件日志 |
| **Avro** | 行式，二进制 | 内嵌模式（JSON schema），有严格的演化规则 | 写入快、紧凑、支持模式演化、非常适合流式处理 | 不适合列扫描 | Kafka 消息、数据接入、CDC |
| **Parquet** | 列式，二进制 | 内嵌，带类型 | 列裁剪、压缩、通过行组统计实现谓词下推 | 单行写入慢，不能原地追加 | 分析、数据湖、ML 数据集 |
| **ORC** | 列式，二进制 | 内嵌，带类型 | 与 Parquet 类似，在 Hive 生态中很强，内置索引 | 通用性不如 Parquet | 以 Hive/Presto 为主的技术栈 |

Parquet 的内部结构：文件 → **行组**（例如约 128 MB）→ **列块** → 页。每个列块都存储最小/最大值统计信息，因此引擎可以跳过不可能匹配筛选条件的行组。编码（字典编码、游程编码）加上压缩（Snappy、ZSTD）让重复值占用极小的空间。

经验法则：
- **写入路径 / 流式处理** → Avro（行式，配合 schema registry）。
- **读取路径 / 分析** → Parquet（或 ORC），最好放在表格式（Delta/Iceberg）之内。
- 模式混乱时，原始落地层用压缩的 JSONL，然后再转换成 Parquet。
- 避免大量小文件；每个文件目标大小约 100 MB–1 GB。

## 示例讲解
10 亿条事件、20 列，存成 CSV 为 300 GB。存成 ZSTD 压缩的 Parquet 约 40 GB。一个读取 3 列的查询扫描约 6 GB 而不是 300 GB，而且对于选择性高的日期筛选，行组统计信息能跳过文件的大部分内容。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "对于需要模式演化的 Kafka 消息，哪种格式最好？",
  "options": ["CSV", "Parquet", "Avro", "纯文本"],
  "explanation": "Avro 是行式、紧凑的格式，并能与 schema registry 搭配实现兼容的模式演化。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于 `WHERE event_date = '2024-06-01'` 这样的筛选，Parquet 为什么能跳过数据？",
  "options": ["它会自动对所有数据排序", "行组存储了每列的最小/最大值统计信息，因此可以跳过不匹配的行组", "它像 B 树一样为每一行建立索引", "它内部以 CSV 存储数据"],
  "explanation": "谓词下推利用的是列块的统计信息。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 Parquet 的行组跳过。每个行组是一个字典，包含某列的 `min` 和 `max`，以及大小 `bytes`。编写 `groups_to_read(row_groups, lo, hi)`，返回可能包含 [lo, hi] 范围内值的行组索引（检查区间重叠）；再编写 `bytes_scanned(row_groups, lo, hi, n_cols_read, n_cols_total)` = 需要读取的行组字节数之和 × n_cols_read / n_cols_total。",
  "hints": ["当 max ≥ lo 且 min ≤ hi 时两个区间重叠。", "列裁剪按读取列所占的比例缩放字节数。"]
}
```

> [!TIP] 面试技巧
> - 把格式分为行式（CSV、JSON、Avro：适合写入/流式处理）和列式（Parquet、ORC：适合分析）。
> - 解释 Parquet 的行组、列统计信息和压缩。
> - 提到模式演化（Avro + schema registry）和小文件问题。
