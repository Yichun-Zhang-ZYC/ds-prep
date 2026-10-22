---
id: nlp-llms-n-gram-language-models
title: n-gram 语言模型
---

## 为什么重要
n-gram 模型是最简单的语言模型，也是解释“语言模型是什么”最清晰的方式：下一个 token 的概率分布。面试官借它考察平滑、困惑度，以及神经语言模型为何取代了它。

## 概念
语言模型为 $P(w_1, \dots, w_n)$ 赋值。由链式法则 $P(w_1..w_n) = \prod_i P(w_i \mid w_1..w_{i-1})$。**n-gram 模型**做马尔可夫假设：只有前 $n-1$ 个词有影响。对 bigram 模型：

$$P(w_i \mid w_{i-1}) = \frac{c(w_{i-1}, w_i)}{c(w_{i-1})}$$

这就是基于计数的最大似然估计（MLE）。给句子加上 `<s>` 和 `</s>` 填充，让模型学到句子的开头和结尾。

**稀疏问题**：大多数合法的 n-gram 在训练中从未出现，MLE 会给出概率 0，一个没见过的 bigram 就会让整句概率归零。修正方法：
- **Add-$k$（拉普拉斯）平滑**：$P(w \mid h) = \dfrac{c(h, w) + k}{c(h) + kV}$。简单，但会把过多概率质量分给未见事件。
- **回退 / 插值**：混合高阶和低阶估计，$\lambda P_{\text{tri}} + \lambda' P_{\text{bi}} + \lambda'' P_{\text{uni}}$。
- **Kneser-Ney**：对计数打折，并回退到*延续*概率（一个词跟在多少个不同上下文之后）。是最好的经典方法。

**困惑度（perplexity）**在含 $N$ 个预测 token 的留出文本上评估模型：

$$\text{PPL} = \exp\Big(-\frac1N \sum_i \ln P(w_i \mid w_{<i})\Big)$$

它是交叉熵的指数：每一步等可能选择的有效数量。越低越好；只能在分词方式和词表相同的模型之间比较。

**局限**：上下文窗口很小，参数数量按 $V^n$ 增长，相似的词之间不共享统计信息。神经语言模型（embedding + RNN/transformer）能在相似词之间泛化并使用长上下文。如今 n-gram 仍用于语音解码、拼写检查，以及作为廉价基线。

## 示例讲解
训练语料（3 个句子）：`i like cats`、`i like dogs`、`i eat cats`。加上 `<s>`/`</s>` 填充后，$c(\text{i}) = 3$，$c(\text{i like}) = 2$，$c(\text{like}) = 2$，$c(\text{like cats}) = 1$，$c(\text{cats}) = 2$，$c(\text{cats </s>}) = 2$。

$P(\text{i like cats}) = P(\text{i} \mid \text{<s>}) \cdot P(\text{like} \mid \text{i}) \cdot P(\text{cats} \mid \text{like}) \cdot P(\text{</s>} \mid \text{cats}) = 1 \cdot \tfrac23 \cdot \tfrac12 \cdot 1 = \tfrac13$。

共 $N = 4$ 次预测，$\text{PPL} = (1/3)^{-1/4} = 3^{0.25} \approx 1.32$。没见过的 bigram `i dogs` 在 MLE 下概率为 0，所以包含它的任何句子困惑度都是无穷大。使用 add-1 平滑且 $V = 7$ 个符号（`<s>`、`</s>`、`i`、`like`、`eat`、`cats`、`dogs`）时：$P(\text{like} \mid \text{i}) = (2+1)/(3+7) = 0.3$，$P(\text{dogs} \mid \text{i}) = 1/10 = 0.1$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "bigram MLE 模型对包含训练中从未见过的 bigram 的测试句子给出概率 0。标准的解决办法是什么？",
  "options": ["训练更多轮", "平滑（add-k、插值/回退、Kneser-Ney）", "把 n 增大到 5", "把文本小写化"],
  "explanation": "平滑为未见的 n-gram 预留概率质量。增大 n 只会让稀疏问题更严重。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个语言模型在测试集上的困惑度是 50。应如何解读？",
  "options": ["50% 的准确率", "平均而言，它每一步的不确定性相当于在 50 个 token 中均匀选择", "需要训练 50 轮", "词表有 50 个词"],
  "explanation": "困惑度是平均负对数似然的指数，即有效分支因子。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "构建一个 bigram 语言模型。`train_bigram(sentences)` 给每个 token 列表加上 `<s>` 和 `</s>` 填充，返回 `(bigram_counts, context_counts, vocab)`（vocab 包含填充符号）。`bigram_prob(model, w1, w2, k=0.0)` 返回 add-$k$ 概率 $(c(w_1,w_2)+k)/(c(w_1)+kV)$，分母为 0 时返回 0.0。`perplexity(model, sentence, k=0.0)` 返回加填充后句子的困惑度；若任一概率为 0 则返回 `float('inf')`。",
  "hints": ["c(w1) 是 w1 作为 bigram 第一个元素出现的次数。", "perplexity = exp(-对数概率的平均值)，共 len(sentence)+1 次预测。"]
}
```

> [!TIP] 面试技巧
> - 把概念串起来：困惑度 = exp(交叉熵)；PPL 为 100 的模型，其不确定性相当于在 100 个词中均匀选择。
> - 陷阱：在不同词表或分词器之间比较困惑度没有意义。
> - 知道为什么需要平滑（零计数）并能说出 Kneser-Ney；把神经语言模型解释为通过 embedding 实现泛化。
