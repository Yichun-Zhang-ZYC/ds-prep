---
id: math-svd
title: 奇异值分解（SVD）
---

## 为什么重要
奇异值分解适用于任意矩阵，是 PCA、低秩近似、LSA、推荐系统分解、伪逆和 LoRA 背后的主力工具。在机器学习面试中，它是继特征向量之后被问得最多的线性代数话题。

## 概念
**定义**：任意 $A \in \mathbb{R}^{m\times n}$ 都可分解为 $A = U\Sigma V^\top$。
- $U$（$m\times m$）和 $V$（$n\times n$）是正交矩阵：其列为**左/右奇异向量**。
- $\Sigma$ 是对角矩阵，对角线为**奇异值** $\sigma_1 \ge \sigma_2 \ge \dots \ge 0$。
- 几何意义：旋转（$V^\top$）、沿坐标轴拉伸 $\sigma_i$（$\Sigma$）、再旋转（$U$）。单位球被映射为半轴为 $\sigma_i u_i$ 的椭球。
- 等价的求和形式：$A = \sum_i \sigma_i u_i v_i^\top$（秩 1 分量之和）。**紧凑/瘦 SVD** 只保留 $r = \text{rank}(A)$ 个非零项。

**与特征分解的联系**：$A^\top A = V\Sigma^\top\Sigma V^\top$，所以 $v_i$ 是 $A^\top A$ 的特征向量，$\sigma_i^2$ 是其特征值（同理 $AA^\top$ 对应 $u_i$）。与特征分解不同，SVD 对**所有**矩阵（包括长方形矩阵）都存在，且 $\sigma_i$ 为非负实数。

**需要掌握的事实**：
- $\text{rank}(A)$ = 非零 $\sigma_i$ 的个数。$\|A\|_2 = \sigma_1$（谱范数），$\|A\|_F^2 = \sum\sigma_i^2$。对方阵，$|\det A| = \prod\sigma_i$。
- 条件数 $\kappa = \sigma_1/\sigma_r$：越大越病态。
- **Eckart-Young 定理**：最佳秩 $k$ 近似（在谱范数和 Frobenius 范数下）为 $A_k = \sum_{i\le k}\sigma_i u_iv_i^\top$。误差：$\|A - A_k\|_2 = \sigma_{k+1}$，$\|A-A_k\|_F^2 = \sum_{i>k}\sigma_i^2$。
- **伪逆**：$A^+ = V\Sigma^+U^\top$（对非零 $\sigma_i$ 取倒数）；给出最小二乘/最小范数解。
- 秩 $k$ 近似的存储：$k(m+n+1)$ 个数，而不是 $mn$。

**与机器学习的联系**：
- **PCA**：先中心化 $X$，再 $X = U\Sigma V^\top$；主方向是 $V$ 的列，方差为 $\sigma_i^2/(n-1)$。SVD 是数值上更受青睐的方式（无需构造 $X^\top X$）。
- **LSA / 推荐系统**：对词-文档或用户-物品矩阵做截断 SVD 得到低维嵌入。
- **LoRA**：把权重更新写成 $W + BA$，秩 $r \ll d$。**图像/嵌入压缩**保留前 $k$ 个分量。
- **随机化/截断 SVD** 可扩展到超大矩阵；完整 SVD 的代价为 $O(\min(mn^2, m^2n))$。

## 示例讲解
设 $A = \begin{pmatrix}3&0\\4&5\end{pmatrix}$。
- $A^\top A = \begin{pmatrix}25&20\\20&25\end{pmatrix}$，特征值为 $45$ 和 $5$（特征向量 $(1,1)/\sqrt2$ 和 $(1,-1)/\sqrt2$）。所以 $\sigma_1 = \sqrt{45} \approx 6.708$，$\sigma_2 = \sqrt5 \approx 2.236$。
- 验证：$\sigma_1\sigma_2 = \sqrt{225} = 15 = |\det A|$；$\sigma_1^2 + \sigma_2^2 = 50 = 9+0+16+25 = \|A\|_F^2$。
- $\sigma_1$ 对应的左向量：$u_1 = Av_1/\sigma_1 = (3, 9)/\sqrt2/\sqrt{45} = (1,3)/\sqrt{10}$。
- 最佳秩 1 近似：$A_1 = \sigma_1u_1v_1^\top = \begin{pmatrix}1.5&1.5\\4.5&4.5\end{pmatrix}$（各行是 $(1,1)$ 的倍数）。其误差 $A - A_1 = \begin{pmatrix}1.5&-1.5\\-0.5&0.5\end{pmatrix}$，$\|A-A_1\|_F^2 = 2.25+2.25+0.25+0.25 = 5 = \sigma_2^2$。
- 秩 1 近似保留了平方 Frobenius“能量”的 $45/50 = 90\%$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "关于 SVD 与特征分解，下列哪项正确？",
  "options": [
    "SVD 只对对称矩阵存在",
    "奇异值可以为负",
    "SVD 对任意矩阵存在，且 sigma_i^2 是 A^T A 的特征值",
    "左、右奇异向量总是相等"
  ],
  "explanation": "SVD 对每个实矩阵都有定义；奇异值非负，右奇异向量把 A^T A 对角化，特征值为 sigma_i^2。"
}
```

```quiz
{
  "id": "q2",
  "question": "某矩阵的奇异值为 10、5、1、0.1。其最佳秩 2 近似的 Frobenius 误差是多少？",
  "options": [
    "sqrt(1.01)",
    "1",
    "5",
    "sqrt(125)"
  ],
  "explanation": "由 Eckart-Young 定理，平方 Frobenius 误差等于被舍弃的 sigma_i^2 之和 = 1 + 0.01 = 1.01，所以误差为 sqrt(1.01)。谱范数误差则为 1。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "对矩阵（列表的列表）实现 `top_singular(A, iters=300)`：从 `v = [1, 0, ..., 0]` 出发，对 $A^\\top A$ 做幂迭代。返回 `(sigma, u, v)`，其中 `v` 是单位右奇异向量，`sigma = ||A v||`，`u = A v / sigma`。再编写 `rank1(A)`，返回矩阵 $\\sigma u v^\\top$（最佳秩 1 近似）。",
  "hints": [
    "每次迭代：`w = A^T (A v)`，再把 w 归一化得到下一个 v。",
    "收敛后，`sigma = ||A v||`，`u = A v / sigma`。",
    "对 A = [[3,0],[4,5]]，应得 sigma = sqrt(45)，平方 Frobenius 误差为 5。"
  ]
}
```

> [!TIP] 面试技巧
> - 写出 A = U Sigma V^T 并解释为旋转、拉伸、再旋转；通过协方差矩阵的特征向量联系到 PCA。
> - 引用 Eckart-Young：截断 SVD 是最优低秩近似，误差由被舍弃的奇异值决定。
> - 提到伪逆和条件数这些实际用途，以及用截断/随机化 SVD 应对大规模数据。
