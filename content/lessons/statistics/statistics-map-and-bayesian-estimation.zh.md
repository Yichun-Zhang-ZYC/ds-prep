---
id: statistics-map-and-bayesian-estimation
title: MAP 与贝叶斯估计
---

## 为什么重要
“MLE 和 MAP 有什么区别？”“为什么说 L2 正则化是贝叶斯的？”是连接机器学习和统计的标准问题。答案就在于先验。

## 概念
贝叶斯估计把参数看作随机变量，给它一个**先验** $p(\theta)$，再用数据更新：

$$
p(\theta \mid x) \propto p(x \mid \theta)\, p(\theta)
$$

从后验得到的点估计：
- **MAP**（最大后验）：后验的众数，$\arg\max_\theta \big[\log p(x \mid \theta) + \log p(\theta)\big]$。
- **后验均值**：使期望平方误差最小。

MAP = MLE + 来自先验的惩罚项：
- 权重的高斯先验 → **L2（岭回归）**惩罚。
- 拉普拉斯先验 → **L1（lasso）**惩罚。

数据很多时似然占主导，MAP ≈ MLE。数据很少时，先验就很重要。

## 示例讲解
转化率的先验为 Beta(α, β)，$n$ 次访问中有 $k$ 次转化。后验为 Beta(α + k, β + n − k)。

$$
\hat p_{\text{MLE}} = \frac{k}{n}, \qquad \hat p_{\text{MAP}} = \frac{k + \alpha - 1}{n + \alpha + \beta - 2}, \qquad \hat p_{\text{mean}} = \frac{k + \alpha}{n + \alpha + \beta}
$$

先验取 Beta(2, 2)，3 次访问中有 3 次转化：MLE = 1.0（荒谬地自信），MAP = 4/5 = 0.8，后验均值 = 5/7 ≈ 0.71。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "岭回归（L2 惩罚）对应于系数取哪种先验时的 MAP 估计？",
  "options": ["均匀分布", "以 0 为中心的高斯分布", "以 0 为中心的拉普拉斯分布", "Beta 分布"],
  "explanation": "均值为 0 的高斯先验取对数后是 −w²/(2σ²) + 常数，这正是 L2 惩罚。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `estimates(k, n, alpha, beta)`：在 Beta(alpha, beta) 先验下估计转化率，返回 `(mle, map, posterior_mean)`。假设 alpha、beta > 1。",
  "hints": ["后验为 Beta(alpha + k, beta + n − k)。", "Beta(a, b) 的众数是 (a − 1)/(a + b − 2)，均值是 a/(a + b)。"]
}
```

> [!TIP] 面试技巧
> - 一句话：“MAP 就是 MLE 加上先验；先验起到正则化的作用。”
> - 提一下 MAP 对重新参数化不具有不变性，而完整的后验具有。
> - 在产品分析中，贝叶斯估计在小分组和实验早期读数上特别有用。
