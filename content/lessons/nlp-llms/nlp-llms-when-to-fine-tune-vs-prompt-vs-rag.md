---
id: nlp-llms-when-to-fine-tune-vs-prompt-vs-rag
title: When to fine-tune vs prompt vs RAG
estimatedMinutes: 10
difficulty: medium
tags: [nlp, llm, fine-tuning, rag, prompting, system-design]
---

## Why it matters
"Should we fine-tune?" is the most common LLM system-design question. Strong answers separate **knowledge** problems from **behaviour** problems and order the options by cost and reversibility.

## Concept
Rule of thumb: **RAG gives the model knowledge; fine-tuning changes its behaviour; prompting is the cheapest way to test both.**

- **Prompting** (instructions, few-shot examples, structured output). Minutes to iterate, no training data, works with any API model. Limits: long prompts cost tokens and latency on every call, and the model may not follow subtle style or format rules reliably.
- **RAG**: retrieve documents at query time and put them in the context. Best when knowledge is **fresh, private, large or must be cited**. Updates are instant (re-index), access control is possible per user, and grounding reduces hallucination. Limits: quality depends on retrieval; adds latency and infrastructure.
- **Fine-tuning** (SFT, preference tuning, LoRA). Best for **style, tone, strict output format, domain-specific skills, and distilling a big model's behaviour into a small, cheap one**. Needs hundreds to thousands of clean examples and an eval set. Limits: poor at reliably injecting new facts, goes stale, can cause forgetting, and needs retraining to change.

**Decision order**:
1. Build an eval set first; you cannot compare options without one.
2. Try a strong prompt. If it passes, stop.
3. Missing facts? Add RAG. Wrong format, tone or skill, or prompt too long/expensive at scale? Fine-tune.
4. They combine: a fine-tuned model that follows your format and uses retrieved context well is a common production setup.

**Signals to fine-tune**: high volume (per-request savings add up), tight latency or on-device constraints, a task a small model can learn, or consistent failures that prompting cannot fix. **Signals not to**: facts change often, little labeled data, need for citations or per-user permissions.

## Worked example
A few-shot prompt adds 1,500 tokens per request. At \$3 per 1M input tokens that is 1,500 × 3 / 1,000,000 = \$0.0045 per request. Fine-tuning a small model removes those examples and costs a one-off \$300 (assume serving cost is otherwise equal).

Break-even: 300 / 0.0045 ≈ 66,667 requests. At 2,000 requests/day that is about 33 days; at 100 requests/day it is never worth it. Add the hidden costs: data labeling, eval, retraining when requirements change.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A support bot must answer from internal policy documents that change weekly, with citations. What is the best primary approach?",
  "options": [
    "Fine-tune on the documents every week",
    "RAG over the documents",
    "A longer system prompt with no retrieval",
    "Pretrain a new model"
  ],
  "answer": 1,
  "explanation": "Fresh, private knowledge that needs citations is the classic RAG case. Fine-tuning is poor at reliably storing facts and goes stale."
}
```

```quiz
{
  "id": "q2",
  "question": "Which problem is fine-tuning best suited to?",
  "options": [
    "Answering questions about yesterday's news",
    "Making a small model always output a strict JSON schema in a brand voice",
    "Enforcing per-user document permissions",
    "Adding citations to answers"
  ],
  "answer": 1,
  "explanation": "Format, style and skills are behaviours that fine-tuning teaches well. The other options are knowledge or access-control problems, which RAG handles."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `breakeven_requests(ft_cost, saved_tokens_per_request, price_per_m_tokens)`: the smallest whole number of requests at which the one-off fine-tuning cost is repaid by the prompt tokens saved (return `float('inf')` if nothing is saved). Then implement `choose_approach(needs_fresh_or_private_knowledge, needs_behavior_change)` returning 'prompt', 'rag', 'fine-tune' or 'rag+fine-tune'.",
  "starterCode": "import math\n\ndef breakeven_requests(ft_cost, saved_tokens_per_request, price_per_m_tokens):\n    pass\n\ndef choose_approach(needs_fresh_or_private_knowledge, needs_behavior_change):\n    pass\n\nprint(breakeven_requests(300, 1500, 3))",
  "tests": "assert breakeven_requests(300, 1500, 3) == 66667\nassert breakeven_requests(45, 1000, 3) == 15000\nassert breakeven_requests(0, 1000, 3) == 0\nassert breakeven_requests(10, 0, 3) == float('inf')\nassert choose_approach(False, False) == 'prompt'\nassert choose_approach(True, False) == 'rag'\nassert choose_approach(False, True) == 'fine-tune'\nassert choose_approach(True, True) == 'rag+fine-tune'",
  "solution": "import math\n\ndef breakeven_requests(ft_cost, saved_tokens_per_request, price_per_m_tokens):\n    saving = saved_tokens_per_request * price_per_m_tokens / 1e6\n    if saving <= 0:\n        return float('inf')\n    return math.ceil(round(ft_cost / saving, 6))\n\ndef choose_approach(needs_fresh_or_private_knowledge, needs_behavior_change):\n    if needs_fresh_or_private_knowledge and needs_behavior_change:\n        return 'rag+fine-tune'\n    if needs_fresh_or_private_knowledge:\n        return 'rag'\n    if needs_behavior_change:\n        return 'fine-tune'\n    return 'prompt'",
  "hints": [
    "Saving per request = tokens * price / 1e6; break-even = ceil(cost / saving).",
    "Round the ratio to ~6 decimals before ceil so floating-point noise like 15000.000000000002 does not add a request."
  ]
}
```

```reveal
{
  "prompt": "Your team wants the model to 'know our product catalogue' and also reply in a fixed support tone. What do you recommend?",
  "answer": "Split the two needs. The catalogue is knowledge that changes and may need citations: use RAG (structured retrieval over the catalogue). The tone is behaviour: first try a system prompt with a few examples; if that is inconsistent or too token-heavy at your volume, fine-tune a smaller model on a few hundred to thousand tone-correct responses (using retrieved context in the training prompts). Build an eval set covering both factual accuracy and tone before deciding, and re-check cost break-even."
}
```

> [!TIP] Interview tips
> - Frame it as knowledge (RAG) vs behaviour (fine-tune), with prompting as the baseline you must beat.
> - Mention evals first, cost break-even, and that RAG and fine-tuning combine.
> - Name the failure modes: RAG retrieval misses, fine-tuning staleness and forgetting.
