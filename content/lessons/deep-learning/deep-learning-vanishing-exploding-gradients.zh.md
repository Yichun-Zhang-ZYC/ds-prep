---
id: deep-learning-vanishing-exploding-gradients
title: 梯度消失 / 梯度爆炸
---

## 为什么重要
梯度问题解释了为什么深度网络和循环网络在几十年里都难以训练，也解释了 ReLU、残差连接、归一化、LSTM 和梯度裁剪为何存在。面试会问：成因是什么、如何检测、如何修复。

## 概念
反向传播要逐层乘以一个 Jacobian。对 $L$ 层的链：
$$\frac{\partial L}{\partial h_0} = \prod_{l=1}^{L} \big(\text{diag}(\phi'(z_l))\,W_l\big)^\top \frac{\partial L}{\partial h_L}$$
如果典型因子的量级 $<1$，乘积会随深度指数级**消失**；如果 $>1$，则会**爆炸**。靠前的层（或 RNN 中靠前的时间步）会得到极小或极大的更新。

**成因**：饱和型激活函数（$\sigma' \le 0.25$，tanh 饱和时导数很小）、谱范数小于或大于 1 的权重、糟糕的初始化、很长的序列（RNN：同一个 $W$ 被乘 $T$ 次）。

**症状**：消失：靠前层的梯度范数比靠后层小几个数量级，损失停滞，权重几乎不变。爆炸：损失突增或出现 `NaN`/`inf`，梯度范数极大。

**补救措施**
- ReLU 系列激活函数（激活时梯度为 1）。
- 合适的初始化（He/Xavier），使每层增益约为 1。
- **残差连接**：$h_{l+1} = h_l + F(h_l)$ 的梯度为 $I + \partial F/\partial h$，提供了绕过连乘的恒等路径。
- **归一化**（BatchNorm/LayerNorm）使预激活值保持在合理范围内。
- **门控循环单元**（LSTM/GRU）：加性的细胞状态路径。
- 针对爆炸的**梯度裁剪**：按值裁剪，或按全局范数裁剪，$g \leftarrow g \cdot \min(1, c/\lVert g\rVert)$，这样能保持方向。是 RNN 和 Transformer 的标准做法（例如 $c=1.0$）。
- 降低学习率 / warmup；RNN 使用截断式 BPTT。
- 裁剪只能解决梯度爆炸；梯度消失需要改变架构。

## 示例讲解
**消失**：一个 10 层的 sigmoid 网络在最佳情况下 $\sigma' = 0.25$ 且权重接近 1，到第一层时梯度缩小了 $0.25^{10} = 9.5\times10^{-7}$ 倍。若使用 ReLU（导数为 1）且增益为 1，则保持为 1。

**爆炸**：每层增益 1.5，10 层后为 $1.5^{10} = 57.7$；50 层后 $1.5^{50} \approx 6.4\times10^{8}$。

**残差**：对 $h_{l+1} = h_l + F(h_l)$，层的 Jacobian 为 $I + J_F$。即使 $J_F \approx 0$，梯度也会原样通过，所以 100 层也不会把它缩小到 $0$。

**按全局范数裁剪**：梯度 $g = [3, 4]$，$\lVert g\rVert = 5$，阈值 $c = 1$：按 $c/\lVert g\rVert = 0.2$ 缩放，得到 $[0.6, 0.8]$，范数为 1，方向不变。如果 $\lVert g\rVert \le c$ 则不做任何改变。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个很深的纯 sigmoid 网络在前几层训练得非常慢。最可能的原因是什么？",
  "options": ["最后一层的学习率太低", "梯度消失，因为多层累乘了 $\\sigma' \\le 0.25$", "梯度爆炸", "batch 太大"],
  "explanation": "许多不超过 0.25 的因子相乘会指数级缩小，所以靠前的层几乎得不到信号。"
}
```

```quiz
{
  "id": "q2",
  "question": "按全局范数裁剪做了什么？",
  "options": ["把较小的梯度置零", "把每个分量裁剪到 [−c, c]，会改变方向", "把整个梯度向量缩放到范数至多为 $c$，并保持方向", "修复梯度消失"],
  "explanation": "全局范数裁剪把所有梯度乘以 $\\min(1, c/\\lVert g\\rVert)$；按值裁剪可能扭曲方向。它对梯度消失没有帮助。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `chain_gradient(ws, derivs)`，返回各层 `w * d` 的乘积（标量链）；`depth_to_vanish(factor, eps)`，返回满足 `factor ** L < eps` 的最小层数 `L`（0 < factor < 1）；以及 `clip_by_global_norm(grads, max_norm)`，输入浮点数列表，仅当其 L2 范数超过 `max_norm` 时才进行缩放。",
  "hints": ["循环：不断乘以 factor，直到累积乘积低于 eps，同时计数。", "scale = max_norm / norm if norm > max_norm else 1.0。"]
}
```

> [!TIP] 面试技巧
> - 从“反向传播是 Jacobian 的连乘”讲起：量级小于 1 消失，大于 1 爆炸。
> - 按成因列出修复方法：激活函数（ReLU）、初始化、架构（残差、LSTM、归一化）、优化（裁剪、学习率）。
> - 表述要准确：裁剪解决的是梯度爆炸，而不是梯度消失。
