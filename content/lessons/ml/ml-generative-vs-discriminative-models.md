---
id: ml-generative-vs-discriminative-models
title: Generative vs discriminative models
estimatedMinutes: 10
difficulty: medium
tags: [ml, fundamentals, probabilistic-models, theory]
---

## Why it matters
"Naive Bayes vs logistic regression?" is a classic question, and the generative/discriminative distinction also frames modern generative AI. Knowing what each models helps you choose with small data, missing features, or when you need to generate samples.

## Concept
- **Discriminative models** learn $P(y \mid x)$ directly, or just a decision boundary. Examples: logistic regression, SVMs, decision trees, most neural classifiers.
- **Generative models** learn how the data is produced: $P(x \mid y)$ and $P(y)$ (or $P(x, y)$, or just $P(x)$). Classify with Bayes' rule:

$$
P(y \mid x) = \frac{P(x \mid y) P(y)}{P(x)}
$$

Examples: Naive Bayes, Gaussian discriminant analysis (LDA/QDA), Hidden Markov Models, Gaussian mixtures, and deep generative models (VAEs, GANs, diffusion models, autoregressive LLMs, which model $P(x)$ token by token).

Tradeoffs:
- Discriminative models usually achieve **lower error with lots of data**: they spend capacity only on the boundary.
- Generative models can **learn faster with little data** (when their assumptions roughly hold), handle **missing features** by marginalizing, can **generate** new samples, and support anomaly detection via low $P(x)$.
- Classic result (Ng & Jordan): Naive Bayes reaches its (higher) asymptotic error with fewer samples than logistic regression.

## Worked example
Spam filtering with 200 labeled emails: Naive Bayes, which estimates word frequencies per class, often beats logistic regression. With 2 million emails, logistic regression (or a neural classifier) typically wins because it doesn't rely on the independence assumption.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which of these is a discriminative model?",
  "options": ["Naive Bayes", "Gaussian mixture model", "Logistic regression", "Hidden Markov Model"],
  "answer": 2,
  "explanation": "Logistic regression models P(y | x) directly. The others model how x is generated."
}
```

```quiz
{
  "id": "q2",
  "question": "When might you prefer a generative classifier?",
  "options": ["When you have huge labeled datasets and only care about accuracy", "When data is scarce, features are often missing, or you also need to sample or detect unusual inputs", "When features are highly correlated", "Never; discriminative models always win"],
  "answer": 1,
  "explanation": "Generative models use structure (P(x|y)) that helps with small data, missing values and novelty detection."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `posterior(priors, likelihoods)` for a generative classifier: `priors` maps class → P(y), `likelihoods` maps class → P(x | y) for the observed x. Return a dict class → P(y | x) using Bayes' rule.",
  "starterCode": "def posterior(priors, likelihoods):\n    pass\n\nprint(posterior({'spam': 0.2, 'ham': 0.8}, {'spam': 0.05, 'ham': 0.005}))",
  "tests": "p = posterior({'spam': 0.2, 'ham': 0.8}, {'spam': 0.05, 'ham': 0.005})\nassert abs(p['spam'] - 0.01 / 0.014) < 1e-12\nassert abs(sum(p.values()) - 1) < 1e-12\np = posterior({'a': 0.5, 'b': 0.5}, {'a': 0.3, 'b': 0.3})\nassert abs(p['a'] - 0.5) < 1e-12",
  "solution": "def posterior(priors, likelihoods):\n    joint = {c: priors[c] * likelihoods[c] for c in priors}\n    evidence = sum(joint.values())\n    return {c: v / evidence for c, v in joint.items()}",
  "hints": ["Joint = prior × likelihood for each class.", "Divide by the sum of joints, which is P(x)."]
}
```

> [!TIP] Interview tips
> - One line each: discriminative = $P(y \mid x)$ / boundary; generative = $P(x \mid y)P(y)$ or $P(x)$.
> - Mention the small-data vs large-data tradeoff (Ng & Jordan) for Naive Bayes vs logistic regression.
> - Connect to GenAI: LLMs and diffusion models are generative models of $P(x)$.
