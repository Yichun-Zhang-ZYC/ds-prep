---
id: experimentation-difference-in-differences
title: Difference-in-differences
estimatedMinutes: 15
difficulty: medium
tags: [causal-inference, did, quasi-experiment, policy-evaluation]
---

## Why it matters
"We launched in Canada but not the US. What was the effect?" When you can't randomize but have a comparison group and data before and after, difference-in-differences (DiD) is the go-to method. It's the most-asked causal inference technique in DS interviews.

## Concept
Compare the **change** in the treated group with the **change** in a control group over the same period:

$$
\text{DiD} = (\bar Y_{T,\text{post}} - \bar Y_{T,\text{pre}}) - (\bar Y_{C,\text{post}} - \bar Y_{C,\text{pre}})
$$

The control group's change estimates what would have happened to the treated group without treatment (time trends, seasonality).

**Key assumption: parallel trends.** Without treatment, both groups would have moved in parallel. Check it by plotting several pre-periods: the lines should move together before launch.

Regression form: $Y = \beta_0 + \beta_1 \text{Treated} + \beta_2 \text{Post} + \beta_3 (\text{Treated} \times \text{Post}) + \varepsilon$, where $\beta_3$ is the DiD estimate (add unit and time fixed effects for many periods).

Pitfalls: different pre-trends, other changes hitting only one group at the same time, and composition changes in the groups.

## Worked example
Weekly orders per store:

| | Before | After | Change |
|---|---|---|---|
| Canada (launched) | 100 | 130 | +30 |
| US (not launched) | 120 | 140 | +20 |

DiD = 30 − 20 = **+10 orders per store per week**. A naive before/after for Canada (+30) would wrongly credit the launch with the seasonal increase that the US also saw.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the key identifying assumption of difference-in-differences?",
  "options": ["The groups have equal levels before treatment", "Without treatment, the two groups' outcomes would have followed parallel trends", "Treatment was randomized", "The outcome is normally distributed"],
  "answer": 1,
  "explanation": "Levels can differ; it's the trends that must be parallel."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "`store_weeks(region, period, orders)` has one row per store-week with `period` = 'pre' or 'post' and region 'treated' or 'control'. Return the DiD estimate of average orders as `did`.",
  "setup": "CREATE TABLE store_weeks (store_id INTEGER, region TEXT, period TEXT, orders REAL); INSERT INTO store_weeks VALUES (1,'treated','pre',95),(2,'treated','pre',105),(1,'treated','post',128),(2,'treated','post',132),(3,'control','pre',118),(4,'control','pre',122),(3,'control','post',137),(4,'control','post',143);",
  "starterCode": "SELECT region, period, AVG(orders) AS avg_orders\nFROM store_weeks\nGROUP BY region, period;",
  "solution": "SELECT\n  (AVG(CASE WHEN region = 'treated' AND period = 'post' THEN orders END)\n   - AVG(CASE WHEN region = 'treated' AND period = 'pre' THEN orders END))\n - (AVG(CASE WHEN region = 'control' AND period = 'post' THEN orders END)\n   - AVG(CASE WHEN region = 'control' AND period = 'pre' THEN orders END)) AS did\nFROM store_weeks;",
  "hints": ["Compute four averages with AVG(CASE WHEN ... THEN orders END).", "DiD = (treated post − treated pre) − (control post − control pre)."]
}
```

> [!TIP] Interview tips
> - Draw the 2×2 table, then state the parallel-trends assumption and how you'd check it (pre-period plot, placebo tests).
> - Mention threats: concurrent shocks to one group, changing group composition.
> - With many groups and periods, use the regression form with fixed effects (and be aware of issues with staggered rollouts).
