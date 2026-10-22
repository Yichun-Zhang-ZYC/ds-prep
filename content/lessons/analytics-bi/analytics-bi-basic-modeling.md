---
id: analytics-bi-basic-modeling
title: Basic modeling
estimatedMinutes: 12
difficulty: medium
tags: [excel, google-sheets, modeling, npv, break-even, sensitivity]
---

## Why it matters
Analyst and BI interviews often hand you a spreadsheet and ask for a quick model: "Is this project worth it?", "How many units to break even?", "What if churn is 2% higher?". They test structure and judgement more than formula tricks.

## Concept
A good spreadsheet model separates **inputs**, **calculations** and **outputs**.

**Structure**
- One **assumptions** block (price, volume, growth, cost, discount rate). Every formula points to it; never hard-code a number inside a formula.
- Calculations flow in one direction (left to right, top to bottom), one formula per row, copied across time periods.
- Use absolute references (`$B$2`) for assumptions, named ranges for readability, and a checks row (e.g. totals reconcile).
- Colour convention: blue = input, black = formula.

**Core calculations**
- **Contribution margin** per unit $= p - v$; **break-even** units $= \dfrac{F}{p - v}$ (round up).
- **NPV** $= \sum_{t=0}^{T} \dfrac{CF_t}{(1+r)^t}$, with `=NPV(r, CF1:CFn) + CF0`. Excel's `NPV` assumes the first value is at $t=1$, a classic trap. Accept a project when $\text{NPV} > 0$.
- **IRR** is the rate that makes NPV zero (`=IRR`); **payback** is the time until cumulative cash flow turns positive.
- Growth: $X_t = X_{t-1}(1+g)$. Compound with a row, not $(1+g)^t$ typed by hand.

**What-if analysis**
- **Sensitivity**: vary one input at a time (a data table) and see how the output moves; shows which assumptions matter.
- **Scenarios**: bundle inputs into base / upside / downside cases, switched by one selector cell.
- **Goal Seek / Solver**: find the input that gives a target output.

State the assumptions and the main risk with every number you present.

## Worked example
Project: invest \$100,000 today, receive \$30,000 per year for 5 years, discount rate 10%.

- Annuity factor $= \dfrac{1 - 1.1^{-5}}{0.1} = 3.7908$, so the PV of inflows is $30{,}000 \times 3.7908 \approx 113{,}724$ dollars and $\text{NPV} \approx 13{,}724 > 0$ dollars: accept.
- Payback: cumulative cash is $-70\text{k}, -40\text{k}, -10\text{k}$ after years 1-3, so it turns positive during year 4 at $3 + 10/30 = 3.33$ years.
- Sensitivity: at a 15% rate the annuity factor is 3.3522, NPV is only about \$565, nearly break-even. The decision is sensitive to the discount rate.

Break-even: fixed cost \$50,000, price \$25, variable cost \$15 gives $50{,}000 / 10 = 5{,}000$ units.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In Excel, `=NPV(0.1, B2:B6)` where B2 is the initial investment (today) and B3:B6 are future inflows. What is wrong?",
  "options": [
    "Nothing; NPV handles t = 0 automatically",
    "NPV discounts every value including B2 by one period, so the initial investment should be added outside: `=NPV(0.1, B3:B6) + B2`",
    "The rate must be given as 10",
    "NPV can only take two arguments"
  ],
  "answer": 1,
  "explanation": "Excel's NPV treats the first value as period 1. A cash flow at t = 0 must be added separately, undiscounted."
}
```

```quiz
{
  "id": "q2",
  "question": "Which practice makes a spreadsheet model most trustworthy?",
  "options": [
    "Hard-coding the price in every formula for speed",
    "Putting inputs in one clearly labelled block and referencing them from formulas",
    "Merging cells for a cleaner look",
    "Pasting values instead of formulas so numbers cannot change"
  ],
  "answer": 1,
  "explanation": "Separating assumptions from calculations lets you audit the model, run scenarios and change one cell instead of hunting for hard-coded numbers."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write three model helpers. `npv(rate, cashflows)`: `cashflows[0]` is at t = 0 (undiscounted), `cashflows[t]` at year t. `payback_period(cashflows)`: years until cumulative cash flow reaches 0, interpolating linearly inside the year it crosses (e.g. 3.33); return `None` if it never does. `breakeven_units(fixed_cost, price, variable_cost)`: smallest whole number of units whose contribution covers the fixed cost.",
  "starterCode": "def npv(rate, cashflows):\n    pass\n\ndef payback_period(cashflows):\n    pass\n\ndef breakeven_units(fixed_cost, price, variable_cost):\n    pass\n\nprint(npv(0.10, [-100, 60, 60]), payback_period([-100, 60, 60]), breakeven_units(1000, 10, 6))",
  "tests": "flows = [-100000] + [30000] * 5\nassert abs(npv(0.10, flows) - (30000 * (1 - 1.1 ** -5) / 0.1 - 100000)) < 1e-6\nassert abs(npv(0.10, flows) - 13723.6) < 0.1\nassert npv(0.0, [-100, 60, 60]) == 20\nassert abs(payback_period(flows) - (3 + 10000 / 30000)) < 1e-9\nassert payback_period([-100, 40, 40]) is None\nassert payback_period([-100, 100]) == 1.0\nassert breakeven_units(50000, 25, 15) == 5000\nassert breakeven_units(1000, 10, 6) == 250\nassert breakeven_units(1001, 10, 6) == 251",
  "solution": "import math\n\ndef npv(rate, cashflows):\n    return sum(cf / (1 + rate) ** t for t, cf in enumerate(cashflows))\n\ndef payback_period(cashflows):\n    cum = cashflows[0]\n    for t in range(1, len(cashflows)):\n        prev = cum\n        cum += cashflows[t]\n        if cum >= 0:\n            return t - 1 + (-prev) / cashflows[t]\n    return None\n\ndef breakeven_units(fixed_cost, price, variable_cost):\n    return math.ceil(fixed_cost / (price - variable_cost))",
  "hints": [
    "Enumerate the cash flows: term t is cf / (1 + rate) ** t.",
    "In the crossing year t, the fraction is (-previous cumulative) / cashflows[t], added to t - 1.",
    "Use math.ceil on fixed_cost / (price - variable_cost)."
  ]
}
```

> [!TIP] Interview tips
> - Open by listing assumptions and asking about the decision the model supports. Structure (inputs, calcs, outputs, checks) is what interviewers grade.
> - Know NPV vs IRR vs payback, and the Excel `NPV` period-1 trap. Say NPV needs a discount rate and IRR can mislead with multiple sign changes.
> - Always show a sensitivity or three scenarios; one point estimate is never convincing. Name the assumption the answer is most sensitive to.
