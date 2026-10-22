---
id: nlp-llms-bag-of-words-tf-idf
title: 词袋与 TF-IDF
---

## 为什么重要
词袋和 TF-IDF 是经典的文本向量化基线，在搜索、垃圾邮件过滤和小数据分类中依然很强。面试官会让你推导 TF-IDF，解释它为何优于原始计数，以及何时应改用 embedding。

## 概念
**词袋（BoW）**把文档表示为固定词表（大小为 $V$）上的词频向量。词序被丢弃；向量是稀疏的（大多数元素为 0）。**n-gram**（如 bigram）以更大的词表为代价找回一点局部顺序。

原始计数会过度加权常见词（`the`、`is`）。**TF-IDF** 对其重新缩放：

$$\text{tf-idf}(t, d) = \text{tf}(t, d) \cdot \text{idf}(t), \qquad \text{idf}(t) = \ln\frac{N}{\text{df}(t)}$$

- $\text{tf}(t,d)$：$t$ 在 $d$ 中的出现次数，常除以 $|d|$（或使用 $1 + \ln$ 次数，即“次线性 tf”）。
- $\text{df}(t)$：包含 $t$ 的文档数；$N$：文档总数。
- 出现在每篇文档中的词 idf $= 0$；稀有词得到很大的权重。

scikit-learn 使用平滑后的 $\text{idf}(t) = \ln\frac{1+N}{1+\text{df}(t)} + 1$（永不为零），并对每行做 L2 归一化，所以两行的点积就是它们的余弦相似度。

**用途**：排序与检索（BM25 是改进的 TF-IDF，带有词频饱和和长度归一化）、线性分类器（逻辑回归、线性 SVM、朴素贝叶斯）、关键词提取。

**局限**：没有语义（`car` 和 `automobile` 互不相关）、稀疏向量维度巨大、没有词序、词表在拟合时就固定了。**只在训练数据上拟合向量化器**，否则 IDF 会泄漏测试信息。用 `min_df`/`max_df` 和哈希（`HashingVectorizer`）控制词表大小。

## 示例讲解
一个包含 $N = 3$ 篇文档的语料：d1 = `cat sat the mat`，d2 = `dog sat the`，d3 = `the cat`。

文档频率：`the` = 3，`cat` = 2，`sat` = 2，`mat` = 1，`dog` = 1。所以 idf(`the`) $= \ln 1 = 0$，idf(`cat`) $= \ln 1.5 \approx 0.405$，idf(`mat`) $= \ln 3 \approx 1.099$。

在 d1（4 个 token）中，每个词的 tf $= 1/4$：tf-idf(`mat`) $= 0.25 \cdot 1.099 \approx 0.275$，tf-idf(`cat`) $\approx 0.101$，tf-idf(`the`) $= 0$。稀有词 `mat` 是 d1 最有代表性的词。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在包含 1,000 篇文档的语料中，某个词出现在所有文档里。它的（未平滑）idf 是多少，意味着什么？",
  "options": ["ln(1000) ≈ 6.9，是信息量很大的词", "0，所以它在每篇文档中的 TF-IDF 权重都是 0", "1，所以保留原始计数", "未定义"],
  "explanation": "idf = ln(N / df) = ln(1000/1000) = 0。无处不在的词没有区分能力。"
}
```

```quiz
{
  "id": "q2",
  "question": "在训练/测试划分的场景中使用 TF-IDF 时，哪种做法能避免泄漏？",
  "options": ["先在全部数据上拟合向量化器，再划分", "只在训练集上拟合向量化器，然后转换两个数据集", "在训练集和测试集上分别拟合不同的向量化器", "测试集不使用 IDF"],
  "explanation": "IDF 统计量必须只来自训练数据；测试集用训练得到的词表和 idf 值做转换。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `tf_idf(docs)`，其中 `docs` 是 token 列表的列表。对每篇文档返回字典 `{term: weight}`，其中 $\\text{tf} = \\text{出现次数} / \\text{len(doc)}$，$\\text{idf} = \\ln(N / \\text{df})$（未平滑，自然对数）。",
  "hints": ["对每篇文档用 set(doc) 更新 Counter 来得到 df。", "文档 d 中词 t 的权重是 (count / len(d)) * math.log(N / df[t])。"]
}
```

> [!TIP] 面试技巧
> - 能默写 TF-IDF 公式并解释直觉：在本文档中频繁、在整个语料中稀有。
> - 陷阱：在测试数据上拟合 IDF（泄漏），以及在计算余弦相似度前忘记 L2 归一化。
> - 提到搜索用 BM25，语义检索用句向量；混合检索常把两者结合。
