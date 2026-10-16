---
id: python-missing-values
title: 缺失值
---

## 为什么重要
每个真实数据集都有缺失值，而 pandas 的处理方式（NaN、None、NaT、pd.NA）有一些怪癖。面试官会检查你是否有意识地发现、量化和处理缺失值，而不是一律 `dropna()`。

## 概念
```python
df.isna().sum()                     # missing count per column
df.isna().mean().sort_values()      # missing share per column
df.dropna(subset=["user_id"])       # drop rows missing key fields only
df.dropna(thresh=3)                 # keep rows with at least 3 non-null values
df["age"].fillna(df["age"].median())
df["city"].fillna("Unknown")
df.fillna({"age": 0, "city": "Unknown"})
df.groupby("region")["price"].transform(lambda s: s.fillna(s.median()))   # group-wise
df.sort_values("ts").groupby("user")["status"].ffill()                   # forward fill per user
df["price"].interpolate()           # linear interpolation for ordered data
df["age_missing"] = df["age"].isna().astype(int)                         # indicator
```

需要了解的语义：
- `NaN`（浮点）、`None`（对象）、`NaT`（日期时间）和 `pd.NA`（可空类型）在 `isna()` 中都算作缺失。
- `NaN != NaN`；绝不要用 `== np.nan` 来判断。
- 聚合默认**跳过 NaN**（`mean`、`sum`）；全为 NaN 的列 `sum` 结果是 0。`count()` 不计 NaN，`size()` 计入。
- `groupby` 会丢弃 NaN 键，除非 `dropna=False`。
- 空字符串、"N/A"、-999 在转换之前都不是 NaN：用 `df.replace({"": np.nan, "N/A": np.nan, -999: np.nan})` 或 `read_csv(na_values=[...])`。

## 示例讲解
年龄列有 15% 缺失，且集中在通过移动端注册的用户中。删除这些行会让数据偏向桌面端用户。更好的做法：按注册渠道用中位数填补，并加上 `age_missing`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`pd.Series([1, np.nan, 3]).mean()` 返回什么？",
  "options": ["NaN", "2.0", "1.33", "报错"],
  "explanation": "pandas 默认跳过 NaN（skipna=True）：(1 + 3) / 2 = 2。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `missing_report(df)`，返回每列缺失比例的 Series，按降序排列。编写 `clean(df)`：把 '' 和 'N/A' 字符串转换为 NaN，把数值列 `price` 用**其所在 `region` 的价格中位数**填补，把 `city` 填为 'Unknown'，并新增 `price_missing`（转换后 price 原本缺失则为 1，否则为 0）。不要修改输入。",
  "hints": ["df.replace 返回一个新的 DataFrame。", "用 groupby('region')['price'].transform('median') 得到每行对应的组中位数来填补。"]
}
```

> [!TIP] 面试技巧
> - 先量化每列的缺失情况，并询问为什么会缺失。
> - 分析之前把哨兵值（''、'N/A'、-999）转换为 NaN。
> - 优先使用有针对性的填补（组中位数、按实体前向填充）加上指示列，而不是一律 dropna。
