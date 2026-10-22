---
id: math-pca-from-linear-algebra
title: PCA 第一性原理
---

## 为什么重要

“推导 PCA”是经典题：它在一道题里考察线性代数、优化和实践判断。本课从第一性原理构建 PCA，并把它与特征分解和 SVD（见相应课程）联系起来。

## 概念

**设定**：先中心化数据（$X_c = X - \bar x$），样本协方差为 $S = X_c^\top X_c/(n-1)$。数据在单位向量 $w$ 上投影的方差为 $w^\top S w$。

**推导**：在 $w^\top w = 1$ 下最大化 $w^\top S w$。Lagrange 函数 $w^\top S w - \lambda(w^\top w - 1)$ 给出 $Sw = \lambda w$，所以 $w$ 是特征向量，方差即 $\lambda$。取最大的特征向量为 PC1；PC2 在与 PC1 正交的向量中最大化方差，依此类推。因为 $S$ 对称半正定，特征向量彼此正交，特征值 $\ge 0$。等价的看法：前 $k$ 维子空间使平方重构误差最小。

**通过 SVD**（库的实际做法）：$X_c = U\Sigma V^\top$。$V$ 的列是主成分，方差为 $\sigma_j^2/(n-1)$，得分为 $X_c V = U\Sigma$，秩 $k$ 重构为 $U_k\Sigma_k V_k^\top$。由 Eckart-Young 定理，它是最佳秩 $k$ 近似：误差 $\lVert X_c - \hat X_k\rVert_F^2 = \sum_{j>k}\sigma_j^2$。SVD 避免构造 $X^\top X$（它会使条件数平方）。

**选择 $k$**：解释方差比例 $\lambda_j/\sum\lambda$；保留累计 90-95%，或在碎石图中找拐点，或按下游任务的验证分数选 $k$。**白化**把得分除以 $\sqrt{\lambda_j}$，得到单位协方差。

**易错点**：（1）一定要中心化；（2）尺度很重要：对原始特征做 PCA 会被大单位的变量主导，所以要标准化（用相关矩阵），除非单位可比；（3）方差不等于相关性：低方差方向可能恰好是有预测力的（PCA 是无监督的）；（4）它只能捕捉线性结构，且受异常值影响；（5）成分的符号是任意的；（6）当 $n < d$ 时，最多只有 $n - 1$ 个成分的方差非零。

## 示例讲解

四个点 $(-2,-2), (0,0), (0,2), (2,0)$。均值为 $(0, 0)$，$X_c^\top X_c = \begin{pmatrix}8&4\\4&8\end{pmatrix}$，所以 $S = \tfrac13\begin{pmatrix}8&4\\4&8\end{pmatrix}$。

$\begin{pmatrix}8&4\\4&8\end{pmatrix}$ 的特征值为 $12$ 和 $4$（特征向量 $(1,1)/\sqrt2$ 和 $(1,-1)/\sqrt2$），所以各主成分方差为 $12/3 = 4$ 和 $4/3$。PC1 的解释方差比例：$4/(4 + 4/3) = 0.75$。

PC1 上的得分：$(x + y)/\sqrt2 = (-2\sqrt2, 0, \sqrt2, \sqrt2)$；平方和为 $8 + 0 + 2 + 2 = 12$，与之吻合。只保留 PC1 时重构误差为 $\sigma_2^2 = 4$（PC2 得分的平方和：$0 + 0 + 2 + 2$），占总平方和 16 的 25%。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "PCA 的方向是协方差矩阵的特征向量。为什么取特征值最大的那些？",
  "options": [
    "它们是最短的向量",
    "对单位向量 $w$，$w^\\top S w$ 是投影的方差；它在最大特征向量处取最大，且等于其特征值",
    "它们使特征数量最少",
    "它们与数据正交"
  ],
  "explanation": "在 $\\lVert w\\rVert = 1$ 下最大化 $w^\\top S w$ 得 $Sw = \\lambda w$（Lagrange），目标值即为 $\\lambda$。后续成分在与前面成分正交的条件下最大化方差。"
}
```

```quiz
{
  "id": "q2",
  "question": "中心化数据矩阵 $X_c$（$n \\times d$）的奇异值为 $\\sigma_j$。第 $j$ 个主成分捕获的方差是多少？",
  "options": [
    "$\\sigma_j$",
    "$\\sigma_j^2$",
    "$\\sigma_j^2/(n-1)$",
    "$\\sigma_j/(n-1)$"
  ],
  "explanation": "$X_c^\\top X_c = V\\Sigma^2 V^\\top$，所以协方差 $X_c^\\top X_c/(n-1)$ 的特征值为 $\\sigma_j^2/(n-1)$。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "使用 numpy 实现 `pca_eig(X, k)`：按列中心化，计算协方差 $S = X_c^\\top X_c/(n-1)$，做特征分解（`np.linalg.eigh`），按降序返回前 `k` 个方向的 `(components, variances, scores)`。`components` 形状为 `(k, d)`（每行一个单位向量），`variances` 形状为 `(k,)`，`scores = X_c @ components.T`。",
  "hints": [
    "`np.linalg.eigh` 返回升序特征值；需按降序排序。",
    "特征向量是返回矩阵的列；转置后每行一个。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "使用 numpy 实现 `pca_svd(X, k)`，基于中心化数据的 SVD 返回 `(components, variances, scores)`（$\\text{variance}_j = \\sigma_j^2/(n-1)$，components 为 $V^\\top$ 的行，scores 为截断的 $U\\Sigma$）。再实现 `recon_error(X, k)`：投影到前 `k` 个主成分再还原的平方 Frobenius 误差 $\\lVert X_c - X_c V_k V_k^\\top\\rVert_F^2$。",
  "hints": [
    "`np.linalg.svd(Xc, full_matrices=False)` 返回 `U, s, Vt`；`Vt` 的行就是主方向。",
    "误差等于被丢弃奇异值的平方和（Eckart-Young），可用于自检。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "使用 numpy 实现 `choose_k(variances, target)`，返回累计解释方差比例不小于 `target` 的最小 `k`；以及 `whiten(X)`，返回 PCA 白化数据 $Z = X_c V \\Lambda^{-1/2}$（保留所有成分），使 `Z` 的协方差为单位阵（用 `ddof=1`）。",
  "hints": [
    "方差已按降序排列；累加直到比例达到目标（允许极小的浮点误差）。",
    "投影到特征向量上实现去相关；把每个得分除以 $\\sqrt{\\lambda_j}$ 使方差相等。"
  ]
}
```

> [!TIP] 面试技巧
> - 两句话给出推导：在单位球面上最大化 $w^\top S w$，所以 $Sw = \lambda w$。然后说“实践中通过对中心化矩阵做 SVD”。
> - 准备好回答：缩放/标准化、如何选 $k$、PCA 与回归的区别（PCA 最小化垂直距离，回归最小化竖直距离）、PCA 与 SVD 的关系，以及为什么线性模型之前做 PCA 可能丢掉低方差的预测信号。
> - 易错点：忘记中心化，或在划分训练/测试集之前对全量数据拟合 PCA（数据泄漏）。应在训练集上拟合，再变换测试集。
