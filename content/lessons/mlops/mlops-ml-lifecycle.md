---
id: mlops-ml-lifecycle
title: ML Lifecycle
estimatedMinutes: 10
difficulty: easy
tags: [mlops, lifecycle, monitoring, drift]
---

## Why it matters
Interviewers want to know you can ship and *keep* a model working, not just fit one in a notebook. Most production ML failures come from data and process, not algorithms.

## Concept
The ML lifecycle is a loop, not a line:

1. **Scope**: define the business metric, the decision the model drives, and a baseline (rules or heuristics).
2. **Data**: collect, label, validate, split (by time when the future matters), and version it.
3. **Develop**: features, training, evaluation, error analysis, experiment tracking.
4. **Deploy**: package the model, pick a serving mode (batch, online, streaming), roll out via shadow, canary or A/B test.
5. **Monitor**: service health (latency, errors), data quality, drift, and business and model metrics.
6. **Retrain / retire**: on a schedule, on a trigger, or when monitoring shows decay. Then back to step 2.

**Why models decay**:
- **Data drift** (covariate shift): $P(X)$ changes, e.g. a new user segment.
- **Concept drift**: $P(Y \mid X)$ changes, e.g. fraudsters adapt.
- **Upstream breaks**: a schema change or a null-filled column.
- **Training-serving skew**: features computed differently offline and online. A feature store or shared transformation code prevents it.

**Detecting drift**: compare a reference window with a live window per feature using the **Population Stability Index**, $\text{PSI} = \sum_i (a_i - e_i)\ln(a_i / e_i)$ over bins, where $e_i$ and $a_i$ are the expected and actual bin fractions. Rules of thumb: $<0.1$ stable, $0.1$ to $0.25$ moderate, $>0.25$ major shift. KS test and Jensen-Shannon divergence are alternatives.

**Labels arrive late** (a churn label takes 30 days), so monitor input drift and proxy metrics first, and ground-truth metrics once labels land.

**Maturity levels**: manual notebooks, then automated training pipelines (continuous training), then CI/CD for the pipeline itself.

## Worked example
A loan-default model was trained on applicants whose income bins were 50/30/20% (low/mid/high). This month the live mix is 30/30/40%.

$$\text{PSI} = (0.30-0.50)\ln\tfrac{0.30}{0.50} + 0 + (0.40-0.20)\ln\tfrac{0.40}{0.20} = 0.1022 + 0.1386 \approx 0.24$$

That is at the edge of a major shift, so alert the owner, inspect the segment change, and check performance on newly labeled data before deciding whether to retrain.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Click-through behaviour changes after a UI redesign even though user demographics are unchanged. Which drift is this?",
  "options": ["Data (covariate) drift", "Concept drift", "Training-serving skew", "Label leakage"],
  "answer": 1,
  "explanation": "The relationship $P(Y \\mid X)$ changed while $P(X)$ did not, which is concept drift."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is monitoring only accuracy insufficient in production?",
  "options": ["Accuracy is not differentiable", "Labels often arrive late, so input drift and data-quality checks give earlier warning", "Accuracy cannot be logged", "Drift never affects accuracy"],
  "answer": 1,
  "explanation": "Ground truth lags, so you need leading indicators such as feature distributions and prediction distributions."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `psi(expected, actual)` for two lists of bin fractions (each sums to 1) using the formula above; skip bins where both are 0 and clip fractions below `1e-4` up to `1e-4` to avoid log(0). Then write `drift_status(psi_value)` returning `'stable'` (< 0.1), `'moderate'` (0.1 to 0.25 inclusive), or `'major'` (> 0.25).",
  "starterCode": "import math\n\ndef psi(expected, actual):\n    pass\n\ndef drift_status(psi_value):\n    pass\n\nprint(psi([0.5, 0.3, 0.2], [0.3, 0.3, 0.4]))",
  "tests": "import math\nv = psi([0.5, 0.3, 0.2], [0.3, 0.3, 0.4])\nassert abs(v - ((-0.2) * math.log(0.6) + 0.2 * math.log(2))) < 1e-9\nassert abs(psi([0.25, 0.75], [0.25, 0.75])) < 1e-12\nassert psi([0.0, 1.0], [0.0, 1.0]) == 0\nassert psi([1.0, 0.0], [0.5, 0.5]) > 1\nassert drift_status(0.05) == 'stable'\nassert drift_status(0.1) == 'moderate'\nassert drift_status(0.25) == 'moderate'\nassert drift_status(0.2501) == 'major'",
  "solution": "import math\n\ndef psi(expected, actual):\n    total = 0.0\n    for e, a in zip(expected, actual):\n        if e == 0 and a == 0:\n            continue\n        e = max(e, 1e-4)\n        a = max(a, 1e-4)\n        total += (a - e) * math.log(a / e)\n    return total\n\ndef drift_status(psi_value):\n    if psi_value < 0.1:\n        return 'stable'\n    if psi_value <= 0.25:\n        return 'moderate'\n    return 'major'",
  "hints": ["Clip each fraction with max(x, 1e-4) before taking the log.", "Identical distributions give PSI = 0."]
}
```

> [!TIP] Interview tips
> - Describe the lifecycle as a loop and say where you would put automation: validation, retraining triggers and rollbacks.
> - Distinguish data drift, concept drift and training-serving skew, and name one detector for each (PSI/KS, performance on fresh labels, feature parity tests).
> - Pitfall: retraining blindly on drifted or corrupted data can make things worse; gate retrains with validation against a champion model.
