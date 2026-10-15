---
id: ml-naive-bayes
title: Naive Bayes
estimatedMinutes: 12
difficulty: easy
tags: [ml, supervised, classification, probabilistic-models, text]
---

## Why it matters
Naive Bayes is a fast, strong baseline for text classification (spam, sentiment, topic) and a favorite "implement it from scratch" interview question that checks your grasp of Bayes' rule and smoothing.

## Concept
Apply Bayes' rule with the **naive** assumption that features are conditionally independent given the class:

$$
P(y \mid x_1, \dots, x_d) \propto P(y) \prod_{j=1}^{d} P(x_j \mid y)
$$

Predict the class with the largest posterior. Work in **log space** to avoid underflow: $\log P(y) + \sum_j \log P(x_j \mid y)$.

Variants by feature type:
- **Multinomial NB**: word counts. $P(w \mid y) = \dfrac{\text{count}(w, y) + \alpha}{\text{total words in } y + \alpha |V|}$.
- **Bernoulli NB**: binary word presence/absence.
- **Gaussian NB**: continuous features, each modeled as a normal per class.

**Laplace (add-α) smoothing** prevents a word never seen in a class from zeroing out the whole product.

Strengths: trains in one pass, works with little data and huge vocabularies, handles many classes. Weaknesses: the independence assumption makes probabilities **poorly calibrated** (often pushed toward 0 or 1), even when the ranking is good; correlated features get double-counted.

## Worked example
Training: spam emails contain the words "free free win" (3 words), ham contains "meeting win" (2 words). Vocabulary = {free, win, meeting}, α = 1, priors 0.5 each. For the email "free":
- $P(\text{free} \mid \text{spam}) = (2 + 1)/(3 + 3) = 0.5$
- $P(\text{free} \mid \text{ham}) = (0 + 1)/(2 + 3) = 0.2$

Posterior spam $= 0.5 \cdot 0.5 / (0.5\cdot 0.5 + 0.5 \cdot 0.2) \approx 0.71$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is Laplace smoothing needed in Naive Bayes?",
  "options": ["To speed up training", "Without it, a word never seen with a class gets probability 0 and wipes out that class's posterior", "To make features independent", "To normalize document lengths"],
  "answer": 1,
  "explanation": "A single zero factor makes the whole product zero. Adding α keeps every probability positive."
}
```

```quiz
{
  "id": "q2",
  "question": "Naive Bayes ranks emails well but its probabilities are often near 0 or 1. Why?",
  "options": ["Too much smoothing", "The independence assumption double-counts correlated evidence, making posteriors overconfident", "It uses log space", "The priors are uniform"],
  "answer": 1,
  "explanation": "Correlated words are treated as independent evidence and multiplied together, exaggerating confidence. Calibrate if you need probabilities."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement multinomial Naive Bayes. `train_nb(docs, labels, alpha=1.0)` takes a list of token lists and labels and returns a model of your choice. `predict_nb(model, doc)` returns the most likely label, computing in log space. Ignore words not in the training vocabulary.",
  "starterCode": "import math\nfrom collections import Counter\n\ndef train_nb(docs, labels, alpha=1.0):\n    pass\n\ndef predict_nb(model, doc):\n    pass\n\ndocs = [['free', 'free', 'win'], ['meeting', 'win'], ['free', 'offer'], ['meeting', 'notes']]\nlabels = ['spam', 'ham', 'spam', 'ham']\nm = train_nb(docs, labels)\nprint(predict_nb(m, ['free', 'win']), predict_nb(m, ['meeting']))",
  "tests": "docs = [['free', 'free', 'win'], ['meeting', 'win'], ['free', 'offer'], ['meeting', 'notes']]\nlabels = ['spam', 'ham', 'spam', 'ham']\nm = train_nb(docs, labels)\nassert predict_nb(m, ['free', 'win']) == 'spam'\nassert predict_nb(m, ['meeting']) == 'ham'\nassert predict_nb(m, ['notes', 'win']) == 'ham'\nassert predict_nb(m, ['offer', 'unknownword']) == 'spam'\nm2 = train_nb([['a'], ['b'], ['b']], ['x', 'y', 'y'])\nassert predict_nb(m2, ['zzz']) == 'y'",
  "solution": "import math\nfrom collections import Counter\n\ndef train_nb(docs, labels, alpha=1.0):\n    classes = sorted(set(labels))\n    vocab = {w for d in docs for w in d}\n    prior = {c: math.log(labels.count(c) / len(labels)) for c in classes}\n    counts = {c: Counter() for c in classes}\n    for d, c in zip(docs, labels):\n        counts[c].update(d)\n    loglik = {}\n    for c in classes:\n        total = sum(counts[c].values())\n        loglik[c] = {w: math.log((counts[c][w] + alpha) / (total + alpha * len(vocab))) for w in vocab}\n    return {'classes': classes, 'prior': prior, 'loglik': loglik, 'vocab': vocab}\n\ndef predict_nb(model, doc):\n    def score(c):\n        return model['prior'][c] + sum(model['loglik'][c][w] for w in doc if w in model['vocab'])\n    return max(model['classes'], key=score)",
  "hints": ["Store log priors and log P(word | class) with add-α smoothing.", "An unknown-only document falls back to the prior: the majority class."]
}
```

> [!TIP] Interview tips
> - Write the formula, then say "naive = conditional independence given the class".
> - Always mention log space and Laplace smoothing; interviewers check for both.
> - Know the tradeoff: great baseline and ranking, poor calibration.
