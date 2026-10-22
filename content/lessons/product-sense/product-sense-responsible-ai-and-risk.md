---
id: product-sense-responsible-ai-and-risk
title: Responsible AI & risk
estimatedMinutes: 11
difficulty: medium
tags: [product-sense, ai-pm, responsible-ai, fairness, risk]
---

## Why it matters

Shipping an AI feature without a risk review can mean biased decisions, leaked personal data or harmful outputs, and legal, financial and brand damage. Interviewers expect you to name concrete risks, measure them with numbers (not slogans) and propose proportionate mitigations.

## Concept

**Risk categories** to walk through:
- **Fairness / bias**: unequal error rates or outcomes across groups, often inherited from labels or proxies (zip code for race).
- **Privacy**: training on or exposing PII, memorization, retention and consent.
- **Safety / harmful content** and **hallucination**: confident wrong answers, especially in medical, legal or financial contexts.
- **Security**: prompt injection, data exfiltration through tools, jailbreaks.
- **Transparency and IP**: unexplained decisions, copyrighted training data, missing disclosure that users face an AI.

**Scale controls to the stakes**: a risk tier (for example minimal, limited, high, unacceptable, as in the EU AI Act) decides how much oversight, documentation and testing a feature needs. Hiring, credit and health decisions are high risk.

**Measure fairness**, always per group and on the metric that matches the harm:
- **Demographic parity / selection rate ratio**: $\dfrac{\text{rate}_B}{\text{rate}_A}$. The **four-fifths rule** flags ratios below 0.8 as potential disparate impact.
- **Equal opportunity**: compare true positive rates, $\text{TPR}_g = \dfrac{TP_g}{TP_g + FN_g}$, so qualified people are treated alike.
- These criteria can conflict (when base rates differ you cannot satisfy all), so state which one you chose and why.

**Mitigations**: representative data and slice-based evaluation, red-teaming before launch, input and output guardrails, least-privilege tool access, human oversight for high-stakes actions, audit logs, model cards, an incident process and a kill switch, plus monitoring after launch.

## Worked example

A loan-approval model approves 60% of 1,000 applicants in group A and 42% of 800 applicants in group B.

Selection-rate ratio: $0.42/0.60 = 0.70$, below the 0.8 threshold, so it is flagged for review. That alone is not proof of discrimination, since the groups may differ legitimately in creditworthiness, so check equal opportunity among people who would repay.

Among applicants who actually repaid, the model approves 80% in A ($\text{TPR}_A = 0.80$) but 65% in B ($\text{TPR}_B = 0.65$). Qualified B applicants are rejected 15 points more often, a stronger signal of unfairness. Investigate features: if "neighborhood" proxies for group, removing it or using constraints may narrow the gap, possibly at a small cost in overall accuracy.

Then decide with stakeholders: set the acceptable gap, document the trade-off in a model card, add monitoring of both ratios by month, and route borderline B decisions to human review. Fairness is a product decision with measured costs, not a checkbox.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Group A is approved at 50% and group B at 35%. Under the four-fifths rule, what do you conclude?",
  "options": [
    "Fine, since 35% is above 20%",
    "Flag it: 35/50 = 0.70 is below 0.8, so investigate potential disparate impact",
    "Proves intentional discrimination",
    "The rule does not apply to ML"
  ],
  "answer": 1,
  "explanation": "The ratio of selection rates is 0.70. It is a screening flag, not proof of discrimination; follow with equal-opportunity and root-cause analysis."
}
```

```quiz
{
  "id": "q2",
  "question": "Which mitigation best addresses prompt injection in an agent that reads emails and can send messages?",
  "options": [
    "Bigger model",
    "Treat email content as untrusted data, use least-privilege tools and require approval for sending",
    "Lower the temperature",
    "More training data"
  ],
  "answer": 1,
  "explanation": "Injection is a security problem: isolate untrusted input, limit what tools can do, and gate irreversible actions with human approval."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `selection_ratio(selected_a, n_a, selected_b, n_b)` returning min(rate)/max(rate) of the two groups' selection rates (return 1.0 if both rates are 0). Write `tpr_by_group(records)` where each record is `(group, y_true, y_pred)`; return a dict group → TPR (TP / (TP + FN)) for groups that have at least one positive. Write `flag_groups(records, max_gap)` returning a sorted list of groups whose TPR is more than `max_gap` below the highest group TPR.",
  "starterCode": "def selection_ratio(selected_a, n_a, selected_b, n_b):\n    pass\n\ndef tpr_by_group(records):\n    pass\n\ndef flag_groups(records, max_gap):\n    pass\n\nprint(selection_ratio(600, 1000, 336, 800))",
  "tests": "assert abs(selection_ratio(600, 1000, 336, 800) - 0.7) < 1e-9\nassert selection_ratio(0, 10, 0, 10) == 1.0\nrecords = [('A', 1, 1), ('A', 1, 1), ('A', 1, 0), ('A', 0, 1), ('B', 1, 1), ('B', 1, 0), ('B', 1, 0), ('B', 0, 0), ('C', 0, 0)]\nt = tpr_by_group(records)\nassert set(t) == {'A', 'B'}\nassert abs(t['A'] - 2 / 3) < 1e-9 and abs(t['B'] - 1 / 3) < 1e-9\nassert flag_groups(records, 0.2) == ['B']\nassert flag_groups(records, 0.5) == []",
  "solution": "def selection_ratio(selected_a, n_a, selected_b, n_b):\n    ra, rb = selected_a / n_a, selected_b / n_b\n    hi = max(ra, rb)\n    if hi == 0:\n        return 1.0\n    return min(ra, rb) / hi\n\ndef tpr_by_group(records):\n    tp, pos = {}, {}\n    for g, y, p in records:\n        if y == 1:\n            pos[g] = pos.get(g, 0) + 1\n            tp[g] = tp.get(g, 0) + (1 if p == 1 else 0)\n    return {g: tp[g] / pos[g] for g in pos}\n\ndef flag_groups(records, max_gap):\n    t = tpr_by_group(records)\n    top = max(t.values())\n    return sorted(g for g, v in t.items() if top - v > max_gap)",
  "hints": [
    "Only count rows with y_true == 1 when computing TPR; TP is the subset with y_pred == 1.",
    "Compare each group's TPR to the maximum TPR across groups."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'You are launching an LLM assistant that answers benefits questions for employees. What responsible-AI risks do you review and how?'",
  "answer": "**Risk tier**: moderate to high; wrong answers affect pay and health coverage, and the system sees personal data.\n\n**Hallucination**: answer only from retrieved policy documents with citations; refuse and hand off when retrieval is weak; evaluate groundedness on 300 real questions with a target of at least 95%.\n\n**Privacy and access**: enforce the asker's permissions at retrieval (no one sees another employee's data), minimize logging of PII, set retention limits, and no training on chats without consent.\n\n**Fairness**: test answer quality across languages, regions and employee types; compare refusal and escalation rates by slice.\n\n**Security**: treat documents as untrusted, red-team for prompt injection and data leakage, and keep tools read-only.\n\n**Oversight**: a visible AI disclosure, easy thumbs-down and 'talk to HR' escape, and human review for sensitive topics (leave, disability, termination).\n\n**Operations**: model card and change log, monthly audits of sampled conversations, incident process, and a kill switch."
}
```

> [!TIP] Interview tips
> - Walk through a checklist: fairness, privacy, safety/hallucination, security, transparency, then tie each to a measurement.
> - Quote concrete fairness metrics (selection ratio with the 0.8 rule, TPR gap) and note they can conflict.
> - Scale oversight to stakes: higher risk tier means human review, audits and a kill switch.
