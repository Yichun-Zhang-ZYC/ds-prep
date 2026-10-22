---
id: analytics-bi-dashboard-design-principles
title: Dashboard design principles
estimatedMinutes: 10
difficulty: easy
tags: [analytics, dashboards, data-visualization, design]
---

## Why it matters

"Here is a dashboard that nobody uses. What would you change?" Dashboard design questions test whether you think about the audience and decision, not just chart types.

## Concept

**Start with the user and decision.** Who looks at it, how often, and what action follows? Common types: *strategic* (executives, few KPIs, monthly), *operational* (real-time, alert-driven), *analytical* (exploratory, many filters).

**Layout and hierarchy**
- Put the most important numbers top-left (people scan in an F or Z pattern): KPI cards with delta vs target and prior period, then trends, then breakdowns, then detail.
- Group related visuals; keep alignment and spacing consistent; one screen, minimal scrolling.

**Choosing visuals**
- Time → line; compare categories → sorted bars; distribution → histogram/box; relationship → scatter; part-to-whole → stacked bar (pies only for 2-3 slices).
- Avoid 3D, dual axes, truncated bar axes, and decoration (low data-ink ratio).

**Colour and labels**
- Use colour to encode meaning (one accent, status red/amber/green) and make it colour-blind safe. Keep consistent colours per category across pages.
- Titles state the takeaway; label units, time range and the data "as of" timestamp.

**Interactivity and trust**: few, sensible filters with defaults; drill-down instead of clutter; metric definitions in tooltips; one governed source of truth.

**Performance**: slow dashboards die. Pre-aggregate, use extracts/import mode, limit visuals per page and high-cardinality filters; aim for load under about 5 seconds.

## Worked example

Before: a sales dashboard with 18 visuals, 3 pies, a rainbow palette and a 25 s load time; users export to Excel instead.

After (same data, redesigned for the weekly pipeline review): 5 KPI cards (bookings, pipeline, win rate, average deal size, forecast vs quota) each showing the delta vs last week; 1 trend line of bookings vs target; 1 sorted bar of bookings by region with the weakest region highlighted in the accent colour; 1 detail table on a drill-through page. Aggregates are precomputed nightly and the load time drops to 4 s. Test: can a VP state the status of the quarter within 5 seconds?

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You must compare revenue across 12 product categories. Which chart is usually best?",
  "options": [
    "Pie chart with 12 slices",
    "Sorted horizontal bar chart",
    "3D stacked area chart",
    "Donut chart with a legend"
  ],
  "answer": 1,
  "explanation": "Length along a common baseline is the easiest visual comparison. Sorted bars with direct labels beat pies, which fail beyond 3-5 slices."
}
```

```quiz
{
  "id": "q2",
  "question": "An executive dashboard shows a KPI card reading \"Revenue 4.2M\". What is the most important missing element?",
  "options": [
    "A gradient fill",
    "Context: vs target or prior period, and the data as-of date",
    "An animation",
    "A 3D effect"
  ],
  "answer": 1,
  "explanation": "A number without a comparison can't tell the reader whether to act. Add delta vs target/prior period and a freshness timestamp."
}
```

## Practice

```reveal
{
  "prompt": "A colleague shows you a sales dashboard: 18 visuals, 9 filters, rainbow colours, three pie charts, two dual-axis charts, and a 25-second load time. Critique it and describe how you would redesign it for a VP of Sales.",
  "answer": "**Diagnose first**: ask who uses it and which decisions it supports (e.g. weekly pipeline review). Then:\n\n- **Too much**: 18 visuals compete for attention. Keep ~5-7, ordered by importance.\n- **Hierarchy**: top row of 4-5 KPI cards with delta vs target and prior period; below, one trend line (time) and one sorted bar (region or rep); detail table at the bottom or on a drill-through page.\n- **Charts**: replace pies with sorted bars; remove dual axes (they imply false correlation) in favour of two aligned small multiples.\n- **Colour**: one neutral base colour, one accent for the highlighted item, red/green only for status and colour-blind safe (add icons or labels).\n- **Filters**: 2-3 that matter (date range, region, segment) with sensible defaults, applied consistently and shown on the page.\n- **Trust**: titles that state the takeaway, units, metric definitions in tooltips, an \"as of\" timestamp.\n- **Performance**: pre-aggregate in the warehouse or use extracts/import mode, cut visuals and high-cardinality fields; target under 5 s.\n\nSuccess check: a VP gets the status in 5 seconds and knows where to drill."
}
```

> [!TIP] Interview tips
> - Open with audience and decision before talking about chart types.
> - Mention performance, trust (definitions, freshness) and accessibility; many candidates stop at aesthetics.
> - Pitfall: giving every stakeholder their own filter; a dashboard that answers everything answers nothing.
