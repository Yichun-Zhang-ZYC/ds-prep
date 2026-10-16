---
id: python-choosing-the-right-chart
title: Choosing the right chart
estimatedMinutes: 10
difficulty: easy
tags: [python, visualization, communication]
---

## Why it matters
Data scientists are judged on how clearly they communicate. "How would you visualize X?" questions test whether you match the chart to the question and avoid misleading designs.

## Concept
Pick by the **question**, not the data type alone:

| Question | Chart |
|---|---|
| Trend over time | Line chart (bars for few discrete periods) |
| Compare categories | Horizontal bar chart, sorted; dot plot |
| Distribution of one variable | Histogram, KDE, box/violin plot, ECDF |
| Compare distributions across groups | Box/violin plots, overlaid ECDFs, small-multiple histograms |
| Relationship between two numeric variables | Scatter (+ trend line), hexbin for large n |
| Part-to-whole | Stacked bar, 100% bar; pie only for 2–3 parts |
| Correlation across many variables | Heatmap |
| Funnel / conversion steps | Funnel or horizontal bars with step rates |
| Estimates with uncertainty | Dot + error bars (CI), forest plot |
| Geography | Choropleth (normalize by population!) |

Avoid misleading charts:
- Truncated y-axis on **bar** charts exaggerates differences (bars encode length from zero).
- Dual y-axes can imply any correlation you like.
- 3-D effects, too many colors, unsorted categories, pie charts with many slices.
- Plotting counts when rates are what matter (larger regions always have more).
- Cherry-picked time windows.

Design: one message per chart, title states the insight ("Mobile conversion fell 12% after v5.2"), label units, direct-label lines instead of legends when possible, highlight what matters and grey out the rest.

## Worked example
Question: "Did the checkout redesign change conversion across 12 markets?" Weak: a grouped bar chart of 24 conversion rates. Better: a dot plot of the **difference** (treatment − control) with 95% CIs per market, sorted, with a vertical line at zero. The reader sees effect size and certainty at a glance.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You want to compare the distribution of session length between 4 app versions. Best chart?",
  "options": ["Pie chart", "Box or violin plots side by side (or overlaid ECDFs)", "Line chart of means", "Stacked bar chart"],
  "answer": 1,
  "explanation": "Box/violin plots and ECDFs compare whole distributions, not just averages."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is a bar chart with the y-axis starting at 95 misleading?",
  "options": ["Bars must be colored", "Bar length encodes the value from zero, so a truncated axis exaggerates differences", "It's not misleading", "Bar charts can't show percentages"],
  "answer": 1,
  "explanation": "Line charts can zoom; bar charts should start at zero."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `recommend_chart(question)` mapping a question type to a chart: 'trend' → 'line', 'compare_categories' → 'sorted_bar', 'distribution' → 'histogram', 'relationship' → 'scatter', 'part_to_whole' → 'stacked_bar', 'uncertainty' → 'dot_with_ci'. Raise `ValueError` for unknown types. Then write `per_capita(counts, population)` returning a dict region → count per 100,000 people, rounded to 1 decimal.",
  "starterCode": "def recommend_chart(question):\n    pass\n\ndef per_capita(counts, population):\n    pass\n\nprint(per_capita({'A': 500, 'B': 90}, {'A': 1_000_000, 'B': 50_000}))",
  "tests": "assert recommend_chart('trend') == 'line'\nassert recommend_chart('uncertainty') == 'dot_with_ci'\nassert recommend_chart('part_to_whole') == 'stacked_bar'\ntry:\n    recommend_chart('vibes')\n    assert False\nexcept ValueError:\n    pass\nassert per_capita({'A': 500, 'B': 90}, {'A': 1_000_000, 'B': 50_000}) == {'A': 50.0, 'B': 180.0}",
  "solution": "def recommend_chart(question):\n    table = {\n        'trend': 'line',\n        'compare_categories': 'sorted_bar',\n        'distribution': 'histogram',\n        'relationship': 'scatter',\n        'part_to_whole': 'stacked_bar',\n        'uncertainty': 'dot_with_ci',\n    }\n    if question not in table:\n        raise ValueError(question)\n    return table[question]\n\ndef per_capita(counts, population):\n    return {r: round(counts[r] / population[r] * 100_000, 1) for r in counts}",
  "hints": ["A dict lookup with a guard is enough.", "Region B has fewer cases but a much higher rate; that's why maps should be normalized."]
}
```

> [!TIP] Interview tips
> - Start from the question ("trend? comparison? distribution?") and name the chart that answers it.
> - Show uncertainty (CIs) for estimates and normalize counts into rates.
> - Call out misleading practices: truncated bar axes, dual axes, pies with many slices.
