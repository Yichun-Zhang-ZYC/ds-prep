---
id: ml-system-design-clarify-requirements-and-business-goal
title: Clarify requirements & business goal
estimatedMinutes: 10
difficulty: easy
tags: [ml-system-design, framework, requirements, interview]
---

## Why it matters
Every ML design interview starts the same way: a vague prompt ("design a feed", "reduce churn") and a clock. Candidates who jump to models fail; candidates who first pin down the business goal, constraints and what a wrong prediction costs pass. This is step 1 of the framework used in every later lesson.

## Concept
Ask in this order:
1. **Business goal**: what number should move (revenue, retention, losses avoided, support cost)? Who is the user and what *action* will the prediction trigger?
2. **Is ML needed?** Compare with a rule, a lookup or a heuristic. If no decision changes with the prediction, stop.
3. **Task framing**: classification, ranking, regression, retrieval, generation? One model or a funnel (retrieve, rank, re-rank)?
4. **Scale and latency**: users, items, QPS (average and peak), response SLO (e.g. p99 < 200 ms), batch vs online.
5. **Data**: what logs and labels exist, how delayed and how noisy; cold-start; privacy/regulatory limits.
6. **Constraints**: cost, interpretability, fairness, safety, on-device, team size and time-to-ship.
7. **Cost of errors**: false positives vs false negatives. This sets the metric and the operating threshold.

**Act-on-prediction rule.** If a correct positive earns benefit $B$ and a false positive costs $C$, acting is worthwhile when $p\,B > (1-p)\,C$, i.e. when
$$p > \frac{C}{B + C}.$$
The break-even precision is $C/(B+C)$. Cheap actions (an email) tolerate low precision; expensive ones (a human review, a blocked payment) demand high precision.

Restate the problem back to the interviewer in one sentence ("predict, per user and week, the probability of churn so CRM can target a retention offer") and get agreement before designing.

## Worked example
A subscription app has 100,000 users and 5% churn (5,000 churners). A retention offer costs \$10 per user contacted ($C = 10$); a saved churner is worth a net \$50 ($B = 50$, already net of the offer cost).

- Break-even precision: $10/(50+10) \approx 0.167$.
- Contact everyone: TP = 5,000, FP = 95,000, profit = $5{,}000 \cdot 50 - 95{,}000 \cdot 10 = -\$700{,}000$.
- Model flags the top 10,000 with precision 0.30: TP = 3,000, FP = 7,000, profit = $3{,}000 \cdot 50 - 7{,}000 \cdot 10 = +\$80{,}000$.

Precision 0.30 beats the 0.167 break-even, so targeting is profitable; "contact everyone" is not. The business framing, not AUC, decides how many users to contact.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A false positive costs $5 and a true positive earns $20. Above what precision is acting on the model's positives profitable?",
  "options": ["0.20", "0.25", "0.50", "0.80"],
  "answer": 0,
  "explanation": "Break-even precision = C/(B+C) = 5/25 = 0.20."
}
```

```quiz
{
  "id": "q2",
  "question": "Which question should you ask first in an ML design interview?",
  "options": ["Which algorithm should we use?", "What business outcome should improve and what action does the prediction trigger?", "How many GPUs do we have?", "Which framework do we deploy with?"],
  "answer": 1,
  "explanation": "Goal and action define the task, metric, latency and error costs; model choice comes last."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `breakeven_precision(benefit_tp, cost_fp)` = C/(B+C), `expected_profit(tp, fp, benefit_tp, cost_fp)`, and `best_cutoff(y_sorted, benefit_tp, cost_fp)`. The last takes true labels ordered by descending model score and returns `(k, profit)`: how many top items to act on to maximise profit (k = 0, profit 0 if acting never pays; on ties choose the smallest k).",
  "starterCode": "def breakeven_precision(benefit_tp, cost_fp):\n    pass\n\ndef expected_profit(tp, fp, benefit_tp, cost_fp):\n    pass\n\ndef best_cutoff(y_sorted, benefit_tp, cost_fp):\n    pass\n",
  "tests": "assert abs(breakeven_precision(50, 10) - 10 / 60) < 1e-12\nassert expected_profit(5000, 95000, 50, 10) == -700000\nassert expected_profit(3000, 7000, 50, 10) == 80000\nassert best_cutoff([1, 1, 0, 1, 0, 0, 0], 50, 10) == (4, 140)\nassert best_cutoff([0, 0, 0, 0, 0, 1], 50, 10) == (0, 0)\nassert best_cutoff([], 50, 10) == (0, 0)",
  "solution": "def breakeven_precision(benefit_tp, cost_fp):\n    return cost_fp / (benefit_tp + cost_fp)\n\ndef expected_profit(tp, fp, benefit_tp, cost_fp):\n    return tp * benefit_tp - fp * cost_fp\n\ndef best_cutoff(y_sorted, benefit_tp, cost_fp):\n    best_k, best, cur = 0, 0, 0\n    for k, y in enumerate(y_sorted, 1):\n        cur += benefit_tp if y == 1 else -cost_fp\n        if cur > best:\n            best_k, best = k, cur\n    return best_k, best",
  "hints": ["Profit after k items is a running sum: +B for each 1, −C for each 0.", "Only update the best when the running profit is strictly higher."]
}
```

> [!TIP] Interview tips
> - Spend the first 3-5 minutes on goal, action, scale, latency, data and error costs; write them down.
> - Say explicitly whether ML is needed and what the non-ML baseline is.
> - Convert error costs into a break-even precision to justify the metric and threshold later.
