---
id: ml-system-design-offline-evaluation
title: Offline evaluation
estimatedMinutes: 12
difficulty: medium
tags: [ml-system-design, framework, evaluation, ranking]
---

## Why it matters
Offline evaluation is your fast, cheap filter before an expensive A/B test. Interviewers check that you split data without leakage, choose metrics that match the task, look at slices and uncertainty, and know why offline gains often fail to transfer online.

## Concept
**Splits**
- **Temporal split** (train on the past, validate and test on the future) for anything with time or feedback loops. Random splits leak.
- **Group split** by user/session/merchant when entities repeat, so test entities are unseen.
- Keep a final **test set** untouched; tune on validation. For small data use (time-series / grouped) cross-validation.
- Mirror serving: the same candidate set, features and delays you will have in production.

**Metrics by task**
- Classification: PR-AUC, precision/recall at the operating threshold, cost-weighted metrics, calibration.
- Ranking: NDCG@k with graded gains, $\text{DCG@}k = \sum_{i=1}^{k} \frac{2^{rel_i} - 1}{\log_2(i+1)}$ and $\text{NDCG@}k = \text{DCG@}k / \text{IDCG@}k$; also MRR, MAP, Recall@k for retrieval.
- Regression/forecasting: MAE, RMSE, MAPE/sMAPE, quantile loss.

**Go beyond one number**
- **Slices**: per country, new vs returning users, device, item popularity (head vs tail). Average gains can hide regressions on a key segment.
- **Uncertainty**: bootstrap confidence intervals; ignore gains smaller than the noise.
- **Error analysis**: inspect the worst mistakes and cluster them.
- **Robustness**: stress tests, adversarial or edge cases, fairness metrics across groups.

**Why offline differs from online**: feedback loops and position bias (logged data reflect the old model), changed user behaviour, latency effects, and metric proxies. For policy changes use **counterfactual estimators** (inverse propensity scoring, doubly robust) on randomised logs. Treat offline results as a gate, and the A/B test as the truth.

## Worked example
Ranking of 3 items with graded relevance (0-3). The model orders them with true relevances $[2, 3, 0]$; the ideal order is $[3, 2, 0]$.
- DCG@3 $= \frac{2^2-1}{\log_2 2} + \frac{2^3-1}{\log_2 3} + 0 = 3 + \frac{7}{1.585} \approx 3 + 4.417 = 7.417$.
- IDCG@3 $= \frac{7}{1} + \frac{3}{1.585} \approx 7 + 1.893 = 8.893$.
- NDCG@3 $\approx 7.417/8.893 = 0.834$.

Slices: overall accuracy 91% looks fine, but new users (10% of traffic) are at 78% and returning users at 92.4%: $0.1 \times 78 + 0.9 \times 92.4 = 90.96$. The cold-start segment is the problem the average hides.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You predict next-week purchases with a random 80/20 row split of 12 months of user logs. What is the main issue?",
  "options": ["The test set is too small", "Future data and the same users appear in training, inflating offline results", "The split is not stratified", "Accuracy is the wrong metric"],
  "answer": 1,
  "explanation": "Random splits leak temporal and user-level information; use a time-based (and user-grouped) split."
}
```

```quiz
{
  "id": "q2",
  "question": "Offline NDCG improved 3% but the A/B test shows no lift. Which is a plausible cause?",
  "options": ["NDCG cannot be improved", "Offline labels come from the old model's exposure, so the offline metric is biased toward it", "The test used too many users", "The model was too well calibrated"],
  "answer": 1,
  "explanation": "Logged feedback only covers items the old system showed (exposure and position bias), so offline gains may not transfer."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ndcg_at_k(rels, k)` for graded relevances listed in ranked order, using gain 2^rel − 1 and discount log2(i + 1) for 1-based position i; IDCG sorts all `rels` descending and truncates to k; return 0.0 if IDCG is 0. Write `temporal_split(rows, cutoff)` where each row is a tuple starting with a timestamp: train has timestamp < cutoff, test has timestamp >= cutoff. Write `slice_accuracy(y_true, y_pred, slices)` returning a dict slice → accuracy.",
  "starterCode": "import math\n\ndef ndcg_at_k(rels, k):\n    pass\n\ndef temporal_split(rows, cutoff):\n    pass\n\ndef slice_accuracy(y_true, y_pred, slices):\n    pass\n",
  "tests": "assert abs(ndcg_at_k([2, 3, 0], 3) - 0.8339912323981488) < 1e-9\nassert abs(ndcg_at_k([3, 2, 0], 3) - 1.0) < 1e-12\nassert ndcg_at_k([0, 0], 2) == 0.0\nassert abs(ndcg_at_k([0, 1, 3], 1) - 0.0) < 1e-12\ntr, te = temporal_split([(5, 'a'), (1, 'b'), (9, 'c'), (7, 'd')], 7)\nassert sorted(tr) == [(1, 'b'), (5, 'a')]\nassert sorted(te) == [(7, 'd'), (9, 'c')]\nr = slice_accuracy([1, 0, 1, 1], [1, 0, 0, 1], ['new', 'new', 'old', 'old'])\nassert r == {'new': 1.0, 'old': 0.5}",
  "solution": "import math\n\ndef ndcg_at_k(rels, k):\n    def dcg(r):\n        return sum((2 ** x - 1) / math.log2(i + 2) for i, x in enumerate(r[:k]))\n    ideal = dcg(sorted(rels, reverse=True))\n    return dcg(rels) / ideal if ideal > 0 else 0.0\n\ndef temporal_split(rows, cutoff):\n    train = [r for r in rows if r[0] < cutoff]\n    test = [r for r in rows if r[0] >= cutoff]\n    return train, test\n\ndef slice_accuracy(y_true, y_pred, slices):\n    tot, ok = {}, {}\n    for t, p, s in zip(y_true, y_pred, slices):\n        tot[s] = tot.get(s, 0) + 1\n        ok[s] = ok.get(s, 0) + (t == p)\n    return {s: ok[s] / tot[s] for s in tot}",
  "hints": ["With 0-based enumerate, the discount is log2(i + 2).", "Count total and correct per slice in two dicts."]
}
```

> [!TIP] Interview tips
> - Say "temporal split, grouped by user" before anything else; it signals you know leakage.
> - Report slices and confidence intervals, not just one headline number.
> - Explain why offline can mislead (exposure bias, feedback loops) and that the A/B test is the final judge.
