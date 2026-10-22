---
id: python-practice-numpy-vectorization
title: "练习：NumPy 向量化"
---

## 为什么重要

“不用循环实现”是标准的 numpy 筛选题：成对距离、softmax、移动平均、独热编码。面试官想看到正确的形状、数值稳定性，以及对内存开销的意识。

## 概念

**解题配方**（规则见广播和向量化两课）：

1. 先写出每个输入和期望输出的形状。
2. 用 `[:, None]` / `[None, :]`（或归约时的 `keepdims=True`）插入轴，使形状通过广播对齐；从**右侧**对齐。
3. 沿正确的轴归约（`axis=-1`），当结果之后要广播回去时保留维度。
4. 优先使用内置函数（`np.where`、`np.clip`、`np.cumsum`、`np.add.at`、`np.bincount`、`argsort`、花式索引），而不是 `np.vectorize`，后者只是伪装的循环。

**数值稳定性**：做 softmax 或 log-sum-exp 时先减去每行最大值；$\text{softmax}(z)_i = e^{z_i - m} / \sum_j e^{z_j - m}$，其中 $m = \max z$。否则 `np.exp(1000)` 会溢出为 `inf`。

**内存**：把 $(n, d)$ 数组与自身做广播差会产生 $(n, n, d)$ 的临时数组。对大的 $n$，使用恒等式 $\|a - b\|^2 = \|a\|^2 + \|b\|^2 - 2\,a \cdot b$，只需一个 $(n, n)$ 的矩阵乘积（开方前要把舍入产生的微小负数截断）。

**窗口**：移动求和是累计和之差：$S_i = C_{i+k} - C_i$，其中 $C$ 是前面补 0 的累计和。无论 $k$ 多大，复杂度都是 $O(n)$。

**陷阱**：整数 dtype（溢出、整除）、切片后视图与副本的区别，以及会悄悄把浮点转成整数的原地 `+=`。

## 示例讲解

二维空间中的三个点：$(0,0)$、$(3,4)$、$(6,8)$。不用循环计算成对欧氏距离：

```python
X = np.array([[0, 0], [3, 4], [6, 8]], dtype=float)
diff = X[:, None, :] - X[None, :, :]        # shape (3, 3, 2)
D = np.sqrt((diff ** 2).sum(axis=-1))       # shape (3, 3)
# [[ 0.  5. 10.]
#  [ 5.  0.  5.]
#  [10.  5.  0.]]
```

`X[:, None, :]` 的形状为 $(3, 1, 2)$，`X[None, :, :]` 的形状为 $(1, 3, 2)$；广播把两者都扩展为 $(3, 3, 2)$，因此 `diff[i, j]` 就是 $x_i - x_j$。沿最后一个轴求和得到平方距离：例如 $(0-3)^2 + (0-4)^2 = 25$，开方得 $5$。这里临时数组只有 $3 \cdot 3 \cdot 2 = 18$ 个浮点数，但当 $n = 10{,}000$、$d = 50$ 时会有 $5 \times 10^9$ 个浮点数（40 GB），这正是矩阵乘积恒等式重要的原因。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "形状分别为 `a: (5, 1)` 和 `b: (3,)`。`a + b` 的形状是什么？",
  "options": [
    "(5,)",
    "(5, 3)",
    "(3, 5)",
    "报错：形状不匹配"
  ],
  "explanation": "从右侧对齐：`b` 变成 (1, 3)；两者广播为 (5, 3)。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么在 softmax 中先减去每行最大值再取指数？",
  "options": [
    "它使结果成为合法的概率",
    "它在不改变输出的情况下防止溢出，因为因子 $e^{-m}$ 会相互抵消",
    "它使每行之和为一",
    "它加快 `np.exp`"
  ],
  "explanation": "softmax 对所有 logits 同时加一个常数保持不变。减去最大值使指数不超过 0，因此不会溢出。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "为 $(n, d)$ 的浮点数组编写 `pairwise_dist(X)`，返回 $(n, n)$ 的欧氏距离矩阵，不使用 Python 循环。使用恒等式 $\\|a-b\\|^2 = \\|a\\|^2 + \\|b\\|^2 - 2a\\cdot b$，并在开方前截断舍入产生的负数。对角线必须恰好为 0。",
  "hints": [
    "平方范数：`sq = (X ** 2).sum(axis=1)`；用 `sq[:, None] + sq[None, :]` 组合。",
    "`np.clip(d2, 0, None)` 去除微小负数；`np.fill_diagonal` 把对角线置零。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "为 $(n, k)$ 数组编写 `softmax_rows(Z)`：对每一行做数值稳定的 softmax。对于 1000 这样的 logits，不能产生 `inf` 或 NaN。",
  "hints": [
    "在 `np.exp` 之前减去 `Z.max(axis=1, keepdims=True)`。",
    "求和时保留维度，这样除法才能沿列广播。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "编写 `moving_average(x, k)`，使用 `np.cumsum` 且不用循环，返回每个包含 `k` 个连续值的窗口的均值（长度为 `len(x) - k + 1`，即 \"valid\" 模式）。若 `k < 1` 或 `k > len(x)` 则抛出 `ValueError`。再编写 `one_hot(labels, n_classes)`，用花式索引返回 `(n, n_classes)` 的整数数组。",
  "hints": [
    "在累计和前补一个 0，这样 `c[k:] - c[:-k]` 就是窗口和。",
    "独热编码：`out[np.arange(n), labels] = 1` 为每行设置一个元素。"
  ]
}
```

> [!TIP] 面试技巧
> - 先写出形状并说明哪些轴参与广播；面试官会留意这一点。
> - 提到数值稳定性（减去最大值）和 $(n, n, d)$ 临时数组的内存开销。
> - 掌握窗口的 `cumsum` 差分技巧，以及用 `np.add.at` / `bincount` 做散射累加；避免使用 `np.vectorize`。
