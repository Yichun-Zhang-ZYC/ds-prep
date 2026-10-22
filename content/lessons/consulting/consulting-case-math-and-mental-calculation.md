---
id: consulting-case-math-and-mental-calculation
title: "Case math and mental calculation"
estimatedMinutes: 12
difficulty: medium
tags: [consulting, case, mental-math, estimation]
---

## Why it matters
Case interviews are timed and usually calculator-free. Slow or sloppy arithmetic breaks your flow and your credibility, while fast, structured mental math shows comfort with numbers. The same habits catch order-of-magnitude errors in everyday data work.

## Concept
**Principles**: state the formula first, then plug numbers; round to 1-2 significant figures and track the rounding direction; do powers of ten separately; check units; end with a sanity check against a known anchor.

**Percent tricks**: 10% = shift the decimal; 5% = half of 10%; 15% = 10% + 5%; 1% = shift twice; 25% = ÷4; 12.5% = ÷8; 33% = ÷3. To compute 17% of 240: 10% = 24, 5% = 12, 2% ≈ 4.8, total ≈ 40.8.

**Fractions to remember**: 1/6 = 16.7%, 1/7 = 14.3%, 1/8 = 12.5%, 1/9 = 11.1%, 1/12 = 8.3%.

**Big numbers**: work in thousands (k), millions (M), billions (B): $300\text{M} \times 20 = 6\text{B}$. Count zeros: $10^3 \times 10^6 = 10^9$.

**Growth**: **rule of 72**: doubling time $\approx 72 / r\%$ (accurate for 4-12%). For small growth, $(1+r)^n \approx 1 + nr + \frac{n(n-1)}{2}r^2$. CAGR $= (\text{end}/\text{start})^{1/n} - 1$; a quick estimate is $\ln(\text{end}/\text{start})/n$.

**Percent vs percentage points**: a rise from 20% to 25% is +5 points but +25% relative. **Successive changes multiply**: +20% then −20% is $1.2 \times 0.8 = 0.96$, a 4% loss. To recover a drop of $d$ you need $\frac{d}{1-d}$ (a 50% drop needs +100%).

**Margin vs markup**: margin $= \frac{p-c}{p}$, markup $= \frac{p-c}{c}$; a 25% markup is a 20% margin.

**Break-even**: $\text{units} = \text{fixed} / (\text{price} - \text{variable cost})$.

**Pitfalls**: mixing units (monthly vs annual), mixing profit and revenue, dropping a zero, false precision, and not saying your rounding aloud.

## Worked example
**Q1**: Revenue is \$240M, growing 6% a year, with a 15% EBITDA margin. Estimate EBITDA in 3 years.

Growth factor: $1.06^3 \approx 1 + 0.18 + 3(0.06)^2 = 1.19$ (exact 1.191). Revenue $\approx 240 \times 1.19 = 240 + 45.6 = \$285.6\text{M}$, call it \$286M. EBITDA at 15% = 10% + 5% = 28.6 + 14.3 = \$42.9M. Exact: $240 \times 1.191 \times 0.15 = \$42.9\text{M}$.

**Q2**: A café sells 1,200 drinks a day at an average \$4.75. Annual revenue?

Round \$4.75 up to \$5 and subtract 5%: $1{,}200 \times 365 \approx 438{,}000$ (or $1{,}200 \times 360 = 432{,}000$ plus a bit). $438{,}000 \times 5 = \$2.19\text{M}$; less 5% (\$0.11M) gives \$2.08M. Exact \$2.0805M. The rounding direction is stated: up on price, corrected afterwards.

**Q3**: How long for an investment growing 6% a year to double? Rule of 72: $72/6 = 12$ years. Exact: $\ln 2 / \ln 1.06 = 11.9$ years.

**Q4**: Break-even. Fixed cost \$1.2M a year, price \$50, variable cost \$30. Margin \$20 per unit, so $1{,}200{,}000 / 20 = 60{,}000$ units a year, about 5,000 a month, 164 a day. Sanity check: at \$50, revenue at break-even is \$3M, i.e. fixed cost is 40% of break-even revenue, consistent with a 40% contribution margin.

**Habit**: after each answer say the unit and one sanity check ("\$286M is about 19% above \$240M, consistent").

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Price falls 20% and then rises 20%. What is the net change?",
  "options": [
    "0%",
    "-4%",
    "+4%",
    "-2%"
  ],
  "answer": 1,
  "explanation": "Changes multiply: 0.8 x 1.2 = 0.96, a 4% loss. To recover a 20% drop you need +25%."
}
```

```quiz
{
  "id": "q2",
  "question": "A product has a 25% markup on cost. What is its gross margin?",
  "options": [
    "25%",
    "20%",
    "30%",
    "75%"
  ],
  "answer": 1,
  "explanation": "Cost 100, price 125; margin = 25 / 125 = 20%."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `doubling_times(rate_pct)` returning `(exact, approx)`: exact years to double at `rate_pct` percent per year (`ln 2 / ln(1 + r)`) and the rule-of-72 estimate `72 / rate_pct`.",
  "starterCode": "import math\n\ndef doubling_times(rate_pct):\n    pass\n\nprint(doubling_times(6))\n",
  "tests": "import math\ne, a = doubling_times(6)\nassert abs(e - math.log(2) / math.log(1.06)) < 1e-9 and a == 12\ne, a = doubling_times(8)\nassert abs(a - 9) < 1e-12 and abs(e - 9.006) < 0.001\nassert abs(doubling_times(100)[0] - 1) < 1e-12\ne, a = doubling_times(1)\nassert abs(e - a) / e < 0.04",
  "solution": "import math\n\ndef doubling_times(rate_pct):\n    r = rate_pct / 100\n    return math.log(2) / math.log(1 + r), 72 / rate_pct",
  "hints": [
    "Convert the percentage to a fraction before using log.",
    "The rule of 72 is most accurate around 8%."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `markup_to_margin(markup)` and `margin_to_markup(margin)` (both fractions). Margin = markup / (1 + markup); markup = margin / (1 - margin). Raise `ValueError` if `margin >= 1`.",
  "starterCode": "def markup_to_margin(markup):\n    pass\n\ndef margin_to_markup(margin):\n    pass\n\nprint(markup_to_margin(0.25), margin_to_markup(0.2))\n",
  "tests": "assert abs(markup_to_margin(0.25) - 0.2) < 1e-12\nassert abs(margin_to_markup(0.2) - 0.25) < 1e-12\nassert abs(margin_to_markup(markup_to_margin(0.7)) - 0.7) < 1e-12\nassert abs(markup_to_margin(1.0) - 0.5) < 1e-12\ntry:\n    margin_to_markup(1.0)\n    raise AssertionError('no error')\nexcept ValueError:\n    pass",
  "solution": "def markup_to_margin(markup):\n    return markup / (1 + markup)\n\ndef margin_to_markup(margin):\n    if margin >= 1:\n        raise ValueError('margin must be below 1')\n    return margin / (1 - margin)",
  "hints": [
    "With cost 1 and price 1 + markup, margin = markup / (1 + markup).",
    "Invert that relationship for the second function."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `net_change(pcts)` returning the total percentage change after applying successive percentage changes (a list such as `[20, -20]`), and `recovery_needed(drop_pct)` returning the percentage gain needed to undo a drop of `drop_pct` percent. Both return plain numbers in percent.",
  "starterCode": "def net_change(pcts):\n    pass\n\ndef recovery_needed(drop_pct):\n    pass\n\nprint(net_change([20, -20]), recovery_needed(50))\n",
  "tests": "assert abs(net_change([20, -20]) + 4) < 1e-9\nassert abs(net_change([10, 10]) - 21) < 1e-9\nassert net_change([]) == 0\nassert abs(recovery_needed(50) - 100) < 1e-9\nassert abs(recovery_needed(20) - 25) < 1e-9\nassert abs((1 - 0.3) * (1 + recovery_needed(30) / 100) - 1) < 1e-12",
  "solution": "def net_change(pcts):\n    f = 1.0\n    for p in pcts:\n        f *= 1 + p / 100\n    return (f - 1) * 100\n\ndef recovery_needed(drop_pct):\n    d = drop_pct / 100\n    return d / (1 - d) * 100",
  "hints": [
    "Multiply growth factors (1 + p/100) instead of adding percentages.",
    "Recovery: (1 - d) * (1 + g) = 1, so g = d / (1 - d)."
  ]
}
```

```reveal
{
  "prompt": "Mental-math drill: estimate $7.9B x 12.5% and 17% of 240 in under 20 seconds each. Show your shortcut.",
  "answer": "**$7.9B x 12.5%**: 12.5% is one eighth. Round $7.9B up to $8B: $8 / 8 = 1$, i.e. $1B. Rounded up by about 1%, so the answer is about $0.99B. Exact: $0.9875B.\n\n**17% of 240**: 10% = 24, 5% = 12, 2% = 4.8. Sum = 40.8. Alternative: 17% = 20% − 3% = 48 − 7.2 = 40.8.\n\n**Habit**: name the anchor (one eighth, 10% + 5%), say the rounding direction, and correct for it."
}
```

> [!TIP] Interview tips
> - Write the formula, round to friendly numbers, say the rounding direction and finish with a sanity check.
> - Memorise the common fractions (1/6 to 1/12), 10% + 5% tricks and the rule of 72.
> - Pitfall: mixing percent with percentage points, or monthly with annual figures.
