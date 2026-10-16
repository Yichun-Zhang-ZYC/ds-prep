---
id: python-ndarray-shape-dtype
title: ndarray、shape、dtype
---

## 为什么重要
NumPy 数组是 pandas、scikit-learn 和 PyTorch 的基础。形状和数据类型 bug（“operands could not be broadcast”、悄无声息的整数溢出、浮点精度）是最常见的数值错误，面试官期望你能熟练处理它们。

## 概念
`ndarray` 是一块具有固定 **dtype**（所有元素类型相同）的内存，外加描述其维度的 **shape**。

```python
import numpy as np
a = np.array([[1, 2, 3], [4, 5, 6]])
a.shape      # (2, 3)   rows, columns
a.ndim       # 2
a.size       # 6
a.dtype      # int64
a.astype(np.float32)          # convert (copies)
np.zeros((3, 4)); np.ones(5); np.arange(0, 1, 0.25); np.linspace(0, 1, 5)
a.reshape(3, 2); a.reshape(-1)   # -1 = infer that dimension
a.T                              # transpose → (3, 2)
a[:, None].shape                 # (2, 1, 3): add an axis
```

- **轴（axis）**的含义：`a.sum(axis=0)` 压缩行（每列一个结果）→ 形状 (3,)；`axis=1` 压缩列 → 形状 (2,)。
- **dtype 很重要**：`int8` 超过 127 会悄悄溢出；`float32` 比 `float64` 节省一半内存，但只有约 7 位有效数字；整数和浮点数混合时会向上转换为浮点数。
- `reshape` 尽可能返回视图；`flatten()` 总是复制；`ravel()` 尽可能返回视图。
- 形状为 `(n,)` 的一维数组既不是行也不是列；当方向重要时，使用 `(n, 1)` 或 `(1, n)`。
- 内存：`a.nbytes` = 元素个数 × 每个元素的字节数。1000 万个 float64 = 80 MB。

## 示例讲解
```python
x = np.arange(12).reshape(3, 4)
x.sum(axis=0)   # array([12, 15, 18, 21])  (column sums)
x.mean(axis=1)  # array([1.5, 5.5, 9.5])   (row means)
np.array([200], dtype=np.int8)  # overflow: the value can't be represented in int8
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`a` 的形状是 (100, 5)。`a.mean(axis=0)` 的形状是什么？",
  "options": ["(100,)", "(5,)", "(100, 5)", "()"],
  "explanation": "axis=0 在行方向上聚合，每列留下一个值。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `describe(a)`，返回包含 `'shape'`、`'ndim'`、`'dtype'`（字符串形式）和 `'mb'`（nbytes / 1e6）的字典。编写 `col_means(a)`，返回二维数组每列的均值；以及 `to_column(v)`，把形状为 (n,) 的一维数组变为形状 (n, 1)。",
  "hints": ["列均值是在 axis 0 上聚合。", "reshape(-1, 1) 会自动推断行数。"]
}
```

> [!TIP] 面试技巧
> - 写 NumPy 代码时把形状大声说出来；大多数 bug 都是形状 bug。
> - 掌握轴的含义：axis=0 压缩行，axis=1 压缩列。
> - 提到为节省内存而选择的 dtype（float32、更小的整数）及其溢出/精度风险。
