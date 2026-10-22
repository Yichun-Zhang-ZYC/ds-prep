---
id: product-sense-build-vs-buy-vs-fine-tune
title: Build vs buy vs fine-tune
estimatedMinutes: 11
difficulty: medium
tags: [product-sense, ai-pm, llm, cost, build-vs-buy]
---

## Why it matters

Every AI feature starts with the same question: call a hosted model API, fine-tune a smaller model, or train and host our own? Interviewers want a decision framework with numbers, not a slogan like "open source is cheaper". The right answer changes with volume, quality gap, privacy and team size.

## Concept

Think of a ladder, and climb only when the rung below fails a measured requirement:

1. **Prompt a hosted API** (buy): zero training, fastest to ship, pay per token, vendor controls quality, latency and deprecations.
2. **Add retrieval (RAG) and better prompts**: fixes missing knowledge and freshness without training.
3. **Fine-tune** (a hosted or open model): fixes *behavior*, style, format and domain-specific skill; often lets a small model match a large one on a narrow task, cutting cost and latency. It does not reliably add new facts.
4. **Self-host an open model**: control over data, latency and cost at scale; you own GPUs, serving and on-call.
5. **Train from scratch**: almost never justified outside foundation-model labs.

Decision factors: **quality gap** on your own eval set, **volume** (break-even), **data sensitivity** and residency, **latency** needs, **differentiation** (is this your moat?), **team** (do you have ML and infra engineers?), and **lock-in / switching cost**.

Break-even volume against an API with per-request cost $c_a$ and a self-hosted option with monthly fixed cost $F$ and variable cost $c_s$:
$$V^* = \frac{F}{c_a - c_s}$$
Below $V^*$ requests per month, buying is cheaper; above it, building wins if quality is equal. Include people cost in $F$, not just GPUs.

## Worked example

A product sends 1M requests a month, each with 1,500 input and 300 output tokens. A hosted API charges \$3 per million input tokens and \$15 per million output tokens (illustrative prices).

Per request: $1500 \times 3/10^6 + 300 \times 15/10^6 = 0.0045 + 0.0045 = \$0.009$. Monthly: \$9,000.

A fine-tuned small model on 2 GPUs costs $2 \times 720 \text{ h} \times \$2.50 = \$3{,}600$ plus about \$6,000 of engineering time per month, so $F = \$9{,}600$ and $c_s \approx 0$. Break-even: $9{,}600/0.009 \approx 1.07\text{M}$ requests per month.

At 1M requests, buying (\$9,000) is slightly cheaper and has no ops burden, so start with the API. At 3M requests the API costs \$27,000 versus about \$9,600 for self-hosting (assuming the 2 GPUs handle the load), so fine-tune and host once the feature proves itself. Re-check quality on your eval set before switching; cost savings from a worse model are not savings.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Your support bot answers wrongly because it doesn't know last week's policy change. What is the best first fix?",
  "options": [
    "Fine-tune the model on the new policy",
    "Retrieve the current policy documents at query time (RAG)",
    "Train a new model from scratch",
    "Switch to a bigger model"
  ],
  "answer": 1,
  "explanation": "Missing and fast-changing knowledge is a retrieval problem. Fine-tuning changes behavior and is a slow, unreliable way to inject facts."
}
```

```quiz
{
  "id": "q2",
  "question": "Which factor most often justifies moving from a hosted API to a self-hosted fine-tuned model?",
  "options": [
    "The team wants to use open-source software",
    "Sustained high volume on a narrow task where a small model matches quality, or strict data-residency rules",
    "The API has a free tier",
    "The prompt is long"
  ],
  "answer": 1,
  "explanation": "Break-even volume, equal measured quality, and privacy constraints are the real drivers; ideology is not."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `api_cost_per_request(in_tokens, out_tokens, in_price_per_m, out_price_per_m)` (prices are dollars per million tokens). Then write `breakeven_requests(fixed_monthly, api_cost, self_var_cost=0.0)` returning the monthly request count where self-hosting costs the same as the API; return `float('inf')` if the API is not more expensive per request than self-hosting.",
  "starterCode": "def api_cost_per_request(in_tokens, out_tokens, in_price_per_m, out_price_per_m):\n    pass\n\ndef breakeven_requests(fixed_monthly, api_cost, self_var_cost=0.0):\n    pass\n\nc = api_cost_per_request(1500, 300, 3, 15)\nprint(c, breakeven_requests(9600, c))",
  "tests": "c = api_cost_per_request(1500, 300, 3, 15)\nassert abs(c - 0.009) < 1e-12\nassert abs(breakeven_requests(9600, c) - 9600 / 0.009) < 1e-6\nassert abs(breakeven_requests(9600, c, 0.001) - 1200000) < 1e-3\nassert breakeven_requests(9600, 0.001, 0.002) == float('inf')",
  "solution": "def api_cost_per_request(in_tokens, out_tokens, in_price_per_m, out_price_per_m):\n    return in_tokens * in_price_per_m / 1e6 + out_tokens * out_price_per_m / 1e6\n\ndef breakeven_requests(fixed_monthly, api_cost, self_var_cost=0.0):\n    saving = api_cost - self_var_cost\n    if saving <= 0:\n        return float('inf')\n    return fixed_monthly / saving",
  "hints": [
    "Cost = tokens × price / 1,000,000, summed for input and output.",
    "The per-request saving is api_cost − self_var_cost; if it is not positive, self-hosting never breaks even."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'We have a prototype using a frontier API that works well. Leadership asks whether we should fine-tune our own model. What do you do?'",
  "answer": "**1. Ask why**: cost, latency, privacy, quality or strategic control? Each has a different test.\n\n**2. Measure the current state**: eval set of 300-500 real examples, task success, p95 latency, cost per successful task, and monthly volume forecast.\n\n**3. Cheap levers first**: prompt tuning, few-shot examples, retrieval, caching, routing easy requests to a smaller hosted model.\n\n**4. Prototype the fine-tune**: a small open model on a few thousand labeled examples; compare on the same eval set. Proceed only if quality is within the agreed tolerance (for example within 2 points of the API).\n\n**5. Total cost of ownership**: GPUs, serving stack, evals, retraining, on-call, and the break-even volume versus the API bill.\n\n**6. Decide and hedge**: stay on the API until volume or constraints cross break-even; keep prompts and eval harness model-agnostic so switching later is cheap."
}
```

> [!TIP] Interview tips
> - Present a ladder (prompt, RAG, fine-tune, self-host) and say what each rung fixes.
> - Always compute break-even with people cost included, and hold quality equal on your own eval set.
> - Mention lock-in, deprecations and data privacy as non-cost factors.
