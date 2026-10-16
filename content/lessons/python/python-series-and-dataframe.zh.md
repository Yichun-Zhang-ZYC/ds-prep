---
id: python-series-and-dataframe
title: Series 与 DataFrame
---

## 为什么重要
pandas 是 Python 中处理表格数据的默认工具，大多数 DS 编码面试都会有一道 pandas 题。理解其数据模型（索引 + 列 + 数据类型）能避免让人栽跟头的对齐和数据类型意外。

## 概念
- **Series** 是带标签的一维数组：值 + **索引**。
- **DataFrame** 是共享同一个索引的多个 Series 组成的表；每列有自己的 dtype。

```python
import pandas as pd
df = pd.DataFrame({
    "user": ["a", "b", "c"],
    "age": [25, 32, 41],
    "plan": ["free", "pro", "pro"],
})
df.shape; df.dtypes; df.columns; df.index
df.head(); df.info(); df.describe()
df["age"]                 # Series
df[["user", "age"]]       # DataFrame
df["age_next"] = df["age"] + 1        # new column (vectorized)
df = df.assign(is_pro=df["plan"].eq("pro"))
df["plan"].value_counts()
df.rename(columns={"user": "user_id"}); df.drop(columns=["age_next"])
```

- **索引对齐**：Series 之间的算术运算按索引标签对齐，而不是按位置。不匹配的标签会产生 NaN。
- 数据类型：`int64`、`float64`、`bool`、`object`（Python 对象/字符串）、`string`、`category`、`datetime64[ns]`。含有缺失值的整数列会变成 `float64`（或使用可空的 `Int64`）。
- 读写：`pd.read_csv`、`read_parquet`、`to_parquet`（列式存储、带类型，比 CSV 快得多）。

## 示例讲解
```python
s1 = pd.Series([1, 2, 3], index=["a", "b", "c"])
s2 = pd.Series([10, 20, 30], index=["b", "c", "d"])
s1 + s2
# a     NaN
# b    12.0
# c    23.0
# d     NaN
```
按标签对齐很强大，但如果你预期的是按位置相加，就会感到意外；要按位置相加，用 `.to_numpy()` 或 `reset_index(drop=True)`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个整数列在合并后出现了一个缺失值。默认情况下它的 dtype 会怎样？",
  "options": ["保持 int64", "变成 float64（NaN 是浮点数）", "变成 object", "报错"],
  "explanation": "NumPy 整数无法存放 NaN，所以 pandas 会向上转换为 float64，除非你使用可空的 Int64 类型。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `build_users()`，返回包含列 `user` = ['a','b','c']、`age` = [25, 32, 41]、`plan` = ['free','pro','pro'] 的 DataFrame。编写 `add_features(df)`，返回新增 `is_pro`（布尔值）和 `age_group`（'<30' 或 '30+'）两列的新 DataFrame，不要修改输入。编写 `plan_share(df)`，返回各套餐占比的 Series（归一化的 value_counts）。",
  "hints": ["df.assign 返回一个新的 DataFrame，原 DataFrame 保持不变。", "value_counts(normalize=True) 给出比例。"]
}
```

> [!TIP] 面试技巧
> - 做 pandas 题时先检查 `df.shape`、`df.dtypes`、`df.head()` 和缺失值。
> - 记住算术运算中的索引对齐；它能解释很多意外出现的 NaN。
> - 优先使用向量化的列运算和 `assign`，而不是逐行循环。
