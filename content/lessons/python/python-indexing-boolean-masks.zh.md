---
id: python-indexing-boolean-masks
title: 索引与布尔掩码
---

## 为什么重要
筛选、选取和更新数组的子集是数据工作中的家常便饭。布尔掩码也正是 pandas 筛选在底层的工作方式，所以面试官期望你能熟练使用它们。

## 概念
```python
a = np.arange(10)
a[2:8:2]            # slicing (view): [2, 4, 6]
a[-3:]              # last three
M = a.reshape(2, 5)
M[1, 2]; M[:, 0]; M[0, ::2]

a[[1, 5, 7]]        # fancy (integer array) indexing → copy
mask = (a > 3) & (a % 2 == 0)   # use & | ~ with parentheses, not and/or/not
a[mask]             # [4, 6, 8]
a[mask] = 0         # assignment through a mask modifies a in place
np.where(a > 5)     # indices where true
np.argsort(a)[::-1][:3]  # indices of the top 3 values
```

- 使用 `&`、`|`、`~`（逐元素运算），并给每个比较加上**括号**；`and`/`or` 会抛出 “truth value of an array is ambiguous”。
- 基本切片返回**视图**；花式索引和布尔索引返回**副本**（但通过它们赋值会写入原数组）。
- 对于二维花式索引，`M[[0, 1], [2, 3]]` 选取的是元素 (0,2) 和 (1,3)；要取子矩阵用 `np.ix_`。
- NaN：用 `np.isnan(a)` 构建掩码；`a == np.nan` 永远是 False。

## 示例讲解
把离群值截断在第 99 百分位，并统计被截断的个数：

```python
cap = np.percentile(x, 99)
n_capped = (x > cap).sum()
x = np.where(x > cap, cap, x)      # or x[x > cap] = cap
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 `a[(a > 2) and (a < 5)]` 会报错？",
  "options": ["数组不能比较", "`and` 需要单个 True/False，但比较得到的是数组；应使用 `&`", "括号用错了", "不允许使用布尔掩码"],
  "explanation": "Python 的 `and` 会对数组调用 bool()，这是有歧义的。`&` 是逐元素运算。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `filter_range(a, lo, hi)`，返回满足 lo ≤ x < hi 的值；`replace_nan(a, value)`，返回把 NaN 替换后的副本；`top_k_indices(a, k)`，返回 k 个最大值的索引，按值降序排列。",
  "hints": ["把每个比较用括号括起来，再用 & 组合。", "先复制，避免修改输入；用 np.isnan 构建掩码。"]
}
```

> [!TIP] 面试技巧
> - 使用带括号的 `&`/`|`/`~`；说明为什么 `and`/`or` 会失败。
> - 了解视图（切片）与副本（花式/布尔索引）的区别。
> - 在大数组上取 top-k 时，提到用 `np.argpartition` 实现 O(n)，而不是完整排序。
