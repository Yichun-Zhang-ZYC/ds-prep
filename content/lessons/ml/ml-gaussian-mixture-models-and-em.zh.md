---
id: ml-gaussian-mixture-models-and-em
title: 高斯混合模型与 EM 算法
---

## 为什么重要
GMM 给出**软**的簇分配，并能建模椭圆形的簇；而它背后的期望最大化（EM）算法是经典理论题。EM 也出现在 HMM、缺失数据问题和主题模型中。

## 概念
GMM 认为每个点来自 $K$ 个高斯分量之一：

$$
p(x) = \sum_{k=1}^{K} \pi_k \, \mathcal{N}(x \mid \mu_k, \Sigma_k), \qquad \sum_k \pi_k = 1
$$

生成每个点的分量是一个隐（潜在）变量，所以无法直接最大化似然。**EM** 交替进行：

- **E 步**：计算**责任度（responsibilities）**，即分量 $k$ 生成点 $i$ 的后验概率：
$$
\gamma_{ik} = \frac{\pi_k \, \mathcal{N}(x_i \mid \mu_k, \Sigma_k)}{\sum_j \pi_j \, \mathcal{N}(x_i \mid \mu_j, \Sigma_j)}
$$
- **M 步**：用责任度加权的统计量重新估计参数：$N_k = \sum_i \gamma_{ik}$，$\pi_k = N_k / n$，$\mu_k = \frac{1}{N_k}\sum_i \gamma_{ik} x_i$，$\Sigma_k = \frac{1}{N_k}\sum_i \gamma_{ik}(x_i - \mu_k)(x_i - \mu_k)^\top$。

每次迭代都不会降低似然；它收敛到局部最优，所以要用多次初始化（常用 k-means 的结果初始化）。

与 k-means 对比：k-means 是 GMM 在方差相等、球形、趋于零且硬分配时的极限。GMM 能处理大小不同的椭圆形簇并给出概率，但更慢，而且可能塌缩（某个分量收缩到单个点上；加一个小的方差下限）。用 **BIC/AIC** 选择 $K$。在拟合好的 GMM 下 $p(x)$ 很低，是一个简单的异常分数。

## 示例讲解
一维，两个分量，$\pi = (0.5, 0.5)$，$\mu = (0, 4)$，$\sigma = (1, 1)$。对 $x = 1$：$\mathcal{N}(1 \mid 0, 1) \propto e^{-0.5}$，$\mathcal{N}(1 \mid 4, 1) \propto e^{-4.5}$。分量 1 的责任度 $= e^{-0.5}/(e^{-0.5} + e^{-4.5}) = 1/(1 + e^{-4}) \approx 0.982$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "GMM 的 EM 算法中，E 步计算的是什么？",
  "options": ["新的均值和方差", "每个点属于每个分量的后验概率", "分量的个数", "似然函数的梯度"],
  "explanation": "E 步以软的方式填补隐藏的分配（责任度）；M 步更新参数。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么你可能选择 GMM 而不是 k-means？",
  "options": ["它更快", "你需要软（概率性）分配，或者簇是大小不同的椭圆形", "它不需要指定簇数", "它在极高维度下效果更好"],
  "explanation": "GMM 建模协方差并给出隶属概率；你仍然需要选择 K（例如用 BIC）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "为一维 GMM 实现一次 EM 迭代。编写 `normal_pdf(x, mu, sigma)`；`e_step(xs, pis, mus, sigmas)` 返回责任度列表的列表（每个点一个）；`m_step(xs, resp)` 返回 `(pis, mus, sigmas)`，其中 sigma 为加权标准差。",
  "hints": ["E 步：权重 = π·N(x)，然后对每个点归一化。", "M 步：N_k = 责任度之和；均值和方差都用责任度加权。"]
}
```

> [!TIP] 面试技巧
> - 用两句话解释 EM：E 步以软的方式猜测隐藏的分配；M 步假设这些猜测是真的，重新拟合参数。
> - 联系 k-means（硬分配、球形簇），并提到用 BIC 选择 K。
> - 指出局部最优、用 k-means 初始化，以及用方差下限防止塌缩。
