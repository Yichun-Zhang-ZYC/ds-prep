---
id: ml-threshold-selection
title: Threshold selection
estimatedMinutes: 10
difficulty: medium
tags: [ml, evaluation, classification, decision-making]
---

## Why it matters
A classifier outputs scores; the business needs decisions. Defaulting to 0.5 is rarely right. Interviewers ask how you'd pick the threshold for fraud blocking, loan approval or alerting.

## Concept
Ways to choose a threshold $t$ (predict positive if $p \ge t$):

- **Cost-based** (best when costs are known): with calibrated probabilities, flag when the expected cost of not acting exceeds the cost of acting:
$$
p \cdot c_{FN} > (1 - p)\cdot c_{FP} \quad\Longrightarrow\quad t^* = \frac{c_{FP}}{c_{FP} + c_{FN}}
$$
  Missing fraud costs \$500, a false alarm \$5 → $t^* = 5/505 \approx 0.01$.
- **Constraint-based**: maximize recall subject to precision ≥ 90%, or fix the alert volume to team capacity (top 200 per day).
- **Metric-based**: maximize F1 or F$_\beta$, or Youden's J = TPR − FPR on the ROC curve.

Practical rules:
- Choose the threshold on a **validation set**, not the test set.
- The cost formula assumes **calibrated** probabilities; calibrate first if needed.
- If class balance shifts (resampled training data, seasonal fraud), the optimal threshold shifts too; re-check it periodically.
- Different segments can need different thresholds, but watch fairness constraints.

## Worked example
Validation results at three thresholds (1,000 loans, 100 defaults):

| t | TP | FP | Cost (FN \$1,000, FP \$100) |
|---|---|---|---|
| 0.3 | 85 | 200 | 15·1,000 + 200·100 = \$35,000 |
| 0.5 | 65 | 60 | 35·1,000 + 60·100 = \$41,000 |
| 0.7 | 40 | 20 | 60·1,000 + 20·100 = \$62,000 |

The lowest-cost threshold is 0.3, even though 0.5 has better precision. (Formula: $t^* = 100/1100 \approx 0.09$, so trying even lower values is worthwhile.)

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A false negative costs 9× a false positive. With calibrated probabilities, what threshold minimizes expected cost?",
  "options": ["0.9", "0.5", "0.1", "0.01"],
  "answer": 2,
  "explanation": "t* = c_FP / (c_FP + c_FN) = 1 / (1 + 9) = 0.1."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `cost_at(y, p, t, c_fp, c_fn)` returning the total cost when predicting positive for p ≥ t. Then write `best_threshold(y, p, c_fp, c_fn)` that tries every distinct score (plus `float('inf')`, meaning \"flag nothing\") as a threshold and returns the one with lowest cost (smallest threshold on ties).",
  "starterCode": "def cost_at(y, p, t, c_fp, c_fn):\n    pass\n\ndef best_threshold(y, p, c_fp, c_fn):\n    pass\n\ny = [1, 0, 1, 0, 0, 1, 0]\np = [0.9, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1]\nprint(best_threshold(y, p, 1, 10), best_threshold(y, p, 10, 1))",
  "tests": "y = [1, 0, 1, 0, 0, 1, 0]\np = [0.9, 0.7, 0.6, 0.4, 0.3, 0.2, 0.1]\nassert cost_at(y, p, 0.6, 1, 10) == 1 + 10\nassert best_threshold(y, p, 1, 10) == 0.2\nassert best_threshold(y, p, 10, 1) == 0.9\nassert best_threshold([0, 0], [0.5, 0.6], 1, 1) == float('inf')\nassert best_threshold(y, p, 1, 1) == 0.6",
  "solution": "def cost_at(y, p, t, c_fp, c_fn):\n    fp = sum(1 for yi, pi in zip(y, p) if pi >= t and yi == 0)\n    fn = sum(1 for yi, pi in zip(y, p) if pi < t and yi == 1)\n    return fp * c_fp + fn * c_fn\n\ndef best_threshold(y, p, c_fp, c_fn):\n    candidates = sorted(set(p)) + [float('inf')]\n    best_t, best_c = None, None\n    for t in candidates:\n        c = cost_at(y, p, t, c_fp, c_fn)\n        if best_c is None or c < best_c:\n            best_t, best_c = t, c\n    return best_t",
  "hints": ["Count FP (flagged negatives) and FN (unflagged positives).", "Scan candidates in ascending order and only replace on strictly lower cost."]
}
```

> [!TIP] Interview tips
> - Never default to 0.5; ask about costs and capacity first.
> - Give the formula $t^* = c_{FP}/(c_{FP} + c_{FN})$ and note it needs calibrated probabilities.
> - Pick the threshold on validation data and monitor it as base rates drift.
