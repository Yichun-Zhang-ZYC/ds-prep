---
id: math-jacobian-hessian
title: 雅可比矩阵与海森矩阵
---

## 为什么重要
雅可比矩阵是向量值函数（网络层、softmax、变换）的导数。海森矩阵描述曲率，决定梯度下降收敛的快慢、临界点是极小值还是鞍点，以及牛顿法等二阶方法的行为。

## 概念
**雅可比矩阵**：对 $f: \mathbb R^n \to \mathbb R^m$，$J_{ij} = \frac{\partial f_i}{\partial x_j}$ 是 $m \times n$ 矩阵，是最佳线性近似 $f(x + \delta) \approx f(x) + J\delta$。链式法则变成矩阵乘法：$J_{f \circ g} = J_f(g(x))\,J_g(x)$。对标量 $f$（$m = 1$），雅可比矩阵就是写成行向量的梯度。反向传播从不构造庞大的雅可比矩阵，而是用行向量 $\frac{\partial L}{\partial v}$ 乘以雅可比矩阵（向量-雅可比乘积）。

**softmax 的雅可比矩阵**：对 $s = \text{softmax}(z)$，$\frac{\partial s_i}{\partial z_j} = s_i(\delta_{ij} - s_j)$，即 $\text{diag}(s) - ss^\top$。由于输出之和恒为 1，它的每一行之和为 0。

**海森矩阵**：对标量 $f: \mathbb R^n \to \mathbb R$，$H_{ij} = \frac{\partial^2 f}{\partial x_i \partial x_j}$ 是梯度的雅可比矩阵。二阶导数连续时它是对称的。它有 $n^2$ 个元素，所以大型网络很少显式构造它。

**海森矩阵告诉你什么**（在临界点 $\nabla f = 0$ 处，看特征值）：
- 全部 $> 0$（正定）：局部极小值。
- 全部 $< 0$：局部极大值。
- 符号混合：**鞍点**。在高维空间中，鞍点远比局部极小值常见。
- 条件数 $\lambda_{\max}/\lambda_{\min}$ 衡量山谷的狭长程度；数值大会使梯度下降变慢并呈之字形。

**牛顿法**：最小化局部二次模型，得到步长 $\Delta x = -H^{-1}\nabla f$。它在二次函数上一步收敛，但求解需要 $O(n^3)$，且要求 $H$ 正定。拟牛顿法（L-BFGS）以较低代价近似 $H^{-1}$。

**常见损失的海森矩阵**：逻辑回归的 $H = X^\top \text{diag}(p(1-p)) X$ 是半正定的，所以该损失是凸的。

## 示例讲解
设 $f(x, y) = x^2 y$。梯度：$\nabla f = (2xy,\ x^2)$。海森矩阵：$H = \begin{pmatrix} 2y & 2x \\ 2x & 0 \end{pmatrix}$。

在 $(1, 2)$ 处：$H = \begin{pmatrix} 4 & 2 \\ 2 & 0 \end{pmatrix}$，迹为 4，行列式为 $-4$。特征值满足 $\lambda^2 - 4\lambda - 4 = 0$，所以 $\lambda = 2 \pm 2\sqrt2 \approx 4.83,\ -0.83$。符号混合：曲面沿一个方向向上弯、沿另一个方向向下弯，呈鞍形。（这里 $\nabla f = (4, 1) \neq 0$，所以它不是临界点；特征值只描述局部曲率。）

向量映射 $F(x, y) = (x^2 y,\ 5x + \sin y)$ 的雅可比矩阵：
$J = \begin{pmatrix} 2xy & x^2 \\ 5 & \cos y \end{pmatrix}$，在 $(1, 0)$ 处为 $\begin{pmatrix} 0 & 1 \\ 5 & 1 \end{pmatrix}$。

对二次函数 $f(x) = \tfrac12 x^\top A x - b^\top x$ 用牛顿法：$\nabla f = Ax - b$，$H = A$，所以从任意 $x_0$ 出发，步长 $-A^{-1}(Ax_0 - b)$ 恰好落在 $x^* = A^{-1}b$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某个临界点处的海森矩阵特征值为 $(3, 1, -0.5)$。它是什么？",
  "options": [
    "局部极小值",
    "局部极大值",
    "鞍点",
    "没有梯度就无法判断"
  ],
  "explanation": "特征值符号混合，意味着函数沿两个方向向上弯、沿一个方向向下弯：这是鞍点。"
}
```

```quiz
{
  "id": "q2",
  "question": "层 $f: \\mathbb R^{512} \\to \\mathbb R^{128}$ 的雅可比矩阵形状是什么？",
  "options": [
    "$512 \\times 128$",
    "$128 \\times 512$",
    "$512 \\times 512$",
    "$128 \\times 128$"
  ],
  "explanation": "$J_{ij} = \\partial f_i / \\partial x_j$ 每个输出占一行、每个输入占一列：$m \\times n = 128 \\times 512$。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 numpy 实现 `numeric_jacobian(f, x, h=1e-6)`（中心差分；`f` 把数组映射为一维数组；返回形状 `(m, n)`）、返回 `diag(s) - s s^T` 的 `softmax_jacobian(z)`，以及根据对称矩阵 `H` 的特征值返回 `'min'`、`'max'` 或 `'saddle'` 的 `classify_hessian(H)`（绝对值小于 1e-9 的特征值视为零，因此半正定的 `H` 为 `'min'`，半负定的为 `'max'`）。另外实现返回 `-H^{-1} grad` 的 `newton_step(grad, H)`。",
  "hints": [
    "雅可比矩阵的第 j 列是 f 沿第 j 个坐标的中心差分。",
    "对称矩阵应使用 np.linalg.eigvalsh。",
    "用 np.linalg.solve(H, grad)，不要显式求逆。"
  ]
}
```

> [!TIP] 面试技巧
> - 要能说出形状：雅可比矩阵是输出维 $\times$ 输入维；海森矩阵是梯度的雅可比矩阵，且对称。
> - 记住 softmax 的雅可比矩阵 $\text{diag}(s) - ss^\top$，以及反向传播使用的是向量-雅可比乘积而非完整矩阵。
> - 解释深度学习为何避免牛顿法（$n^2$ 内存、$n^3$ 求解），以及 L-BFGS 或 Adam 是在近似什么。
