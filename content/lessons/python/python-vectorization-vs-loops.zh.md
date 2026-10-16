---
id: python-vectorization-vs-loops
title: 向量化 vs 循环
---

## 为什么重要
用数组运算替换 Python 循环常常能带来 10–100 倍的加速。“这个特征计算要跑好几个小时；把它加速”是面试和工作中的标准任务。

## 概念
Python 循环对每个元素都要付出解释器开销（类型检查、装箱、分派）。向量化的 NumPy 运算在连续内存上运行一个 C 循环，通常还会用到 SIMD 指令。

转换模式：

| 循环思路 | 向量化写法 |
|---|---|
| `[x * 2 + 1 for x in a]` | `a * 2 + 1` |
| 逐元素 `if/else` | `np.where(cond, a, b)`、`np.select([...], [...])` |
| 累计和 | `np.cumsum(a)` |
| 统计匹配个数 | `(a > t).sum()` / `np.count_nonzero` |
| 按整数键分组求和 | `np.bincount(keys, weights=vals)` |
| 截断取值 | `np.clip(a, lo, hi)` |
| 差分 | `np.diff(a)` |
| 分桶 | `np.digitize(a, bins)` |

- `np.vectorize` 只是一个便利封装，**不能**加速：它仍然在 Python 中循环。
- 有些递推关系（每一步依赖前一步的结果，例如带自定义逻辑的指数平滑）难以干净地向量化；可以用 Numba、Cython，或者接受循环。
- 向量化代码可能使用更多内存（临时数组）；数据非常大时，分块处理。
- 在优化前后用 `%timeit` / `time.perf_counter()` 测量。

## 示例讲解
给交易打标签：金额 > 100 为 “high”，> 20 为 “mid”，否则为 “low”。

```python
labels = np.select([amount > 100, amount > 20], ["high", "mid"], default="low")
```
在 1000 万行数据上，这比带 if/elif 的 Python 循环快约 50 倍。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`np.vectorize(f)(arr)` 和原生 NumPy 运算一样快吗？",
  "options": ["是的，它会把 f 编译成 C", "不是，它只是一个便利封装，仍然在 Python 循环中调用 f", "只对整数数组成立", "只在 GPU 上成立"],
  "explanation": "官方文档说明它是为了方便，而不是为了性能。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 NumPy 改写这些循环（不用 Python 循环）：`bucketize(amount)` 返回由 'low'/'mid'/'high' 组成的数组（> 100 为 high，> 20 为 mid）；`group_sum(keys, vals, n_groups)` 对 0..n_groups−1 的整数键返回各键之和；`pct_change(prices)` 对 t ≥ 1 返回 (p[t] − p[t−1]) / p[t−1]。",
  "hints": ["np.select 按顺序判断条件，就像 if/elif。", "带 weights 的 np.bincount 按整数键对值求和；minlength 会为空组补零。"]
}
```

> [!TIP] 面试技巧
> - 解释向量化*为什么*更快（逐元素的解释器开销 vs C 循环）。
> - 掌握一套工具：where/select、cumsum、bincount、diff、clip、digitize。
> - 指出 np.vectorize 并不快，并提到对有循环依赖的计算使用 Numba。
