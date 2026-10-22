---
id: math-positive-definite-matrices
title: 正定矩阵
---

## 为什么重要
协方差矩阵、核（Gram）矩阵和凸问题的 Hessian 都是（半）正定的。这一性质保证了唯一的极小值、有效的高斯分布与核函数，以及快速稳定的求解器（Cholesky）。面试官借此考查你能否把代数与凸性、协方差联系起来。

## 概念
对称矩阵 $A$ 是**正定（PD）**的，若对所有 $x \ne 0$ 有 $x^\top A x > 0$；是**半正定（PSD）**的，若 $x^\top A x \ge 0$。（$x^\top A x$ 称为**二次型**。）

**对称矩阵 $A$ 的等价判别**：
- 所有特征值 $> 0$（PD）或 $\ge 0$（PSD）。
- 所有顺序主子式 $> 0$（Sylvester 判据），或存在 **Cholesky 分解** $A = LL^\top$，其中 $L$ 为对角线为正的下三角矩阵（仅 PD）。Cholesky 也是实际中的标准检验方法。
- 对某个列线性无关的 $B$ 有 $A = B^\top B$（PD），或对任意 $B$（PSD）。
- 必要但不充分：所有对角元 $> 0$，且 $|a_{ij}| < \sqrt{a_{ii}a_{jj}}$。

**出现的场景**：
- **协方差** $\Sigma = \frac1{n-1}X_c^\top X_c$ 总是 PSD（$v^\top\Sigma v = $ 投影的方差 $\ge 0$）；除非特征线性相关，否则是 PD。多元高斯需要 PD 的 $\Sigma$ 才有密度。
- **Gram/核矩阵** $K_{ij} = k(x_i, x_j)$ 是 PSD 的，当且仅当 $k$ 是有效的（Mercer）核。
- **Hessian**：临界点处 PD 表示严格局部极小；处处 PSD 表示凸。对二次函数 $\tfrac12x^\top Ax - b^\top x$，唯一极小点满足 $Ax = b$。
- **岭回归**：当 $\lambda>0$ 时 $X^\top X + \lambda I$ 为 PD，因此总是可逆。

**Cholesky**：$A = LL^\top$ 大约需要 $n^3/3$ 次浮点运算（LU 的一半）且稳定。用途：用两次三角求解来解 $Ax=b$；**采样**时 $x = \mu + Lz$（$z\sim N(0,I)$）的协方差为 $LL^\top = \Sigma$；以及高斯过程推断。若分解失败（主元非正），说明矩阵不是 PD；实践中会加**抖动项** $\epsilon I$。

**其他**：不定 = 同时有正、负特征值（鞍点）。PD 矩阵定义了有效的内积 $\langle x,y\rangle_A = x^\top Ay$ 以及马氏距离 $\sqrt{(x-\mu)^\top\Sigma^{-1}(x-\mu)}$。

## 示例讲解
比较 $A = \begin{pmatrix}2&1\\1&2\end{pmatrix}$ 与 $C = \begin{pmatrix}1&2\\2&1\end{pmatrix}$。
- $A$：特征值 $3, 1 > 0$，所以 PD。二次型：$x^\top Ax = 2x_1^2 + 2x_1x_2 + 2x_2^2 = x_1^2 + x_2^2 + (x_1+x_2)^2 > 0$。
- $C$：特征值 $3, -1$，所以是**不定**的。取 $x = (1,-1)$：$x^\top Cx = 1 - 2 - 2 + 1 = -2 < 0$。顺序主子式：$1 > 0$，但 $\det C = -3 < 0$。
- $\begin{pmatrix}4&2\\2&3\end{pmatrix}$ 的 Cholesky：$l_{11} = \sqrt4 = 2$；$l_{21} = 2/2 = 1$；$l_{22} = \sqrt{3 - 1^2} = \sqrt2$。所以 $L = \begin{pmatrix}2&0\\1&\sqrt2\end{pmatrix}$，$LL^\top = \begin{pmatrix}4&2\\2&1+2\end{pmatrix}$，符合要求。
- 对 $C$ 做 Cholesky：$l_{11}=1$，$l_{21}=2$，$l_{22}^2 = 1 - 4 = -3 < 0$，分解失败，证实 $C$ 不是 PD。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么样本协方差矩阵总是至少半正定？",
  "options": [
    "它的对角元为正",
    "它的元素在 -1 和 1 之间",
    "v^T Sigma v 等于数据在 v 上投影的方差，而方差 >= 0",
    "它总是可逆"
  ],
  "explanation": "对任意方向 v，v^T Sigma v 是一维投影的方差，不可能为负。当特征线性相关或 n <= d 时它是奇异的（仅为 PSD）。"
}
```

```quiz
{
  "id": "q2",
  "question": "某临界点处的 Hessian 特征值为 2、5、-1。该点是什么？",
  "options": [
    "严格局部极小点",
    "鞍点",
    "严格局部极大点",
    "全局极小点"
  ],
  "explanation": "符号混合意味着二次型在某些方向上向上弯曲、在另一些方向上向下弯曲：鞍点。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `quad_form(A, x)` = $x^\\top A x$，以及 `cholesky(A)`：返回满足 $A = LL^\\top$ 的下三角 `L`（列表的列表），若矩阵不是正定的（主元 $\\le 10^{-12}$）则返回 `None`。最后实现 `is_pd(A)` = `cholesky(A) is not None`。",
  "hints": [
    "对 i >= j：`s = A[i][j] - sum(L[i][k]*L[j][k] for k in range(j))`；若 i == j，则 `L[i][i] = sqrt(s)`（s <= 1e-12 时失败），否则 `L[i][j] = s / L[j][j]`。",
    "把 L 初始化为 n x n 的零矩阵。",
    "全 1 的 2x2 矩阵只是 PSD，所以应返回 None。"
  ]
}
```

> [!TIP] 面试技巧
> - 给出多种等价判别（特征值、Cholesky、二次型、顺序主子式），并说明代码里会用哪种（Cholesky 或特征值）。
> - 把 PSD 与协方差、核函数和凸性（Hessian）联系起来，这是它在机器学习中最重要的三个场景。
> - 提到用抖动项 / 岭项修复近奇异的协方差，以及用 Cholesky 对高斯分布采样。
