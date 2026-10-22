---
id: genai-eng-hybrid-search
title: 混合搜索（BM25 + 稠密向量）
---

## 为什么重要
稠密 embedding 能捕捉语义，但会漏掉精确的词元（SKU、错误码、人名）；BM25 恰好相反。生产环境的 RAG 几乎总是把两者融合，面试官会问你如何组合处于不同量纲的分数。

## 概念
**BM25** 根据查询词的匹配来给文档打分，词频会饱和，并做长度归一化：
$$\text{BM25}(q, d) = \sum_{t \in q} \text{IDF}(t) \cdot \frac{f(t,d)(k_1+1)}{f(t,d) + k_1\left(1 - b + b\,\frac{|d|}{\text{avgdl}}\right)}$$
典型取值 $k_1 \approx 1.2$-$2$，$b \approx 0.75$。它擅长稀有的精确词，且无需训练；对同义词和改写无能为力。**稠密检索**（双编码器 + ANN）能处理改写和跨语言查询，但可能漏掉标识符和稀有实体。学习型稀疏模型（SPLADE）介于两者之间。

**融合**方式：
- **倒数排名融合（RRF）**：$\text{score}(d) = \sum_{r} \frac{1}{k + \text{rank}_r(d)}$，$k \approx 60$。只用排名，不需要分数归一化，稳健，是默认选择。未出现在某个列表中的文档贡献为 0。
- **加权分数融合**：先对每个分数列表做 min-max（或 z-score）归一化，再计算 $\alpha\, s_{\text{dense}} + (1-\alpha)\, s_{\text{bm25}}$。可以用带标注的查询调参，但对分数分布和离群值敏感。
- **级联**：用一种方法召回，再用 cross-encoder 重排（见“重排序”一课）。

**流水线**：并行运行两个检索器（各取前 50-100），融合，可选地在各检索器中应用元数据过滤，然后把前 5-20 条传给下游。许多引擎（Elasticsearch/OpenSearch、Weaviate、Qdrant、pgvector + `tsvector`）原生支持。

## 示例讲解
查询 "error E4021 timeout"。BM25 排名：A、B、C。稠密排名：B、D、A。取 $k=60$：
- A：$1/61 + 1/63 = 0.016393 + 0.015873 = 0.032266$
- B：$1/62 + 1/61 = 0.016129 + 0.016393 = 0.032522$
- C：$1/63 = 0.015873$（仅 BM25）；D：$1/62 = 0.016129$（仅稠密）

融合后的顺序：B、A、D、C。B 胜出是因为两个检索器都喜欢它，尽管它并没有在两个列表中都排第一。注意原始分数（BM25 约 12，余弦约 0.8）从未被直接比较。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 RRF 比直接把原始 BM25 和余弦分数相加更常用？",
  "options": [
    "RRF 在所有数据集上都更准确",
    "它只使用排名，因此不需要对量纲不可比的分数做归一化",
    "它不再需要第二个检索器",
    "它降低索引大小"
  ],
  "explanation": "BM25 分数无界且依赖语料，而余弦在 [-1, 1] 内。排名是可比的，这使 RRF 成为稳健的默认选择；但并不保证在所有场景下最优。"
}
```

```quiz
{
  "id": "q2",
  "question": "下面哪个查询最能从在稠密检索器上加入 BM25 中获益？",
  "options": [
    "“how do I get my money back”（退款政策）",
    "“summarize our vacation policy”",
    "“ORA-00942 table or view does not exist”",
    "“ideas for a team offsite”"
  ],
  "explanation": "错误码这样的精确标识符是 embedding 可能模糊掉的稀有词元；BM25 可以精确匹配它们。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `rrf(rankings, k=60)`：rankings 是排好序的 id 列表的列表（最好的在前）；返回按得分降序（平局按 id）排列的 `(id, score)` 列表，得分 = 各列表中 1/(k + rank) 之和，rank 从 1 开始。再实现 `alpha_fuse(bm25, dense, alpha)`：两者都是 id -> 原始分数 的字典；把每个字典 min-max 归一化到 [0, 1]（全部相等则归一化为 0.0），缺失的 id 视为 0，按 alpha * dense + (1 - alpha) * bm25 组合，返回按融合得分降序（平局按 id）排列的 id。",
  "hints": [
    "使用 enumerate(ranking, start=1)，让第一项的排名为 1。",
    "Min-max：(v - min) / (max - min)；注意处理 max == min 的情况。"
  ]
}
```

> [!TIP] 面试技巧
> - 解释为什么不能直接把 BM25 和余弦分数相加：量纲和分布不同。RRF 绕开了这个问题；加权融合需要归一化。
> - 知道混合搜索在哪些场景最有价值：标识符、行话、简短关键词查询、领域专用词汇。用带标注数据集上的 recall@k 评估，而不是凭感觉。
> - 提到调参点：RRF 中的 $k$（很少有影响）、列表深度、$\alpha$，以及每个检索器的过滤条件。
