---
id: product-sense-roi-of-ai-projects
title: ROI of AI projects
estimatedMinutes: 11
difficulty: hard
tags: [product-sense, ai-pm, roi, business-case, cost]
---

## Why it matters

Leadership funds AI projects on a business case, and many pilots die because the benefit was gross, not net, or the run cost was ignored. Interviewers ask you to size the value, list all costs, compute payback and say what assumptions would break the case.

## Concept

**Benefits** (only count what turns into money):
- **Time saved**: counts only if redeployed to valuable work or it reduces hiring or overtime; otherwise it is capacity, not cash. Apply an adoption rate.
- **Revenue lift**: conversion, retention or upsell; measure with an A/B test to get incrementality.
- **Cost avoidance / risk reduction**: fewer errors, fraud losses or compliance incidents.

**Costs** (people usually dominate):
- **Build**: engineering, data work, evaluation, legal and security review.
- **Run**: inference or GPU, vendor fees, retrieval infrastructure, human review of flagged items.
- **Sustain**: monitoring, retraining, prompt and eval upkeep, support, change management and training.

**Formulas**:
$$\text{net monthly} = B_m - C_m,\qquad \text{payback} = \frac{C_{\text{build}}}{\text{net monthly}}$$
$$\text{ROI}_T = \frac{T\cdot \text{net monthly} - C_{\text{build}}}{C_{\text{build}}}$$
For multi-year cases discount cash flows (NPV). Benefits ramp up with adoption, so model a ramp rather than day-one full value.

**Stress-test the case**: sensitivity to adoption, accuracy (it changes review cost and error cost), volume and model price. Compare with the cheapest alternative (rules, process change, a vendor tool) and include the option value of learning. Treat "soft" benefits such as satisfaction as supporting, not as the justification.

## Worked example

A support-reply assistant. Volume: 50,000 tickets a month, saving 2 minutes each for agents at \$30/hour.

Gross time value: $50{,}000 \times 2/60 \times 30 = \$50{,}000$ per month. Only 70% of tickets will use the tool, so benefit is $0.7 \times 50{,}000 = \$35{,}000$.

Monthly costs: inference $50{,}000 \times 0.7 \times \$0.02 = \$700$, plus 0.5 FTE for evals, monitoring and prompt upkeep at about \$6,000. Total \$6,700. Net monthly: $35{,}000 - 6{,}700 = \$28{,}300$.

Build cost: \$240,000. Payback: $240{,}000/28{,}300 \approx 8.5$ months. First-year ROI: $(12 \times 28{,}300 - 240{,}000)/240{,}000 = 99{,}600/240{,}000 \approx 41.5\%$.

Stress test: at 40% adoption the benefit is \$20,000 and inference \$400, so net is $20{,}000 - 400 - 6{,}000 = \$13{,}600$ and payback stretches to about 17.6 months. Adoption is the swing variable, so the plan must fund training, UX and champions. Also check whether the saved minutes actually reduce overtime or backlog; if not, the cash benefit is far smaller.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A tool saves each of 100 employees 30 minutes a day, but no one is hired less and no overtime is reduced. How should the cash benefit be treated?",
  "options": [
    "Count the full wage value as savings",
    "Treat it as freed capacity, not cash, unless it is redeployed to value-creating work or avoids cost",
    "Count double for productivity",
    "Ignore the project"
  ],
  "answer": 1,
  "explanation": "Time saved becomes money only when it changes spend or output. Otherwise present it as capacity with an explicit plan to use it."
}
```

```quiz
{
  "id": "q2",
  "question": "Build cost $300,000; net monthly benefit $25,000. What is the payback period?",
  "options": [
    "8 months",
    "12 months",
    "15 months",
    "25 months"
  ],
  "answer": 1,
  "explanation": "300,000 / 25,000 = 12 months, and this ignores adoption ramp and discounting."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `roi_summary(build_cost, monthly_benefit, monthly_run_cost, months)` returning `(net_monthly, payback_months, roi)`. `net_monthly = monthly_benefit - monthly_run_cost`; `payback_months = build_cost / net_monthly` (use `float('inf')` if net_monthly <= 0); `roi = (months * net_monthly - build_cost) / build_cost`. Then write `adoption_breakeven(build_cost, monthly_gross_benefit, monthly_run_cost, months)` returning the minimum adoption fraction (0-1) at which `roi` over `months` is exactly 0, treating the benefit as `adoption * monthly_gross_benefit` (ignore the adoption effect on run cost); return `None` if even 100% adoption cannot break even.",
  "starterCode": "def roi_summary(build_cost, monthly_benefit, monthly_run_cost, months):\n    pass\n\ndef adoption_breakeven(build_cost, monthly_gross_benefit, monthly_run_cost, months):\n    pass\n\nprint(roi_summary(240000, 35000, 6700, 12))",
  "tests": "net, pay, roi = roi_summary(240000, 35000, 6700, 12)\nassert abs(net - 28300) < 1e-9\nassert abs(pay - 240000 / 28300) < 1e-9\nassert abs(roi - 0.415) < 1e-9\nn2, p2, r2 = roi_summary(100000, 5000, 6000, 12)\nassert n2 == -1000 and p2 == float('inf') and r2 < 0\n# break-even: adoption * 50000 - 6700 = 240000 / 12 = 20000  ->  0.534\nassert abs(adoption_breakeven(240000, 50000, 6700, 12) - 26700 / 50000) < 1e-9\nassert adoption_breakeven(240000, 15000, 6700, 12) is None",
  "solution": "def roi_summary(build_cost, monthly_benefit, monthly_run_cost, months):\n    net = monthly_benefit - monthly_run_cost\n    payback = build_cost / net if net > 0 else float('inf')\n    roi = (months * net - build_cost) / build_cost\n    return net, payback, roi\n\ndef adoption_breakeven(build_cost, monthly_gross_benefit, monthly_run_cost, months):\n    needed_net = build_cost / months\n    a = (needed_net + monthly_run_cost) / monthly_gross_benefit\n    return a if a <= 1 else None",
  "hints": [
    "ROI = 0 means months × net = build_cost, so the needed net monthly benefit is build_cost / months.",
    "Solve adoption × gross − run_cost = needed_net for adoption."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'A team asks for $1.2M to build an AI assistant for sales reps. How do you evaluate the business case?'",
  "answer": "**1. Define the benefit mechanism**: what changes (more calls, higher win rate, shorter ramp for new reps)? Prefer revenue effects measurable by A/B over time saved.\n\n**2. Size it**: reps × baseline quota × expected lift; for example 200 reps × $1M quota × 2% lift = $4M per year gross. Haircut by adoption (say 60%) and by evidence quality (a pilot, not vendor claims).\n\n**3. Full cost**: build $1.2M, run (inference, data integrations), 2-3 FTE sustain, enablement and training, legal and security review.\n\n**4. Metrics**: payback, 3-year NPV, ROI, with best, base and worst cases; show which assumption (adoption, lift) matters most.\n\n**5. Alternatives**: vendor tool, a smaller scope (call summaries only), or process changes; compare cost and time to value.\n\n**6. De-risk**: stage-gate funding. Fund a $200k pilot with a pre-registered lift target and holdout group, then release the rest when gates are met.\n\n**7. Decision**: fund if the base case pays back within about 18 months and the downside is tolerable."
}
```

> [!TIP] Interview tips
> - Count net, adopted benefit and full cost (build, run and sustain), then give payback and ROI with a sensitivity range.
> - Distinguish capacity from cash savings; prefer revenue effects proven by an A/B test.
> - Propose stage-gated funding with pre-registered success criteria instead of a yes/no on the whole budget.
