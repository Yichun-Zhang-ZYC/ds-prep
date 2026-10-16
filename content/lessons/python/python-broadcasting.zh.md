---
id: python-broadcasting
title: 广播
---

## 为什么重要
广播让你无需循环或复制就能组合不同形状的数组：按列标准化、计算两两距离、在神经网络中加偏置。用错了会报错，或者更糟，悄无声息地得到错误的形状。

## 概念
对两个数组进行运算时，NumPy **从右往左**比较形状。两个维度相等**或其中一个为 1** 时是兼容的。缺失的前导维度被视为 1。大小为 1 的维度会被拉伸（虚拟地拉伸，不复制）。

| A 的形状 | B 的形状 | 结果 |
|---|---|---|
| (3, 4) | (4,) | (3, 4)：B 应用到每一行 |
| (3, 4) | (3, 1) | (3, 4)：B 应用到每一列 |
| (3, 1) | (1, 4) | (3, 4)：外积式组合 |
| (3, 4) | (3,) | **报错**：4 对 3 |

常见模式：
```python
X_std = (X - X.mean(axis=0)) / X.std(axis=0)            # (n, d) with (d,)
row_norm = X / X.sum(axis=1, keepdims=True)              # (n, d) with (n, 1)
D = np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(-1))   # (n, m) pairwise distances
```

- `keepdims=True` 把被聚合的轴保留为大小 1，这样结果可以广播回去。
- `x[:, None]`（或 `np.newaxis`）插入一个轴，用来控制方向。
- 注意内存：两两距离的技巧会构建一个 (n, m, d) 的中间数组。
- 隐蔽的 bug：形状为 (n,) 的 `y_true` 减去形状为 (n, 1) 的 `y_pred` 会得到一个 (n, n) 矩阵，而不是 n 个残差。

## 示例讲解
```python
y_true = np.array([1., 2., 3.])
y_pred = np.array([[1.], [2.], [4.]])      # shape (3, 1) from a model
(y_true - y_pred).shape                     # (3, 3)!  wrong
(y_true - y_pred.ravel()).shape             # (3,)     right
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`np.ones((5, 1)) + np.ones((1, 3))` 的形状是什么？",
  "options": ["(5, 1)", "(1, 3)", "(5, 3)", "报错"],
  "explanation": "每个大小为 1 的维度都被拉伸以匹配：(5, 3)。"
}
```

```quiz
{
  "id": "q2",
  "question": "下面哪对形状**不能**广播？",
  "options": ["(8, 1, 6) 和 (7, 1)", "(4, 3) 和 (3,)", "(4, 3) 和 (4,)", "(2, 1) 和 (1, 5)"],
  "explanation": "从右对齐后，3 和 4 不同，而且都不是 1。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "只用广播（不用 Python 循环）编写：`standardize(X)`（按列计算 z 分数，使用总体标准差）、`row_normalize(X)`（每行除以该行之和），以及 `pairwise_dist(A, B)`，返回 A（n×d）与 B（m×d）各行之间欧氏距离的 (n, m) 矩阵。",
  "hints": ["keepdims=True 让行和保持为 (n, 1) 的列。", "A[:, None, :] 是 (n, 1, d)，B[None, :, :] 是 (1, m, d)。"]
}
```

> [!TIP] 面试技巧
> - 说出规则：从右对齐；各维度必须相等或为 1。
> - 有意识地使用 keepdims 和 None/newaxis，不确定时就打印形状。
> - 提到 (n,) 与 (n, 1) 的残差 bug；这是经典的隐蔽错误。
