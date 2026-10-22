---
id: math-norms-and-regularization-geometry
title: 范数与正则化的几何
---

## 为什么重要

“为什么 L1 能产生稀疏性？”是被问得最多的机器学习理论题之一，一张图加一个公式就是有力的回答。本课比基础的正则化一课更深入：把范数看作几何、软阈值、投影，以及贝叶斯视角。

## 概念

**范数**：$\lVert x\rVert_p = (\sum_i |x_i|^p)^{1/p}$。单位球在 $p = 1$ 时是菱形，$p = 2$ 时是圆盘，$p = \infty$ 时是正方形。$p < 1$ 时非凸（星形），而“L0 范数”（非零个数）根本不是范数。矩阵类比：Frobenius 范数 $\lVert A\rVert_F^2 = \sum A_{ij}^2$（对元素的 L2），核范数 $=\sum \sigma_i$（对奇异值的 L1，促进低秩），谱范数 $= \sigma_{\max}$。

**惩罚与约束**：$\min L(w) + \lambda\lVert w\rVert$ 等价于对某个 $t(\lambda)$ 的 $\min L(w)$ s.t. $\lVert w\rVert \le t$（见 Lagrange 乘数一课）。解位于损失等高线第一次接触球的位置。菱形与光滑等高线大概率在尖角处相遇，而尖角处有坐标为零。圆盘没有尖角，所以权重会缩小但不为零。

**闭式解**（正交设计 $X^\top X = I$，$z = X^\top y$ 为 OLS 解）：岭回归给出 $\hat w_j = z_j/(1 + \lambda)$，即统一缩小；lasso 给出 $\hat w_j = \operatorname{sign}(z_j)\max(|z_j| - \lambda, 0)$，即**软阈值**：小的置零，大的减去 $\lambda$。一般情形下，岭回归把第 $j$ 个 SVD 分量缩小 $\sigma_j^2/(\sigma_j^2 + \lambda)$，所以低方差方向被压得最厉害。

**贝叶斯视角**：高斯先验 $\Rightarrow$ L2；Laplace 先验（在 0 处有尖峰）$\Rightarrow$ L1。**弹性网络** $\alpha\lVert w\rVert_1 + (1-\alpha)\lVert w\rVert_2^2$ 保留稀疏性，同时把权重分摊到相关特征上，而 lasso 会随意挑一个。当 $p > n$ 时，lasso 最多选出 $n$ 个特征。

**实践要点**：惩罚前先标准化特征；不要惩罚截距；使用 Adam 时，加在损失里的 L2 与解耦的 weight decay（AdamW）不同，因为自适应分母会重新缩放 L2 梯度。Lasso 用坐标下降或近端梯度求解（$w \leftarrow S(w - \eta\nabla L, \eta\lambda)$）。

## 示例讲解

在范数预算为 2 的约束下，对 $c = (3, 1)$ 最小化 $\lVert w - c\rVert^2$。

L2 球（$\lVert w\rVert_2 \le 2$）：把 $c$ 缩放到长度 2。$\lVert c\rVert = \sqrt{10} \approx 3.162$，所以 $w = 2c/\sqrt{10} \approx (1.897, 0.632)$。两个坐标按比例缩小，都不为零。

L1 球（$\lVert w\rVert_1 \le 2$）：对 $c$ 做阈值为 $\theta$ 的软阈值，使 $(3 - \theta) + \max(1 - \theta, 0) = 2$。试 $\theta = 1$ 得 $2 + 0 = 2$。所以 $w = (2, 0)$：第二个坐标恰好为 0。小的坐标被淘汰，这就是特征选择的缩影。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 L1 惩罚倾向于产生恰好为零的系数，而 L2 不会？",
  "options": [
    "L1 在 0 处可导，会把权重拉向 0",
    "L1 球在坐标轴上有尖角，损失等高线通常先在尖角处接触约束集；而且 L1 对 0 有恒定的拉力，能压过较小的梯度",
    "L2 忽略小权重",
    "L1 的范数值更小"
  ],
  "explanation": "几何上，菱形的顶点在坐标轴上。解析上，L1 在 0 处的次梯度是区间 $[-\\lambda, \\lambda]$，所以损失梯度小于 $\\lambda$ 的权重会恰好停在 0；而 L2 的拉力 $2\\lambda w$ 在 $w \\to 0$ 时趋于 0。"
}
```

```quiz
{
  "id": "q2",
  "question": "在高斯噪声下，岭回归是权重服从哪种先验时的 MAP 估计？",
  "options": [
    "Laplace 先验",
    "以 0 为中心的高斯先验",
    "均匀先验",
    "Cauchy 先验"
  ],
  "explanation": "$N(0, \\tau^2)$ 先验给出 $-\\log p(w) = \\lVert w\\rVert^2 / 2\\tau^2 + \\text{常数}$，即 $\\lambda = \\sigma^2/\\tau^2$ 的 L2 惩罚。Laplace 先验给出 L1 惩罚（lasso）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "纯 Python。对正交设计问题，每个坐标的解有闭式。实现 `soft_threshold(z, lam)`（lasso：$\\operatorname{sign}(z)\\max(|z| - \\lambda, 0)$）、`ridge_shrink(z, lam)`（$z/(1+\\lambda)$）和 $p \\ge 1$ 的 `lp_norm(v, p)`（也接受 `p=float('inf')`）。",
  "hints": [
    "当 $|z| \\le \\lambda$ 时软阈值返回 0，否则把 $z$ 向 0 移动 $\\lambda$。",
    "$p = \\infty$ 的范数是绝对值最大的分量。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "纯 Python。实现向球 $\\lVert x\\rVert_2 \\le r$ 和 $\\lVert x\\rVert_1 \\le r$ 的欧氏投影 `project_l2(v, r)` 与 `project_l1(v, r)`。L1：若 $\\lVert v\\rVert_1 \\le r$ 直接返回 `v`；否则把 $|v|$ 降序排序为 $u$，找到最大的 $k$（从 1 计）使 $u_k - (\\sum_{i\\le k} u_i - r)/k > 0$，令 $\\theta = (\\sum_{i \\le k} u_i - r)/k$，并对每个分量做阈值为 $\\theta$ 的软阈值。",
  "hints": [
    "L2 投影只是把球外的点缩放到球面上。",
    "记录条件成立的最后一个 $k$ 对应的 $\\theta$（条件在前缀 $k$ 上成立）。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "使用 numpy，用循环坐标下降实现 $\\tfrac12\\lVert y - Xw\\rVert^2 + \\lambda\\lVert w\\rVert_1$ 的 `lasso_cd(X, y, lam, sweeps=500)`：对每个 $j$，令偏残差 $r = y - Xw + X_j w_j$，设 $w_j = S(X_j^\\top r, \\lambda) / (X_j^\\top X_j)$，其中 $S$ 为软阈值。返回 `w`。",
  "hints": [
    "对每个坐标重新计算偏残差（问题规模小，开销可以接受）。",
    "最优时，非零的 $w_j$ 满足 $X_j^\\top(y - Xw) = \\lambda\\,\\text{sign}(w_j)$，为零的分量满足 $|X_j^\\top(y - Xw)| \\le \\lambda$（KKT 条件）。"
  ]
}
```

> [!TIP] 面试技巧
> - 分三层回答：几何（尖角）、微积分（0 处次梯度是一个区间）、贝叶斯（Laplace 先验）。画出菱形和圆盘。
> - 掌握软阈值和岭回归的收缩因子 $\sigma^2/(\sigma^2+\lambda)$；这表明你理解的是估计器本身，而不只是口号。
> - 易错点：正则化前不标准化、对偏置做正则化，以及声称 lasso 在特征相关时是稳定的（并非如此，应使用弹性网络）。深度网络可提到 AdamW。
