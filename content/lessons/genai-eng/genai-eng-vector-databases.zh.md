---
id: genai-eng-vector-databases
title: 向量数据库（FAISS、Pinecone、pgvector、Chroma）
---

## 为什么重要
每个 RAG 系统都需要在数百万个 embedding 上做快速最近邻搜索。面试官会考察：精确搜索为什么无法扩展、ANN 索引如何在召回率、速度和内存之间取舍，以及何时选择库、Postgres 扩展还是托管服务。

## 概念
**精确（flat）搜索**把查询与每个向量比较：每次查询 $O(N d)$。到大约 10 万至 100 万个向量时还可以；再大就需要**近似最近邻（ANN）**索引，用少量召回率换取大幅加速。质量用 $\text{recall@}k = |\text{ANN top-}k \cap \text{exact top-}k| / k$ 衡量。

**索引家族**：
- **HNSW**：分层邻近图；从顶层开始贪心搜索逐层向下。召回/延迟最佳，但整个图要放在内存里（每个向量有额外的连接），构建较慢。参数：`M`（连接数）、`efConstruction`、`efSearch`（越大召回越高、越慢）。
- **IVF**：用 k-means 把向量划分为 `nlist` 个单元；查询只扫描最近的 `nprobe` 个单元。构建便宜；召回随 `nprobe` 上升。
- **PQ（乘积量化）**：把每个向量切成 $m$ 个子向量，每个子向量只存一个字节的编码（约 32 倍压缩）。常与 IVF 组合成 IVF-PQ，用于十亿级或内存受限场景；会损失一些召回。
- **DiskANN 类/磁盘图索引**把大部分数据放在 SSD 上，适合超大语料。

**距离度量**：对 embedding 做归一化后用内积，等价于余弦。使用 embedding 模型训练时对应的度量。

**生产环境关注点**：**元数据过滤**（租户、日期、ACL）可以是前过滤、后过滤或带过滤的图遍历（后过滤可能返回少于 $k$ 条结果）；更新/删除（HNSW 的删除是墓碑标记，需定期重建）；分片与副本；以及混合（关键词 + 向量）支持。

**如何选择**：**FAISS** 是库（没有服务、持久化和过滤；适合批处理任务和研究）。**Chroma** 是易用的嵌入式/开发用存储。**pgvector** 给 Postgres 增加带 HNSW/IVFFlat 的 `vector` 列：支持事务，SQL 连接和过滤都在同一系统中，适合几百万向量以内。**Pinecone、Weaviate、Qdrant、Milvus** 是专用引擎：在更大规模下提供托管扩展、过滤和多租户。

## 示例讲解
语料：1000 万个 chunk，768 维 float32 embedding。原始大小：$10^7 \cdot 768 \cdot 4 = 30.72$ GB。`M=16` 的 HNSW 每个向量约增加 $2M \cdot 4 = 128$ 字节的连接，即多约 1.28 GB，内存中约 32 GB。int8 标量量化把向量降到 7.68 GB；用 96 个单字节编码的 PQ 为 $96 \cdot 10^7 = 0.96$ GB，会损失一些召回，可通过用完整向量对前 100 名重新打分来弥补。

决策：少于 100 万 chunk 时，一个带 pgvector 的 Postgres 实例最简单。1000 万、带过滤且高 QPS 时，使用带量化加重打分的专用引擎。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你把 HNSW 的 `efSearch` 从 32 提高到 256，会发生什么？",
  "options": [
    "召回和延迟通常都会上升",
    "召回上升，延迟下降",
    "索引内存下降",
    "构建时间增加，但查询不变"
  ],
  "explanation": "`efSearch` 是查询时候选列表的大小：更大的搜索宽度会探索更多图节点，以延迟为代价提高召回。它不会改变索引本身。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个 500 万向量的语料需要 ACID 更新、与用户表连接以及租户过滤。最自然的首选是什么？",
  "options": [
    "应用内存中的 FAISS flat 索引",
    "现有 Postgres 中的 pgvector",
    "单独的 GPU 集群",
    "把 embedding 存成 JSON 字符串"
  ],
  "explanation": "pgvector 把向量、元数据和事务放在同一个系统中，适合几百万向量。当规模或 QPS 要求更高时再迁移到专用引擎。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `cosine_top_k(query, vectors, k)`（vectors 是 id -> 列表 的字典；返回余弦得分最高的 k 个 id，平局按 id 排序）、`recall_at_k(approx_ids, exact_ids)`（交集大小 / len(exact_ids)），以及 `ivf_search(query, clusters, centroids, nprobe, k)`：找出与查询最相似（余弦）的 `nprobe` 个质心，只在这些簇的并集上运行 `cosine_top_k`（每个簇是 id -> 向量 的字典）。",
  "hints": [
    "按元组 (-score, id) 排序以获得确定的平局处理。",
    "IVF 就是：按质心相似度选单元，合并它们的向量，然后在合并后的池上做精确搜索。"
  ]
}
```

> [!TIP] 面试技巧
> - 报告延迟时一定要同时给出召回率；没有召回数字的“ANN”毫无意义。对照带标注的精确结果调节 `efSearch`/`nprobe`。
> - 掌握内存估算（N x d x 4 字节）及各种手段：降低维度（Matryoshka embedding）、量化、基于磁盘的索引。
> - 提到过滤的陷阱：大量后过滤会导致结果太少，所以要多取一些候选，或使用支持过滤搜索的引擎。
