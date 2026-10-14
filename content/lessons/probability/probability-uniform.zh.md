---
id: probability-uniform
title: 均匀分布
---

## 为什么重要
均匀分布常出现在脑筋急转弯里（“在一根木棍上随机取两个点”），也是所有模拟的起点：随机数生成器产生的是 Uniform(0, 1)，其他分布都由它构造。

## 概念
**连续均匀分布 Uniform(a, b)**：$[a, b]$ 中每个值的可能性都相同。

$$
f(x) = \frac{1}{b - a}, \qquad E[X] = \frac{a + b}{2}, \qquad \text{Var}(X) = \frac{(b - a)^2}{12}
$$

**离散均匀分布**，取值 $\{1, \dots, n\}$（均匀骰子）：$E = (n + 1)/2$，$\text{Var} = (n^2 - 1)/12$。

**逆变换采样**：若 $U \sim \text{Uniform}(0, 1)$，$F$ 是某个 CDF，则 $F^{-1}(U)$ 服从分布 $F$。例如 $-\ln(U)/\lambda$ 服从 Exponential($\lambda$)。

## 示例讲解
$X, Y$ 独立且都服从 Uniform(0, 1)。$P(X + Y < 1)$ 是多少？

$(X, Y)$ 均匀地填满单位正方形，$X + Y < 1$ 是对角线下方的三角形，面积为 $1/2$。只要联合分布是均匀的，就可以用几何代替积分。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "X ~ Uniform(0, 1)。E[X²] 是多少？",
  "options": ["1/2", "1/3", "1/4", "1/12"],
  "explanation": "∫₀¹ x² dx = 1/3。于是 Var(X) = 1/3 − (1/2)² = 1/12，与公式一致。"
}
```

```quiz
{
  "id": "q2",
  "question": "独立抽取两个 Uniform(0, 1) 的值。较大的那个小于 0.5 的概率是多少？",
  "options": ["0.5", "0.25", "0.75", "0.125"],
  "explanation": "两个都必须小于 0.5：0.5 × 0.5 = 0.25。n 个均匀变量最大值的 CDF 是 xⁿ。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `exponential_sample(lam, u)`：用逆变换 $-\\ln(1-u)/\\lambda$ 把一个 Uniform(0,1) 的数 `u` 变成 Exponential(`lam`) 样本。再编写 `mean_of_samples(lam, n, seed)`：用 `random.Random(seed).random()` 抽取 `n` 个样本并返回它们的均值。",
  "hints": ["指数分布的 CDF 是 F(x) = 1 − e^(−λx)；从 u = F(x) 解出 x。", "Exponential(2) 的均值是 1/2。"]
}
```

> [!TIP] 面试技巧
> - 两三个均匀变量的问题，画出正方形或立方体，计算面积或体积。
> - 记住 Var = (b − a)²/12，它会出现在“舍入误差”和量化类问题中。
> - 被问到“怎么从分布 X 中采样？”时，提出逆变换采样。
