---
id: python-practice-pandas-groupby-puzzles
title: "练习：pandas groupby 谜题"
---

## 为什么重要

“每组 Top N”“占组总量的比例”“每位客户的最新一行”“把每行与其所在组比较”是 pandas 面试的经典题。它们考察你是否知道何时用 `agg`、`transform` 或 `head`，而不是背 API。

## 概念

**决策规则**（基础见 groupby agg/transform 课）：

- 每组输出一行：`agg`（用具名聚合：`agg(n=("id", "size"), total=("amt", "sum"))`）。
- 输出与输入等长、把组统计量广播回每行：`transform`（`x / g.transform("sum")`）。
- 每组保留少数几行：先排序，再 `groupby(...).head(n)` 或 `.nlargest`；并列重要时用 `rank(method=..., ascending=False)`。
- 与组内相邻行比较：`groupby(...).shift()`、`.diff()`、`.cumsum()`、`.cumcount()`。
- 任意的组内逻辑：`apply` 是最后手段（慢，且输出形状容易出错）。

**常见陷阱**：

- 在 `head`、`first` 或 `last` 之前先 `sort_values`；groupby 只保留组内行的原有顺序，不会替你排序。
- `groupby` 默认丢弃 NaN 键；用 `dropna=False` 保留。
- `size` 统计行数，`count` 统计非空值个数。
- 合并结果之前先用 `as_index=False` 或 `reset_index()`；聚合会把键移到索引中。
- 并列：`head(2)` 恰好返回 2 行，而 `rank(method="dense") <= 2` 可能返回更多。要明确题目想要哪种。
- 选一列后用列表字典调用 `agg` 会得到 MultiIndex 列；想要扁平列名就用具名聚合。

## 示例讲解

各区域销售额：E 区有销售 a、b、c，金额为 50、30、20；W 区有 d、e、f，金额为 40、40、10。任务：求每位销售占区域总额的比例，以及其在区域内的稠密排名。

```python
g = df.groupby("region")["amount"]
df["share"] = df["amount"] / g.transform("sum")
df["rank"] = g.rank(method="dense", ascending=False)
```

区域总额为 100（E）和 90（W），所以 E 的占比为 0.50、0.30、0.20，W 的占比为 0.444、0.444、0.111；排名分别为 1、2、3 和 1、1、2。`transform("sum")` 返回与原索引对齐的 Series，因此除法逐行进行，无需合并。若改用 `agg("sum")`，只会得到 2 行，还得再连接回去。W 区存在并列，因此“每区第一名”在 `rank` 下返回两位销售，而在 `sort + head(1)` 下只返回一位。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你需要把每笔订单金额除以该客户的总消费，并保留所有行。哪种写法最简洁？",
  "options": [
    "`df.groupby(\"cust\")[\"amt\"].agg(\"sum\")`",
    "`df[\"amt\"] / df.groupby(\"cust\")[\"amt\"].transform(\"sum\")`",
    "`df.groupby(\"cust\").apply(len)`",
    "`df.groupby(\"cust\")[\"amt\"].head(1)`"
  ],
  "explanation": "`transform` 返回与原始行对齐的结果，因此除法是逐元素的。`agg` 会压缩成每位客户一行。"
}
```

```quiz
{
  "id": "q2",
  "question": "某组的金额为 40、40、10。`rank(method=\"min\", ascending=False)` 返回什么？",
  "options": [
    "1, 2, 3",
    "1, 1, 3",
    "1, 1, 2",
    "1, 2, 2"
  ],
  "explanation": "`min` 给并列行赋予该并列段中最小的名次（1, 1）并跳过下一个名次（3）；`dense` 则给出 1, 1, 2。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "`df` 含有列 `region`、`rep`、`amount`。编写 `top2_per_region(df)`，返回每个区域金额最大的 2 行（并列时按输入顺序），按 region 升序、amount 降序排列，索引重置为 0..n-1，列保持原样。",
  "hints": [
    "先排序，再 `groupby(\"region\").head(2)`。",
    "使用 `kind=\"stable\"` 让并列行保持输入顺序，最后用 `reset_index(drop=True)`。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "编写 `add_share_rank(df)`，返回 `df`（列为 `region`、`rep`、`amount`）的副本，并新增两列：`share` = 金额 / 区域总额，`rank` = 金额在区域内的稠密排名（最高为 1，整数类型）。不要改变行顺序。",
  "hints": [
    "只构造一次 `g = out.groupby(\"region\")[\"amount\"]` 并复用。",
    "`rank` 返回浮点数；用 `astype(int)` 转换。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "`orders` 含有列 `customer`、`date`（ISO 字符串）和 `amount`。编写 `repeat_buyers(orders)`，返回一个 DataFrame，列为 `customer`、`n`（订单数）、`total`（总额）和 `above_avg`（客户最近一单金额是否大于该客户的平均订单金额）。只保留至少有 2 笔订单的客户，按 `total` 降序排列，索引重置。",
  "hints": [
    "使用 `\"last\"` 之前先按 date 排序；groupby 会保留组内的行顺序。",
    "具名聚合 `agg(n=\"size\", total=\"sum\", ...)` 给出扁平列名；之后再用布尔掩码过滤。"
  ]
}
```

> [!TIP] 面试技巧
> - 先说清答案的形状（每组一行、与输入等长，还是每组几行），这决定用 agg、transform 还是 head。
> - 在 first/last/head 之前一定先排序，并询问并列如何处理。
> - 优先使用具名聚合和 `transform` 而不是 `apply`；并说明 `apply` 更慢且输出形状不固定。
