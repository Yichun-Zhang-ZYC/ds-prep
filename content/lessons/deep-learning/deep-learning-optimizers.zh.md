---
id: deep-learning-optimizers
title: 优化器（SGD、Adam、AdamW）
---

## 为什么重要
优化器决定了梯度如何变成权重更新。“Adam 是怎么工作的？”和“Adam 与 AdamW 有何区别？”几乎是任何深度学习面试必问的问题，LLM 训练也依赖于 AdamW 的细节。

## 概念
**SGD**：$\theta \leftarrow \theta - \eta\, g$，其中 $g$ 是 mini-batch 梯度（有噪声但便宜；噪声有助于逃离尖锐极小值）。

**动量**（PyTorch 形式）：$v \leftarrow \mu v + g$，$\theta \leftarrow \theta - \eta v$，$\mu \approx 0.9$。平滑噪声，沿一致方向加速前进；有助于穿越狭长山谷。**Nesterov** 在前瞻点处计算梯度。

**自适应方法**根据每个参数的梯度历史缩放其步长：
- **RMSProp**：$v \leftarrow \beta_2 v + (1-\beta_2) g^2$，步长 $\eta\, g/(\sqrt v + \epsilon)$。
- **Adam** = 动量 + RMSProp + 偏差修正：
  - $m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t$，$\ v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2$
  - $\hat m_t = m_t/(1-\beta_1^t)$，$\ \hat v_t = v_t/(1-\beta_2^t)$（修正早期因零初始化造成的偏差）
  - $\theta \leftarrow \theta - \eta\, \hat m_t / (\sqrt{\hat v_t} + \epsilon)$
  - 默认值：$\eta = 10^{-3}$，$\beta_1 = 0.9$，$\beta_2 = 0.999$，$\epsilon = 10^{-8}$。LLM 常用 $\beta_2 = 0.95$。
- **带 L2 的 Adam** 把 $\lambda\theta$ 加到梯度上，因此衰减被 $\sqrt{\hat v}$ 除，对权重的收缩不均匀（梯度大的参数收缩较弱）。
- **AdamW** 把权重衰减*解耦*：$\theta \leftarrow \theta - \eta\,(\hat m/(\sqrt{\hat v}+\epsilon) + \lambda\theta)$。衰减是与梯度尺度无关的干净收缩；它是 Transformer 的默认选择。通常偏置和归一化层参数不做衰减。

**权衡**：Adam 收敛快、调参少，适合稀疏梯度和 Transformer；SGD+动量在视觉任务（ResNet）上经过仔细调学习率后泛化往往略好。Adam 每个参数额外存储 2 个张量（优化器状态加权重约为参数内存的 3 倍；混合精度加 fp32 主权重时约 16 字节/参数）。相关：Adafactor、Lion（更省内存）、LAMB/LARS（大 batch）。

## 示例讲解
Adam 第一步，$g_1 = 0.5$，使用默认值：
- $m_1 = 0.1 \cdot 0.5 = 0.05$，$\ v_1 = 0.001 \cdot 0.25 = 0.00025$
- $\hat m_1 = 0.05/0.1 = 0.5$，$\ \hat v_1 = 0.00025/0.001 = 0.25$，所以 $\sqrt{\hat v_1} = 0.5$
- 更新量 $= \eta \cdot 0.5/0.5 = \eta$。

无论梯度尺度如何，第一步的大小都是 $\eta$（试试 $g_1 = 50$：同样是 $\eta$）。如果没有偏差修正，步长会是 $\eta \cdot 0.05/\sqrt{0.00025} = 3.16\,\eta$，太大了。

**动量**：$\mu=0.9$，恒定 $g=1$：$v = 1, 1.9, 2.71, \dots \to 10$。有效步长逐渐增长到 $10\eta$。

**L2 与解耦衰减对比**，$\theta=1$，$g=0.5$，$\eta=0.1$，$\lambda=0.1$（第一步）：
- Adam+L2：$g' = 0.5 + 0.1 = 0.6$；归一化后步长依然是 $\eta$，所以 $\theta = 0.9$。衰减没有产生可见的效果。
- AdamW：$\theta = 1 - 0.1\,(1 + 0.1\cdot 1) = 0.89$。衰减按预期贡献了 $\eta\lambda\theta = 0.01$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 Adam 中，为什么要应用偏差修正（$\\hat m = m/(1-\\beta_1^t)$）？",
  "options": ["为了降低梯度的方差", "为了防止梯度爆炸", "因为 $m$ 和 $v$ 初始化为零，训练早期会偏向零", "为了让 Adam 等价于 SGD"],
  "explanation": "当 $m_0=v_0=0$ 且 $\\beta$ 接近 1 时，早期的滑动平均会低估真实的矩；除以 $1-\\beta^t$ 可以修正。"
}
```

```quiz
{
  "id": "q2",
  "question": "带 L2 正则的 Adam 与 AdamW 有什么区别？",
  "options": ["AdamW 使用更大的学习率", "AdamW 直接对权重施加权重衰减而不是通过梯度，所以不会被 $\\sqrt{\\hat v}$ 重新缩放", "AdamW 没有动量", "它们在数学上完全相同"],
  "explanation": "使用 L2 时，惩罚项的梯度会经过自适应归一化；AdamW 将其解耦，使衰减强度不依赖于梯度历史。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "（标量，纯 Python）实现 `sgd_momentum_step(theta, g, v, lr, mu)`，返回 `(theta, v)`，使用 `v = mu*v + g; theta -= lr*v`；以及 `adam_step(theta, g, m, v, t, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=False)`，返回 `(theta, m, v)`，其中 `t` 从 1 开始计数。如果 `wd > 0` 且不是 `decoupled`，把 `wd*theta` 加到梯度上（L2）；如果是 `decoupled`，则执行 AdamW：用更新前的 theta 减去 `lr*wd*theta`。",
  "hints": ["先用（可能经过 L2 修改的）梯度更新 m 和 v，再计算 m_hat = m/(1-b1**t) 和 v_hat = v/(1-b2**t)。", "AdamW：theta_new = theta - lr * (m_hat/(sqrt(v_hat)+eps) + wd*theta)。"]
}
```

> [!TIP] 面试技巧
> - 要能凭记忆写出 Adam 的更新式，包括偏差修正，并说出默认超参数。
> - 把 AdamW 解释为解耦的权重衰减，并说明为什么在 Adam 内部使用 L2 的缩放是不对的。
> - 了解权衡：Adam 速度快、适合 Transformer，SGD+动量有时泛化更好；提到优化器状态的内存开销。
