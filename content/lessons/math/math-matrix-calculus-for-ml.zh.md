---
id: math-matrix-calculus-for-ml
title: 机器学习中的矩阵微积分
---

## 为什么重要

每个深度学习框架本质上都是矩阵微积分机器，面试官会让你手推最小二乘、岭回归、softmax 交叉熵或线性层的梯度。关键是不用下标堆砌，并通过检查形状发现错误。

## 概念

**约定**：对标量 $L$，梯度 $\nabla_X L$ 与 $X$ 形状相同。这使梯度下降 $X \leftarrow X - \eta \nabla_X L$ 的形状匹配。向量值函数的一般情形见 Jacobian 与 Hessian 一课。

**核心恒等式**（$a$ 为常数）：

| $f$ | $\nabla_x f$ |
|---|---|
| $a^\top x$ | $a$ |
| $x^\top A x$ | $(A + A^\top)x$（对称时为 $2Ax$） |
| $\lVert x\rVert^2$ | $2x$ |
| $\lVert Ax - b\rVert^2$ | $2A^\top(Ax - b)$ |
| $\operatorname{tr}(A^\top X)$ | $A$ |
| $\log\det X$ | $X^{-\top}$ |

**微分法**（最快、最不易错）：把 $dL$ 写成 $dX$ 的函数，再改写成 $\operatorname{tr}(G^\top dX)$，则 $\nabla_X L = G$。使用 $d(AB) = dA\,B + A\,dB$ 以及迹的规则 $\operatorname{tr}(AB) = \operatorname{tr}(BA)$，标量的迹等于自身。

**形状匹配检查**：梯度必须与变量形状相同。对 $Y = XW$（$n\times d$ 乘 $d \times k$），上游梯度 $dY$ 为 $n \times k$：$dW = X^\top dY$（$d \times k$），$dX = dY\,W^\top$（$n \times d$）。有偏置时，$db = \sum_{\text{行}} dY$，因为 $b$ 被广播过。

**经典结果**：岭回归 $L = \lVert Xw - y\rVert^2 + \lambda\lVert w\rVert^2$ 的梯度为 $2X^\top(Xw - y) + 2\lambda w$，闭式解 $w = (X^\top X + \lambda I)^{-1}X^\top y$。对 logits $z$ 和 one-hot $y$ 的 softmax 交叉熵，梯度为 $\nabla_z L = p - y$（所以反向传播自然从 logits 开始）。

**务必验证**：用有限差分检查梯度，$\frac{f(w + \epsilon e_j) - f(w - \epsilon e_j)}{2\epsilon}$ 应与你的公式在约 $10^{-6}$ 内一致。

## 示例讲解

求 $X = \begin{pmatrix}1&0\\0&1\\1&1\end{pmatrix}$、$y = (1, 2, 2)^\top$ 在 $L = \tfrac12\lVert Xw - y\rVert^2$ 下的最小二乘解。

梯度：$\nabla L = X^\top(Xw - y)$。在 $w = 0$ 处为 $-X^\top y = -(3, 4)^\top$。令其为零得正规方程 $X^\top X w = X^\top y$，其中 $X^\top X = \begin{pmatrix}2&1\\1&2\end{pmatrix}$，逆为 $\tfrac13\begin{pmatrix}2&-1\\-1&2\end{pmatrix}$。所以 $w = \tfrac13(2\cdot 3 - 4,\ -3 + 2\cdot 4) = (2/3, 5/3)$。

验证：残差 $y - Xw = (1/3, 1/3, -1/3)$，$X^\top$ 乘以它得 $(1/3 - 1/3,\ 1/3 - 1/3) = 0$。残差与 $X$ 的列正交，与投影的几何图像一致。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "对于 $f(x) = x^\\top A x$（$A$ 为非对称方阵），$\\nabla f$ 是什么？",
  "options": [
    "$2Ax$",
    "$(A + A^\\top)x$",
    "$A^\\top x$",
    "$2A^\\top A x$"
  ],
  "explanation": "展开 $\\sum_{ij} A_{ij}x_i x_j$ 并求导得 $(A + A^\\top)x$。只有 $A$ 对称时才化为 $2Ax$。"
}
```

```quiz
{
  "id": "q2",
  "question": "对 $Y = XW$（$X \\in \\mathbb R^{n \\times d}$，$W \\in \\mathbb R^{d \\times k}$）做反向传播，对 $W$ 的梯度是？",
  "options": [
    "$dY\\, X^\\top$",
    "$X^\\top dY$",
    "$dY\\, X$",
    "$X\\, dY^\\top$"
  ],
  "explanation": "$dW = X^\\top dY$，形状为 $d \\times k$。用形状匹配法：把 $X^\\top$（$d\\times n$）和 $dY$（$n \\times k$）组合成 $d \\times k$ 只有这一种方式。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "纯 Python，矩阵用列表的列表表示。实现 `matvec(A, v)`、`lstsq_grad(X, y, w)`（返回 $L = \\tfrac12\\lVert Xw - y\\rVert^2$ 的梯度，即 $X^\\top(Xw - y)$），以及 `num_grad(f, w, eps=1e-6)`（对列表 `w` 的标量函数 `f` 做中心差分梯度）。",
  "hints": [
    "残差 $r = Xw - y$，梯度第 $j$ 项为 $\\sum_i X_{ij} r_i$。",
    "中心差分：$(f(w + \\epsilon e_j) - f(w - \\epsilon e_j)) / 2\\epsilon$。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "使用 numpy 实现线性分类器的 `softmax_ce(W, X, y)`，logits 为 $Z = XW$（$X$ 为 $n \\times d$，$W$ 为 $d \\times k$，`y` 为整数标签）。返回 `(loss, dW)`：loss 为平均交叉熵，$dW = X^\\top (P - Y)/n$，其中 $P$ 为按行 softmax，$Y$ 为 one-hot 标签。请使用数值稳定的 softmax。",
  "hints": [
    "指数运算前先减去每行最大值。",
    "对 logits 的梯度是 $P - Y$；然后 $dW = X^\\top dZ / n$。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "使用 numpy 为 $Y = XW + b$（$b$ 按行广播）实现 `linear_backward(X, W, b, dY)`。给定上游梯度 `dY`（即 $\\partial L/\\partial Y$），返回 `(dX, dW, db)`，形状须与 `X`、`W`、`b` 一致。",
  "hints": [
    "对齐形状：$dX$ 为 $n \\times d$，所以必须是 $dY\\,W^\\top$。",
    "偏置在 $n$ 行上被广播，所以其梯度要沿 batch 轴求和。"
  ]
}
```

> [!TIP] 面试技巧
> - 先说明形状约定，再用微分法或形状匹配推导；面试官更看重合理性检查，而不是代数本身。
> - 牢记：$\nabla_w \lVert Xw-y\rVert^2 = 2X^\top(Xw-y)$、softmax-CE 梯度 $p - y$，以及线性层的三个梯度。
> - 易错点：$A$ 非对称时漏掉转置，或忘记偏置梯度要在 batch 上求和。可以提到梯度检查是调试自定义层的方法。
