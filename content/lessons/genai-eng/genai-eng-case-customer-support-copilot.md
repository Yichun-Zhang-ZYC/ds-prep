---
id: genai-eng-case-customer-support-copilot
title: "Case: Customer-support copilot"
estimatedMinutes: 14
difficulty: medium
tags: [genai, case-study, rag, customer-support, guardrails]
---

## Why it matters
Customer support is the most common "design an LLM product" interview prompt: high volume, clear business metrics, real risk when the model is wrong. It ties together RAG, tool use, guardrails, evaluation and cost in a single answer.

## Concept
**Playbook** (state requirements first: channels, languages, ticket volume, refund/legal risk, latency, who is the user).

1. **Pick the autonomy level.** *Agent-assist* (draft reply, human sends) is the safe v1; *auto-resolve* only for low-risk intents once measured precision is high. Most real systems are tiered by intent and confidence.
2. **Pipeline**: classify intent/language/sentiment → retrieve from the knowledge base (hybrid search + rerank, see the RAG lessons) → fetch customer context via tools (order status, plan, past tickets; read-only first) → draft with citations to KB articles → guardrail checks → route (auto-send, draft for agent, escalate).
3. **Guardrails**: PII redaction before logging, policy checks (refund limits, no legal/medical promises), grounding check (every claim cites a retrieved article), prompt-injection defense for customer text and retrieved content, tone checks, and a confidence threshold with a safe fallback ("handing you to a specialist").
4. **Write actions** (refund, cancel) go through tools with typed arguments, limits and human approval; never let the model free-text an action.
5. **Feedback loop**: log agent edits, thumbs, and final resolution. Edited drafts become eval cases and few-shot examples; KB gaps found by "no answer" cases go to content owners.

**Metrics**: *quality* (acceptance rate, edit distance, groundedness, CSAT), *efficiency* (average handle time, first-contact resolution, deflection rate), *safety* (policy-violation rate, wrong-auto-send rate, escalation recall), *cost* (per ticket). Report deflection together with CSAT and re-contact rate, otherwise you reward bad deflection.

**Pitfalls**: stale KB (answers are only as fresh as the index), reply language mismatch, long ticket threads blowing the context (summarize history), one global threshold (set per intent), measuring only offline BLEU-style similarity, launching without a shadow-mode period.

## Worked example
Illustrative numbers: 120k tickets/month, 70% of agents adopt the copilot, one draft per ticket. Per draft: 3,000 input tokens (ticket, history, 4 KB chunks, system prompt) and 400 output tokens at \$3 / \$15 per million tokens.

- Cost per draft $= 3000 \times 3/10^6 + 400 \times 15/10^6 = 0.009 + 0.006 = 0.015$ dollars; monthly $= 120{,}000 \times 0.015 = 1{,}800$ dollars.
- If drafts cut handle time by 2 minutes at \$0.50 per agent-minute, savings $= 120{,}000 \times 0.7 \times 2 \times 0.5 = 84{,}000$ dollars per month, so LLM spend is about 2% of the benefit. Quality and risk, not token cost, are the real constraints.
- Rollout: shadow mode (drafts hidden, compared to the agent's real reply) → agent-assist for 10% of agents → A/B test on handle time and CSAT → auto-send only for intents like "where is my order" when auto-send precision on a held-out set is at least 98% and wrong sends are cheap to recover from.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Deflection rate rose from 30% to 45% after launch, but CSAT fell and re-contact within 7 days doubled. What is the most likely conclusion?",
  "options": [
    "The launch succeeded because deflection rose",
    "Some deflected tickets were not actually resolved; judge by resolution, CSAT and re-contact, not deflection alone",
    "CSAT is unreliable and should be ignored",
    "The model needs a higher temperature"
  ],
  "answer": 1,
  "explanation": "Deflection counts conversations the bot closed, not problems solved. Pair it with outcome metrics."
}
```

```quiz
{
  "id": "q2",
  "question": "Which design best limits the damage when the model drafts a wrong refund promise?",
  "options": [
    "Tell the model in the prompt never to promise refunds",
    "Execute refunds only through a typed tool with amount limits and approval above a threshold, and run a policy check on the draft",
    "Lower the temperature to 0",
    "Use a larger model"
  ],
  "answer": 1,
  "explanation": "Prompts are advisory; enforcement belongs in code: typed tools, limits, approvals and output checks."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `route(conf, intent, amount=0, auto_thr=0.9, review_thr=0.6, refund_limit=50)` returning one of `'auto_send'`, `'draft_for_agent'`, `'human_review'`, `'escalate'`. Rules in order: intents `legal`, `security`, `account_deletion` always `'escalate'`; intent `refund` with `amount > refund_limit` is `'human_review'`; otherwise `conf >= auto_thr` is `'auto_send'`, `conf >= review_thr` is `'draft_for_agent'`, else `'escalate'`.",
  "starterCode": "def route(conf, intent, amount=0, auto_thr=0.9, review_thr=0.6, refund_limit=50):\n    pass\n",
  "tests": "assert route(0.99, 'legal') == 'escalate'\nassert route(0.99, 'refund', 80) == 'human_review'\nassert route(0.99, 'refund', 50) == 'auto_send'\nassert route(0.95, 'order_status') == 'auto_send'\nassert route(0.9, 'order_status') == 'auto_send'\nassert route(0.75, 'billing') == 'draft_for_agent'\nassert route(0.6, 'billing') == 'draft_for_agent'\nassert route(0.3, 'billing') == 'escalate'",
  "solution": "def route(conf, intent, amount=0, auto_thr=0.9, review_thr=0.6, refund_limit=50):\n    if intent in ('legal', 'security', 'account_deletion'):\n        return 'escalate'\n    if intent == 'refund' and amount > refund_limit:\n        return 'human_review'\n    if conf >= auto_thr:\n        return 'auto_send'\n    if conf >= review_thr:\n        return 'draft_for_agent'\n    return 'escalate'",
  "hints": [
    "Check the hard-coded risk rules before looking at confidence.",
    "`amount > refund_limit` is strict, so exactly 50 is allowed."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Pick an auto-send threshold. `items` is a list of `(confidence, was_correct)` pairs from a labeled set. Implement `sweep(items, thr)` returning `(coverage, precision)` for tickets with `confidence >= thr` (coverage = share of all items auto-sent; precision = share of those that were correct; `(0.0, 0.0)` if none). Then `pick_threshold(items, target_precision)` returns the lowest confidence value present in `items` whose precision is at least the target (so coverage is maximal), or `None`.",
  "starterCode": "def sweep(items, thr):\n    pass\n\ndef pick_threshold(items, target_precision):\n    pass\n",
  "tests": "items = [(0.95, True), (0.92, True), (0.85, False), (0.7, True), (0.5, False)]\nassert sweep(items, 0.9) == (0.4, 1.0)\ncov, prec = sweep(items, 0.7)\nassert abs(cov - 0.8) < 1e-12 and abs(prec - 0.75) < 1e-12\nassert sweep(items, 0.99) == (0.0, 0.0)\nassert pick_threshold(items, 0.9) == 0.92\nassert pick_threshold(items, 0.75) == 0.7\nassert pick_threshold(items, 0.5) == 0.5\nassert pick_threshold([(0.4, False)], 0.9) is None",
  "solution": "def sweep(items, thr):\n    sent = [ok for c, ok in items if c >= thr]\n    if not sent:\n        return (0.0, 0.0)\n    return (len(sent) / len(items), sum(sent) / len(sent))\n\ndef pick_threshold(items, target_precision):\n    for thr in sorted({c for c, _ in items}):\n        cov, prec = sweep(items, thr)\n        if cov > 0 and prec >= target_precision - 1e-12:\n            return thr\n    return None",
  "hints": [
    "`True` sums as 1, so `sum(sent)` counts correct items.",
    "Try candidate thresholds in ascending order and return the first that meets the target."
  ]
}
```

> [!TIP] Interview tips
> - Open with requirements and risk, then choose autonomy level (assist first, auto-resolve for low-risk intents with measured precision).
> - Name the pipeline: intent, retrieval, tools, cited draft, guardrails, routing, feedback loop.
> - Pair deflection with CSAT and re-contact; set thresholds per intent from a labeled set; mention shadow mode and A/B rollout.
