---
id: python-matplotlib-seaborn-basics
title: matplotlib / seaborn 基础
---

## 为什么重要
探索性数据分析、带回家的作业和模型诊断都需要快速、整洁的图表。面试官希望看到面向对象的 matplotlib API、带标签的坐标轴和合理的图表选择，而不是默认样式下杂乱的图。

## 概念
使用**面向对象**的 API：创建 Figure 和 Axes，然后在 axes 上调用方法。

```python
import matplotlib.pyplot as plt
import seaborn as sns

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].hist(df["amount"], bins=50)
axes[0].set(title="Order amount", xlabel="USD", ylabel="Orders")
axes[1].plot(daily.index, daily.values, label="daily")
axes[1].plot(daily.index, daily.rolling(7).mean(), label="7-day avg")
axes[1].legend()
fig.tight_layout()
fig.savefig("eda.png", dpi=150)
```

**seaborn** 在 matplotlib 之上构建统计图表，可以直接使用 DataFrame（长格式）：

```python
sns.histplot(df, x="amount", hue="plan", log_scale=True)
sns.boxplot(df, x="plan", y="amount")
sns.scatterplot(df, x="age", y="amount", hue="plan", alpha=0.3)
sns.lineplot(df, x="date", y="revenue", hue="region")       # aggregates + CI band
sns.heatmap(df.corr(numeric_only=True), annot=True, cmap="vlag", center=0)
sns.pairplot(df[cols]); sns.relplot(..., col="region")      # small multiples
```

好习惯：
- 坐标轴始终标注单位，标题直接点明结论。
- 点重叠时用 `alpha` 或 hexbin；偏态数据用对数刻度。
- 柱状图从零开始；折线图可以放大局部。
- 使用对色盲友好的配色，避免不必要的 3D 图或饼图。

## 示例讲解
人均收入严重右偏：线性直方图只在 0 附近显示一根很高的柱子。`sns.histplot(x="revenue", log_scale=True)` 揭示出大致对数正态的形状，以及一个值得深入研究的高价值买家群体。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "100 万个点的散点图变成了一整块实心团。最好的解决办法是？",
  "options": ["把点画得更大", "使用透明度（alpha）、抽样，或 hexbin / 二维直方图", "改成饼图", "加一个 3D 坐标轴"],
  "explanation": "点重叠会掩盖密度；alpha 或分箱能把密度显示出来。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "这里不检查绘图本身；练习准备可直接绘图的数据。编写 `hist_bins(values, n_bins)`，在 [最小值, 最大值] 上划分等宽的箱，返回 `(edges, counts)`（最大值放进最后一个箱）；再编写 `log_bins(lo, hi, n)`，返回从 lo 到 hi 的 n + 1 个对数间隔的边界（使用基于 log10 的 `numpy.logspace`）。",
  "hints": ["边界：np.linspace(min, max, n_bins + 1)。", "searchsorted(..., side='right') − 1 给出每个值所在的箱；clip 把最大值放进最后一个箱。"]
}
```

```reveal
{
  "prompt": "在一份带回家的作业中，你被要求展示新的定价页面是否改变了 5 个国家的转化率。你会放哪些图？",
  "answer": "1. **每个国家的点估计及置信区间**（点图或柱状图 + 误差线），按效应大小排序，并画出零线。这能直接回答问题。\n2. **各变体的每日转化率**（折线图，按国家分面的小多图），用来检查稳定性和新奇效应。\n3. **每个国家的样本量**（小柱状图或表格），让读者知道哪些估计噪声大。\n\n坐标轴标注单位（百分点），每个标题写明结论，避免在一张图上叠 10 条线。"
}
```

> [!TIP] 面试技巧
> - 使用 `fig, ax = plt.subplots()`，并在 axes 上设置标签和标题。
> - 用 seaborn 从 DataFrame 快速绘制统计图（hue、用 col 画小多图）。
> - 提到偏态数据用对数刻度，点重叠用 alpha/hexbin。
