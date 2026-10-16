---
id: python-implement-algorithms-from-scratch
title: 从零实现算法（k-means、线性回归、kNN）
---

## 为什么重要
“用 NumPy 实现 k-means / 线性回归 / kNN”是 DS 和 MLE 编码面试的常客。它在 20–30 分钟内同时考察向量化、对形状的把控以及对算法的理解。

## 概念
面试中可靠的做法：
1. **澄清**输入/输出（形状、数据类型）、边界情况，以及是否允许使用 NumPy。
2. 写代码之前，用 2–3 行**说明算法**。
3. **写出简洁、向量化的版本**，在注释中标明形状。
4. 在一个能手算的小例子上**测试**；说明复杂度。

模板：

```python
# Linear regression via gradient descent        X: (n, d), y: (n,)
w, b = np.zeros(d), 0.0
for _ in range(epochs):
    err = X @ w + b - y                          # (n,)
    w -= lr * (X.T @ err) / n                    # (d,)
    b -= lr * err.mean()

# kNN classify                                   X_train: (n, d), X_test: (m, d)
d2 = ((X_test[:, None, :] - X_train[None, :, :]) ** 2).sum(-1)   # (m, n)
nn = np.argsort(d2, axis=1)[:, :k]                               # (m, k)
votes = y_train[nn]                                              # (m, k)

# k-means step                                   X: (n, d), C: (k, d)
labels = ((X[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)      # (n,)
C = np.array([X[labels == j].mean(0) for j in range(k)])         # (k, d)
```

要能说出的复杂度：k-means 每次迭代 O(n·k·d)；暴力 kNN 每批查询 O(m·n·d)；梯度下降每个 epoch O(n·d)（闭式 OLS 为 O(n·d² + d³)）。

常见追问：处理空簇、k-means++ 初始化、特征标准化、加入 L2 正则化、用 `np.linalg.lstsq` 求闭式解、kNN 的平局处理。

## 示例讲解
对于在标准化特征上以 lr = 0.1 训练的线性回归，通过与同一数据上 `np.linalg.lstsq` 的结果对比来验证收敛；系数应在约 1e-3 内一致。如果损失发散，说明学习率太大或特征没有缩放。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你用梯度下降实现的线性回归，在几个 epoch 后损失爆炸到 inf。最可能的原因是？",
  "options": ["epoch 太少", "学习率太高和/或特征没有缩放", "使用了 NumPy", "数据太多"],
  "explanation": "步子太大会越过最小值；标准化特征并降低学习率。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 NumPy 实现：`linreg_gd(X, y, lr=0.1, epochs=2000)`，通过对 MSE 做批量梯度下降返回 `(w, b)`；`knn_predict(X_train, y_train, X_test, k)`，返回多数投票的标签（平局时取最小的标签，例如对整数标签使用 np.bincount(...).argmax()）；`kmeans(X, init_centroids, iters=20)`，返回 `(centroids, labels)`（如果某个簇为空，保持其质心不变）。",
  "hints": ["MSE/2 的梯度：w 为 X.T @ err / n，b 为 mean(err)。", "np.bincount(labels).argmax() 在平局时返回最小的标签。"]
}
```

> [!TIP] 面试技巧
> - 边写边说出形状：大多数 bug 都是形状 bug。
> - 先写出正确的简单版本，再向量化；在 4 个点的例子上测试。
> - 说明复杂度和可能的追问（k-means++、空簇、缩放、正则化、近似最近邻）。
