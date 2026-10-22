---
id: math-entropy-cross-entropy
title: Entropy, cross-entropy
estimatedMinutes: 12
difficulty: medium
tags: [information-theory, entropy, cross-entropy, loss]
---

## Why it matters
Cross-entropy is the loss behind logistic regression, softmax classifiers and language models, and entropy underlies decision-tree splits. Interviewers ask you to define both, explain why minimizing cross-entropy equals maximum likelihood, and interpret values in bits or nats.

## Concept
**Entropy** of a distribution $p$ is the average surprise, the minimum average number of bits needed to encode samples from it:
$$H(p) = -\sum_x p(x) \log p(x)$$
Use $\log_2$ for bits, $\ln$ for nats; convention $0 \log 0 = 0$. It is maximal for the uniform distribution ($\log K$ for $K$ outcomes) and 0 for a deterministic one.

**Cross-entropy** is the average code length when samples come from $p$ but you encode with a code built for $q$:
$$H(p, q) = -\sum_x p(x) \log q(x) = H(p) + D_{KL}(p \,\|\, q) \ge H(p)$$

**In ML**: with a one-hot label $p$ (true class $y$), $H(p, q) = -\log q_y$: the **negative log-likelihood** of the true class. So minimizing cross-entropy loss is maximum likelihood. For binary labels this is log loss: $-[y \log \hat p + (1-y)\log(1-\hat p)]$.

**Related**: conditional entropy $H(Y \mid X)$, and the information gain used by decision trees $= H(\text{parent}) - \sum_k \frac{n_k}{n} H(\text{child}_k)$. **Perplexity** $= 2^{H}$ (or $e^{H}$ with nats) is the effective number of equally likely choices; language models report it.

## Worked example
Let $p = (0.5, 0.25, 0.25)$.

$H(p) = -(0.5 \log_2 0.5 + 2 \cdot 0.25 \log_2 0.25) = 0.5 + 1 = 1.5$ bits.

Encode with a uniform model $q = (1/3, 1/3, 1/3)$: $H(p, q) = \log_2 3 \approx 1.585$ bits. The extra $0.085$ bits per symbol is $D_{KL}(p \| q)$, the price of using the wrong model.

Classification: if the true class gets predicted probability 0.7, the loss is $-\ln 0.7 \approx 0.357$ nats; at 0.1 it is $-\ln 0.1 \approx 2.303$. The loss punishes confident wrong answers heavily and is unbounded as $q_y \to 0$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 4-class classifier outputs the uniform distribution for every example. What is its cross-entropy loss with one-hot labels, in bits?",
  "options": [
    "0",
    "1",
    "2",
    "4"
  ],
  "answer": 2,
  "explanation": "$-\\log_2(1/4) = 2$ bits, which is $H$ of the uniform distribution and the loss of a model that has learned nothing about 4 balanced classes."
}
```

```quiz
{
  "id": "q2",
  "question": "Which statement is true for any distributions $p, q$?",
  "options": [
    "$H(p, q) \\le H(p)$",
    "$H(p, q) \\ge H(p)$",
    "$H(p, q) = H(q, p)$",
    "$H(p, q) = 0$ when $p = q$"
  ],
  "answer": 1,
  "explanation": "$H(p, q) = H(p) + D_{KL}(p\\|q)$ and $D_{KL} \\ge 0$, so cross-entropy is minimized exactly when $q = p$. It is not symmetric, and at $q = p$ it equals $H(p)$, not 0."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `entropy(p, base=2)` and `cross_entropy(p, q, base=2)` for discrete distributions given as lists. Treat terms with $p_i = 0$ as 0. If $p_i > 0$ and $q_i = 0$, `cross_entropy` should return `float('inf')`. Then implement `perplexity(p, base=2)` $= \\text{base}^{H(p)}$.",
  "starterCode": "import math\n\ndef entropy(p, base=2):\n    pass\n\ndef cross_entropy(p, q, base=2):\n    pass\n\ndef perplexity(p, base=2):\n    pass\n\nprint(entropy([0.5, 0.25, 0.25]), cross_entropy([0.5, 0.25, 0.25], [1/3] * 3))",
  "tests": "import math\nassert abs(entropy([0.5, 0.25, 0.25]) - 1.5) < 1e-12\nassert abs(entropy([1.0, 0.0])) < 1e-12\nassert abs(entropy([0.25] * 4) - 2.0) < 1e-12\nassert abs(entropy([0.5, 0.5], base=math.e) - math.log(2)) < 1e-12\nassert abs(cross_entropy([0.5, 0.25, 0.25], [1/3] * 3) - math.log2(3)) < 1e-12\nassert abs(cross_entropy([1, 0], [0.7, 0.3], base=math.e) + math.log(0.7)) < 1e-12\nassert cross_entropy([0.5, 0.5], [1.0, 0.0]) == float('inf')\nassert abs(cross_entropy([0.0, 1.0], [0.5, 0.5]) - 1.0) < 1e-12\nassert abs(perplexity([0.25] * 4) - 4.0) < 1e-9",
  "solution": "import math\n\ndef entropy(p, base=2):\n    return -sum(pi * math.log(pi, base) for pi in p if pi > 0)\n\ndef cross_entropy(p, q, base=2):\n    total = 0.0\n    for pi, qi in zip(p, q):\n        if pi > 0:\n            if qi == 0:\n                return float('inf')\n            total -= pi * math.log(qi, base)\n    return total\n\ndef perplexity(p, base=2):\n    return base ** entropy(p, base)",
  "hints": [
    "`math.log(x, base)` handles any base; skip terms where p is 0 before taking the log.",
    "Return infinity as soon as a term has p > 0 but q = 0."
  ]
}
```

> [!TIP] Interview tips
> - Define $H(p, q) = H(p) + D_{KL}(p\|q)$ and say cross-entropy loss is the negative log-likelihood of the true class.
> - Know the reference points: uniform over $K$ classes gives $\ln K$ nats of loss (a quick sanity check for an untrained classifier).
> - Pitfall: log of 0. Clip probabilities or use log-softmax with logits for numerical stability.
