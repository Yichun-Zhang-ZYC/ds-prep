---
id: ml-calibration
title: Calibration
estimatedMinutes: 10
difficulty: medium
tags: [ml, evaluation, probabilities, calibration]
---

## Why it matters
If a model says "30% chance of churn", do 30% of those users actually churn? Calibrated probabilities are essential for expected-value decisions, ad bidding, risk pricing and combining models. Interviewers ask how to measure and fix calibration.

## Concept
A model is **calibrated** if, among all predictions of $p$, the event happens a fraction $p$ of the time: $P(Y = 1 \mid \hat p = p) = p$.

**Measure it**:
- **Reliability diagram**: bin predictions (e.g. 10 bins), plot mean predicted probability vs observed positive rate per bin. Perfect calibration lies on the diagonal.
- **Expected Calibration Error (ECE)**: $\sum_b \frac{n_b}{n}\,|\text{acc}_b - \text{conf}_b|$, the weighted average gap across bins.
- Proper scoring rules (log loss, Brier) reward calibration and ranking together.

**Typical miscalibration**: Naive Bayes and boosted trees are often pushed toward extremes or squashed toward the middle; deep nets tend to be overconfident; random forests rarely predict near 0 or 1; **resampling or class weights** shift probabilities toward the minority class.

**Fix it** (fit on a held-out calibration set, not the training data):
- **Platt scaling**: fit a logistic regression on the model's score: $p = \sigma(a s + b)$. Good for small data and sigmoid-shaped distortions.
- **Isotonic regression**: a monotone, piecewise-constant mapping. More flexible; needs more data (≈ 1,000+ points) or it overfits.
- **Temperature scaling** (neural nets): divide logits by $T$ learned on validation data.
- **Prior correction** after undersampling negatives at rate $\beta$: $p = \dfrac{\beta p_s}{\beta p_s - p_s + 1}$.

Calibration doesn't change ranking (for monotone maps), so ROC-AUC stays the same.

## Worked example
A fraud model trained on 50/50 undersampled data predicts 0.5 for a transaction. Negatives were kept at rate $\beta = 0.01$. Corrected: $0.01 \cdot 0.5 / (0.01 \cdot 0.5 - 0.5 + 1) = 0.005/0.505 \approx 0.0099$, about 1%, not 50%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Applying isotonic regression to calibrate a model will typically change which metric the least?",
  "options": ["Log loss", "Brier score", "ROC-AUC", "Expected calibration error"],
  "answer": 2,
  "explanation": "Monotone recalibration preserves the ranking (ties aside), so ROC-AUC is essentially unchanged."
}
```

```quiz
{
  "id": "q2",
  "question": "Why fit the calibrator on a separate held-out set?",
  "options": ["It's faster", "On training data the model's scores are overconfident, so the calibrator would learn the wrong mapping", "Calibrators need categorical data", "To change the ranking"],
  "answer": 1,
  "explanation": "The calibration map must reflect how the model behaves on unseen data."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `reliability_bins(y, p, n_bins)` that splits [0, 1] into equal-width bins (p = 1.0 goes in the last bin) and returns a list of `(mean_p, frac_pos, count)` for non-empty bins in order. Then write `ece(y, p, n_bins)` = Σ (count/n) · |frac_pos − mean_p|. Finally `undersample_correct(p_s, beta)` applies the prior correction formula.",
  "starterCode": "def reliability_bins(y, p, n_bins):\n    pass\n\ndef ece(y, p, n_bins):\n    pass\n\ndef undersample_correct(p_s, beta):\n    pass\n\ny = [0, 0, 1, 1, 1, 0]\np = [0.1, 0.2, 0.8, 0.9, 0.7, 0.6]\nprint(reliability_bins(y, p, 2), ece(y, p, 2), undersample_correct(0.5, 0.01))",
  "tests": "y = [0, 0, 1, 1, 1, 0]\np = [0.1, 0.2, 0.8, 0.9, 0.7, 0.6]\nb = reliability_bins(y, p, 2)\nassert len(b) == 2 and b[0][2] == 2 and b[1][2] == 4\nassert abs(b[0][0] - 0.15) < 1e-12 and b[0][1] == 0\nassert abs(b[1][0] - 0.75) < 1e-12 and abs(b[1][1] - 0.75) < 1e-12\nassert abs(ece(y, p, 2) - (2 / 6) * 0.15) < 1e-12\nassert reliability_bins([1], [1.0], 10)[0][2] == 1\nassert abs(undersample_correct(0.5, 0.01) - 0.005 / 0.505) < 1e-12\nassert abs(undersample_correct(0.3, 1.0) - 0.3) < 1e-12",
  "solution": "def reliability_bins(y, p, n_bins):\n    groups = [[] for _ in range(n_bins)]\n    for yi, pi in zip(y, p):\n        b = min(int(pi * n_bins), n_bins - 1)\n        groups[b].append((yi, pi))\n    out = []\n    for g in groups:\n        if g:\n            out.append((sum(pi for _, pi in g) / len(g), sum(yi for yi, _ in g) / len(g), len(g)))\n    return out\n\ndef ece(y, p, n_bins):\n    n = len(y)\n    return sum(c / n * abs(fp - mp) for mp, fp, c in reliability_bins(y, p, n_bins))\n\ndef undersample_correct(p_s, beta):\n    return beta * p_s / (beta * p_s - p_s + 1)",
  "hints": ["Bin index = min(int(p · n_bins), n_bins − 1).", "With β = 1 (no undersampling), the correction is the identity."]
}
```

> [!TIP] Interview tips
> - Distinguish ranking (AUC) from calibration (reliability diagram, ECE, Brier).
> - Name Platt vs isotonic (small vs large calibration sets) and fit on held-out data.
> - Remember resampling breaks calibration; correct the prior or recalibrate before using probabilities.
