---
id: product-sense-case-launching-an-ai-assistant
title: "Case: Launching an AI assistant feature"
estimatedMinutes: 14
difficulty: hard
tags: [case-study, ai, llm, launch, metrics, rollout]
---

## Why it matters
"We want to add an AI assistant to our product. How do you decide it is ready, and how do you launch it?" is now a standard product-sense case. It tests whether you can combine success metrics, offline evaluation, staged rollout, guardrails and cost, not just say "run an A/B test". It builds on Defining AI success metrics and the Human-in-the-loop design lessons.

## Concept
**1. Define the job and the success metric.** Name the user task (resolve a support issue, draft an email, answer a data question). Primary metric = **task success** or **resolution**, measured from outcomes (no re-contact within 7 days, accepted edit, completed workflow), not from "assistant responded".

**2. Metric tree**:
- **Value**: task success, acceptance rate of suggestions, edit distance, time saved, retention and conversion of users who use it.
- **Quality**: correctness or groundedness rate (judged by humans and LLM graders on a golden set), hallucination rate, refusal appropriateness.
- **Trust and safety**: harmful-output rate, PII leaks, policy violations, escalation when uncertain.
- **Experience**: latency (time to first token, p95 total), thumbs-down rate, repeated rephrasing.
- **Economics**: cost per task (tokens, retrieval, tooling), human-handling cost avoided, gross margin impact.

**3. Evaluate before you launch**: a golden set of real, representative tasks with expected outcomes (include hard and adversarial ones), automated graders calibrated against human labels, red-teaming, and regression tests for every prompt or model change.

**4. Staged rollout**:
- **Dogfood** → **shadow mode** (assistant runs but outputs are hidden or only shown to agents) → **limited beta** with opt-in → **A/B test** against the existing flow with a holdout → **gradual ramp** (1% → 5% → 25% → 100%) with automatic rollback triggers.
- Start with low-risk surfaces and keep a **human in the loop** (suggest, do not act) for high-stakes actions. Provide an easy fallback to a human or the old path.

**5. Pitfalls**:
- **Deflection is not resolution**: users who give up look like deflected tickets. Use re-contact and CSAT.
- Novelty effect and selection bias in opt-in beta users.
- Averages hide failures: slice by language, user segment, query type and difficulty.
- Costs scale with usage and prompt length; set budgets, cache, and route easy queries to cheaper models.
- Silent quality drift as models, data and user behaviour change: monitor continuously and keep sampling human review.

**Launch gate**: ship to the next stage only if quality, safety and latency thresholds pass and cost per task fits the budget.

## Worked example
A support assistant is shadow-tested on 10,000 conversations (all numbers illustrative). It resolves 42% without a human, and 8% of those resolved conversations are reopened within 7 days. Costs: \$0.12 per assistant conversation, \$4.50 per human-handled conversation.

- **Baseline** (all human): 10,000 × \$4.50 = \$45,000.
- **With assistant**: 10,000 × \$0.12 = \$1,200 for the assistant, plus 5,800 escalations × \$4.50 = \$26,100, plus 4,200 × 8% = 336 reopened × \$4.50 = \$1,512. Total = **\$28,812**.
- **Net saving** = \$16,188, or about **36%**. The headline "42% deflection" overstates it: true resolution is 4,200 × 0.92 = 3,864, or **38.6%**.

**Launch plan with gates** (illustrative thresholds):
1. **Shadow mode**: golden-set accuracy ≥ 90%, hallucination rate ≤ 2%, zero PII leaks, p95 latency ≤ 4 s.
2. **Beta to 5% of traffic** with human fallback: resolution without reopen ≥ 35%, CSAT not worse than human by more than 2 points, escalation rate ≤ 60%.
3. **A/B test with a 5% holdout**: primary metric = true resolution rate and cost per resolved ticket; guardrails = CSAT, re-contact, complaint rate.
4. **Ramp** 25% → 100% with automatic rollback if guardrails breach, and weekly sampling of human-reviewed conversations.

Risk to flag: the 58% escalated cases are harder than average, so human cost per escalated ticket may rise. Track average handle time on escalations, not just volume.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An assistant 'deflects' 60% of support tickets. What additional evidence do you need before calling it a success?",
  "options": [
    "None; deflection is the goal",
    "Re-contact or reopen rate, CSAT of deflected users, and whether users abandoned instead of being helped",
    "Server uptime",
    "Number of tokens used"
  ],
  "answer": 1,
  "explanation": "A deflected ticket may be an abandoned one. Success means the issue was actually resolved, which shows up in no re-contact and satisfaction."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main purpose of shadow mode before exposing an AI assistant to users?",
  "options": [
    "Increase novelty",
    "Evaluate outputs on real traffic (quality, safety, cost, latency) with zero user impact",
    "Collect opt-in feedback",
    "Replace the golden set"
  ],
  "answer": 1,
  "explanation": "Shadow mode runs the system on real inputs without showing outputs, so you find failures and cost surprises before anyone is affected."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `net_savings(n, ai_cost, human_cost, resolved_rate, reopen_rate)`. Baseline = n * human_cost. With the assistant: every conversation costs `ai_cost`; unresolved ones (`n * (1 - resolved_rate)`) are escalated to a human; resolved ones that reopen (`n * resolved_rate * reopen_rate`) also cost `human_cost`. Return `(baseline, with_ai, savings, savings_pct)`.",
  "starterCode": "def net_savings(n, ai_cost, human_cost, resolved_rate, reopen_rate):\n    pass\n\nprint(net_savings(10000, 0.12, 4.5, 0.42, 0.08))",
  "tests": "b, w, s, p = net_savings(10000, 0.12, 4.5, 0.42, 0.08)\nassert abs(b - 45000) < 1e-6\nassert abs(w - 28812) < 1e-6\nassert abs(s - 16188) < 1e-6\nassert abs(p - 16188 / 45000) < 1e-12\nb, w, s, p = net_savings(100, 1, 10, 0.0, 0.0)\nassert abs(w - (100 + 1000)) < 1e-9 and s < 0",
  "solution": "def net_savings(n, ai_cost, human_cost, resolved_rate, reopen_rate):\n    baseline = n * human_cost\n    escalated = n * (1 - resolved_rate)\n    reopened = n * resolved_rate * reopen_rate\n    with_ai = n * ai_cost + (escalated + reopened) * human_cost\n    return baseline, with_ai, baseline - with_ai, (baseline - with_ai) / baseline",
  "hints": [
    "The assistant cost is paid for every conversation, including those later escalated.",
    "With a 0% resolution rate the assistant only adds cost, so savings are negative."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `resolution_metrics(convs)`. Each conversation is a dict with boolean keys `escalated` and `reopened` (reopened only matters if not escalated). Return `(deflection_rate, true_resolution_rate)` where deflection_rate = share not escalated and true_resolution_rate = share not escalated and not reopened.",
  "starterCode": "def resolution_metrics(convs):\n    pass\n\nconvs = [\n    {'escalated': False, 'reopened': False},\n    {'escalated': False, 'reopened': True},\n    {'escalated': True, 'reopened': False},\n    {'escalated': False, 'reopened': False},\n]\nprint(resolution_metrics(convs))",
  "tests": "convs = [\n    {'escalated': False, 'reopened': False},\n    {'escalated': False, 'reopened': True},\n    {'escalated': True, 'reopened': False},\n    {'escalated': False, 'reopened': False},\n]\nd, t = resolution_metrics(convs)\nassert abs(d - 0.75) < 1e-12 and abs(t - 0.5) < 1e-12\nd, t = resolution_metrics([{'escalated': True, 'reopened': True}])\nassert d == 0 and t == 0",
  "solution": "def resolution_metrics(convs):\n    n = len(convs)\n    defl = sum(1 for c in convs if not c['escalated'])\n    true = sum(1 for c in convs if not c['escalated'] and not c['reopened'])\n    return defl / n, true / n",
  "hints": [
    "True resolution is a subset of deflection.",
    "Count both in one pass or with two comprehensions."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `launch_gate(metrics, thresholds)`. `thresholds` is `{name: (op, limit)}` with `op` either `'>='` or `'<='`. A metric passes if it satisfies the comparison; a missing metric fails. Return the sorted list of failed metric names (an empty list means the gate passes).",
  "starterCode": "def launch_gate(metrics, thresholds):\n    pass\n\nth = {'accuracy': ('>=', 0.9), 'hallucination': ('<=', 0.02), 'p95_latency_s': ('<=', 4.0)}\nprint(launch_gate({'accuracy': 0.92, 'hallucination': 0.03, 'p95_latency_s': 3.1}, th))",
  "tests": "th = {'accuracy': ('>=', 0.9), 'hallucination': ('<=', 0.02), 'p95_latency_s': ('<=', 4.0)}\nassert launch_gate({'accuracy': 0.92, 'hallucination': 0.03, 'p95_latency_s': 3.1}, th) == ['hallucination']\nassert launch_gate({'accuracy': 0.92, 'hallucination': 0.01, 'p95_latency_s': 3.1}, th) == []\nassert launch_gate({'accuracy': 0.9, 'hallucination': 0.02, 'p95_latency_s': 4.0}, th) == []\nassert launch_gate({'accuracy': 0.85}, th) == ['accuracy', 'hallucination', 'p95_latency_s']",
  "solution": "def launch_gate(metrics, thresholds):\n    failed = []\n    for name, (op, limit) in thresholds.items():\n        v = metrics.get(name)\n        ok = v is not None and ((v >= limit) if op == '>=' else (v <= limit))\n        if not ok:\n            failed.append(name)\n    return sorted(failed)",
  "hints": [
    "Boundary values pass because the operators are inclusive.",
    "A metric you did not measure must not silently pass."
  ]
}
```

```reveal
{
  "prompt": "Interview: \"We want to launch an AI writing assistant inside our email product. How would you decide whether to launch and how to roll it out?\"",
  "answer": "**Clarify**: who are the users (consumers, business), which tasks (draft, rewrite, summarise), what is the risk of a bad output (an embarrassing email sent to a client), and the cost budget.\n\n**Success metrics**: primary = share of sessions where a suggestion is accepted with light edits and the email is sent (task success); secondary = time to send, weekly active users of the feature, retention of users who use it. Guardrails = harmful or off-brand outputs, user-reported errors, latency p95, cost per accepted draft, and no drop in core email metrics.\n\n**Evaluate offline**: golden set of real prompts across tones and languages, with human-rated and LLM-graded quality, red-teaming for toxicity and PII, and regression tests for every prompt or model change.\n\n**Rollout**: dogfood, then opt-in beta, then a 5% A/B test with a holdout, then ramp with automatic rollback on guardrail breach. Keep the human in the loop: the assistant drafts and the user sends.\n\n**Decide**: launch broadly only if accepted-draft rate and retention improve, quality and safety gates hold, and cost per accepted draft fits the budget. Watch novelty decay and re-measure after 4-8 weeks."
}
```

> [!TIP] Interview tips
> - Define success by task outcomes (resolved, accepted, completed), then add quality, safety, latency and cost guardrails.
> - Show the full path: golden-set evaluation, shadow mode, beta, A/B with holdout, gradual ramp with rollback, and human fallback.
> - Distinguish deflection from resolution, quantify cost per resolved task, and slice results by segment and difficulty.
