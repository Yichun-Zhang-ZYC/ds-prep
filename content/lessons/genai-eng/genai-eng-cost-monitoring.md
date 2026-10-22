---
id: genai-eng-cost-monitoring
title: Cost monitoring
estimatedMinutes: 10
difficulty: medium
tags: [genai, cost, monitoring, finops, alerting]
---

## Why it matters

LLM spend is usage-based and can jump 10x overnight from a prompt change, a retry loop or one heavy customer. Interviewers want to hear how you attribute cost, set budgets and alerts, and cut the bill without hurting quality.


## Concept

**Unit economics first**: cost per request $=\dfrac{t_{in}\,p_{in} + t_{out}\,p_{out}}{10^6}$ with prices per million tokens. Output tokens typically cost 3-5x input tokens, so long generations dominate. Add embeddings, reranker calls, vector DB and tool/API fees, and retries. Then compute cost per **business unit**: per conversation, per resolved ticket, per active user. Compare to value (revenue, agent-hours saved) to get margin.

**Attribution**: tag every call with feature, prompt version, model, tenant/team, environment and request id. Without tags you can see the bill but not the cause. Pull token counts from the provider's response `usage` field (do not estimate), record cached-token counts separately, and reconcile your totals against the invoice.

**Controls**:
- **Budgets and rate limits** per tenant and per feature; hard caps on `max_tokens`, context length, tool-loop iterations and retries (a runaway agent loop is the classic cost incident).
- **Alerts**: absolute daily/hourly budget, and **anomaly detection** (today vs trailing mean plus $k$ standard deviations, with a floor on the std so flat history does not alert on noise); alert on cost per request and tokens per request, not just total spend, to separate traffic growth from inefficiency.
- **Dashboards**: cost by feature/model/tenant, p95 tokens per request, cache hit rate, retry rate, top spenders.

**Levers to cut cost** (measure quality on your eval set after each): route easy requests to a smaller model (cascade or classifier router), shorten prompts, prompt-cache stable prefixes, cache responses, limit output length, batch APIs for offline work (discounted, asynchronous), retrieve fewer chunks, and distill or fine-tune a small model for high-volume tasks.

**Latency and cost trade**: the cheapest option is not always acceptable; track cost per *successful* outcome, because retries and failed answers cost money too.


## Worked example

A support assistant handles 50,000 requests/day, averaging 1,200 input and 300 output tokens, at \$2.50 per million input tokens and \$10 per million output tokens.

Per request: input 1,200 × \$2.50 / 10^6 = \$0.003, output 300 × \$10 / 10^6 = \$0.003, total \$0.006. Daily: 50,000 × \$0.006 = \$300, about \$9,000 per month.

Then a deploy adds a self-critique step that retries the model up to 4 times per request. Traffic is unchanged, but calls per request go from 1 to 4, so daily cost becomes about \$1,200. A total-spend alert fires only after the money is gone; a **tokens-per-request** alert fires within the hour, and the `prompt_version` tag points at the culprit.

Fix options: cap iterations at 2, route the critique to a small model (say \$0.25 / \$1 per million), and cache. Verify on the eval set that quality holds.


## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Daily spend is flat, but cost per request doubled while request volume halved. What does a total-spend alert tell you?",
  "options": [
    "Everything is fine",
    "Nothing useful: you need per-request cost and token metrics to see the efficiency regression",
    "Traffic doubled",
    "The provider raised prices"
  ],
  "answer": 1,
  "explanation": "Total spend hides offsetting changes. Track unit costs (per request, per resolved ticket) and tokens per request."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the most reliable source of token counts for cost accounting?",
  "options": [
    "Character count divided by 4",
    "The `usage` field returned by the provider, reconciled with the invoice",
    "The max_tokens parameter",
    "A local tokenizer for a different model"
  ],
  "answer": 1,
  "explanation": "Providers bill on their own tokenization (and cached vs uncached tokens), so use the reported usage and reconcile monthly."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Records look like `{'model', 'input_tokens', 'output_tokens', 'feature'}` and `prices` maps model to `(usd_per_1M_input, usd_per_1M_output)`. Write `request_cost(rec, prices)`, then `cost_by(records, prices, key)` returning total cost per value of `rec[key]`. Finally write `spike_days(daily, window=3, k=3.0)` returning indices `i >= window` where `daily[i] > mean + k * max(std, 0.05 * mean)`, with mean and population std computed over the previous `window` days.",
  "starterCode": "def request_cost(rec, prices):\n    # prices: {model: (usd_per_1M_input, usd_per_1M_output)}\n    pass\n\ndef cost_by(records, prices, key):\n    # total cost grouped by rec[key], e.g. \"feature\"\n    pass\n\ndef spike_days(daily, window=3, k=3.0):\n    # indices i >= window where daily[i] > mean + k * max(std, 0.05 * mean) of the previous `window` days\n    # (population std)\n    pass\n\nprices = {\"big\": (2.5, 10.0)}\nprint(request_cost({\"model\": \"big\", \"input_tokens\": 1200, \"output_tokens\": 300}, prices))",
  "tests": "prices = {'big': (2.5, 10.0), 'small': (0.25, 1.0)}\nr1 = {'model': 'big', 'input_tokens': 1200, 'output_tokens': 300, 'feature': 'chat'}\nassert abs(request_cost(r1, prices) - 0.006) < 1e-12\nrecs = [\n    r1,\n    {'model': 'big', 'input_tokens': 2000, 'output_tokens': 0, 'feature': 'search'},\n    {'model': 'small', 'input_tokens': 1000000, 'output_tokens': 1000000, 'feature': 'chat'},\n]\nc = cost_by(recs, prices, 'feature')\nassert sorted(c) == ['chat', 'search']\nassert abs(c['chat'] - 1.256) < 1e-9 and abs(c['search'] - 0.005) < 1e-12\nassert cost_by([], prices, 'feature') == {}\nassert spike_days([100, 102, 98, 101, 400, 99, 103]) == [4]\nassert spike_days([100, 100, 100, 100, 100]) == []\nassert spike_days([100, 100, 100, 130], window=3, k=3.0) == [3]\nassert spike_days([5, 6], window=3) == []",
  "solution": "def request_cost(rec, prices):\n    p_in, p_out = prices[rec[\"model\"]]\n    return (rec[\"input_tokens\"] * p_in + rec[\"output_tokens\"] * p_out) / 1e6\n\ndef cost_by(records, prices, key):\n    out = {}\n    for r in records:\n        out[r[key]] = out.get(r[key], 0.0) + request_cost(r, prices)\n    return out\n\ndef spike_days(daily, window=3, k=3.0):\n    flagged = []\n    for i in range(window, len(daily)):\n        prev = daily[i - window:i]\n        m = sum(prev) / window\n        sd = (sum((x - m) ** 2 for x in prev) / window) ** 0.5\n        if daily[i] > m + k * max(sd, 0.05 * m):\n            flagged.append(i)\n    return flagged",
  "hints": [
    "Cost = (in_tokens * p_in + out_tokens * p_out) / 1e6.",
    "The std floor (5% of the mean) keeps a perfectly flat history from flagging tiny wiggles; compute std with divisor `window`."
  ]
}
```

> [!TIP] Interview tips
> - Start from unit economics: cost per request = tokens times price, output tokens cost more; then cost per business outcome.
> - Name the controls: tags for attribution, usage-field accounting, per-tenant budgets, caps on tokens and loop iterations, anomaly alerts on cost and tokens per request.
> - List cost levers with the quality caveat: model routing, prompt and response caching, shorter prompts, batch APIs, distillation; each must be validated on the eval set.
