---
id: math-momentum-rmsprop-adam
title: 动量、RMSProp、Adam
---

## 为什么重要
普通 SGD 在“峡谷”地形（一个方向陡、另一个方向平）以及梯度尺度差异很大的参数上表现不佳。Adam 是深度学习的默认优化器，面试官希望你能默写它的更新公式并解释每个部分。

## 概念
**Momentum（动量）** 保留过去梯度的指数衰减累加，因此方向一致时会加速，来回震荡时会相互抵消：
$$v_t = \beta v_{t-1} + g_t, \qquad \theta_t = \theta_{t-1} - \eta\, v_t \quad (\beta \approx 0.9)$$

**RMSProp** 用梯度平方的滑动均方根去除每个坐标，让每个参数拥有自己的有效步长：
$$s_t = \rho s_{t-1} + (1-\rho) g_t^2, \qquad \theta_t = \theta_{t-1} - \eta \frac{g_t}{\sqrt{s_t} + \epsilon}$$

**Adam** 把两者结合：一阶矩平均 $m_t$（方向）和二阶矩平均 $v_t$（尺度），由于两者都从 0 开始，所以需要偏差修正：
$$m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t, \quad v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2$$
$$\hat m_t = \frac{m_t}{1-\beta_1^t}, \quad \hat v_t = \frac{v_t}{1-\beta_2^t}, \quad \theta_t = \theta_{t-1} - \eta \frac{\hat m_t}{\sqrt{\hat v_t} + \epsilon}$$

默认值：$\beta_1 = 0.9$，$\beta_2 = 0.999$，$\epsilon = 10^{-8}$。**AdamW** 把权重衰减与自适应步长解耦（衰减直接作用在 $\theta$ 上，而不是加到梯度里），因此泛化比带 L2 的 Adam 更好。自适应方法对学习率不那么敏感；带动量的 SGD 在视觉任务上泛化往往略好，但需要更多调参。

## 示例讲解
从 $x_0 = 1$ 出发，用 $\eta = 0.1$ 最小化 $f(x) = x^2$（梯度为 $2x$）。

- Momentum（$\beta = 0.9$）：第 1 步：$g = 2$，$v = 2$，$x = 1 - 0.2 = 0.8$。第 2 步：$g = 1.6$，$v = 0.9 \cdot 2 + 1.6 = 3.4$，$x = 0.8 - 0.34 = 0.46$。速度不断累积，所以第二步比第一步更大。
- Adam 第 1 步：$g = 2$，$m = 0.2$，$v = 0.004$，$\hat m = 0.2/0.1 = 2$，$\hat v = 0.004/0.001 = 4$，步长为 $0.1 \cdot 2/2 = 0.1$，于是 $x = 0.9$。第 1 步中 Adam 的步长约为 $\eta \cdot \text{sign}(g)$，与梯度尺度无关。这种尺度不变性正是它稳健的原因。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 Adam 要对 $m_t$ 和 $v_t$ 做偏差修正？",
  "options": [
    "为了降低梯度的方差",
    "两个平均值都初始化为 0，所以早期估计会偏向 0",
    "为了保证在非凸损失上收敛",
    "为了让更新与学习率无关"
  ],
  "explanation": "由于 $m_0 = v_0 = 0$ 且衰减率接近 1，最初几步的平均值会严重偏小。除以 $1-\\beta^t$ 把它们重新缩放为无偏估计；随着 $t$ 增大，这个效果会消失。"
}
```

```quiz
{
  "id": "q2",
  "question": "两个参数的梯度大小恒定，分别为 100 和 0.01。忽略 $\\epsilon$，Adam 对它们的更新幅度相比如何？",
  "options": [
    "第一个走得远约 10,000 倍",
    "两者每步都大约移动 $\\eta$",
    "第二个走得更远",
    "两者都不动"
  ],
  "explanation": "Adam 除以梯度的均方根，所以对任意尺度的稳定梯度，$\\hat m/\\sqrt{\\hat v} \\approx \\pm 1$。而 SGD 会让第一个参数走得远 10,000 倍。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现三个一维优化器，从 `x0` 出发，对梯度为 `grad(x)` 的函数执行 `steps` 次更新并返回最终的 `x`：`momentum(grad, x0, lr, beta, steps)`（$v = \\beta v + g$，$x \\mathrel{-}= lr \\cdot v$）、`rmsprop(grad, x0, lr, rho, steps, eps=1e-8)` 以及带偏差修正的 `adam(grad, x0, lr, steps, b1=0.9, b2=0.999, eps=1e-8)`（$t$ 从 1 开始）。",
  "hints": [
    "把状态（速度、平方滑动平均、m、v）存放在局部变量中，并在更新参数之前先更新它们。",
    "在 Adam 中，每步只计算一次梯度，然后使用 $1 - \\beta^t$，其中 $t$ 从 1 开始。"
  ]
}
```

> [!TIP] 面试技巧
> - 能写出 Adam 的更新公式并说明每个矩的作用：$m$ 是方向（动量），$v$ 是逐参数的尺度（类似 RMSProp）。
> - 了解 AdamW（解耦权重衰减），以及训练 Transformer 时 Adam 通常需要 warmup 和学习率调度。
> - 陷阱：省略偏差修正会让最初几步错误地过小（Adam）或过大（$\rho$ 和 $\epsilon$ 很小的 RMSProp）。
