---
id: nlp-llms-word2vec-glove
title: Word2Vec 与 GloVe
---

## 为什么重要
Word2Vec 和 GloVe 引入了稠密的、学习得到的词向量，其几何结构编码了语义。面试官会问 skip-gram 如何训练、为什么需要负采样，以及这些静态 embedding 与上下文 embedding 有何不同。

## 概念
**分布假说**：出现在相似上下文中的词含义相近。两种方法都从共现统计中为每个词学习一个稠密向量（50-300 维），取代稀疏的 one-hot 或计数向量。

**Word2Vec** 是一个浅层神经模型，有两种架构：
- **Skip-gram**：用中心词预测上下文词。对低频词更好。
- **CBOW**：用上下文平均向量预测中心词。更快，对高频词更平滑。

训练样本来自大小为 $m$ 的滑动窗口：窗口内每个（中心词，上下文词）对是一个样本。在整个词表上做完整 softmax，$P(o \mid c) = \dfrac{\exp(v_o^\top u_c)}{\sum_{w} \exp(v_w^\top u_c)}$，每个样本的代价是 $O(V)$。**负采样（SGNS）**把它替换成 $K$ 个二分类：真实上下文词对比从一元分布的 3/4 次方中抽取的 $K$ 个随机“噪声”词：

$$\mathcal{L} = -\ln \sigma(v_o^\top u_c) - \sum_{k=1}^{K} \ln \sigma(-v_{n_k}^\top u_c)$$

高频词还会被**下采样**，以降低 `the`、`of` 的权重。每个词最终有两个向量（中心 $u$、上下文 $v$）；通常保留 $u$ 或取两者平均。带负采样的 skip-gram 隐式地分解了一个平移后的点互信息（PMI）矩阵。

**GloVe** 则用加权最小二乘损失把向量拟合到全局共现矩阵 $X$：

$$J = \sum_{i,j} f(X_{ij})\,\big(w_i^\top \tilde w_j + b_i + \tilde b_j - \ln X_{ij}\big)^2$$

其中 $f$ 限制了极高频词对的影响。质量与 Word2Vec 相近；GloVe 直接使用全局计数，Word2Vec 则流式处理局部窗口。

**FastText** 增加了字符 n-gram 向量，所以能处理拼写错误和未见词（以及形态丰富的语言）。

**embedding 能带来什么**：最近邻、类比（`king - man + woman ≈ queen`，只是粗略近似），以及下游模型的特征。**局限**：每个词型只有一个向量，所以 `bank`（河岸 vs 银行）是两种含义的混合；会吸收语料中的偏见；没有句子级语义。上下文 embedding（下一课）解决多义词问题。

## 示例讲解
句子 `the quick brown fox jumps`，窗口 $m = 1$。中心词 `brown` 产生样本对（`brown`，`quick`）和（`brown`，`fox`）。5 个 token 共有 $1+2+2+2+1 = 8$ 个样本对。

一个样本对、$K = 1$ 个负例的 SGNS 损失：中心向量 $u_c = [1, 1]$，真实上下文 $v_o = [1, 1]$（点积 $= 2$），负例 $v_n = [1, -2]$（点积 $= -1$）。

$\mathcal{L} = -\ln \sigma(2) - \ln \sigma(1) = 0.127 + 0.313 = 0.440$。梯度步会把 $u_c$ 拉向 $v_o$，并推离 $v_n$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 Word2Vec 使用负采样而不是完整的 softmax？",
  "options": ["softmax 不可微", "完整 softmax 每个样本代价为 O(V)；负采样只需要真实词加 K 个采样的噪声词", "负采样给出精确概率", "它不再需要窗口"],
  "explanation": "词表有 10^5-10^6 个词时，对所有词做归一化太昂贵；K（5-20）个二元逻辑损失可以近似它。"
}
```

```quiz
{
  "id": "q2",
  "question": "与 BERT 类 embedding 相比，Word2Vec/GloVe 的主要局限是什么？",
  "options": ["训练更慢", "无论上下文如何，每个词型只有一个向量，所以多义词（bank、apple）被混在一起", "不能用于相似度计算", "需要标注数据"],
  "explanation": "静态 embedding 每个词型只有一个向量；上下文模型对每次出现生成不同的向量。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `skipgram_pairs(tokens, window)`：对每个 token 以及窗口内（`window` 个位置以内）的每个其他 token，返回 `(center, context)` 样本对列表，按中心词位置、再按上下文位置排序。然后实现 `sgns_loss(u_c, v_pos, v_negs)`，即负采样损失 $-\\ln\\sigma(v_o^\\top u_c) - \\sum_k \\ln\\sigma(-v_{n_k}^\\top u_c)$，输入为普通 Python 列表。",
  "hints": ["对中心词 i，让 j 遍历 range(max(0, i - window), min(n, i + window + 1))，并跳过 j == i。", "使用 -ln sigma(z) = ln(1 + exp(-z))；负例项用 -dot。"]
}
```

> [!TIP] 面试技巧
> - 能写出 SGNS 损失，并说明为什么负采样避免了 $O(V)$ 的 softmax。
> - 陷阱：把它们称作“上下文相关”的；无论句子如何，`bank` 只有一个向量。提到 FastText 可处理 OOV 词。
> - 说明类比结果有噪声，且 embedding 会编码训练文本中的社会偏见。
