---
id: deep-learning-rnn-lstm-gru
title: RNN、LSTM、GRU
---

## 为什么重要
在 Transformer 之前，循环网络是序列任务的标准方案。面试官仍会问普通 RNN 为什么会遗忘、LSTM 的门如何解决这个问题，以及 GRU 有何不同。

## 概念
**普通 RNN** 在每一步重复使用同一组权重，并传递一个隐藏状态：
$$h_t = \tanh(W_h h_{t-1} + W_x x_t + b)$$
训练使用**时间反向传播（BPTT）**：把循环展开，通过每一步反向传播（出于成本考虑常常截断到一个窗口）。

**问题**：$\partial h_T/\partial h_t$ 是 $T - t$ 个雅可比矩阵的乘积，每个约为 $W_h^\top \text{diag}(\tanh')$。如果最大奇异值小于 1，乘积会**消失**（无法学习长程依赖）；大于 1 则会**爆炸**（用梯度裁剪解决）。

**LSTM** 增加了带有加法更新的**细胞状态** $c_t$ 和三个门（$\sigma$ 输出在 $(0,1)$ 内）：
$$f_t = \sigma(\cdot),\ i_t = \sigma(\cdot),\ o_t = \sigma(\cdot),\ \tilde c_t = \tanh(\cdot)$$
$$c_t = f_t \odot c_{t-1} + i_t \odot \tilde c_t, \qquad h_t = o_t \odot \tanh(c_t)$$
每个门的形式为 $W x_t + U h_{t-1} + b$。因为 $\partial c_t/\partial c_{t-1} = f_t$（没有反复的压缩矩阵），当遗忘门接近 1 时，梯度可以跨越很多步传播。遗忘偏置通常初始化为约 1。**参数量**：隐藏维度 $H$、输入维度 $D$ 时为 $4\,(H(H + D) + H)$。

**GRU** 用两个门（更新门 $z_t$ 和重置门 $r_t$）合并了细胞状态和隐藏状态：$h_t = (1 - z_t) \odot h_{t-1} + z_t \odot \tilde h_t$，其中 $\tilde h_t = \tanh(W x_t + U(r_t \odot h_{t-1}) + b)$。它有 3 组权重而不是 4 组（参数约少 25%），训练更快，精度常与 LSTM 相当。

**实践要点**：双向 RNN 同时读取两个方向（不适用于生成）；多层堆叠并在层间使用 dropout；变长批次需要填充和打包。**Transformer 胜出的原因**：RNN 是顺序计算的（沿时间无法并行），长程信号仍会衰减；注意力一步就能连接任意两个位置。

## 示例讲解
**梯度消失**：标量 RNN $h_t = \tanh(0.5\,h_{t-1} + x_t)$，$h_0 = 0$，输入 $x = (1, 0)$。

$h_1 = \tanh(1) = 0.762$；$h_2 = \tanh(0.5 \cdot 0.762) = \tanh(0.381) = 0.363$。$x_1$ 对 $h_t$ 的影响每一步缩小 $0.5\,\tanh' \le 0.5$ 倍；20 步之后 $\le 0.5^{20} \approx 10^{-6}$。

**LSTM 参数量**：$D = 128$，$H = 256$：$4\,(256 \cdot (256 + 128) + 256) = 4 \cdot 98{,}560 = 394{,}240$。相同尺寸的 GRU 是它的 $\tfrac34$：$295{,}680$。

**一个 LSTM 步**，所有预激活为 0：每个门都是 $\sigma(0) = 0.5$，$\tilde c = \tanh(0) = 0$。当 $c_{t-1} = 1$：$c_t = 0.5\cdot1 + 0.5\cdot0 = 0.5$，$h_t = 0.5\,\tanh(0.5) = 0.231$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 LSTM 的细胞状态有助于处理长程依赖？",
  "options": [
    "它的更新是加法形式 $c_t = f_t \\odot c_{t-1} + \\dots$，梯度通过时只乘以遗忘门这一个因子",
    "它用 ReLU 代替 tanh",
    "它的参数比 RNN 多",
    "它不再需要 BPTT"
  ],
  "explanation": "$\\partial c_t / \\partial c_{t-1} = f_t$。当 $f_t \\approx 1$ 时，梯度得以保留，而不是被权重矩阵反复相乘并压缩。"
}
```

```quiz
{
  "id": "q2",
  "question": "与相同隐藏维度的 LSTM 相比，GRU 具有：",
  "options": [
    "更多的门和更多的参数",
    "完全没有门",
    "更少的参数（3 组权重而不是 4 组），且没有单独的细胞状态",
    "参数数量相同，但有单独的记忆单元"
  ],
  "explanation": "GRU 有更新门和重置门，并合并了细胞状态与隐藏状态；参数量为 3H(H+D+1)，而 LSTM 为 4H(H+D+1)（单偏置约定）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写针对单个样本的 `lstm_step(x, h, c, W, U, b)`。`W` 形状为 (4H, D)，`U` 形状为 (4H, H)，`b` 形状为 (4H,)。计算 `z = W @ x + U @ h + b`，并按输入门 `i`、遗忘门 `f`、候选 `g`、输出门 `o` 的顺序切成四个大小为 H 的块。对 i、f、o 应用 sigmoid，对 g 应用 tanh。返回 `(h_new, c_new)`。同时编写 `lstm_param_count(d, h)`（单偏置约定）。",
  "hints": [
    "`i, f, g, o = np.split(z, 4)`。",
    "c_new = f * c + i * g；h_new = o * np.tanh(c_new)。"
  ]
}
```

> [!TIP] 面试技巧
> - 把梯度消失解释为沿时间的雅可比矩阵连乘，把 LSTM 的加法细胞通路讲成解决办法。
> - 掌握门的公式和参数量公式 $4(H(H+D)+H)$；GRU 约为它的 3/4。
> - 与 Transformer 对比：RNN 是顺序的、长程能力较弱，但推理时每步内存恒定。
