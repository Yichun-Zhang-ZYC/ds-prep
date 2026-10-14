---
id: statistics-maximum-likelihood-estimation
title: 最大似然估计（MLE）
---

## 为什么重要
大多数模型都是用 MLE 拟合的：逻辑回归、泊松回归，以及使用交叉熵损失的神经网络，都是在最大化似然。“推导硬币正面概率 p 的 MLE”是经典的白板题。

## 概念
**似然** $L(\theta) = P(\text{data} \mid \theta)$ 把观测到的数据看作固定的，问哪个参数让这份数据出现的概率最大。MLE 为

$$
\hat\theta_{\text{MLE}} = \arg\max_\theta L(\theta) = \arg\max_\theta \sum_i \log p(x_i \mid \theta)
$$

步骤：写出对数似然（乘积变成求和），求导，令导数为 0，解出参数。

性质（大样本、满足正则条件时）：一致、渐近正态、渐近有效。小样本下它可能有偏，例如正态分布方差的 MLE 除的是 $n$。

最小化**交叉熵 / 对数损失**，正好等价于最大化伯努利似然。

## 示例讲解
抛 $n$ 次硬币得到 $k$ 次正面：

$$
\ell(p) = k \log p + (n - k)\log(1 - p), \qquad \ell'(p) = \frac{k}{p} - \frac{n - k}{1 - p} = 0 \;\Rightarrow\; \hat p = \frac{k}{n}
$$

对泊松计数 $x_1, \dots, x_n$：$\ell(\lambda) = \sum x_i \log\lambda - n\lambda + \text{const}$，所以 $\hat\lambda = \bar x$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "等待时间被建模为 Exponential(λ)，密度为 λe^(−λx)。λ 的 MLE 是什么？",
  "options": ["x̄", "1 / x̄", "n / Σx² ", "中位数"],
  "explanation": "ℓ(λ) = n log λ − λ Σx。令 n/λ − Σx = 0，得到 λ̂ = n / Σx = 1 / x̄。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "对由 0/1 组成的结果列表，编写 `bernoulli_log_likelihood(p, data)`；再编写 `grid_mle(data)`，在 {0.001, 0.002, …, 0.999} 中返回对数似然最大的 p。它应该（大约）落在样本均值上。",
  "hints": ["每个 1 加上 log p，每个 0 加上 log(1 − p)。", "用 max(grid, key=...) 挑出最好的网格点。"]
}
```

> [!TIP] 面试技巧
> - 求导之前一定先取对数似然，并说明原因（求和更容易，数值也更稳定）。
> - 把 MLE 和熟悉的损失函数联系起来：对数损失 ↔ 伯努利，平方误差 ↔ 方差固定的高斯分布。
> - 提一下 MLE 在小样本下的问题（过拟合、概率被估计成 0 或 1），以及先验（MAP）能缓解这些问题。
