---
id: product-sense-north-star-metric
title: "North star metric"
estimatedMinutes: 10
difficulty: easy
tags: [product-sense, metrics, north-star]
---

## Why it matters
"What is the north star metric for X?" is the opening move of most product-sense interviews. A good answer shows you can tie one number to customer value and long-term revenue, then break it into levers a team can act on.

## Concept
A **north star metric (NSM)** is the single number that best captures the core value customers get from the product, and that leads (rather than lags) sustainable business growth.

A good NSM is:
- **Value-based**: moves when users get more of what they came for (nights booked, hours listened, messages sent), not when you trick them.
- **A leading indicator of revenue**, not revenue itself (revenue can rise from price hikes while value falls).
- **Measurable, sensitive and attributable**: teams can move it within a quarter and see their effect.
- **Understandable**: one sentence, one number, one owner.

Typical shapes: a *volume of value delivered* (weekly nights booked) or *frequency x depth* (weekly active listeners x hours each). Pair it with an **input-metric tree**: decompose the NSM into multiplicative or additive drivers (breadth, depth, frequency, efficiency) so each team owns a branch.

Bad NSMs: signups (vanity, ignores value), revenue (lagging, price-sensitive), raw time spent (can reward addiction or friction), DAU alone (ignores what users do).

## Worked example
A podcast app picks **weekly listening hours** as its NSM and decomposes it:

$$\text{NSM} = \text{weekly active listeners (WAL)} \times \text{hours per listener}$$

Today: WAL = 2,000,000 and 3.5 h per listener, so NSM = 7,000,000 h/week. WAL itself splits into new activated + retained + resurrected users; hours per listener splits into sessions per week x minutes per session.

Candidate levers: improve onboarding (+2% WAL = +140,000 h) or better recommendations (+8% hours per listener = +560,000 h). Because the tree is multiplicative, a 1% lift in either factor is worth the same 1% of NSM, so the choice is about *which factor is cheaper to move*. Here recommendations win about 4x on expected impact.

Check the NSM against its failure modes: autoplay could inflate hours while satisfaction falls, so a guardrail such as 30-day retention or a "skipped within 30 s" rate rides alongside it (see the guardrail lesson).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is the best north star for a two-sided home-rental marketplace?",
  "options": [
    "Registered users",
    "Gross revenue",
    "Nights booked",
    "Page views"
  ],
  "answer": 2,
  "explanation": "Nights booked captures value delivered to both guests and hosts, grows with the business, and is actionable. Signups and page views are vanity; revenue lags and can rise through fees."
}
```

```quiz
{
  "id": "q2",
  "question": "A team proposes 'total time spent in app' as NSM for a news app. What is the main risk?",
  "options": [
    "It is not measurable",
    "It can rise from friction or addictive design while user value falls",
    "It is a lagging indicator of revenue",
    "It cannot be decomposed"
  ],
  "answer": 1,
  "explanation": "Time spent can be inflated by slow navigation or compulsive loops. Pair it with a quality signal or choose a value-based metric such as articles read to completion."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Given a multiplicative metric tree as a dict of factors, write `nsm(factors)` (the product), `impact_of_lift(factors, name, pct)` (change in NSM if factor `name` rises by `pct`, e.g. 0.10), and `rank_levers(factors, lifts)` returning factor names sorted by NSM impact, highest first (`lifts` maps each name to its achievable lift).",
  "starterCode": "def nsm(factors):\n    pass\n\ndef impact_of_lift(factors, name, pct):\n    pass\n\ndef rank_levers(factors, lifts):\n    pass\n\nf = {'wal': 2_000_000, 'hours': 3.5}\nprint(nsm(f), impact_of_lift(f, 'hours', 0.08))",
  "tests": "f = {'wal': 2_000_000, 'hours': 3.5}\nassert abs(nsm(f) - 7_000_000) < 1e-6\nassert abs(impact_of_lift(f, 'wal', 0.10) - 700_000) < 1e-6\nassert abs(impact_of_lift(f, 'hours', 0.08) - 560_000) < 1e-6\nassert rank_levers(f, {'wal': 0.02, 'hours': 0.08}) == ['hours', 'wal']\nassert rank_levers(f, {'wal': 0.20, 'hours': 0.08}) == ['wal', 'hours']\nassert f == {'wal': 2_000_000, 'hours': 3.5}",
  "solution": "def nsm(factors):\n    out = 1.0\n    for v in factors.values():\n        out *= v\n    return out\n\ndef impact_of_lift(factors, name, pct):\n    return nsm(factors) * pct\n\ndef rank_levers(factors, lifts):\n    return sorted(lifts, key=lambda k: -impact_of_lift(factors, k, lifts[k]))",
  "hints": [
    "In a product of factors, a relative lift of pct in one factor multiplies the whole product by (1 + pct).",
    "Impact = NSM x pct; sort by it descending."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'What would you choose as the north star metric for Duolingo, and how would you break it down?'",
  "answer": "**Clarify**: mission is learning a language habitually. Revenue and DAU are outcomes, not value.\n\n**Candidate NSM**: *weekly learners who complete at least one lesson and one review session* (or total lessons completed per week). It measures learning effort, not just opens, and leads retention and subscription.\n\n**Tree**: NSM = weekly active learners x lessons per learner. Learners = new activated + retained + resurrected. Lessons per learner = days active x lessons per active day (streaks, notifications, lesson length).\n\n**Guardrails**: lesson quality or test-out accuracy (are people actually learning?), 30-day retention, notification opt-out rate, support tickets.\n\n**Why not DAU or revenue**: DAU ignores depth; revenue lags and can be inflated by paywalls that hurt learning.\n\n**Close**: say what you would change your mind on, e.g. if lessons completed rise but proficiency does not, move to a learning-outcome metric."
}
```

> [!TIP] Interview tips
> - Always give the NSM, the one-line rationale, the input tree and at least one guardrail.
> - Explain why the obvious alternatives (revenue, signups, DAU) are worse; interviewers want the reasoning more than the exact metric.
> - Pitfall: choosing a metric you cannot move within a quarter or that no single team owns.
