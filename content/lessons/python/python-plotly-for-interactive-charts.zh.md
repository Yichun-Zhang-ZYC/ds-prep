---
id: python-plotly-for-interactive-charts
title: 用 plotly 做交互式图表
---

## 为什么重要
业务方喜欢悬停、缩放和筛选。plotly（以及基于它构建的仪表盘，如 Dash 或 Streamlit）是从 Python 发布交互式图表的常用方式，在 DA/BI 面试中也会出现。

## 概念
**plotly.express** 能从整洁的 DataFrame 一行代码生成图表：

```python
import plotly.express as px
fig = px.line(df, x="date", y="revenue", color="region",
              hover_data=["orders"], title="Daily revenue by region")
fig.update_layout(yaxis_title="USD", hovermode="x unified")
fig.show()                        # notebook
fig.write_html("revenue.html")    # shareable standalone file

px.scatter(df, x="age", y="spend", color="plan", size="orders", log_y=True)
px.histogram(df, x="amount", nbins=50, color="variant", barmode="overlay")
px.bar(df, x="country", y="users", facet_col="device")
px.choropleth(df, locations="iso3", color="rate")
px.scatter(df, x="gdp", y="life", animation_frame="year")   # animation
```

- 需要精细控制、混合多种图形类型时，用 `plotly.graph_objects`（`go.Figure`、`add_trace`）。
- 交互性：悬停提示、缩放/平移、点击图例切换序列、范围滑块（`fig.update_xaxes(rangeslider_visible=True)`）。
- 仪表盘：**Streamlit**（做原型最快）、**Dash**（plotly 的框架），或者面向业务用户的 BI 工具（Tableau、Looker、Power BI）。

权衡：点很多时交互式 HTML 文件会很大（先聚合或用 `render_mode="webgl"`）；报告和幻灯片用静态图片（`fig.write_image`）；交互性救不了选错的图表。

## 示例讲解
一位产品经理想按国家和设备探索转化率随时间的变化。用 `px.line(..., color="country", facet_col="device")`，悬停时显示用户数和转化数，保存为 HTML，就能回答大部分后续问题，不必再向数据团队提新需求。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "什么时候静态的 matplotlib 图表比交互式 plotly 图表更好？",
  "options": ["从来不会", "用于打印的报告、幻灯片和论文，信息必须在不交互的情况下也清楚", "当数据有日期时", "使用 pandas 时"],
  "explanation": "交互性有助于探索；对于固定的媒介，带有清晰结论的静态图更好。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "交互式图表需要整洁（长格式）的数据。编写 `to_tidy(wide)`，把形如 `{'date': [...], 'US': [...], 'CA': [...]}` 的字典转换为键为 `date`、`region`、`value` 的字典列表（地区按输入中键的顺序，行先按地区再按日期排列）。再编写 `downsample(points, max_points)`，每隔 k 个点保留一个（k = ceil(长度 / max_points)），让图表保持轻量。",
  "hints": ["跳过 'date' 键，遍历其余的列。", "points[::k] 每隔 k 个元素保留一个。"]
}
```

> [!TIP] 面试技巧
> - 提到用 plotly express 快速制作交互式图表，用 Streamlit/Dash 做轻量应用。
> - 给它提供带 `color` 或 `facet` 列的长格式/整洁数据。
> - 知道什么时候静态图更好（报告、幻灯片），以及如何让大型交互图保持流畅（聚合、WebGL）。
