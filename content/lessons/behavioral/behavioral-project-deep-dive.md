---
id: behavioral-project-deep-dive
title: Project deep dive
estimatedMinutes: 12
difficulty: medium
tags: [behavioral, project, impact, technical-depth]
---

## Why it matters
The deep dive is where interviewers test whether your resume claims are real. They will probe decisions, alternatives, failures and the numbers, often for 20-30 minutes on a single project.

## Concept
**Structure** (5-7 minutes uninterrupted, then Q&A): (1) **Context and goal**: the business problem, success metric and why it mattered; (2) **Your role and scope**: team size, what you personally owned; (3) **Approach and decisions**: data, baseline, model or method, and *why this over alternatives*; (4) **Challenges**: what broke or surprised you and how you dealt with it; (5) **Results**: baseline vs final, how it was measured (A/B test, backtest), business impact; (6) **Reflection**: what you would do differently.

**Be ready for probes**: why not a simpler baseline? How did you validate and avoid leakage? What were the failure modes and how were they monitored? How did it behave in production? How did you handle label noise or class imbalance? What would you do with 3 more months?

**Quantify impact honestly**: report the baseline, the change, the uncertainty (confidence interval or test result) and the translation into money or time. Incremental impact $= (\text{rate}_{control} - \text{rate}_{treated}) \times n_{treated}$. Distinguish offline metrics from online outcomes, and correlation from causal lift.

**Prepare 2-3 projects** thoroughly: re-read your code, notebook and results; know every number on your resume; keep a one-page cheat sheet (problem, data, method, metrics, timeline, trade-offs, learnings).

**Honesty**: say what was done by teammates; if you do not know, reason aloud or say what you would check.

## Worked example
**Project**: churn-prevention model for a subscription app (3 months, 2 data scientists, I owned modelling and the experiment).

**Context**: monthly churn was 8%; a retention offer costs $30 per user contacted. **Approach**: baseline was "contact users inactive for 14 days" (precision 5%). I built a gradient-boosted model on 40 behavioural features with a time-based split to avoid leakage. Precision in the top decile reached 30% (6x baseline). I chose boosting over a deep model after a logistic regression reached 80% of the gain and was easier to explain to marketing.

**Experiment**: 100,000 treated users vs 100,000 control. Churn: 8.0% control vs 7.2% treated. Incremental saves $= 0.008 \times 100{,}000 = 800$ users. At $120 annual value per saved user and $30,000 offer cost: $800 \times 120 - 30{,}000 = $66{,}000$ net. Significance: pooled rate 7.6%, $SE = \sqrt{0.076 \cdot 0.924 \cdot 2/100000} \approx 0.00119$, $z \approx 6.75$.

**Reflection**: I would pilot the offer on a smaller group first, and I would estimate uplift (who is *persuadable*) rather than raw churn risk, because some top-decile users would have stayed anyway.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An interviewer asks 'How do you know the model caused the improvement?' What is the best answer?",
  "options": [
    "The AUC was high",
    "A randomised holdout/A-B test measured the difference in outcome between treated and control users",
    "The dashboard went up after launch",
    "The stakeholders were happy"
  ],
  "answer": 1,
  "explanation": "Causal claims need randomisation (or a credible quasi-experiment); offline metrics and before/after comparisons are confounded."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the best way to describe your role in a team project?",
  "options": [
    "Say 'we' for everything",
    "Claim all the work",
    "State the team context briefly and specify what you personally owned and decided",
    "Avoid mentioning others"
  ],
  "answer": 2,
  "explanation": "Honest, specific ownership is credible and makes follow-up questions easy to answer."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `incremental_impact(n_treated, rate_control, rate_treated, value_per_save, cost)` returning `(saves, net)`: saves = (rate_control - rate_treated) * n_treated; net = saves * value_per_save - cost. Write `z_two_prop(n1, rate1, n2, rate2)` returning the pooled two-proportion z statistic for (rate1 - rate2) with equal-size or unequal groups: pooled p = (n1*rate1 + n2*rate2)/(n1+n2); se = sqrt(p*(1-p)*(1/n1 + 1/n2)).",
  "starterCode": "import math\n\ndef incremental_impact(n_treated, rate_control, rate_treated, value_per_save, cost):\n    pass\n\ndef z_two_prop(n1, rate1, n2, rate2):\n    pass\n\nprint(incremental_impact(100000, 0.08, 0.072, 120, 30000))\nprint(z_two_prop(100000, 0.08, 100000, 0.072))\n",
  "tests": "s, net = incremental_impact(100000, 0.08, 0.072, 120, 30000)\nassert abs(s - 800) < 1e-6 and abs(net - 66000) < 1e-3\nz = z_two_prop(100000, 0.08, 100000, 0.072)\np = 0.076\nse = math.sqrt(p * (1 - p) * 2 / 100000)\nassert abs(z - 0.008 / se) < 1e-9 and 6.7 < z < 6.8\nassert abs(z_two_prop(100, 0.5, 100, 0.5)) < 1e-12\nassert z_two_prop(1000, 0.10, 3000, 0.12) < 0\ns2, net2 = incremental_impact(1000, 0.1, 0.1, 50, 10)\nassert abs(s2) < 1e-9 and abs(net2 + 10) < 1e-9",
  "solution": "import math\n\ndef incremental_impact(n_treated, rate_control, rate_treated, value_per_save, cost):\n    saves = (rate_control - rate_treated) * n_treated\n    return saves, saves * value_per_save - cost\n\ndef z_two_prop(n1, rate1, n2, rate2):\n    p = (n1 * rate1 + n2 * rate2) / (n1 + n2)\n    se = math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))\n    return (rate1 - rate2) / se",
  "hints": [
    "Saves are the difference in churn rates times the treated population.",
    "A negative z just means group 1 has the lower rate."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Pick one project from your resume and let me stress-test it.' Anticipate five probing questions and give concise answers for a demand-forecasting project.",
  "answer": "**1. Why that model?** \"I benchmarked seasonal-naive (MAPE 22%), ETS (18%) and gradient boosting with calendar and promo features (14%). Boosting won on promo-heavy SKUs; for low-volume SKUs ETS was within 1 point and cheaper, so I used a hybrid.\"\n\n**2. How did you avoid leakage?** \"Rolling-origin backtests with 12 weekly folds; features available at forecast time only; promo flags used the planned, not actual, calendar.\"\n\n**3. How do you know it helped?** \"Stock-outs fell from 6.1% to 4.8% in treated stores versus a 0.2 pp change in matched control stores over 8 weeks (difference-in-differences).\"\n\n**4. What went wrong?** \"A holiday shift broke seasonality in week 3; error doubled. I added a holiday-offset feature and an alert on rolling bias.\"\n\n**5. What next?** \"Probabilistic forecasts to set safety stock directly, and hierarchical reconciliation across store-region-total.\""
}
```

> [!TIP] Interview tips
> - Rehearse two projects until you can cover context, decisions, results and reflection in 6 minutes.
> - Know your baseline, your metric definitions and one thing that went wrong in each project.
> - Pitfall: claiming impact without measurement. Say how it was measured and what the uncertainty was.
