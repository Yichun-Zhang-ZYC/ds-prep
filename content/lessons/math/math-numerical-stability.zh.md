---
id: math-numerical-stability
title: 数值稳定性（log-sum-exp、softmax、溢出）
---

## 为什么重要

浮点数的范围和精度都有限。真实模型会碰到这些问题：exp 溢出导致 loss 为 NaN、概率下溢为 0、方差算出负数。面试官会问如何安全地计算 softmax、交叉熵和方差。

## 概念

**失效模式**。上溢：$e^{x}$ 在 float64 中当 $x > 709$ 时为 $\infty$，在 float32 中当 $x > 88$ 时为 $\infty$；float16 最大只有 65504。下溢：极小的值被冲刷为 0，随后 $\log 0 = -\infty$。**灾难性抵消**：两个几乎相等的大数相减会丢掉有效数字，例如对均值很大的数据计算 $E[x^2] - E[x]^2$。

**Log-sum-exp**：$\operatorname{LSE}(x) = m + \log\sum_i e^{x_i - m}$，其中 $m = \max_i x_i$。于是 $\text{softmax}(x)_i = e^{x_i - \operatorname{LSE}(x)}$，$\log\text{softmax}(x)_i = x_i - \operatorname{LSE}(x)$。这就是框架把 softmax 与交叉熵融合成一个接受 logits 的算子的原因。

**其他稳定形式**：sigmoid 按 $z$ 的符号分支，只对 $-|z|$ 取指数；基于 logits 的二元交叉熵为 $\max(z, 0) - zy + \log(1 + e^{-|z|})$；当 $x$ 很小时，用 `log1p(x)` 和 `expm1(x)`，因为 $1 + x$ 会舍掉信息；概率的乘积（HMM、朴素贝叶斯、似然）在对数空间中计算。

**方差**：使用 Welford 在线更新，既稳定又可跨分片合并：$M_2 = M_{2,a} + M_{2,b} + \delta^2 \frac{n_a n_b}{n_a + n_b}$。**线性代数**：避免构造 $X^\top X$（它会让条件数平方，$\kappa(X^\top X) = \kappa(X)^2$）；用 QR 或 SVD 求解最小二乘。在平方根和分母中加入 $\epsilon$（Adam、LayerNorm）。

**低精度**：混合精度训练把主权重和归约保留在 float32，并在 float16 中使用 loss scaling，避免小梯度下溢。bfloat16 拥有 float32 的范围，但只有约 3 位有效数字。

## 示例讲解

取 logits $x = (1000, 1001, 1002)$。朴素 softmax 计算 $e^{1002} = \infty$，返回 NaN。稳定做法：$m = 1002$，平移后为 $(-2, -1, 0)$，指数为 $(0.1353, 0.3679, 1)$，和为 $1.5032$。

于是 $\operatorname{LSE} = 1002 + \ln 1.5032 = 1002.4076$，softmax $= (0.0900, 0.2447, 0.6652)$。若真实类别是第一类，交叉熵为 $\operatorname{LSE} - x_1 = 2.4076$，全程不会出现巨大的数。

对比 $\{10^9+4, 10^9+7, 10^9+13, 10^9+16\}$ 的方差。真实总体方差为 22.5（偏差为 $\pm6, \pm3$）。朴素公式在 float64 中对两个接近 $10^{18}$ 的数相减，而相邻可表示数相差 128，结果毫无意义；Welford 作用于偏差，保持精确。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么稳定版 softmax 要在取指数前减去 $\\max_i x_i$？输出会改变吗？",
  "options": [
    "为了加速 exp；输出略有变化",
    "为了防止溢出；由于 softmax 的平移不变性，输出在数学上完全相同",
    "为了把 logits 归一化为单位方差；输出会变",
    "只对 float16 有意义；输出相同"
  ],
  "explanation": "对任意常数 $c$，$\\frac{e^{x_i - c}}{\\sum_j e^{x_j - c}} = \\frac{e^{x_i}}{\\sum_j e^{x_j}}$。取 $c = \\max x$ 使所有指数 $\\le 0$，不会溢出（最大项恰为 1）。"
}
```

```quiz
{
  "id": "q2",
  "question": "你要计算 10,000 个独立观测的对数似然，哪种做法是安全的？",
  "options": [
    "先把概率相乘，再取对数",
    "对各个观测的对数概率求和",
    "先归一化概率再相乘",
    "为了速度使用 float16"
  ],
  "explanation": "10,000 个小于 1 的数相乘会下溢为 0（float64 的下限约为 $10^{-308}$）。对数求和则让数值保持在合理范围内。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "纯 Python（使用 `math` 模块）。实现 `logsumexp(xs)`（数值稳定，空列表返回 `-inf`）、`softmax(xs)` 和 `log_softmax(xs)`，使其对 `[1000, 1001, 1002]` 和 `[-1000, -1001]` 这样的输入也能正常工作。",
  "hints": [
    "提出最大值：$\\log\\sum e^{x_i} = m + \\log\\sum e^{x_i - m}$。",
    "$\\log\\text{softmax}(x)_i = x_i - \\text{logsumexp}(x)$；不要先算 softmax 再取 log。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "实现 `sigmoid(z)` 和 `bce_with_logits(z, y)`（单个 logit `z`、标签 `y` 取 {0, 1} 的二元交叉熵），使二者在 $|z|$ 达到 1000 时也不溢出。损失使用 $\\max(z,0) - zy + \\log(1 + e^{-|z|})$，并使用 `math.log1p`。",
  "hints": [
    "按 $z$ 的符号分支，使指数运算只作用于非正数。",
    "当 $y = 0$ 且 $z$ 很大时损失约为 $z$；当 $y = 1$ 且 $z$ 很负时约为 $-z$。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "实现使用 $E[x^2] - E[x]^2$ 的 `naive_var(xs)`，以及单遍扫描的 `welford_var(xs)`（总体方差），更新式为 `delta = x - mean; mean += delta / n; M2 += delta * (x - mean)`。数据带有巨大偏移时朴素方法会丢失精度；再实现 `merge(a, b)`，合并两个 `(n, mean, M2)` 摘要。",
  "hints": [
    "总体方差为 `M2 / n`。",
    "合并规则：$M2 = M2_a + M2_b + \\delta^2\\, n_a n_b / (n_a + n_b)$，其中 $\\delta = \\text{mean}_b - \\text{mean}_a$。"
  ]
}
```

> [!TIP] 面试技巧
> - 立刻说出“减去最大值”和“log-sum-exp”；并提到框架会把 softmax 与交叉熵融合（`CrossEntropyLoss` 接收 logits）。
> - 记住范围：float32 在 $e^{88}$ 附近上溢，float64 在 $e^{709}$ 附近，float16 为 65504。解释 loss scaling，以及为何 bfloat16 不需要它。
> - 易错点：把 `log(softmax(x))` 或 `log(sigmoid(z))` 分两步计算，应使用 `log_softmax` 和 `logsigmoid`。流式方差也绝不要用 $E[x^2]-E[x]^2$。
