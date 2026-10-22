---
id: consulting-ai-strategy-and-maturity-assessment
title: AI strategy & maturity assessment
estimatedMinutes: 12
difficulty: medium
tags: [consulting, ai-strategy, maturity-model, roadmap]
---

## Why it matters
Consulting and AI-lead interviews ask "How would you build an AI strategy for this company?" or "Where do they stand today?". You need a maturity model to diagnose and a value-versus-feasibility portfolio to prioritise.

## Concept
**Diagnose with a maturity model**: score 1-5 across dimensions: (1) strategy and use-case portfolio, (2) data (quality, access, governance), (3) technology and platform (cloud, MLOps, tooling), (4) talent and organisation, (5) governance and responsible AI, (6) adoption and change management. Bands: 1 exploring, 2 experimenting, 3 scaling, 4 leading. Weight the dimensions by what constrains this client; the **weakest link** (usually data or adoption) caps everything.

**Strategy components**: where to play (use-case portfolio by domain), how to win (data advantage, build vs buy vs partner), roadmap (quick wins in 3 months, foundations in 6-12, transformational bets later), operating model (central centre of excellence, embedded teams, or hub-and-spoke), governance and risk, and a value tracker.

**Prioritise use cases**: score value (\$ per year) times feasibility (data, skills, integration, risk) and divide by effort for a ranked list. Mix quick wins that fund the journey with strategic bets.

**Typical failure modes**: pilots that never reach production, no data owner, no business sponsor, ignoring change management, and tool-first thinking. Fix with product owners, MLOps basics and stage gates.

## Worked example
A retailer scores itself 1-5: strategy 2, data 1, technology 2, talent 3, governance 1, adoption 2. Weights reflect its constraints: 0.20, 0.25, 0.20, 0.15, 0.10, 0.10.

Weighted score: $2(0.20) + 1(0.25) + 2(0.20) + 3(0.15) + 1(0.10) + 2(0.10) = 0.40 + 0.25 + 0.40 + 0.45 + 0.10 + 0.20 = 1.80$, which is "exploring". Weakest links: data and governance (both 1).

Use cases (annual value, feasibility 1-5): demand forecasting \$3.0M, 3; dynamic pricing \$4.2M, 2; churn model \$2.0M, 4; GenAI shopping assistant \$1.5M, 2. Value x feasibility: forecasting 9.0, pricing 8.4, churn 8.0, assistant 3.0.

Roadmap: the data foundations (a single product and customer table, ownership, quality checks) come first because they cap every use case. Quick win: churn model on existing CRM data (feasible, 4). Next: demand forecasting after the data work. Defer the pricing bet until governance and experimentation capability reach level 2, and treat the assistant as an experiment with a small budget.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is the most common reason AI pilots fail to reach production?",
  "options": [
    "The model's AUC is too low",
    "No data ownership, business sponsor or integration path",
    "Cloud costs",
    "Not enough GPUs"
  ],
  "answer": 1,
  "explanation": "Organisational and data-foundation gaps (ownership, sponsor, integration, change management) kill more pilots than modelling quality."
}
```

```quiz
{
  "id": "q2",
  "question": "A hub-and-spoke AI operating model means:",
  "options": [
    "Every team builds its own stack independently",
    "A central team sets platforms and standards while embedded teams in business units build use cases",
    "All AI work is outsourced",
    "A single data scientist serves the company"
  ],
  "answer": 1,
  "explanation": "The hub provides shared platform, governance and expertise; the spokes sit close to domain problems."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `maturity(scores, weights)` where both are dicts keyed by dimension. Return `(score, band, weakest)`: score = sum(scores[d] * weights[d]) (weights sum to 1), band = 'exploring' if score < 2, 'experimenting' if < 3, 'scaling' if < 4 else 'leading', weakest = sorted list of dimensions with the minimum score. Write `prioritize(cases)` where each case is `(name, value, feasibility)`; return names sorted by value * feasibility descending (ties by name).",
  "starterCode": "def maturity(scores, weights):\n    pass\n\ndef prioritize(cases):\n    pass\n\ns = {'strategy': 2, 'data': 1, 'tech': 2, 'talent': 3, 'governance': 1, 'adoption': 2}\nw = {'strategy': .2, 'data': .25, 'tech': .2, 'talent': .15, 'governance': .1, 'adoption': .1}\nprint(maturity(s, w))\n",
  "tests": "s = {'strategy': 2, 'data': 1, 'tech': 2, 'talent': 3, 'governance': 1, 'adoption': 2}\nw = {'strategy': .2, 'data': .25, 'tech': .2, 'talent': .15, 'governance': .1, 'adoption': .1}\nsc, band, weak = maturity(s, w)\nassert abs(sc - 1.8) < 1e-9 and band == 'exploring' and weak == ['data', 'governance']\nsc, band, weak = maturity({'a': 4, 'b': 5}, {'a': .5, 'b': .5})\nassert abs(sc - 4.5) < 1e-9 and band == 'leading' and weak == ['a']\nassert maturity({'a': 3}, {'a': 1.0})[1] == 'scaling'\nassert maturity({'a': 2}, {'a': 1.0})[1] == 'experimenting'\ncases = [('forecast', 3.0, 3), ('pricing', 4.2, 2), ('churn', 2.0, 4), ('assistant', 1.5, 2)]\nassert prioritize(cases) == ['forecast', 'pricing', 'churn', 'assistant']\nassert prioritize([('b', 1, 1), ('a', 1, 1)]) == ['a', 'b']",
  "solution": "def maturity(scores, weights):\n    score = sum(scores[d] * weights[d] for d in scores)\n    if score < 2:\n        band = 'exploring'\n    elif score < 3:\n        band = 'experimenting'\n    elif score < 4:\n        band = 'scaling'\n    else:\n        band = 'leading'\n    low = min(scores.values())\n    weakest = sorted(d for d, v in scores.items() if v == low)\n    return score, band, weakest\n\ndef prioritize(cases):\n    return [n for _, n in sorted((-(v * f), n) for n, v, f in cases)]",
  "hints": [
    "Use the minimum score value to find every dimension tied for weakest.",
    "Sort on (-value*feasibility, name)."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'A mid-size insurer wants an AI strategy. Where do you start and what do you deliver in 12 weeks?'",
  "answer": "**Weeks 1-3, diagnose**: interview 15-20 leaders; score six maturity dimensions (strategy, data, technology, talent, governance, adoption); inventory existing models, data assets and shadow AI (employees using public LLM tools).\n\n**Weeks 4-6, opportunity landscape**: map the value chain (distribution, underwriting, claims, servicing); list 30-40 use cases; score each on value (premium growth, loss ratio, cost-to-serve), feasibility (data, integration, regulation) and risk. Typical winners: claims triage and fraud scoring, underwriting document extraction, service-agent copilot.\n\n**Weeks 7-9, strategy and roadmap**: choose 3 waves: quick wins in 6 months (document extraction with human review), foundations (claims data model, MLOps, model risk management), scaling bets (pricing sophistication). Decide build vs buy per use case and the operating model (hub-and-spoke; a head of AI reporting to the COO).\n\n**Weeks 10-12, business case and governance**: total investment, benefits ramp, 3-year NPV, KPIs; model risk and responsible-AI policy aligned with regulators; talent plan.\n\n**Risks**: data quality in legacy systems, regulatory scrutiny of pricing models, adoption by adjusters; mitigate via sponsorship and a lighthouse use case."
}
```

> [!TIP] Interview tips
> - Offer a structure (diagnose, prioritise, roadmap, operating model, governance) and a concrete 90-day plan.
> - Show you can say no: rank use cases and defer low-feasibility bets.
> - Pitfall: a technology-first strategy. Tie every initiative to a business owner and a measurable value.
