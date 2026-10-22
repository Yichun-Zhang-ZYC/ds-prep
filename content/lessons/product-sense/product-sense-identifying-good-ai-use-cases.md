---
id: product-sense-identifying-good-ai-use-cases
title: Identifying good AI use cases
estimatedMinutes: 10
difficulty: medium
tags: [product-sense, ai-pm, use-cases, roi]
---

## Why it matters

"We should add AI" is the most common vague request a data scientist hears. Interviewers test whether you can separate problems where a model creates value from problems where a rule, a search box or a better UI is cheaper and safer. Good judgment here saves months of work.

## Concept

Screen a candidate use case with five questions:

- **Problem fit**: is the task fuzzy, high-volume and pattern-based (classify, extract, summarize, rank, draft)? If a few deterministic rules solve it, don't use a model.
- **Error tolerance**: what does a wrong answer cost, and can a human or a cheap check catch it? Drafting and suggesting tolerate errors; irreversible actions (payments, medical advice) do not.
- **Value per success**: volume × time (or revenue) saved per item × success rate. Small value times large volume is fine; large value times tiny volume rarely justifies the build.
- **Data and feedback**: do you have examples, ground truth or a way to collect user feedback (accept / edit / reject)? No feedback loop means no way to improve or even measure.
- **Feasibility and baseline**: has a strong baseline (rules, existing process, an off-the-shelf LLM prompt) been measured? The model must beat it by enough to cover its run and maintenance cost.

Net monthly value of automating a task:
$$\text{net} = N\cdot r\cdot\big(t\cdot c_h - (1-a)\cdot c_e\big)$$
with volume $N$, automation rate $r$, time saved $t$ (hours) at hourly cost $c_h$, accuracy $a$ and cost per error $c_e$. The error term is why high-stakes tasks need human review rather than full automation.

**Good** starting points: ticket triage, document extraction, search over internal docs, first-draft writing with review. **Bad** ones: anything exactly computable (tax rules), rare high-stakes decisions with no tolerance, problems with no data and no owner for the output.

## Worked example

A support team gets 20,000 tickets a month. Triage costs 3 minutes each at \$30/hour. A model can auto-route 60% of tickets at 95% accuracy; a misroute costs \$5 in rework.

Automated tickets: $20{,}000 \times 0.6 = 12{,}000$. Time saved: $12{,}000 \times 3/60 \times 30 = \$18{,}000$. Error cost: $12{,}000 \times 0.05 \times 5 = \$3{,}000$. Net $= \$15{,}000$ per month, a good candidate.

Now take the same model but route refund approvals, where a bad approval costs \$200. Error cost becomes $12{,}000 \times 0.05 \times 200 = \$120{,}000$, so the net is about $-\$102{,}000$. Same accuracy, same volume; the cost of an error flips the answer. The fix is to keep a human approval step (see human-in-the-loop design) rather than to abandon the idea.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which task is the weakest fit for an ML or LLM solution?",
  "options": [
    "Summarizing long customer call transcripts",
    "Computing sales tax from a published rate table",
    "Extracting fields from varied invoice layouts",
    "Drafting first replies to support emails"
  ],
  "answer": 1,
  "explanation": "Sales tax is exactly computable with deterministic rules; a model adds error and cost for no benefit. The other tasks are fuzzy, high-volume and tolerate review."
}
```

```quiz
{
  "id": "q2",
  "question": "A proposed AI feature has high volume and good data, but each error is irreversible and costs $500. What is the best next step?",
  "options": [
    "Ship full automation and monitor complaints",
    "Add human approval or a confidence-gated review path and re-estimate net value",
    "Reject all AI for this product",
    "Collect more training data before any analysis"
  ],
  "answer": 1,
  "explanation": "High error cost is handled with oversight, not by abandoning the use case; re-run the value calculation with the review cost included."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `net_value(volume, auto_rate, minutes_saved, hourly_cost, accuracy, error_cost)` returning monthly net value: automated items × (time value saved − (1 − accuracy) × error_cost). Then write `best_use_case(cases)` where `cases` maps name → a dict of those keyword arguments; return the name with the highest net value.",
  "starterCode": "def net_value(volume, auto_rate, minutes_saved, hourly_cost, accuracy, error_cost):\n    pass\n\ndef best_use_case(cases):\n    pass\n\nprint(net_value(20000, 0.6, 3, 30, 0.95, 5))",
  "tests": "assert abs(net_value(20000, 0.6, 3, 30, 0.95, 5) - 15000) < 1e-6\nassert abs(net_value(20000, 0.6, 3, 30, 0.95, 200) + 102000) < 1e-6\ncases = {\n    'triage': dict(volume=20000, auto_rate=0.6, minutes_saved=3, hourly_cost=30, accuracy=0.95, error_cost=5),\n    'refunds': dict(volume=20000, auto_rate=0.6, minutes_saved=3, hourly_cost=30, accuracy=0.95, error_cost=200),\n    'summaries': dict(volume=5000, auto_rate=1.0, minutes_saved=6, hourly_cost=30, accuracy=0.9, error_cost=1),\n}\nassert best_use_case(cases) == 'triage'",
  "solution": "def net_value(volume, auto_rate, minutes_saved, hourly_cost, accuracy, error_cost):\n    automated = volume * auto_rate\n    saved = minutes_saved / 60 * hourly_cost\n    return automated * (saved - (1 - accuracy) * error_cost)\n\ndef best_use_case(cases):\n    return max(cases, key=lambda name: net_value(**cases[name]))",
  "hints": [
    "Time value per item = minutes_saved / 60 × hourly_cost.",
    "`max(cases, key=...)` iterates over names; unpack each case dict with `**`."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Our CEO wants an AI chatbot for the product. How do you decide whether it is worth building?'",
  "answer": "**1. Pin down the problem**: which user job or cost center does it serve (support deflection, onboarding, discovery)? Get current volume and cost.\n\n**2. Baseline first**: what do FAQ search, better navigation or rules achieve today? Measure it.\n\n**3. Value estimate**: volume × deflection rate × cost per contact, minus error cost and run cost; show best, expected and worst cases.\n\n**4. Risk**: what happens on a wrong or unsafe answer? Scope to low-risk intents, add citations, escalation to humans, and guardrails.\n\n**5. Cheap test**: prototype with an off-the-shelf LLM plus retrieval over existing docs, evaluate on 200 real past conversations, then pilot to 5% of traffic with an A/B test on resolution rate, CSAT and escalation rate.\n\n**6. Decide**: build only if the pilot beats the baseline on value and guardrails hold."
}
```

> [!TIP] Interview tips
> - Start from the problem and a baseline, not the technology; say when a rule or search is enough.
> - Quantify: volume × value per success − error cost − run cost, and show sensitivity to accuracy.
> - Raise error tolerance and feedback loops unprompted; they separate strong answers from hype.
