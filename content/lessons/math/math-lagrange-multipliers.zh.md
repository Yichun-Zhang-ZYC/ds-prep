---
id: math-lagrange-multipliers
title: 拉格朗日乘子
---

## 为什么重要
约束优化无处不在：SVM、最大熵模型、PCA（单位范数约束）、和为 1 的投资组合权重，以及把正则化看作约束。拉格朗日乘子把约束问题转化为无约束问题，而且乘子本身有实际含义（影子价格）。

## 概念
要在 $h(x) = 0$ 的约束下最小化 $f(x)$，构造**拉格朗日函数** $\mathcal L(x, \lambda) = f(x) + \lambda\, h(x)$，并求解 $\nabla_x \mathcal L = 0$ 与 $h(x) = 0$。

**几何视角**：在有约束的最优点，$f$ 的等高线与约束曲线相切，所以 $\nabla f = -\lambda \nabla h$：两个梯度平行。

**$\lambda$ 的含义**：它衡量放松约束时最优值变化的速度，对约束 $h(x) = c$ 有 $\partial f^*/\partial c = -\lambda$（符号取决于约定）。

**不等式约束** $g(x) \le 0$ 使用乘子 $\mu \ge 0$ 和 **KKT 条件**：平稳性 $\nabla f + \mu \nabla g = 0$、原始可行性与对偶可行性，以及互补松弛 $\mu\, g(x) = 0$（不起作用的约束 $\mu = 0$）。对凸问题 KKT 是充分条件；它是 SVM 对偶和支持向量的基础（只有起作用的约束才有 $\mu > 0$）。

**带等式约束的二次规划** $\min \tfrac12 x^\top Q x + c^\top x$，约束 $Ax = b$，可化为一个线性方程组：
$$\begin{bmatrix} Q & A^\top \\ A & 0 \end{bmatrix}\begin{bmatrix} x \\ \nu \end{bmatrix} = \begin{bmatrix} -c \\ b \end{bmatrix}$$
经典应用：PCA（最大化 $w^\top \Sigma w$，约束 $\|w\| = 1$，得到 $\Sigma w = \lambda w$）；在和为 1 的约束下最大化熵，得到均匀分布。

## 示例讲解
在 $x + y = 1$ 的约束下最小化 $f(x, y) = x^2 + y^2$。

$\mathcal L = x^2 + y^2 + \lambda(x + y - 1)$。令导数为零：$2x + \lambda = 0$，$2y + \lambda = 0$，$x + y = 1$。于是 $x = y = -\lambda/2$，由 $-\lambda = 1$ 得 $\lambda = -1$，$x = y = 0.5$，$f^* = 0.5$。

用代入法检验：$y = 1 - x$，$f = x^2 + (1-x)^2$，$f' = 4x - 2 = 0 \Rightarrow x = 0.5$。几何上，这就是直线上离原点最近的点。把约束改为 $x + y = c$ 得 $f^* = c^2/2$，所以 $df^*/dc = c = 1 = -\lambda$，与影子价格的解释一致。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "对于 $\\min f(x)$ s.t. $h(x) = 0$，在有约束的最优点，下列哪个说法成立？",
  "options": [
    "$\\nabla f = 0$",
    "$\\nabla f$ 与 $\\nabla h$ 平行",
    "$\\nabla f$ 与 $\\nabla h$ 正交",
    "$\\lambda = 0$"
  ],
  "explanation": "目标函数无法沿约束曲面继续改进，所以 $\\nabla f$ 没有沿曲面切向的分量：$\\nabla f = -\\lambda \\nabla h$。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 KKT 条件中，互补松弛 $\\mu\\, g(x) = 0$ 意味着：",
  "options": [
    "每个约束都起作用",
    "不起作用的约束（$g(x) < 0$）乘子为零",
    "乘子必须为负",
    "目标函数是常数"
  ],
  "explanation": "要么约束是紧的（$g = 0$），要么它不影响解（$\\mu = 0$）。在 SVM 中，$\\mu > 0$ 的点正是支持向量。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `eq_qp(Q, c, A, b)`，求解 $\\min \\tfrac12 x^\\top Q x + c^\\top x$ s.t. $Ax = b$：构造 KKT 矩阵并调用 `np.linalg.solve`。返回 `(x, nu)`，其中 `nu` 是乘子（拉格朗日函数为 $\\tfrac12 x^\\top Q x + c^\\top x + \\nu^\\top(Ax - b)$）。",
  "hints": [
    "平稳性：$Qx + c + A^\\top\\nu = 0$。可行性：$Ax = b$。把它们叠成一个分块方程组。",
    "用 `np.block([[Q, A.T], [A, zeros]])` 构造 KKT 矩阵；在索引 n 处拆分解向量。"
  ]
}
```

> [!TIP] 面试技巧
> - 说清几何图像（梯度平行）以及 $\lambda$ 的影子价格含义。
> - 掌握标准例子：PCA 得到特征值问题，最大熵得到均匀分布（或 softmax / 指数族解），SVM 对偶来自 KKT。
> - 陷阱：拉格朗日条件通常只是必要条件；在断言得到极小值之前，要检查凸性或二阶条件。
