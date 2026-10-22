---
id: product-sense-defining-ai-success-metrics
title: Defining AI success metrics (quality, latency, cost)
estimatedMinutes: 11
difficulty: medium
tags: [product-sense, ai-pm, metrics, evaluation, latency, cost]
---

## Why it matters

An AI feature that is accurate but slow, or fast and cheap but wrong, fails in production. Interviewers ask how you would define success for an LLM or ML feature, and the strong answer balances quality, latency and cost per successful outcome, with guardrails, rather than quoting a single accuracy number.

## Concept

Define metrics on three axes plus guardrails:

**Quality** (does it do the job?)
- Offline: task success on a golden set, exact match / F1 for extraction, groundedness (is every claim supported by retrieved sources), pairwise human preference, LLM-as-judge (calibrate it against human labels first).
- Online: acceptance rate (suggestion used), edit distance, resolution rate, thumbs up/down, escalation rate, and the business outcome (handle time, conversion).

**Latency** (does it feel usable?)
- Time to first token (TTFT) for streaming UIs, end-to-end p50/p95/p99 (not the mean), tokens per second. Set the budget from the UX: chat tolerates ~1 s TTFT, inline autocomplete needs ~200 ms.

**Cost**
- Cost per *successful* task, not per request:
$$\text{cost per success} = \frac{\text{model cost per attempt}}{\text{success rate}}$$
and include fallback cost when a failure goes to a human: $\text{effective cost} = c_m + (1-s)\,c_h$.

**Guardrails**: harmful-output rate, hallucination rate, refusal rate on valid requests, PII leakage, and quality on key slices (language, customer tier).

Report quality, latency and cost together (a Pareto view); a model is only better if it wins on the constraint that binds.

## Worked example

Compare two models for support-ticket replies. Model A costs \$0.01 per attempt and resolves 70% of tickets without a human. Model B costs \$0.03 per attempt and resolves 92%. A failed attempt escalates to an agent costing \$4.

Cost per success looks like a modest gap: A is $0.01/0.70 = \$0.0143$, B is $0.03/0.92 = \$0.0326$. But effective cost per ticket tells the real story:

- A: $0.01 + 0.30 \times 4 = \$1.21$
- B: $0.03 + 0.08 \times 4 = \$0.35$

The "3x more expensive" model is 3.5x cheaper once failures are priced in. Now add latency: B has p95 of 6 s against 2 s for A, and the UX budget is 4 s. Options are streaming (TTFT is what users feel), routing easy tickets to A, or a speculative / smaller draft model. Success is therefore stated as: "resolution rate at least 85%, p95 under 4 s, effective cost under \$0.50 per ticket, harmful-output rate under 0.1%".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why report p95 latency rather than average latency for an LLM feature?",
  "options": [
    "p95 is always lower",
    "Tail requests (long generations, retries) hurt real users and are hidden by the mean",
    "Averages cannot be computed for streaming",
    "p95 is cheaper to measure"
  ],
  "answer": 1,
  "explanation": "User experience is defined by the slow tail; LLM latency distributions are heavy-tailed because output length varies."
}
```

```quiz
{
  "id": "q2",
  "question": "Model X costs $0.002 per attempt at 60% success; model Y costs $0.01 at 95% success; a failure costs $2 of human time. Which has the lower effective cost per ticket?",
  "options": [
    "X, because its per-call price is lower",
    "Y: 0.01 + 0.05×2 = $0.11 vs X: 0.002 + 0.40×2 = $0.802",
    "They are equal",
    "Cannot be determined"
  ],
  "answer": 1,
  "explanation": "Include the cost of failures: effective cost = model cost + (1 − success) × fallback cost."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `effective_cost(model_cost, success_rate, fallback_cost)` = model_cost + (1 − success_rate) × fallback_cost. Write `percentile(values, q)` using the nearest-rank method (sort, take the value at rank ceil(q/100 × n), 1-indexed). Finally write `pick_model(models, max_p95)` where `models` maps name → dict(cost, success, fallback, latencies); return the name with the lowest effective cost among models whose p95 latency is at most `max_p95`, or None.",
  "starterCode": "import math\n\ndef effective_cost(model_cost, success_rate, fallback_cost):\n    pass\n\ndef percentile(values, q):\n    pass\n\ndef pick_model(models, max_p95):\n    pass\n\nprint(effective_cost(0.01, 0.7, 4), percentile(list(range(1, 101)), 95))",
  "tests": "assert abs(effective_cost(0.01, 0.7, 4) - 1.21) < 1e-9\nassert abs(effective_cost(0.03, 0.92, 4) - 0.35) < 1e-9\nassert percentile(list(range(1, 101)), 95) == 95\nassert percentile([5, 1, 3], 50) == 3\nassert percentile(list(range(1, 21)), 95) == 19\nfast = [1.0] * 19 + [2.0]\nslow = [1.0] * 5 + [6.0] * 15\nmodels = {\n    'A': dict(cost=0.01, success=0.7, fallback=4, latencies=fast),\n    'B': dict(cost=0.03, success=0.92, fallback=4, latencies=slow),\n}\nassert pick_model(models, 7) == 'B'\nassert pick_model(models, 3) == 'A'\nassert pick_model(models, 0.5) is None",
  "solution": "import math\n\ndef effective_cost(model_cost, success_rate, fallback_cost):\n    return model_cost + (1 - success_rate) * fallback_cost\n\ndef percentile(values, q):\n    s = sorted(values)\n    rank = math.ceil(round(q / 100 * len(s), 9))\n    return s[max(rank, 1) - 1]\n\ndef pick_model(models, max_p95):\n    best, best_cost = None, None\n    for name, m in models.items():\n        if percentile(m['latencies'], 95) > max_p95:\n            continue\n        c = effective_cost(m['cost'], m['success'], m['fallback'])\n        if best_cost is None or c < best_cost:\n            best, best_cost = name, c\n    return best",
  "hints": [
    "Nearest rank: index = ceil(q/100 × n) − 1 after sorting; round before ceil to avoid float noise.",
    "Filter by p95 first, then take the minimum effective cost."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'How would you define success metrics for an LLM-powered meeting-summary feature?'",
  "answer": "**Goal**: users save time and trust the summary enough to act on it.\n\n**Quality (offline)**: on 200 labeled meetings, action-item recall and precision, factual consistency (every claim traceable to the transcript), and pairwise preference vs the current baseline; calibrate any LLM judge against human ratings.\n\n**Quality (online)**: summary opened and shared rate, edit rate (characters changed), thumbs up/down, regeneration rate, and the north-star outcome: follow-up tasks created from the summary.\n\n**Latency**: summary ready within 60 s of meeting end at p95; for long meetings use chunked map-reduce and show progress.\n\n**Cost**: under $0.15 per meeting hour all-in; track cost per *accepted* summary.\n\n**Guardrails**: hallucinated attributions (who said what), omitted decisions, PII exposure to non-attendees, performance by language and accent.\n\n**Process**: ship to 5% with an A/B test; success requires acceptance at least 60%, edit rate falling over time, guardrails flat."
}
```

> [!TIP] Interview tips
> - Give metrics on quality, latency and cost together, plus guardrails; name which one binds.
> - Use cost per successful task (or effective cost with fallback) and p95, not per-call price or mean latency.
> - Say how you'd validate an LLM judge against human labels before trusting it.
