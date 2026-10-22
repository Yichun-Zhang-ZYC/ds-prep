---
id: product-sense-human-in-the-loop-design
title: Human-in-the-loop design
estimatedMinutes: 10
difficulty: medium
tags: [product-sense, ai-pm, human-in-the-loop, automation, thresholds]
---

## Why it matters

Most production AI systems are not fully automatic or fully manual; they route some decisions to people. Interviewers ask where to put the human, how to choose a confidence threshold, and how to keep reviewers from rubber-stamping. The answer is a cost trade-off you can compute.

## Concept

**Patterns** (from most to least human control):
- **Human decides, AI suggests** (drafts, ranked options): lowest risk, lowest automation.
- **AI acts after approval**: a reviewer confirms each action; use for irreversible or costly actions.
- **Confidence-gated routing**: auto-handle when confidence $\ge \tau$, queue the rest for review. The workhorse pattern.
- **AI acts, humans audit a sample**: for low-risk, reversible actions; sample rate sets how fast you detect drift.
- **Escalation on triggers**: sensitive topics, VIP users, new categories, or user request always go to a person.

**Choosing the threshold** $\tau$: raising it sends more items to review (higher review cost, fewer automated errors). Minimize
$$\text{cost}(\tau) = c_r\cdot n_{\text{reviewed}} + c_e\cdot n_{\text{auto errors}}$$
where $c_r$ is review cost per item and $c_e$ the cost of an automated mistake. This only works if confidence is **calibrated**; otherwise the threshold means nothing.

**Design details that matter**:
- Reviewer capacity is a hard constraint; size the queue and the SLA to it.
- Show the model's evidence and uncertainty, but guard against **automation bias** (reviewers over-trusting): inject known-answer audit items and track override rate.
- Corrections are labels: feed them back to retraining and evaluation (a **data flywheel**).
- Track automation rate, reviewer agreement, override rate, time per review and error rate on the auto path.

## Worked example

A document-classification model processes 10,000 items a day. A reviewer costs \$0.50 per item and is assumed to be correct; an automated error costs \$10.

With threshold 0.9, the model auto-handles 6,000 items at 99% accuracy. Reviewed: 4,000, costing \$2,000. Auto errors: $6{,}000 \times 0.01 = 60$, costing \$600. Total \$2,600.

With threshold 0.7, it auto-handles 8,500 items at 96% accuracy. Reviewed: 1,500, costing \$750. Auto errors: $8{,}500 \times 0.04 = 340$, costing \$3,400. Total \$4,150.

The stricter threshold wins (\$2,600 vs \$4,150) even though it automates less, because each error costs 20 times a review. If errors cost only \$1, the looser threshold would win (\$750 + \$340 = \$1,090 vs \$2,000 + \$60 = \$2,060). Always tie the threshold to the relative cost of errors versus reviews, and re-tune it when either changes.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Reviewers approve 99.5% of model suggestions. What is the main risk?",
  "options": [
    "The model is perfect",
    "Automation bias: reviewers may be rubber-stamping, so errors pass through",
    "The threshold is too high",
    "Review is too fast"
  ],
  "answer": 1,
  "explanation": "A near-100% approval rate can mean either a great model or an inattentive reviewer. Seed audit items with known errors to tell them apart."
}
```

```quiz
{
  "id": "q2",
  "question": "Errors become 10x more expensive relative to review cost. How should the auto-approve threshold move?",
  "options": [
    "Lower it to automate more",
    "Raise it, sending more items to humans",
    "Leave it unchanged",
    "Remove the threshold"
  ],
  "answer": 1,
  "explanation": "When automated mistakes cost more, the optimal point shifts toward more human review."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`preds` is a list of `(confidence, is_correct)` pairs, where `is_correct` is 1 or 0. Write `hitl_cost(preds, threshold, review_cost, error_cost)`: items with confidence >= threshold are automated (each wrong one costs `error_cost`); the rest are reviewed (each costs `review_cost`, assumed correct). Then write `best_threshold(preds, candidates, review_cost, error_cost)` returning the candidate with the lowest cost; on ties pick the highest threshold.",
  "starterCode": "def hitl_cost(preds, threshold, review_cost, error_cost):\n    pass\n\ndef best_threshold(preds, candidates, review_cost, error_cost):\n    pass\n\npreds = [(0.95, 1), (0.92, 1), (0.9, 1), (0.85, 0), (0.8, 1), (0.75, 1), (0.7, 0), (0.6, 1), (0.55, 0), (0.4, 0)]\nprint(hitl_cost(preds, 0.9, 1, 5))",
  "tests": "preds = [(0.95, 1), (0.92, 1), (0.9, 1), (0.85, 0), (0.8, 1), (0.75, 1), (0.7, 0), (0.6, 1), (0.55, 0), (0.4, 0)]\nassert hitl_cost(preds, 0.9, 1, 5) == 7\nassert hitl_cost(preds, 0.8, 1, 5) == 10\nassert hitl_cost(preds, 0.7, 1, 5) == 13\nassert hitl_cost(preds, 0.0, 1, 5) == 20\nassert hitl_cost(preds, 1.01, 1, 5) == 10\nassert best_threshold(preds, [0.5, 0.7, 0.8, 0.9], 1, 5) == 0.9\nassert best_threshold(preds, [0.5, 0.7, 0.8, 0.9], 1, 0.5) == 0.5\nassert best_threshold(preds, [0.9, 1.01], 1, 5) == 0.9",
  "solution": "def hitl_cost(preds, threshold, review_cost, error_cost):\n    cost = 0\n    for conf, ok in preds:\n        if conf >= threshold:\n            if not ok:\n                cost += error_cost\n        else:\n            cost += review_cost\n    return cost\n\ndef best_threshold(preds, candidates, review_cost, error_cost):\n    best, best_cost = None, None\n    for t in sorted(candidates, reverse=True):\n        c = hitl_cost(preds, t, review_cost, error_cost)\n        if best_cost is None or c < best_cost:\n            best, best_cost = t, c\n    return best",
  "hints": [
    "Loop once: if confidence >= threshold, add error_cost when wrong; otherwise add review_cost.",
    "Iterate candidates in descending order and replace the best only on a strictly lower cost to get the tie-break."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a human-in-the-loop flow for an AI that flags fraudulent transactions. 1,000 alerts a day, 20 analysts.'",
  "answer": "**1. Tiering by score**: very high risk (score at least 0.95) blocked automatically with an easy appeal; medium band queued for analysts; low band approved.\n\n**2. Capacity check**: 20 analysts × about 60 reviews a day = 1,200 reviews, so the review band must hold at most about 1,000 items a day. Tune thresholds so the queue fits, with a spillover rule (oldest first, or highest risk first).\n\n**3. Cost-based threshold**: minimize review cost plus expected fraud loss plus customer-friction cost of false blocks, using calibrated probabilities and transaction amount (high amounts always go to review).\n\n**4. Reviewer UX**: show top features, similar past cases and customer history; capture the decision and a reason code in one click.\n\n**5. Quality loop**: audit 5% of auto-approved and auto-blocked items; seed known cases to detect rubber-stamping; track override rate and reviewer agreement.\n\n**6. Flywheel**: analyst labels feed weekly retraining; monitor precision at the review band and drift in score distribution."
}
```

> [!TIP] Interview tips
> - Frame the threshold as minimizing review cost plus automated-error cost, and note it needs calibrated scores.
> - Check reviewer capacity as a hard constraint and mention automation bias with audit items.
> - Close the loop: reviewer corrections become training and evaluation data.
