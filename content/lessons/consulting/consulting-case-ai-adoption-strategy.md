---
id: consulting-case-ai-adoption-strategy
title: "Case: AI adoption strategy for a business"
estimatedMinutes: 15
difficulty: hard
tags: [consulting, case, ai-strategy, roi, prioritization]
---

## Why it matters
"How should a company adopt AI?" is now one of the most common consulting and DS-leadership cases. It tests whether you can move from hype to a prioritised, value-sized roadmap, and whether you notice data, people and risk constraints. The earlier lessons cover maturity assessment and translating problems; this one is the end-to-end case.

## Concept
**Playbook**: (1) clarify the business goal (cost, revenue, risk, experience) and constraints (budget, regulation, timeline); (2) **find value pools**: map the value chain and list use cases by pain point, not by technology; (3) **prioritise** with value × feasibility ÷ risk: value (\$ per year), feasibility (data availability, workflow fit, tech maturity), risk (errors, privacy, regulation, reputation); (4) **choose build / buy / partner** per use case: buy commodity capability, build where data is the moat; (5) **readiness**: data quality and access, platform, talent, governance; (6) **operating model and change**: owners, human-in-the-loop, training, incentives; (7) **roadmap**: a pilot with success metrics, then scale gates; (8) **risks**: hallucination, bias, security, vendor lock-in, model drift.

**Value sizing**: $\text{value} = \text{volume} \times \text{eligible share} \times \text{value per item} \times \text{effect size} \times \text{adoption}$, minus build and run cost; then apply a **probability of success** haircut.

**Distinguish** generative assistants (draft, summarise, search) from predictive models (score, forecast) and automation (RPA, rules); the cheapest solution that meets the need often wins.

**Pitfalls**: starting from a tool ("let's deploy an LLM") instead of a problem; ignoring adoption (a tool nobody uses saves nothing); no baseline or success metric; skipping governance until after the pilot; counting gross savings without run costs, monitoring and human review.

See *AI strategy and maturity assessment* for the maturity ladder.

## Worked example
**Case**: A mid-size insurer (\$2B premiums) asks where to start with generative AI. (Illustrative numbers.)

**Value pools** (annual, \$M): claims handling assist 2.0, customer-service summarisation 0.8, underwriting document extraction 1.5, marketing copy 0.2. Feasibility (1-5) and risk (1-5): claims 4 / 2, service 5 / 2, underwriting 3 / 3, marketing 5 / 1. Score = value × feasibility ÷ risk: claims 4.0, service 2.0, underwriting 1.5, marketing 1.0. **Start with claims assist** (and service summarisation as a quick follow-on sharing the same platform).

**Sizing claims assist**: 600,000 claims a year; 50% are low complexity, so 300,000 eligible. Handling costs about \$20 per claim (30 minutes at \$40 an hour loaded). The assistant cuts handling time 40% and 85% of adjusters use it: $300{,}000 \times 20 \times 0.40 \times 0.85 = \$2.04\text{M}$ a year at steady state.

**Costs**: \$1.2M to build and integrate, \$0.6M a year to run (model usage, monitoring, review). With a 50% adoption ramp in year 1: year 1 net $= 1.02 - 0.6 - 1.2 = -\$0.78\text{M}$; year 2 net $= 2.04 - 0.6 = +\$1.44\text{M}$; cumulative +\$0.66M, so **payback in year 2**. With a 70% probability of reaching the full effect, the risk-adjusted steady state is $2.04 \times 0.7 - 0.6 = \$0.83\text{M}$ a year, still positive.

**Plan**: 12-week pilot with 40 adjusters; metrics: handling time, quality audit error rate, adopter share; human review stays on for payouts above a threshold; privacy and model-risk sign-off before launch. Scale only if time saved is at least 25% and error rate does not rise.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A VP says: 'Let's deploy an LLM chatbot.' What is the best first response?",
  "options": [
    "Start building immediately",
    "Ask which business problem and metric it should move, then compare options including non-AI ones",
    "Refuse because LLMs are risky",
    "Buy the most popular vendor"
  ],
  "answer": 1,
  "explanation": "Start from the problem and the value metric; the cheapest solution that works may not be an LLM."
}
```

```quiz
{
  "id": "q2",
  "question": "Which omission most often makes an AI business case overstate savings?",
  "options": [
    "Using round numbers",
    "Ignoring adoption, run costs and human review",
    "Including a pilot",
    "Using a probability of success"
  ],
  "answer": 1,
  "explanation": "Gross savings assume everyone uses the tool perfectly for free. Adoption, monitoring and review costs shrink the net value."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `annual_savings(volume, eligible_share, cost_per_item, time_saved, adoption)` returning `volume * eligible_share * cost_per_item * time_saved * adoption`.",
  "starterCode": "def annual_savings(volume, eligible_share, cost_per_item, time_saved, adoption):\n    pass\n\nprint(annual_savings(600000, 0.5, 20, 0.4, 0.85))\n",
  "tests": "assert abs(annual_savings(600000, 0.5, 20, 0.4, 0.85) - 2040000) < 1e-6\nassert annual_savings(1000, 1, 10, 0, 1) == 0\nassert abs(annual_savings(1000, 0.2, 5, 0.5, 0.5) - 250) < 1e-9",
  "solution": "def annual_savings(volume, eligible_share, cost_per_item, time_saved, adoption):\n    return volume * eligible_share * cost_per_item * time_saved * adoption",
  "hints": [
    "It is a straight product of five factors.",
    "300,000 eligible x $20 = $6M of handling cost; 40% x 85% of it is saved."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `cumulative_net(steady_savings, ramp, run_cost, build_cost)`. `ramp` is a list of adoption fractions per year (e.g. `[0.5, 1, 1]`). In year `t` net cash is `steady_savings * ramp[t] - run_cost`; build cost is paid at the start. Return the list of cumulative net cash after each year, starting from `-build_cost`.",
  "starterCode": "def cumulative_net(steady_savings, ramp, run_cost, build_cost):\n    pass\n\nprint(cumulative_net(2.04, [0.5, 1, 1], 0.6, 1.2))\n",
  "tests": "r = cumulative_net(2.04, [0.5, 1, 1], 0.6, 1.2)\nassert len(r) == 3\nassert abs(r[0] + 0.78) < 1e-9 and abs(r[1] - 0.66) < 1e-9 and abs(r[2] - 2.10) < 1e-9\nassert cumulative_net(1, [], 0.1, 5) == []\nassert abs(cumulative_net(0.5, [1], 1, 0)[0] + 0.5) < 1e-12",
  "solution": "def cumulative_net(steady_savings, ramp, run_cost, build_cost):\n    cash = -build_cost\n    out = []\n    for a in ramp:\n        cash += steady_savings * a - run_cost\n        out.append(cash)\n    return out",
  "hints": [
    "Start the running total at -build_cost and append after each year.",
    "Year 1: 2.04 x 0.5 - 0.6 = 0.42, so cumulative = -1.2 + 0.42 = -0.78."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `prioritize(cases)` where `cases` is a list of `(name, value, feasibility, risk)`. Score = `value * feasibility / risk`. Return the names sorted by score descending (ties broken alphabetically by name).",
  "starterCode": "def prioritize(cases):\n    pass\n\ncases = [('claims', 2.0, 4, 2), ('service', 0.8, 5, 2), ('underwriting', 1.5, 3, 3), ('marketing', 0.2, 5, 1)]\nprint(prioritize(cases))\n",
  "tests": "cases = [('claims', 2.0, 4, 2), ('service', 0.8, 5, 2), ('underwriting', 1.5, 3, 3), ('marketing', 0.2, 5, 1)]\nassert prioritize(cases) == ['claims', 'service', 'underwriting', 'marketing']\nassert prioritize([('b', 1, 1, 1), ('a', 2, 1, 2)]) == ['a', 'b']\nassert prioritize([]) == []",
  "solution": "def prioritize(cases):\n    scored = [(-(v * f / r), n) for n, v, f, r in cases]\n    return [n for _, n in sorted(scored)]",
  "hints": [
    "Sort by a tuple (-score, name) to get descending score with alphabetical ties.",
    "Scores in the example: 4.0, 2.0, 1.5, 1.0."
  ]
}
```

> [!TIP] Interview tips
> - Start from value pools and pain points, rank use cases by value x feasibility / risk, then size the winner.
> - Include adoption, run cost, human review and a probability-of-success haircut in the ROI.
> - Propose a pilot with explicit success metrics and a scale gate, plus governance from day one.
