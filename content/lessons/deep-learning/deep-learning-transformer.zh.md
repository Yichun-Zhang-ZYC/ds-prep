---
id: deep-learning-transformer
title: "Transformer（编码器、解码器、位置编码）"
---

## 为什么重要
Transformer 是现代 NLP、视觉和生成模型的骨干。面试官会让你画出完整架构，解释为什么必须注入位置信息，并论证残差、LayerNorm 位置和 FFN 等设计选择。

## 概念
**编码器块**（重复 $N$ 次）：多头自注意力 → add & norm → 逐位置 FFN → add & norm。**解码器块**：*掩码*（因果）自注意力 → 对编码器输出的交叉注意力（query 来自解码器，key/value 来自编码器）→ FFN，每个子层都包裹残差 + 归一化。仅编码器（BERT）去掉解码器；仅解码器（GPT）去掉编码器和交叉注意力。

**位置编码。** 自注意力对排列是等变的，因此必须注入 token 顺序。原始的正弦版本加到词嵌入上：

$$PE_{(pos,2i)} = \sin\!\big(pos / 10000^{2i/d}\big),\quad PE_{(pos,2i+1)} = \cos\!\big(pos / 10000^{2i/d}\big)$$

每一对维度是一个波长不同的正弦波，且 $PE_{pos+k}$ 是 $PE_{pos}$ 的线性函数，因此相对偏移容易学习。替代方案：可学习的绝对位置嵌入、相对偏置、RoPE（旋转 $q,k$）和 ALiBi（线性距离惩罚）；后两者对长上下文的外推更好。

**残差 + 归一化。** $y = x + \text{Sublayer}(x)$ 为梯度提供穿过深度的直接通路。**Post-LN**（原始）：$\text{LN}(x + F(x))$。**Pre-LN**（多数现代模型）：$x + F(\text{LN}(x))$，无需长时间 warm-up 即可稳定训练。LayerNorm 对每个 token 在特征维度上归一化，因此不依赖 batch 大小或序列填充（不同于 BatchNorm）。

**FFN。** $\text{FFN}(x) = W_2\,\phi(W_1 x + b_1) + b_2$，独立作用于每个位置，隐藏层大小通常为 $4d$（GELU 或 SwiGLU）。它占每个块约三分之二的参数并提供非线性；注意力只负责混合 token，FFN 负责变换每个 token。

**开销。** 注意力对序列长度 $n$ 的时间复杂度为 $O(n^2 d)$，内存为 $O(n^2)$；FFN 为 $O(n d^2)$。把 $QK^\top$ 除以 $\sqrt{d_k}$ 可避免 softmax 饱和。

## 示例讲解
$d = 4$、位置 $pos = 1$ 的正弦位置编码。第 $i=0$ 对的频率为 $1/10000^0 = 1$；第 $i=1$ 对的频率为 $1/10000^{2/4} = 1/100$。

$PE_1 = [\sin 1,\ \cos 1,\ \sin 0.01,\ \cos 0.01] \approx [0.8415,\ 0.5403,\ 0.0100,\ 1.0000]$

快速变化的维度区分相邻位置；缓慢变化的维度编码粗粒度位置。$d = 512$ 时一个块的参数量：注意力 $4d^2 \approx 1.05$M，FFN $2 \cdot d \cdot 4d \approx 4.19$M。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Transformer 为什么需要位置编码？",
  "options": ["为了归一化激活", "自注意力对排列等变，没有顺序的概念", "为了降低 O(n^2) 开销", "让 FFN 看到相邻 token"],
  "explanation": "没有位置编码时，打乱输入 token 只会打乱输出；顺序信息必须被显式加入。"
}
```

```quiz
{
  "id": "q2",
  "question": "Pre-LN 相比 Post-LN 的主要实际优势是什么？",
  "options": ["参数更少", "注意力开销更低", "梯度更稳定，深层堆叠所需 warm-up 更少", "使模型变成双向"],
  "explanation": "在 Pre-LN 中，从输入到输出的残差路径是恒等映射，梯度畅通无阻。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 numpy 实现 `positional_encoding(n_pos, d)`（正弦位置编码，形状 n_pos x d，d 为偶数；偶数维用 sin，奇数维用 cos）、`layer_norm(x, eps=1e-5)`（沿最后一个轴归一化，无可学习的增益/偏置）以及返回 `x + sublayer(layer_norm(x))` 的 `pre_ln_block(x, sublayer)`。",
  "hints": ["angle = pos / 10000^(2i/d)，其中 i 为维度对的索引。", "使用 keepdims=True 以便沿最后一个轴广播；var 为总体方差（ddof=0）。"]
}
```

> [!TIP] 面试技巧
> - 画出编码器和解码器块，并说出三种注意力：编码器自注意力、解码器掩码自注意力、交叉注意力。
> - 解释为什么必须注入顺序，并提到 RoPE 是现代默认选择。
> - 了解 Pre-LN 与 Post-LN、为什么用 LayerNorm（而非 BatchNorm），以及注意力对长度是 $O(n^2)$。
