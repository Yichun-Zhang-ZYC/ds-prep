---
id: math-matrix-multiplication-transpose-inverse
title: 矩阵乘法、转置与逆
---

## 为什么重要
神经网络的一层就是一次矩阵乘法，线性回归是矩阵方程，协方差、PCA 和注意力都是矩阵乘积。面试官会考查你对形状、转置与逆的运算规则的掌握，以及为什么我们几乎从不显式求逆。

## 概念
**矩阵乘积**：若 $A$ 是 $m \times n$、$B$ 是 $n \times p$，则 $C = AB$ 是 $m \times p$，$C_{ij} = \sum_k A_{ik} B_{kj}$（$A$ 的第 $i$ 行与 $B$ 的第 $j$ 列做点积）。内部维度必须匹配；代价为 $O(mnp)$。
- **不满足交换律**：一般 $AB \ne BA$（常常只有一个有定义）。**满足结合律**：$(AB)C = A(BC)$，所以加括号的方式改变代价而不改变结果。**满足分配律**：$A(B+C) = AB + AC$。
- 视角：$Ax$ 是 $A$ 的**各列**按 $x$ 加权的线性组合；$AB$ 先作用 $B$ 再作用 $A$（线性映射的复合）。

**转置**：$(A^\top)_{ij} = A_{ji}$。规则：$(AB)^\top = B^\top A^\top$，$(A+B)^\top = A^\top + B^\top$，$(A^\top)^\top = A$。若 $A = A^\top$ 则称**对称**；$X^\top X$ 和协方差矩阵总是对称的。点积：$x\cdot y = x^\top y$。

**逆**：$A^{-1}$ 满足 $AA^{-1} = A^{-1}A = I$。仅对**方阵且满秩**（$\det A \ne 0$）存在。规则：$(AB)^{-1} = B^{-1}A^{-1}$，$(A^\top)^{-1} = (A^{-1})^\top$。$2\times2$ 情形：$\begin{pmatrix}a&b\\c&d\end{pmatrix}^{-1} = \frac{1}{ad-bc}\begin{pmatrix}d&-b\\-c&a\end{pmatrix}$。

**实践中**：
- 求解 $Ax = b$ 应使用分解（LU、QR、Cholesky），**而不是** $A^{-1}b$：更省算力，数值上更稳定。
- 近奇异矩阵（条件数 $\kappa$ 很大）会放大误差；可加岭项 $\lambda I$ 或使用伪逆 $A^+$（基于 SVD）。
- 正规方程：$\hat\beta = (X^\top X)^{-1} X^\top y$，仅当 $X$ 列满秩时存在。
- 单位矩阵 $I$ 是乘法的单位元；对角矩阵的逆就是把对角线元素取倒数。

## 示例讲解
设 $A = \begin{pmatrix}1&2\\3&4\end{pmatrix}$，$B = \begin{pmatrix}0&1\\1&0\end{pmatrix}$（交换列）。
- $AB = \begin{pmatrix}2&1\\4&3\end{pmatrix}$（$A$ 的列被交换）；$BA = \begin{pmatrix}3&4\\1&2\end{pmatrix}$（行被交换）。所以 $AB \ne BA$。
- $A^\top = \begin{pmatrix}1&3\\2&4\end{pmatrix}$。
- $\det A = 1\cdot4 - 2\cdot3 = -2$，所以 $A^{-1} = \frac{1}{-2}\begin{pmatrix}4&-2\\-3&1\end{pmatrix} = \begin{pmatrix}-2&1\\1.5&-0.5\end{pmatrix}$。
- 验证：$A$ 的第一行乘 $A^{-1}$ 的第一列：$1(-2) + 2(1.5) = 1$；乘第二列：$1(1) + 2(-0.5) = 0$。正确。
- 解 $Ax = (5, 6)^\top$：$x = A^{-1}b = (-10 + 6,\; 7.5 - 3) = (-4, 4.5)$。验证：$-4 + 9 = 5$，$-12 + 18 = 6$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "A 是 3x4，B 是 4x2。下列哪项正确？",
  "options": [
    "AB 是 4x4",
    "BA 有定义，大小为 2x3",
    "AB 是 3x2，BA 无定义",
    "AB 与 BA 都有定义"
  ],
  "explanation": "AB：(3x4)(4x2) = 3x2。BA 需要 B 的列数 2 等于 A 的行数 3，不成立，所以 BA 无定义。"
}
```

```quiz
{
  "id": "q2",
  "question": "对可逆的 A 和 B，(AB)^-1 等于什么？",
  "options": [
    "A^-1 B^-1",
    "B^-1 A^-1",
    "仅当 AB = BA 时为 (BA)^-1",
    "A^T B^T"
  ],
  "explanation": "先撤销最后一步操作：(AB)^-1 = B^-1 A^-1，与转置的反序规则 (AB)^T = B^T A^T 一致。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用普通嵌套列表实现：`matmul(A, B)`（形状不匹配时抛出 `ValueError`）、`transpose(A)`，以及针对 2x2 矩阵的 `inverse2(A)`：返回逆矩阵，若行列式（接近）为零（绝对值 < 1e-12）则返回 `None`。",
  "hints": [
    "`C[i][j] = sum(A[i][k] * B[k][j] for k in range(n))`。",
    "`transpose` 即 `[list(r) for r in zip(*A)]`。",
    "检查逆：`matmul(A, inverse2(A))` 应为单位矩阵。"
  ]
}
```

> [!TIP] 面试技巧
> - 先说明形状规则：(m x n)(n x p) = (m x p)；再指出矩阵乘法不可交换。
> - 说明你不会为了解方程组而显式求逆，而是使用求解器或矩阵分解。
> - 把奇异性与秩联系起来：X^T X 奇异意味着特征完全共线。
