---
id: probability-expectation-variance-covariance-correlation
title: 期望、方差、协方差与相关系数
---

## 为什么重要
这四个量是统计和机器学习的基本词汇：指标的均值、它的噪声、两个指标如何一起变化。面试官会考公式，也会考经典陷阱（相关系数与量纲无关、零相关不等于独立）。

## 概念
| 量 | 定义 | 说明 |
|---|---|---|
| 期望 | $E[X] = \sum x\,p(x)$ 或 $\int x f(x)\,dx$ | 长期平均值 |
| 方差 | $\text{Var}(X) = E[(X - \mu)^2] = E[X^2] - E[X]^2$ | 离散程度；单位是平方 |
| 协方差 | $\text{Cov}(X, Y) = E[XY] - E[X]E[Y]$ | 符号表示方向 |
| 相关系数 | $\rho = \dfrac{\text{Cov}(X, Y)}{\sigma_X \sigma_Y}$ | 介于 −1 和 1 之间；无量纲 |

经常用到的规则：

$$
\text{Var}(aX + b) = a^2\,\text{Var}(X) \qquad \text{Var}(X + Y) = \text{Var}(X) + \text{Var}(Y) + 2\,\text{Cov}(X, Y)
$$

独立意味着 $\text{Cov} = 0$，但反过来不成立：若 $X$ 关于 0 对称，$Y = X^2$ 与 $X$ 的相关系数为 0，却完全相关依赖。相关系数只衡量**线性**关系。

## 示例讲解
一个均匀骰子：$E[X] = 3.5$，$E[X^2] = \frac{1 + 4 + 9 + 16 + 25 + 36}{6} = \frac{91}{6}$，所以

$$
\text{Var}(X) = \tfrac{91}{6} - 3.5^2 = \tfrac{35}{12} \approx 2.92
$$

两个独立骰子之和的方差是 $2 \times 35/12 \approx 5.83$；两者平均值的方差是 $5.83 / 4 \approx 1.46$，这就是取平均能降低噪声的原因。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Var(X) = 4，Var(3X − 7) 是多少？",
  "options": ["12", "36", "5", "29"],
  "explanation": "常数只平移不改变离散程度：Var(aX + b) = a²Var(X) = 9 × 4 = 36。"
}
```

```quiz
{
  "id": "q2",
  "question": "Corr(X, Y) = 0。哪种说法一定成立？",
  "options": ["X 与 Y 独立", "X 与 Y 之间没有线性关系", "知道 X 对推断 Y 没有任何帮助", "Cov(X, Y) > 0"],
  "explanation": "零相关只排除了线性关系。Y = X² 是经典的“相关依赖但不相关”的例子。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "不使用任何库，实现 `mean(xs)`、`variance(xs)`（总体方差，除以 n）、`covariance(xs, ys)` 和 `correlation(xs, ys)`。",
  "hints": ["每个函数都在前一个函数的基础上实现。", "最后一个测试是 y = x²：相互依赖，但相关系数为 0。"]
}
```

> [!TIP] 面试技巧
> - 写公式时说明是总体方差（÷n）还是样本方差（÷(n−1)）。
> - 用 $\text{Var}(\bar X) = \sigma^2 / n$ 解释为什么样本越大估计越精确。
> - 被问到相关性时，补一句“相关不代表因果，而且它只反映线性关系”。
