---
id: ml-log-loss
title: Log loss
estimatedMinutes: 10
difficulty: medium
tags: [ml, evaluation, classification, probabilities]
---

## Why it matters
When decisions use predicted probabilities (bidding, pricing, risk), you need a metric that rewards **good probabilities**, not just good rankings. Log loss is that metric and also the training loss of most classifiers.

## Concept
Binary log loss (cross-entropy) for predicted probabilities $p_i$:

$$
\text{LogLoss} = -\frac{1}{n}\sum_{i=1}^{n}\big[y_i \log p_i + (1 - y_i)\log(1 - p_i)\big]
$$

Multiclass: $-\frac{1}{n}\sum_i \log p_{i, y_i}$, the negative log probability assigned to the true class.

Properties:
- It's a **proper scoring rule**: expected loss is minimized by reporting the true probability, so it rewards calibration.
- **Confident mistakes are punished hard**: predicting 0.99 for a negative costs $-\log(0.01) \approx 4.6$, while predicting 0.6 costs about 0.92. As $p \to 0$ for a positive, the loss → ∞, so clip probabilities (e.g. to $[10^{-15}, 1 - 10^{-15}]$).
- Baseline: predicting the base rate $\pi$ for everyone gives $-[\pi\log\pi + (1-\pi)\log(1-\pi)]$ (the entropy). Compare models against this.
- Lower is better; it isn't bounded above and isn't as intuitive as accuracy, so pair it with a calibration plot.

**Brier score** $= \frac{1}{n}\sum(p_i - y_i)^2$ is another proper scoring rule; it's bounded in [0, 1] and less harsh on confident errors.

## Worked example
Three predictions: (y=1, p=0.9), (y=0, p=0.2), (y=1, p=0.4). Losses: $-\ln 0.9 = 0.105$, $-\ln 0.8 = 0.223$, $-\ln 0.4 = 0.916$. Mean ≈ 0.415. The single under-confident positive contributes most of the loss.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two models have the same ROC-AUC, but model A has much lower log loss. What does that suggest?",
  "options": ["A ranks better", "A's probabilities are better calibrated / less overconfident", "A has higher accuracy", "Nothing; they're equivalent"],
  "answer": 1,
  "explanation": "Same ranking quality, but A's probability values are closer to reality."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `log_loss(y, p, eps=1e-15)` (clip probabilities to [eps, 1 − eps], natural log), `baseline_log_loss(y)` that predicts the mean of y for everyone, and `brier(y, p)`.",
  "starterCode": "import math\n\ndef log_loss(y, p, eps=1e-15):\n    pass\n\ndef baseline_log_loss(y):\n    pass\n\ndef brier(y, p):\n    pass\n\nprint(log_loss([1, 0, 1], [0.9, 0.2, 0.4]), baseline_log_loss([1, 0, 1]), brier([1, 0, 1], [0.9, 0.2, 0.4]))",
  "tests": "import math\nexp = -(math.log(0.9) + math.log(0.8) + math.log(0.4)) / 3\nassert abs(log_loss([1, 0, 1], [0.9, 0.2, 0.4]) - exp) < 1e-12\nassert log_loss([1], [0.0]) < 40\nassert abs(baseline_log_loss([1, 0, 1, 0]) - math.log(2)) < 1e-12\nassert abs(brier([1, 0, 1], [0.9, 0.2, 0.4]) - (0.01 + 0.04 + 0.36) / 3) < 1e-12",
  "solution": "import math\n\ndef log_loss(y, p, eps=1e-15):\n    total = 0.0\n    for yi, pi in zip(y, p):\n        pi = min(max(pi, eps), 1 - eps)\n        total += -(yi * math.log(pi) + (1 - yi) * math.log(1 - pi))\n    return total / len(y)\n\ndef baseline_log_loss(y):\n    rate = sum(y) / len(y)\n    return log_loss(y, [rate] * len(y))\n\ndef brier(y, p):\n    return sum((pi - yi) ** 2 for yi, pi in zip(y, p)) / len(y)",
  "hints": ["Clip before taking the log so p = 0 or 1 doesn't crash.", "The baseline with a 50% rate is ln 2 ≈ 0.693."]
}
```

> [!TIP] Interview tips
> - Use log loss when probabilities feed decisions; AUC only measures ranking.
> - Mention clipping, the base-rate baseline, and that confident errors dominate.
> - Know the Brier score as a bounded alternative.
