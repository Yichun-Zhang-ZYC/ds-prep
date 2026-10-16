---
id: python-plotly-for-interactive-charts
title: plotly for interactive charts
estimatedMinutes: 8
difficulty: easy
tags: [python, visualization, plotly, dashboards]
---

## Why it matters
Stakeholders love hovering, zooming and filtering. plotly (and dashboards built on it, like Dash or Streamlit) is the common way to ship interactive charts from Python, and it comes up in DA/BI interviews.

## Concept
**plotly.express** gives one-line charts from tidy DataFrames:

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

- `plotly.graph_objects` (`go.Figure`, `add_trace`) for fine-grained control and mixing trace types.
- Interactivity: hover tooltips, zoom/pan, legend click to toggle series, range sliders (`fig.update_xaxes(rangeslider_visible=True)`).
- Dashboards: **Streamlit** (fastest for prototypes), **Dash** (plotly's framework), or BI tools (Tableau, Looker, Power BI) for business users.

Tradeoffs: interactive HTML files can be large with many points (use aggregation or `render_mode="webgl"`); static images (`fig.write_image`) for reports and slides; interactivity doesn't fix a poorly chosen chart.

## Worked example
A product manager wants to explore conversion by country and device over time. A `px.line(..., color="country", facet_col="device")` with hover showing users and conversions, saved as HTML, answers most follow-up questions without new requests to the data team.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "When is a static matplotlib chart better than an interactive plotly one?",
  "options": ["Never", "For printed reports, slides and papers where the message must be clear without interaction", "When the data has dates", "When using pandas"],
  "answer": 1,
  "explanation": "Interactivity helps exploration; a static chart with a clear takeaway is better for fixed media."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Interactive charts need tidy (long) data. Write `to_tidy(wide)` that converts a dict like `{'date': [...], 'US': [...], 'CA': [...]}` into a list of dicts with keys `date`, `region`, `value` (regions in the input key order, rows ordered by region then date). Then write `downsample(points, max_points)` that keeps every k-th point (k = ceil(len / max_points)) so the chart stays light.",
  "starterCode": "import math\n\ndef to_tidy(wide):\n    pass\n\ndef downsample(points, max_points):\n    pass\n\nprint(to_tidy({'date': ['d1', 'd2'], 'US': [1, 2], 'CA': [3, 4]}))",
  "tests": "t = to_tidy({'date': ['d1', 'd2'], 'US': [1, 2], 'CA': [3, 4]})\nassert t == [{'date': 'd1', 'region': 'US', 'value': 1}, {'date': 'd2', 'region': 'US', 'value': 2}, {'date': 'd1', 'region': 'CA', 'value': 3}, {'date': 'd2', 'region': 'CA', 'value': 4}]\nassert downsample(list(range(10)), 5) == [0, 2, 4, 6, 8]\nassert downsample(list(range(10)), 3) == [0, 4, 8]\nassert downsample([1, 2], 10) == [1, 2]",
  "solution": "import math\n\ndef to_tidy(wide):\n    dates = wide['date']\n    rows = []\n    for region, values in wide.items():\n        if region == 'date':\n            continue\n        for d, v in zip(dates, values):\n            rows.append({'date': d, 'region': region, 'value': v})\n    return rows\n\ndef downsample(points, max_points):\n    k = max(1, math.ceil(len(points) / max_points))\n    return points[::k]",
  "hints": ["Skip the 'date' key and loop over the remaining columns.", "points[::k] keeps every k-th element."]
}
```

> [!TIP] Interview tips
> - Mention plotly express for quick interactive charts and Streamlit/Dash for lightweight apps.
> - Feed it long/tidy data with a `color` or `facet` column.
> - Know when static is better (reports, slides) and how to keep big interactive charts fast (aggregate, WebGL).
