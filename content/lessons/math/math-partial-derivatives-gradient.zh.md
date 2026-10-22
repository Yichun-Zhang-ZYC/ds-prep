---
id: math-partial-derivatives-gradient
title: 偏导数与梯度
---

## 为什么重要
模型有很多参数，所以损失是向量的函数。梯度汇集了所有偏导数，指向损失上升最快的方向，这是基于梯度的学习的全部基础。常见问题包括梯度方向、线性回归的梯度以及梯度检查。

## 概念
**偏导数** $\frac{\partial f}{\partial x_i}$ 是对某一个变量求导，同时固定其他变量。

**梯度**把它们堆叠起来：$\nabla f(x) = \left(\frac{\partial f}{\partial x_1}, \dots, \frac{\partial f}{\partial x_d}\right)$，形状与 $x$ 相同。一阶近似：$f(x + \delta) \approx f(x) + \nabla f(x)^\top \delta$。

**关键性质**：
- 沿单位向量 $u$ 的**方向导数**为 $\nabla f \cdot u$。
- 当 $u = \nabla f / \|\nabla f\|$ 时它最大，因此梯度是最陡上升方向，$-\nabla f$ 是最陡下降方向。其长度 $\|\nabla f\|$ 就是最陡的斜率。
- 梯度与 $f$ 的等值线（等高线）垂直。
- $\nabla f = 0$ 标志着临界点（极小、极大或鞍点）。

**应当熟记的梯度**：
- $f = a^\top x \Rightarrow \nabla f = a$
- $f = \tfrac12 x^\top A x$（$A$ 对称）$\Rightarrow \nabla f = Ax$
- $f = \|x\|^2 \Rightarrow \nabla f = 2x$
- 线性回归 MSE $J(w) = \frac1n \|Xw - y\|^2 \Rightarrow \nabla J = \frac2n X^\top (Xw - y)$。令其为零得到正规方程 $X^\top X w = X^\top y$。

**形状规则**：标量损失对张量的梯度，形状总与该张量相同。矩阵推导看起来不对时，先检查形状。

**梯度检查**：逐个坐标扰动，计算 $\frac{J(w + \epsilon e_i) - J(w - \epsilon e_i)}{2\epsilon}$，并与解析梯度比较（相对误差约 $10^{-6}$ 属正常）。

## 示例讲解
设 $f(x, y) = x^2 y + 3y$。偏导数：$\frac{\partial f}{\partial x} = 2xy$，$\frac{\partial f}{\partial y} = x^2 + 3$。

在 $(1, 2)$ 处：$\nabla f = (4, 4)$，$f = 8$。
- 最陡上升方向：$(1, 1)/\sqrt 2$，斜率为 $\|\nabla f\| = 4\sqrt2 \approx 5.657$。
- 沿 $u = (1, 0)$（只在 $x$ 方向移动）的方向导数：$4$。
- 沿 $u = (1, -1)/\sqrt2$：$(4 - 4)/\sqrt2 = 0$，这与等值线 $f = 8$ 相切。
- 学习率 0.1 的一步下降：$(1, 2) - 0.1\,(4, 4) = (0.6, 1.6)$，此时 $f = 0.36 \cdot 1.6 + 4.8 = 5.376$，从 8 下降。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 $\\nabla f = (3, 4)$ 的点上，最大可能的方向导数是多少？",
  "options": [
    "7",
    "5",
    "3",
    "4"
  ],
  "explanation": "所有单位方向中的最大值等于梯度的范数：$\\sqrt{3^2 + 4^2} = 5$，在方向 $(3, 4)/5$ 上取得。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于 $J(w) = \\frac1n\\|Xw - y\\|^2$，其中 $X \\in \\mathbb R^{n \\times d}$，$\\nabla_w J$ 的形状是什么？",
  "options": [
    "$n \\times d$",
    "$n$",
    "$d$",
    "标量"
  ],
  "explanation": "梯度的形状与求导所对应的变量相同：$w \\in \\mathbb R^d$。在 $\\frac2n X^\\top(Xw - y)$ 中，$X^\\top$ 为 $d \\times n$，残差为 $n \\times 1$。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 numpy 实现 `numeric_grad(f, x, h=1e-6)`（中心差分，逐个坐标，返回与 `x` 形状相同的浮点数组）、`mse_grad(w, X, y)`（对应 $J = \\frac1n\\|Xw - y\\|^2$），以及返回单位最陡下降方向 `-g/||g||` 的 `descent_dir(g)`。",
  "hints": [
    "构造基向量 e（e[i] = h），计算 f(x + e) 与 f(x - e)。",
    "梯度为 (2/n) * X.T @ (X @ w - y)。",
    "除以欧氏范数得到单位向量。"
  ]
}
```

> [!TIP] 面试技巧
> - 先说“梯度指向最陡上升方向，并与等值线垂直”，再用方向导数 $\nabla f \cdot u$ 证明。
> - 记住 $\nabla_w \frac1n\|Xw - y\|^2 = \frac2n X^\top(Xw - y)$，并用形状检查来发现转置错误。
> - 指出梯度为零不代表是极小值：也可能是鞍点。
