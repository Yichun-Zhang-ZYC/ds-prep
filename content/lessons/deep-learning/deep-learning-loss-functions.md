---
id: deep-learning-loss-functions
title: Loss functions
estimatedMinutes: 10
difficulty: medium
tags: [deep-learning, loss, cross-entropy, huber]
---

## Why it matters
The loss defines what the network optimizes. Interviewers ask why cross-entropy rather than MSE for classification, when to use Huber/MAE, and how to compute softmax cross-entropy stably.

## Concept
**Regression**
- **MSE** $\frac1n\sum (\hat y - y)^2$: Gaussian-noise MLE, penalizes outliers heavily, predicts the conditional mean.
- **MAE** $\frac1n\sum |\hat y - y|$: Laplace MLE, robust, predicts the conditional median; gradient has constant magnitude and is undefined at 0.
- **Huber**: quadratic for $|r|\le\delta$, linear beyond: $\delta(|r| - \delta/2)$. MSE's smoothness near 0, MAE's robustness in the tails.

**Classification**
- **Binary cross-entropy (BCE)**: $-[y\log p + (1-y)\log(1-p)]$, with $p = \sigma(z)$. The gradient w.r.t. the logit is $p - y$.
- **Categorical cross-entropy**: $-\log p_{\text{true}}$ with $p = \text{softmax}(z)$; gradient w.r.t. logits is $p - \text{onehot}$.
- Cross-entropy is the negative log-likelihood of the labels, a proper scoring rule, and keeps the problem convex for logistic regression.
- **Why not MSE for classification**: with a sigmoid output the MSE gradient is $(p-y)\,p(1-p)$, which vanishes when the model is confidently *wrong*. BCE's $p - y$ does not.
- **Numerical stability**: compute from logits with log-sum-exp, $\log\sum e^{z_j} = m + \log\sum e^{z_j - m}$ ($m=\max z$), never $\log(\text{softmax}(z))$ naively (`BCEWithLogitsLoss`, `CrossEntropyLoss` do this).

**Variants worth naming**: label smoothing (soft targets, curbs overconfidence), focal loss $-(1-p_t)^\gamma\log p_t$ (down-weights easy examples for class imbalance), class weights, hinge loss (SVM), contrastive/triplet losses (embeddings), KL divergence (distillation, VAEs).

## Worked example
Logits $z = [2, 1, 0]$, true class 0.

Softmax: $e^z = [7.389, 2.718, 1]$, sum $= 11.107$, so $p = [0.6652, 0.2447, 0.0900]$.

CE loss $= -\ln 0.6652 = 0.4076$. Gradient w.r.t. logits $= p - \text{onehot} = [-0.3348,\ 0.2447,\ 0.0900]$ (sums to 0).

**MSE vs BCE on a confidently wrong prediction**: $y=1$, logit $z=-4$, so $p = \sigma(-4) = 0.0180$.
- BCE gradient w.r.t. $z$: $p - y = -0.982$.
- MSE ($\tfrac12(p-y)^2$) gradient: $(p-y)\,p(1-p) = -0.982 \times 0.0180 \times 0.982 = -0.0173$.

MSE's gradient is ~57x smaller exactly when the model needs the most correction.

Huber with $\delta=1$: residual 0.5 gives $0.5\cdot0.25 = 0.125$; residual 3 gives $1\cdot(3 - 0.5) = 2.5$ (MSE would give 4.5).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is cross-entropy preferred over MSE for a sigmoid classifier?",
  "options": ["MSE cannot be computed on probabilities", "Cross-entropy is faster to compute", "MSE gradients vanish when the sigmoid saturates on a wrong prediction, while cross-entropy gives $p-y$", "Cross-entropy has no hyperparameters"],
  "answer": 2,
  "explanation": "With MSE the gradient carries a factor $p(1-p)$ that is near 0 for confident mistakes; cross-entropy cancels it."
}
```

```quiz
{
  "id": "q2",
  "question": "Your regression targets contain occasional huge outliers. Which loss is the most sensible start?",
  "options": ["MSE", "Huber", "Hinge", "Cross-entropy"],
  "answer": 1,
  "explanation": "Huber is quadratic near 0 (smooth optimization) but linear for large residuals, limiting outlier influence. MSE is dominated by outliers."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (pure Python) `mse(y, yhat)`, `huber(y, yhat, delta=1.0)` (mean Huber loss), `bce(y, p, eps=1e-12)` (mean binary cross-entropy, clipping p to [eps, 1-eps]), `cross_entropy_from_logits(logits, target)` for one example using the log-sum-exp trick, and `softmax_ce_grad(logits, target)` returning the gradient w.r.t. the logits.",
  "starterCode": "import math\n\ndef mse(y, yhat):\n    pass\n\ndef huber(y, yhat, delta=1.0):\n    pass\n\ndef bce(y, p, eps=1e-12):\n    pass\n\ndef cross_entropy_from_logits(logits, target):\n    pass\n\ndef softmax_ce_grad(logits, target):\n    pass\n\nprint(cross_entropy_from_logits([2, 1, 0], 0), softmax_ce_grad([2, 1, 0], 0))",
  "tests": "assert abs(mse([1, 2], [2, 4]) - 2.5) < 1e-12\nassert abs(huber([0, 0], [0.5, 3]) - (0.125 + 2.5) / 2) < 1e-12\nassert abs(bce([1, 0], [0.9, 0.2]) - (-math.log(0.9) - math.log(0.8)) / 2) < 1e-12\nassert bce([1], [0.0]) > 20\nassert abs(cross_entropy_from_logits([2, 1, 0], 0) - 0.40760596) < 1e-6\nassert abs(cross_entropy_from_logits([1000, 0], 0)) < 1e-9\nassert abs(cross_entropy_from_logits([1000, 0], 1) - 1000) < 1e-9\ng = softmax_ce_grad([2, 1, 0], 0)\nassert abs(sum(g)) < 1e-12\nassert abs(g[0] + 0.33475904) < 1e-6 and abs(g[1] - 0.24472847) < 1e-6 and abs(g[2] - 0.09003057) < 1e-6",
  "solution": "import math\n\ndef mse(y, yhat):\n    return sum((a - b) ** 2 for a, b in zip(y, yhat)) / len(y)\n\ndef huber(y, yhat, delta=1.0):\n    tot = 0.0\n    for a, b in zip(y, yhat):\n        r = abs(a - b)\n        tot += 0.5 * r * r if r <= delta else delta * (r - 0.5 * delta)\n    return tot / len(y)\n\ndef bce(y, p, eps=1e-12):\n    tot = 0.0\n    for a, b in zip(y, p):\n        b = min(max(b, eps), 1 - eps)\n        tot -= a * math.log(b) + (1 - a) * math.log(1 - b)\n    return tot / len(y)\n\ndef cross_entropy_from_logits(logits, target):\n    m = max(logits)\n    lse = m + math.log(sum(math.exp(z - m) for z in logits))\n    return lse - logits[target]\n\ndef softmax_ce_grad(logits, target):\n    m = max(logits)\n    es = [math.exp(z - m) for z in logits]\n    t = sum(es)\n    g = [e / t for e in es]\n    g[target] -= 1\n    return g",
  "hints": ["log-sum-exp: m = max(logits); lse = m + log(sum(exp(z - m))). Loss = lse - logits[target].", "Gradient = softmax(logits) with 1 subtracted at the target index."]
}
```

> [!TIP] Interview tips
> - State the probabilistic view: MSE = Gaussian MLE, MAE = Laplace MLE, cross-entropy = Bernoulli/categorical MLE.
> - Know the clean gradient $p - y$ for softmax/sigmoid + cross-entropy, and why MSE is a poor fit for classification.
> - Mention stability (log-sum-exp, loss from logits) and imbalance remedies (class weights, focal loss).
