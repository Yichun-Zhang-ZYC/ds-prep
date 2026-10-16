---
id: python-indexing-loc-iloc
title: 索引：loc / iloc
---

## 为什么重要
混淆 `loc` 和 `iloc` 会导致差一错误、选错行以及 `SettingWithCopyWarning`。面试官会检查你是否能明确且正确地选取和更新数据。

## 概念
- `.loc[rows, cols]`：基于**标签**。切片**包含**结束标签。接受布尔掩码。
- `.iloc[rows, cols]`：基于**整数位置**。切片**不包含**结束位置（与 Python 一致）。
- `.at[row, col]` / `.iat[i, j]`：快速访问单个值。

```python
df = df.set_index("user")
df.loc["b"]                       # one row (Series)
df.loc["a":"c", ["age", "plan"]]  # rows a..c INCLUSIVE
df.iloc[0:2, 0]                   # first two rows, first column
df.loc[df["age"] > 30, "plan"]    # mask + column
df.loc[df["age"] > 30, "segment"] = "senior"   # safe in-place update
df.reset_index()                  # index back to a column
```

- `df["col"]` 选取列；`df[mask]` 筛选行；`df[0:3]` 按位置切片行。正是这种重载让显式的 `loc`/`iloc` 更清晰。
- **链式索引**（`df[df.age > 30]["plan"] = "x"`）可能修改的是一个临时副本，结果悄无声息地什么也没做；应使用单个 `.loc[mask, col] = value`。
- 筛选后索引会有空缺：`iloc[0]` 是剩下的第一行，`loc[0]` 是标签为 0 的行（可能已被筛掉）。

## 示例讲解
```python
df = pd.DataFrame({"x": [10, 20, 30, 40]})
sub = df[df.x > 15]       # index is [1, 2, 3]
sub.iloc[0]               # x = 20 (first row by position)
sub.loc[1]                # x = 20 (row labeled 1)
sub.loc[0]                # KeyError: label 0 was filtered out
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在默认的 RangeIndex 下，`df.loc[0:3]` 和 `df.iloc[0:3]` 分别返回多少行？",
  "options": ["3 和 3", "4 和 3", "3 和 4", "4 和 4"],
  "explanation": "loc 切片包含结束标签（0,1,2,3）；iloc 不包含结束位置（0,1,2）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "给定包含 `user`、`age`、`plan` 列的 DataFrame：编写 `ages_for(df, users)`，返回给定用户名对应年龄的 Series（把 `user` 设为索引并使用 `.loc`）。编写 `first_n_cols(df, n)`，按位置返回前 n 列。编写 `flag_seniors(df, min_age)`，返回一个副本，其中新增列 `senior`，在 age ≥ min_age 处为 True（在副本上用 `.loc` 赋值）。",
  "hints": ["`.loc[标签列表, 'age']` 按列表的顺序返回行。", "iloc[:, :n] 选取所有行和前 n 列。"]
}
```

> [!TIP] 面试技巧
> - 说出“loc = 标签、包含结尾；iloc = 位置、不含结尾”。
> - 使用单个 `.loc[mask, col] = value`，避免链式赋值 bug。
> - 记住筛选会留下索引空缺；位置重要时用 reset_index。
