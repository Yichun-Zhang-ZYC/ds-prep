---
id: consulting-translating-business-problems-into-data-ai-solutions
title: Translating business problems into data/AI solutions
estimatedMinutes: 12
difficulty: medium
tags: [consulting, problem-framing, roi, ai-solutions]
---

## Why it matters
Stakeholders say "reduce churn" or "use AI for support", not "fit a gradient-boosted classifier". The core consulting-DS skill is converting a business objective into a decision, a data task, a metric and an ROI case, and knowing when not to use ML.

## Concept
**Translation chain**: business goal, then the **decision** to improve, then the **prediction or optimisation task**, then data and features, then metrics, then deployment and adoption.

**Task mapping**: forecast quantity (regression/time series), who will do X (classification, propensity), who will respond *because of* an action (uplift), what to show (ranking/recommendation), find groups (clustering), spot unusual cases (anomaly detection), read or write text (NLP/LLM), best allocation under constraints (optimisation).

**Solution ladder** (climb only as far as needed): descriptive analytics or a rule, then a simple model, then a complex model, then GenAI/agents. Each step must beat the cheaper one by more than its extra cost and risk.

**Three metric layers**: model metric (AUC, MAE), product metric (resolution rate, CTR), business metric (cost saved, revenue, risk avoided). Agree on the baseline and a success threshold up front.

**ROI case**: annual benefit $= \text{volume} \times \text{automation rate} \times (\text{cost}_{human} - \text{cost}_{AI}) - \text{run cost}$; payback months $= \text{build cost} / (\text{annual net} / 12)$. Add risks: data availability, adoption, error cost, compliance.

**Go/no-go checklist**: is there a decision, labelled data, a feedback loop, an owner who will act, and acceptable error cost?

## Worked example
A support team handles 600,000 tickets a year at \$5.00 each. Proposal: an LLM assistant that fully resolves 30% of tickets at \$0.50 each. Build cost \$400,000; run cost \$100,000 per year.

Gross saving: $600{,}000 \times 0.30 \times (5.00 - 0.50) = \$810{,}000$. Annual net after run cost: \$710,000. Year-1 net: $710{,}000 - 400{,}000 = \$310{,}000$. Payback: $400{,}000 / (710{,}000/12) \approx 6.8$ months.

Sensitivity: the automation rate is the risk. At 15% the gross saving is \$405,000, annual net \$305,000 and payback 15.7 months, still positive within the year-2 horizon. At 8% gross saving is \$216,000 which is above the run cost but pays back in more than 3.4 years, so the go/no-go hinges on the resolution rate. Recommendation: run a 4-week pilot on one ticket category with a human fallback to measure the real resolution rate and the escalation error cost before committing the full build.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A retailer wants to decide how many units of each SKU to stock next week. Which task framing fits best?",
  "options": [
    "Clustering of customers",
    "Demand forecasting (regression/time series) feeding an inventory optimisation",
    "Binary churn classification",
    "Image classification"
  ],
  "answer": 1,
  "explanation": "The decision is a quantity to order, so forecast demand with uncertainty and optimise stock against holding and stock-out costs."
}
```

```quiz
{
  "id": "q2",
  "question": "A bot costs USD 400k to build and USD 100k/year to run, and saves USD 810k/year gross. What is the year-1 net benefit?",
  "options": [
    "$310k",
    "$410k",
    "$710k",
    "$810k"
  ],
  "answer": 0,
  "explanation": "810 - 100 - 400 = 310 (in $k)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ai_roi(volume, cost_human, cost_ai, rate, build, run)` returning `(annual_net, year1_net, payback_months)`: annual_net = volume*rate*(cost_human - cost_ai) - run; year1_net = annual_net - build; payback_months = build / (annual_net / 12), or `None` if annual_net <= 0.",
  "starterCode": "def ai_roi(volume, cost_human, cost_ai, rate, build, run):\n    pass\n\nprint(ai_roi(600000, 5.0, 0.5, 0.30, 400000, 100000))\n",
  "tests": "a, y1, pb = ai_roi(600000, 5.0, 0.5, 0.30, 400000, 100000)\nassert abs(a - 710000) < 1e-6 and abs(y1 - 310000) < 1e-6\nassert abs(pb - 400000 / (710000 / 12)) < 1e-9\na, y1, pb = ai_roi(600000, 5.0, 0.5, 0.15, 400000, 100000)\nassert abs(a - 305000) < 1e-6 and abs(pb - 400000 / (305000 / 12)) < 1e-9\nassert ai_roi(600000, 5.0, 0.5, 0.03, 400000, 100000)[2] is None",
  "solution": "def ai_roi(volume, cost_human, cost_ai, rate, build, run):\n    annual = volume * rate * (cost_human - cost_ai) - run\n    year1 = annual - build\n    payback = build / (annual / 12) if annual > 0 else None\n    return annual, year1, payback",
  "hints": [
    "Savings per automated ticket = cost_human - cost_ai.",
    "If annual net is not positive, the project never pays back."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Our COO says: use AI to reduce fraud losses.' How do you turn this into a data science project?",
  "answer": "**1. Clarify the goal**: fraud losses are USD 40M/year on USD 4B volume (1%); target is to cut losses 25% without raising false declines that hurt good customers. Which fraud types (card-not-present, account takeover, refund abuse)?\n\n**2. Decision**: approve, step-up authenticate or decline each transaction in under 100 ms; plus a manual review queue of limited size.\n\n**3. Task**: binary classification with a cost-sensitive threshold; add graph/device features for rings; anomaly detection as a backstop for new patterns.\n\n**4. Data**: labelled chargebacks (30-90 days delay, so label lag and censoring), transaction, device, customer history; check feedback bias because declined transactions have no outcome.\n\n**5. Metrics**: model (PR-AUC, recall at 1% false positive rate), business (dollars saved minus review cost minus lost sales from false declines), operational (latency, review queue load).\n\n**6. Baseline and plan**: compare with current rules; shadow mode for 4 weeks, then A/B by traffic slice, then ramp.\n\n**7. Risks**: concept drift from adversaries, fairness and explainability for declines, regulatory needs; monitor weekly and retrain on a schedule."
}
```

> [!TIP] Interview tips
> - Always restate the business goal as a decision and a metric before naming any model.
> - Give the non-ML baseline and say when you would not use ML; interviewers reward judgement over buzzwords.
> - Pitfall: quoting AUC as success. Close the loop with dollars, adoption and error cost.
