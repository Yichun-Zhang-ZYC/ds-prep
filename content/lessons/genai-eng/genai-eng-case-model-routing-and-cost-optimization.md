---
id: genai-eng-case-model-routing-and-cost-optimization
title: "Case: Model routing and cost optimization"
estimatedMinutes: 14
difficulty: hard
tags: [genai, case-study, cost, routing, cascade]
---

## Why it matters
Once an LLM feature works, the bill arrives: "traffic is 10x, spend is 10x, make it 3x cheaper without hurting quality." This case tests whether you attack cost systematically (measure, then cheapest lever first) instead of just "use a smaller model". It builds on Token cost & latency, Caching and Cost monitoring.

## Concept
**Playbook** (in order of risk, lowest first):
1. **Measure**: cost per request by feature, route, tenant and prompt version; token split (system prompt, history, retrieved context, output, reasoning); cache hit rates. Optimize the top line item, not the one that is easiest.
2. **No-quality-loss savings**: trim the prompt, cap output length, structured output instead of prose, drop unused tool definitions, **prompt caching** for stable prefixes, response/semantic caching for repeats, batch APIs for offline jobs (about half price, higher latency).
3. **Routing**: send each request to the cheapest model that can handle it.
   - **Static rules**: by task type or tenant tier (extraction to small, hard reasoning to large).
   - **Classifier router**: a small model or a trained classifier predicts difficulty from the query; threshold chosen on a labeled set.
   - **Cascade**: try the small model first, accept if a confidence signal passes (logprobs, self-check, validator such as schema/tests/citation check, or a cheap judge), else escalate. Expected cost $= c_{small} + p_{esc} \cdot c_{large}$, so it only pays when the escalation rate is low and the check is cheap; escalated requests pay latency twice.
   - **Fallback**: on provider errors or rate limits, route to another model/provider (reliability, not cost).
4. **Specialize**: fine-tune or distill a small model on the large model's outputs for a narrow, high-volume task (see Case: Fine-tune vs RAG decision).
5. **Self-hosting** only at sustained high utilization; otherwise per-token APIs win once GPU idle time, ops and engineering are counted.

**Guardrails**: define quality per slice with an eval set *before* routing; the router is a model with its own error rate, so evaluate end-to-end (accuracy, cost, p95 latency) and use shadow traffic or an A/B test. Watch for **distribution shift** (router trained on last quarter's queries), prompt differences between models (prompts do not transfer perfectly), and routing high-stakes requests to weak models. Keep a kill switch to force the large model.

## Worked example
Scenario (all prices illustrative): 1M requests/day, average 1,500 input and 300 output tokens. Large model: \$3 / \$15 per 1M input/output tokens. Small model: \$0.30 / \$1.50.

- Large: $(1500 \cdot 3 + 300 \cdot 15)/10^6 = \$0.009$ per request, \$9,000/day.
- Small: \$0.0009 per request, \$900/day.

Step 1, free wins: 1,000 of the input tokens are a stable system prompt plus examples. With prompt caching at 10% of input price on the large model, input cost per request drops from \$0.0045 to $(500 \cdot 3 + 1000 \cdot 0.3)/10^6 = \$0.0018$, so a request costs \$0.0063 (30% less). Many requests repeat, and an exact-match cache with a 10% hit rate cuts cost by another 10%.

Step 2, cascade (using the uncached numbers for clarity): small first, validator plus confidence check escalates 30% of traffic. Expected cost $0.0009 + 0.3 \cdot 0.009 = \$0.0036$, i.e. \$3,600/day, a 60% saving. Quality check on the eval set: small accepts 70% of traffic at 96% accuracy, the large model gets the hard 30% at 80%: $0.7 \cdot 0.96 + 0.3 \cdot 0.80 = 91.2\%$ versus 92% for large-only. Product decides if 0.8 points for 60% savings is acceptable; the threshold is the dial. Escalated requests see roughly small latency plus large latency, so p95 rises; mitigate by streaming and a fast check.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which cost lever carries the LEAST quality risk and should usually be done first?",
  "options": [
    "Routing everything to the smallest model",
    "Prompt caching, trimming prompts and capping output length",
    "Fine-tuning a model",
    "Raising the temperature"
  ],
  "answer": 1,
  "explanation": "Caching and token hygiene change cost without changing the model's answer, so they come before anything that can alter quality."
}
```

```quiz
{
  "id": "q2",
  "question": "A cascade escalates 40% of requests to a large model. Small costs 1 unit per request and large costs 10 units. What is the expected cost per request?",
  "options": [
    "4 units",
    "5 units",
    "10 units",
    "1.4 units"
  ],
  "answer": 1,
  "explanation": "The small model is paid for every request: 1 + 0.4 x 10 = 5 units, 50% cheaper than large-only, but the escalated 40% pay two model latencies."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `request_cost` (prices per 1M tokens, optional cached input at a discounted price). Verify the worked-example numbers.",
  "starterCode": "def request_cost(n_in, n_out, price_in, price_out, cached_in=0, cached_price=None):\n    \"\"\"Cost in dollars. Prices are dollars per 1M tokens. `cached_in` of the input tokens\n    are billed at `cached_price` (default: the normal input price).\"\"\"\n    pass\n",
  "tests": "assert abs(request_cost(1500, 300, 3.0, 15.0) - 0.009) < 1e-12\nassert abs(request_cost(1500, 300, 0.30, 1.50) - 0.0009) < 1e-12\nassert abs(request_cost(1000, 100, 3.0, 15.0, cached_in=800, cached_price=0.3) - (200 * 3.0 + 800 * 0.3 + 100 * 15.0) / 1e6) < 1e-12\n",
  "solution": "def request_cost(n_in, n_out, price_in, price_out, cached_in=0, cached_price=None):\n    if cached_price is None:\n        cached_price = price_in\n    fresh = n_in - cached_in\n    return (fresh * price_in + cached_in * cached_price + n_out * price_out) / 1e6\n",
  "hints": [
    "Cached tokens are part of `n_in`, not extra.",
    "Divide the token-weighted sum by 1e6."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `cascade_cost` (small model always, large model for a fraction) and `cascade_saving` relative to large-only. Note what happens when the escalation rate approaches 100%.",
  "starterCode": "def cascade_cost(cost_small, cost_large, p_escalate):\n    \"\"\"Expected cost per request when every request goes to the small model first and a\n    fraction p_escalate is re-sent to the large model.\"\"\"\n    pass\n\ndef cascade_saving(cost_small, cost_large, p_escalate):\n    \"\"\"Fractional saving vs always using the large model (0.6 means 60% cheaper).\"\"\"\n    pass\n",
  "tests": "assert abs(cascade_cost(0.0009, 0.009, 0.3) - 0.0036) < 1e-12\nassert abs(cascade_saving(0.0009, 0.009, 0.3) - 0.6) < 1e-9\nassert cascade_saving(0.0009, 0.009, 1.0) < 0\nassert abs(cascade_cost(1, 10, 0.0) - 1) < 1e-12\n",
  "solution": "def cascade_cost(cost_small, cost_large, p_escalate):\n    return cost_small + p_escalate * cost_large\n\ndef cascade_saving(cost_small, cost_large, p_escalate):\n    return 1 - cascade_cost(cost_small, cost_large, p_escalate) / cost_large\n",
  "hints": [
    "The small model is paid for every request, even the escalated ones.",
    "Saving = 1 - cascade / large."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `pick_threshold`: given records of (confidence, small_correct, large_correct), find the lowest confidence threshold at which the routed system still meets a target accuracy.",
  "starterCode": "def pick_threshold(records, target_acc):\n    \"\"\"records: list of (confidence, small_correct, large_correct) with 0/1 correctness.\n    Requests with confidence >= t are answered by the small model, the rest by the large one.\n    Return the LOWEST t (most traffic to the small model) whose overall accuracy >= target_acc,\n    trying each distinct confidence value plus 1.01 (all large). Return None if none qualifies.\"\"\"\n    pass\n",
  "tests": "recs = [(0.95, 1, 1), (0.9, 1, 1), (0.8, 1, 1), (0.7, 0, 1), (0.6, 0, 1), (0.4, 0, 0)]\nassert pick_threshold(recs, 0.8) == 0.8\nassert pick_threshold(recs, 0.5) == 0.4\nassert pick_threshold(recs, 0.7) == 0.8\nassert pick_threshold(recs, 0.9) is None\n",
  "solution": "def pick_threshold(records, target_acc):\n    cands = sorted({r[0] for r in records} | {1.01})\n    for t in cands:\n        correct = sum(s if c >= t else l for c, s, l in records)\n        if correct / len(records) >= target_acc:\n            return t\n    return None\n",
  "hints": [
    "For each candidate t: use small_correct when confidence >= t, else large_correct.",
    "Candidates are the distinct confidences plus 1.01, checked in ascending order."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Your LLM spend is $300k/month and finance wants it cut by 50% without a quality drop. What do you do?'",
  "answer": "**1. Instrument first** (week 1): cost per request broken down by feature, model, prompt version, input vs output vs cached vs reasoning tokens, and by tenant. Typically two or three features dominate. Also collect an eval set per top feature, with slice tags, to define \"no quality drop\".\n\n**2. Free wins** (weeks 1 to 2): prompt caching on stable prefixes (reorder prompts so static content comes first), prune system prompts and few-shot examples, cap `max_tokens`, request structured output, summarize or window long chat history, retrieve fewer chunks, turn off unnecessary reasoning effort, move offline/non-urgent jobs to the batch API, add exact and semantic caches where repeats are common (with safe thresholds and TTLs). Re-run evals after each.\n\n**3. Routing** (weeks 2 to 6): start with static rules (task type to model tier), then a cascade for the highest-volume feature: small model plus validator (schema, tests, citation check) and a confidence signal, escalate to large. Choose the threshold on the eval set to hit the quality bar, then shadow-test on live traffic and A/B. Track per-route accuracy, escalation rate, p95 latency, and cost. Keep a kill switch.\n\n**4. Specialize** (month 2+): for the one or two highest-volume narrow tasks, distill or fine-tune a small model on logged large-model outputs (filtered by human or judge) and re-evaluate.\n\n**5. Governance**: per-tenant budgets and rate limits, cost dashboards and alerts, a cost/quality scorecard for every prompt or model change in CI, quarterly price/model review (new small models often beat last year's large ones).\n\n**Expected outcome (illustrative)**: caching and token hygiene about 20 to 30%, routing about 30 to 50% of what remains, which together exceeds the 50% goal. Be clear that the exact numbers come from the measurements in step 1."
}
```

> [!TIP] Interview tips
> - Start with measurement and zero-risk levers (caching, token trimming), then routing, then specialization.
> - Give the cascade formula c_small + p_escalate x c_large and note it needs a cheap, reliable confidence signal.
> - Always tie savings to an end-to-end quality number on a slice-tagged eval set, and mention latency, drift and a kill switch.
