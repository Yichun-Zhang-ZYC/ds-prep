---
id: ml-system-design-credit-scoring
title: "Design: Credit scoring and loan approval"
estimatedMinutes: 14
difficulty: hard
tags: [ml-system-design, credit-scoring, calibration, fairness]
---

## Why it matters
Credit scoring is the regulated, high-stakes cousin of fraud detection. Interviewers use it to test whether you handle selection bias (you only see outcomes for approved loans), slow labels, calibration, explainability and fairness, and can turn a probability into an economic decision.

## Concept
**Framing**: given an application, estimate the probability of default (PD), then decide approve/decline and set price and limit. Related lessons: *Fraud detection* (same cost-sensitive thinking, but fraud labels arrive in weeks and adversaries adapt) and *Define ML objective and metrics*.

**Label**: "bad" = e.g. 90+ days past due within 12 months of origination. Labels take a year to mature, so the training set is always a year behind: use **vintage** analysis, out-of-time validation (train on older originations, test on newer) and early-delinquency proxies for fast feedback.

**Selection bias and reject inference**: outcomes exist only for approved applicants, so a model trained on them sees a truncated population and can be biased for borderline applicants. Mitigations: reject inference (augmentation or parceling that assigns inferred outcomes to declined applicants, with known limits), outcomes from other lenders via bureau data, and a small **random approval** exploration budget just below the cutoff. Be honest that none fully fixes it.

**Features**: bureau (utilization, delinquencies, inquiries, length of history), application (income, debt-to-income), cash-flow from bank transactions, loan terms. Do not use protected attributes (race, sex, age in many jurisdictions); scrutinize proxies such as ZIP code.

**Models**: a logistic-regression **scorecard** (weight-of-evidence binning, monotonic, easy to audit) is the baseline lenders trust; gradient boosting with **monotonic constraints** usually adds a little lift and needs explanation tooling (SHAP-based reason codes). Adverse-action rules (ECOA/Reg B, FCRA in the US) require specific reasons for declines, and model risk management (e.g. SR 11-7) requires documentation and independent validation. The model must be **calibrated**, because PD feeds pricing, limits and loss provisioning.

**Decision**: $\text{EL}=\text{PD}\times\text{LGD}\times\text{EAD}$. Approve when expected profit is positive: $(1-\text{PD})\cdot\text{interest} - \text{PD}\cdot\text{LGD}\cdot\text{EAD} - \text{funding cost}>0$. Cutoffs also reflect capacity and risk appetite; risk-based pricing and limit assignment extend the same logic.

**Metrics**: ranking (AUC/Gini $=2\text{AUC}-1$, KS), calibration (reliability by score band), business (approval rate at a fixed bad rate, portfolio profit), stability (**PSI** $=\sum_i (a_i-e_i)\ln(a_i/e_i)$ over score bins; $<0.1$ stable, $0.1$-$0.25$ moderate shift, $>0.25$ major), and fairness (approval-rate ratios across groups as a screen, e.g. the four-fifths rule, then a less-discriminatory-alternative search).

**Monitoring**: PSI on scores and features, vintage curves, calibration drift, macro stress tests; champion/challenger rollouts with human override rates tracked.

## Worked example
Illustrative, simplified one-year loan. Principal \$10,000, interest 12% (\$1,200), funding cost 4% (\$400), LGD 60%.

For an applicant with PD $=4\%$: expected interest = 0.96 × 1200 = \$1,152, expected loss = 0.04 × 0.6 × 10,000 = \$240, so expected profit = 1152 − 240 − 400 = \$512. Approve.

Break-even PD from $(1-p)\,r - p\cdot\text{LGD} - f = 0$ per dollar lent: $p=\frac{r-f}{r+\text{LGD}}=\frac{0.12-0.04}{0.12+0.6}=0.111$. Applicants with PD above about 11.1% lose money on average, so that is the profit-maximizing cutoff before capacity and fairness constraints. If the model is miscalibrated and a true 11% applicant is scored at 6%, the lender approves loans it should decline, which is why calibration matters more here than in a pure ranking task.

Stability check: score bins at development $[0.5, 0.3, 0.2]$ and now $[0.4, 0.3, 0.3]$ give PSI $=(-0.1)\ln0.8+0+0.1\ln1.5=0.0223+0.0405=0.063$, stable.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Your training data contain default outcomes only for approved applicants. What is the main consequence and a reasonable mitigation?",
  "options": [
    "No consequence, approved applicants are representative",
    "Selection bias: the model is biased for borderline applicants; use reject inference, external bureau outcomes and a small random-approval exploration budget",
    "The model cannot be trained",
    "You should use only declined applicants"
  ],
  "answer": 1,
  "explanation": "The training population is truncated by past policy. Reject inference and controlled exploration reduce, but do not eliminate, the bias."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is calibration essential for a credit model, beyond AUC?",
  "options": [
    "AUC cannot be computed on defaults",
    "PD feeds pricing, loss provisioning and break-even cutoffs, so biased probabilities directly create mispriced or loss-making loans",
    "Calibration makes training faster",
    "Regulators forbid AUC"
  ],
  "answer": 1,
  "explanation": "A well-ranked but miscalibrated model can approve unprofitable loans at the wrong price. Check reliability by score band and recalibrate on recent vintages."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `auc(scores, y)` (probability a random bad (`y=1`) has a higher score than a random good (`y=0`), ties count 0.5), `gini(scores, y)` $=2\\text{AUC}-1$, and `ks_statistic(scores, y)`, the maximum absolute difference between the cumulative distributions of bad and good over all score thresholds.",
  "starterCode": "def auc(scores, y):\n    pass\n\ndef gini(scores, y):\n    pass\n\ndef ks_statistic(scores, y):\n    pass\n\nprint(auc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]), ks_statistic([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]))",
  "tests": "s = [0.1, 0.4, 0.35, 0.8]\ny = [0, 0, 1, 1]\nassert abs(auc(s, y) - 0.75) < 1e-12\nassert abs(gini(s, y) - 0.5) < 1e-12\nassert abs(ks_statistic(s, y) - 0.5) < 1e-12\nassert abs(auc([1, 1], [0, 1]) - 0.5) < 1e-12\nassert abs(auc([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]) - 1.0) < 1e-12\nassert abs(ks_statistic([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]) - 1.0) < 1e-12\nassert abs(ks_statistic([0.5, 0.5], [0, 1])) < 1e-12",
  "solution": "def auc(scores, y):\n    bad = [s for s, t in zip(scores, y) if t == 1]\n    good = [s for s, t in zip(scores, y) if t == 0]\n    wins = 0.0\n    for b in bad:\n        for g in good:\n            if b > g:\n                wins += 1\n            elif b == g:\n                wins += 0.5\n    return wins / (len(bad) * len(good))\n\ndef gini(scores, y):\n    return 2 * auc(scores, y) - 1\n\ndef ks_statistic(scores, y):\n    bad = [s for s, t in zip(scores, y) if t == 1]\n    good = [s for s, t in zip(scores, y) if t == 0]\n    best = 0.0\n    for t in set(scores):\n        fb = sum(1 for s in bad if s <= t) / len(bad)\n        fg = sum(1 for s in good if s <= t) / len(good)\n        best = max(best, abs(fb - fg))\n    return best",
  "hints": [
    "AUC: loop over all (bad, good) pairs, count wins plus half of ties.",
    "For KS, for each distinct score t compute the fraction of bads with score <= t minus the fraction of goods with score <= t."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `psi(expected, actual, eps=1e-4)`. Inputs are bin counts (or proportions); normalize each to proportions, replace any proportion below `eps` with `eps`, and return $\\sum_i (a_i-e_i)\\ln(a_i/e_i)$. Then write `psi_flag(value)` returning `'stable'` for $<0.1$, `'moderate'` for $<0.25$, else `'major'`.",
  "starterCode": "import math\n\ndef psi(expected, actual, eps=1e-4):\n    pass\n\ndef psi_flag(value):\n    pass\n\nprint(psi([50, 30, 20], [40, 30, 30]))",
  "tests": "v = psi([50, 30, 20], [40, 30, 30])\nassert abs(v - 0.0628609) < 1e-6\nassert abs(psi([0.5, 0.3, 0.2], [0.4, 0.3, 0.3]) - v) < 1e-9\nassert abs(psi([10, 10], [10, 10])) < 1e-12\nz = psi([1, 1], [2, 0])\nassert math.isfinite(z) and z > 0.25\nassert psi_flag(0.05) == 'stable'\nassert psi_flag(0.1) == 'moderate'\nassert psi_flag(0.2499) == 'moderate'\nassert psi_flag(0.25) == 'major'",
  "solution": "import math\n\ndef psi(expected, actual, eps=1e-4):\n    se, sa = sum(expected), sum(actual)\n    total = 0.0\n    for e, a in zip(expected, actual):\n        e = max(e / se, eps)\n        a = max(a / sa, eps)\n        total += (a - e) * math.log(a / e)\n    return total\n\ndef psi_flag(value):\n    if value < 0.1:\n        return 'stable'\n    if value < 0.25:\n        return 'moderate'\n    return 'major'",
  "hints": [
    "Normalize with x / sum(x) before flooring at eps.",
    "The floor avoids log(0) when a bin is empty."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `expected_profit(pd, rate, lgd, funding, principal)` $=(1-pd)\\cdot rate\\cdot principal - pd\\cdot lgd\\cdot principal - funding\\cdot principal$ and `breakeven_pd(rate, lgd, funding)` $=(rate-funding)/(rate+lgd)$. Then write `approve(pds, rate, lgd, funding)` returning the indices (ascending) of applicants with strictly positive expected profit per dollar lent.",
  "starterCode": "def expected_profit(pd, rate, lgd, funding, principal):\n    pass\n\ndef breakeven_pd(rate, lgd, funding):\n    pass\n\ndef approve(pds, rate, lgd, funding):\n    pass\n\nprint(expected_profit(0.04, 0.12, 0.6, 0.04, 10000), breakeven_pd(0.12, 0.6, 0.04))",
  "tests": "assert abs(expected_profit(0.04, 0.12, 0.6, 0.04, 10000) - 512.0) < 1e-9\nassert abs(expected_profit(0.0, 0.12, 0.6, 0.04, 100) - 8.0) < 1e-9\nassert abs(breakeven_pd(0.12, 0.6, 0.04) - 0.08 / 0.72) < 1e-12\nassert approve([0.02, 0.15, 0.10, 0.12, 0.04], 0.12, 0.6, 0.04) == [0, 2, 4]\nassert approve([0.5], 0.12, 0.6, 0.04) == []",
  "solution": "def expected_profit(pd, rate, lgd, funding, principal):\n    return (1 - pd) * rate * principal - pd * lgd * principal - funding * principal\n\ndef breakeven_pd(rate, lgd, funding):\n    return (rate - funding) / (rate + lgd)\n\ndef approve(pds, rate, lgd, funding):\n    return [i for i, p in enumerate(pds) if expected_profit(p, rate, lgd, funding, 1) > 0]",
  "hints": [
    "Work per dollar lent (principal = 1) in approve.",
    "Positive profit is equivalent to pd < breakeven_pd, but compute it directly."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a credit decisioning system for unsecured personal loans.' Outline your answer.",
  "answer": "**Requirements**: instant decisions (< 2 s), approve/decline plus APR and limit, regulatory constraints (adverse-action reasons, fair lending, model risk), objective = risk-adjusted profit at a target bad rate.\n\n**Data**: application, credit bureau pulls, bank cash-flow data with consent, internal repayment history for existing customers. Label = 90+ DPD within 12 months; build vintages, time-based splits, early-delinquency proxy for faster iteration. Reject inference plus a small random-approval band near the cutoff.\n\n**Models**: monotonic GBDT or WoE logistic scorecard for PD (calibrated, e.g. isotonic on recent vintages), separate LGD/EAD or prepayment models if needed. Reason codes from SHAP or scorecard point deductions, filtered to actionable factors.\n\n**Decision engine**: policy rules (hard knock-outs, fraud/identity checks, affordability) -> PD -> expected profit by APR and limit -> approve/decline/refer to manual review. Log all inputs, versions and decisions for audit.\n\n**Evaluation**: AUC/KS and calibration by segment out-of-time, approval rate at fixed bad rate, simulated profit; fairness analysis (approval and error rates across groups, search for less discriminatory alternatives); shadow mode then champion/challenger on a small share.\n\n**Monitoring**: PSI, vintage performance, calibration drift, macro stress tests, override rates, quarterly validation by an independent team."
}
```

> [!TIP] Interview tips
> - Open with label definition and maturity: it exposes the one-year delay and the vintage logic.
> - Name selection bias and reject inference explicitly; few candidates do.
> - Turn PD into a dollar decision with EL and a break-even cutoff.
> - Cover explainability, adverse-action reasons and fairness as first-class requirements, not add-ons.
