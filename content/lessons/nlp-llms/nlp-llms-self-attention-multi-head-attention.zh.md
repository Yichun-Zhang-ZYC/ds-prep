---
id: nlp-llms-self-attention-multi-head-attention
title: 自注意力与多头注意力
---

## 为什么重要
自注意力是所有 Transformer 的核心运算。面试官会让你写出公式、解释 $\sqrt{d_k}$ 缩放、计算开销，并说明多头带来了什么。

## 概念
每个 token 的向量 $x_i$ 被投影为**查询（query）**、**键（key）**和**值（value）**：$Q = XW_Q$，$K = XW_K$，$V = XW_V$。然后
$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}} + M\right)V$$

- $QK^\top$ 的第 $i$ 行表示 token $i$ 应该从每个 token $j$ 读取多少信息；softmax 把分数变成和为 1 的权重；输出是各值向量的加权平均。
- **缩放**：若 $q, k$ 的各分量方差为 1，则 $q \cdot k$ 的方差为 $d_k$。除以 $\sqrt{d_k}$ 使 logits 保持 $O(1)$；否则 softmax 会饱和，梯度消失。
- **掩码 $M$**：对角线以上取 $-\infty$ 得到**因果**注意力（解码器）；填充掩码屏蔽 pad token；编码器不使用因果掩码。
- **多头**：把 $d_{model}$ 拆成 $h$ 个大小为 $d_k = d_{model}/h$ 的头，每个头使用各自的 $W_Q, W_K, W_V$ 独立做注意力，拼接后再乘 $W_O$。各头可以分工（句法、共指、位置），总开销与一个大头相同。
- **自注意力 vs 交叉注意力**：自注意力的 $Q, K, V$ 来自同一序列；交叉注意力的 $Q$ 来自解码器，$K, V$ 来自编码器。
- **开销**：每个头的时间为 $O(n^2 d)$，注意力矩阵内存为 $O(n^2)$；这就是长上下文昂贵的原因（FlashAttention 优化的是内存读写，而不是 $n^2$ 的计算量）。
- 注意力是**置换等变**的，所以必须额外加入位置信息（正弦、可学习、RoPE、ALiBi）。

## 示例讲解
两个 token，$d_k = 2$，$Q = K = I$，$V = \begin{pmatrix}1 & 2\\3 & 4\end{pmatrix}$。

分数 $QK^\top = I$，缩放 $1/\sqrt 2$ 后：$\begin{pmatrix}0.707 & 0\\0 & 0.707\end{pmatrix}$。第 0 行 softmax：$e^{0.707} = 2.028$，权重 $= (2.028, 1)/3.028 = (0.670, 0.330)$。

第 0 行输出 $= 0.670\,(1, 2) + 0.330\,(3, 4) = (1.660, 2.660)$。由对称性第 1 行 $= (2.340, 3.340)$。使用因果掩码时，第 0 行只能看到自己，等于 $(1, 2)$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么要把注意力 logits 除以 $\\sqrt{d_k}$？",
  "options": [
    "为了让矩阵变成方阵",
    "为了让点积方差保持在 1 附近，避免 softmax 饱和、梯度消失",
    "为了减少内存",
    "为了保证因果性"
  ],
  "explanation": "不缩放时 $q \\cdot k$ 的方差为 $d_k$；logits 过大会使 softmax 接近 one-hot，梯度消失。"
}
```

```quiz
{
  "id": "q2",
  "question": "token 数从 1k 增加到 4k，每个头的注意力矩阵大小如何变化？",
  "options": [
    "变为 4 倍",
    "变为 8 倍",
    "变为 16 倍",
    "不变"
  ],
  "explanation": "矩阵大小为 $n \\times n$，随长度二次增长：$4^2 = 16$。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "使用 numpy 编写 `attention(Q, K, V, causal=False)`，对单个头返回 `(output, weights)`：缩放点积注意力，并使用数值稳定的按行 softmax。若 `causal` 为真，token i 不能关注 j > i 的 token。",
  "hints": [
    "scores = Q @ K.T / sqrt(d_k)；做 exp 前先减去每行最大值以保证稳定。",
    "在 softmax 之前把对角线以上的分数（np.triu，k=1）设为 -inf。"
  ]
}
```

```reveal
{
  "prompt": "面试题：一个 Transformer 的 $d_{model} = 512$，有 8 个头。$d_k$ 是多少？注意力投影（$W_Q, W_K, W_V, W_O$，忽略偏置）有多少参数？使用 8 个头比 1 个头开销更大吗？",
  "answer": "$d_k = 512/8 = 64$。$W_Q, W_K, W_V, W_O$ 各为 $512 \\times 512$，所以该层有 $4 \\times 512^2 = 1{,}048{,}576$ 个参数，无论 1 个头还是 8 个头都一样。计算量也相同：8 个大小为 64 的头做 $8 \\times n^2 \\times 64 = n^2 \\times 512$ 次乘加，等于一个 512 维的头。唯一的额外开销是 8 个独立的 $n \\times n$ 注意力矩阵（更多内存）。好处：每个头学到不同的注意力模式。"
}
```

> [!TIP] 面试技巧
> - 默写 $\text{softmax}(QK^\top/\sqrt{d_k})V$，并说明每一部分的作用（相似度、缩放、权重、混合）。
> - 说出开销：每个头 $O(n^2 d)$ 时间、$O(n^2)$ 内存；提到 FlashAttention、稀疏和线性注意力等缓解方法。
> - 与一个宽头相比，多头并不增加计算量；它增加的是表示的多样性。

