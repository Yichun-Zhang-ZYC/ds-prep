---
id: genai-eng-content-filtering
title: Content filtering
estimatedMinutes: 10
difficulty: easy
tags: [genai, safety, moderation, guardrails, thresholds]
---

## Why it matters

Any user-facing LLM needs guardrails on what goes in and what comes out. The interview is rarely about the classifier itself; it is about where the checks sit, how thresholds trade false blocks against misses, and what the latency and cost look like.


## Concept

**Where to filter**: on the **input** (user message, retrieved context), on the **output** (before the user sees it), and on **tool calls** (before side effects). Input filters save cost by rejecting early; output filters catch what the model generates anyway.

**How to filter** (cheap to expensive):
- **Rules**: blocklists, regex, length and format limits. Fast and auditable, easy to evade.
- **Classifiers**: moderation endpoints or small fine-tuned models that return per-category scores (hate, violence, self-harm, sexual, harassment, ...). Low latency, tunable thresholds.
- **LLM-as-judge / policy prompts**: flexible and handles custom policies ("no medical dosage advice") but slower and costlier; run only on borderline cases.
- **Model-native safety**: aligned base behavior plus a system prompt. Necessary, not sufficient.

**Thresholds and actions**: scores are continuous, so use two thresholds: $\ge$ `block_thr` blocks, between `review_thr` and `block_thr` goes to a human queue or a safer fallback response, below allows. Choose thresholds per category from the cost of errors: for self-harm, favor recall and respond with supportive resources instead of a bare refusal; for a casual chat app, tolerate more misses on mild categories.

**Metrics**: precision (of blocked items, how many were truly bad), recall (of bad items, how many were caught). Because harmful content is rare, accuracy is useless; watch precision and recall on a labeled set that is **oversampled** with positives, then re-weight to the production base rate to estimate real review volume.

**Operational points**: streaming makes output filtering harder (check chunks, or buffer a window); log decisions for audits; localize (language and cultural coverage differ across classifiers); give users a clear refusal message and an appeal path; re-test after every model or prompt change.


## Worked example

A moderation classifier scores 1,000 messages, of which 10 are truly harmful.
- **Threshold 0.5**: flags 40; 9 of those are harmful. Precision $= 9/40 = 22.5\%$, recall $= 9/10 = 90\%$.
- **Threshold 0.9**: flags 8; 7 are harmful. Precision $= 7/8 = 87.5\%$, recall $= 7/10 = 70\%$.

Neither alone is right. Use **two tiers**: auto-block at $\ge 0.9$ (8 items, 87.5% precise), and send $0.5$ to $0.9$ to a human queue or a safe fallback (32 items, 2 harmful). Humans review 32 messages per 1,000 instead of 40, and the pipeline reaches 90% recall without blocking 30 innocent users outright.


## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Only 0.5% of traffic is harmful. A filter that allows everything has 99.5% accuracy. What should you report instead?",
  "options": [
    "Accuracy on a larger sample",
    "Precision and recall per category at the chosen thresholds",
    "Average latency only",
    "The number of rules"
  ],
  "answer": 1,
  "explanation": "With extreme class imbalance accuracy hides total failure; precision and recall expose it."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use two thresholds (review and block) instead of one?",
  "options": [
    "Classifiers output two scores",
    "It routes uncertain items to humans or a safe fallback, limiting both wrongful blocks and misses",
    "It halves latency",
    "Regulators require exactly two"
  ],
  "answer": 1,
  "explanation": "The middle band is where the classifier is least reliable, so spend the expensive human or LLM review there."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `moderate(scores, block_thr=0.9, review_thr=0.5)` that takes a dict of category scores and returns `'block'` if the max score is `>= block_thr`, `'review'` if it is `>= review_thr`, else `'allow'`. Then write `precision_recall(scores, labels, thr)` where an item is flagged when `score >= thr` and `labels` are 1 for harmful; return `(precision, recall)`, using 1.0 for a ratio with a zero denominator.",
  "starterCode": "def moderate(scores, block_thr=0.9, review_thr=0.5):\n    # scores: {category: score}; decide using the highest score\n    pass\n\ndef precision_recall(scores, labels, thr):\n    # flag item if score >= thr; return (precision, recall)\n    pass\n\nprint(moderate({\"hate\": 0.2, \"violence\": 0.93}))\nprint(precision_recall([0.95, 0.8, 0.6, 0.4, 0.2], [1, 1, 0, 1, 0], 0.5))",
  "tests": "assert moderate({'hate': 0.2, 'violence': 0.93}) == 'block'\nassert moderate({'hate': 0.5}) == 'review'\nassert moderate({'hate': 0.49, 'self_harm': 0.1}) == 'allow'\nassert moderate({'a': 0.7}, block_thr=0.6, review_thr=0.3) == 'block'\np, r = precision_recall([0.95, 0.8, 0.6, 0.4, 0.2], [1, 1, 0, 1, 0], 0.5)\nassert abs(p - 2/3) < 1e-9 and abs(r - 2/3) < 1e-9\np, r = precision_recall([0.95, 0.8, 0.6, 0.4, 0.2], [1, 1, 0, 1, 0], 0.9)\nassert abs(p - 1.0) < 1e-9 and abs(r - 1/3) < 1e-9\np, r = precision_recall([0.95, 0.8, 0.6, 0.4, 0.2], [1, 1, 0, 1, 0], 0.99)\nassert p == 1.0 and r == 0.0",
  "solution": "def moderate(scores, block_thr=0.9, review_thr=0.5):\n    top = max(scores.values())\n    if top >= block_thr:\n        return \"block\"\n    if top >= review_thr:\n        return \"review\"\n    return \"allow\"\n\ndef precision_recall(scores, labels, thr):\n    flagged = [s >= thr for s in scores]\n    tp = sum(1 for f, l in zip(flagged, labels) if f and l)\n    fp = sum(1 for f, l in zip(flagged, labels) if f and not l)\n    fn = sum(1 for f, l in zip(flagged, labels) if not f and l)\n    precision = tp / (tp + fp) if tp + fp else 1.0\n    recall = tp / (tp + fn) if tp + fn else 1.0\n    return precision, recall",
  "hints": [
    "Use `max(scores.values())` and compare against the higher threshold first.",
    "Count tp, fp, fn separately, then guard each division."
  ]
}
```

> [!TIP] Interview tips
> - Say where filters go (input, output, tool calls) and the cost ladder: rules, classifier, LLM judge only for borderline cases.
> - Talk in precision/recall with oversampled eval sets re-weighted to the production base rate; never quote accuracy.
> - Pitfall: filtering streamed output token-by-token is hard; mention buffering windows, and that thresholds must be re-validated after each model or prompt change.
