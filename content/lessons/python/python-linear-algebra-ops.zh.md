---
id: python-linear-algebra-ops
title: 线性代数运算
---

## 为什么重要
线性回归、PCA、嵌入相似度和神经网络层都是矩阵运算。面试官会让你用 NumPy 实现 OLS、余弦相似度或投影，并且避免显式求逆这类数值不稳定的做法。

## 概念
```python
A @ B                    # matrix multiply (same as np.matmul); (n,k) @ (k,m) → (n,m)
A * B                    # ELEMENTWISE product, not matrix multiply
v @ w                    # dot product of 1-D vectors
np.linalg.norm(v)        # Euclidean length; axis=1 for row norms
np.linalg.solve(A, b)    # solve A x = b (preferred over inv(A) @ b)
np.linalg.lstsq(X, y, rcond=None)   # least squares, handles rank deficiency
np.linalg.inv(A); np.linalg.det(A)
w, V = np.linalg.eigh(S) # eigen-decomposition of a symmetric matrix
U, s, Vt = np.linalg.svd(X, full_matrices=False)
np.einsum("ij,jk->ik", A, B)   # explicit index notation
```

- 避免计算 `inv(X.T @ X)`：它比 `solve` 或 `lstsq` 更慢、更不精确，特别是在特征接近共线时（病态；检查 `np.linalg.cond`）。
- 行之间的**余弦相似度**：先把每行归一化为单位长度，再计算 `A_n @ B_n.T`。
- **批量**运算：`@` 会在前导维度上广播：(b, n, k) @ (b, k, m) → (b, n, m)。
- 形状必须在内侧维度上对齐；一维向量在左边时当作行，在右边时当作列。

## 示例讲解
3 个查询嵌入与 1,000 个文档之间的余弦相似度：

```python
Q = Q / np.linalg.norm(Q, axis=1, keepdims=True)      # (3, d)
D = D / np.linalg.norm(D, axis=1, keepdims=True)      # (1000, d)
S = Q @ D.T                                           # (3, 1000)
top5 = np.argsort(-S, axis=1)[:, :5]
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "A 是 (100, 20)，B 是 (20, 5)。A @ B 的形状是什么？A * B 合法吗？",
  "options": ["(100, 5)；A * B 不合法（形状无法广播）", "(20, 20)；A * B 合法", "(100, 5)；A * B 与 A @ B 相同", "(5, 100)；A * B 不合法"],
  "explanation": "对 @ 来说内侧维度（20）匹配。逐元素的 * 需要可广播的形状，而 (100, 20) 和 (20, 5) 不可广播。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `ols(X, y)`，返回**截距在前**的最小二乘系数（在前面加一列 1；使用 `np.linalg.lstsq`）。编写 `cosine_sim_matrix(A, B)`，返回各行之间的 (n, m) 余弦相似度矩阵。编写 `project(v, u)`，返回向量 v 在向量 u 上的投影。",
  "hints": ["np.column_stack([np.ones(n), X]) 会加上截距列。", "v 在 u 上的投影 = (v·u / u·u) u。"]
}
```

> [!TIP] 面试技巧
> - 区分 `@`（矩阵乘法）和 `*`（逐元素乘法）。
> - 优先使用 `solve`/`lstsq` 而不是 `inv`，并提到共线特征带来的条件数问题。
> - 余弦相似度：先归一化各行再做矩阵乘法；这是向量搜索的核心。
