---
id: genai-eng-human-evaluation
title: "Human evaluation"
estimatedMinutes: 10
difficulty: medium
tags: [genai, evaluation, human-eval, agreement, kappa]
---

## Why it matters
Automatic metrics and LLM judges are proxies; humans are the ground truth for quality, safety and launch decisions. But human labels are costly and noisy. Interviewers ask how to design a reliable annotation process and how to quantify agreement.

## Concept
**When to use humans**: building and validating gold sets and judges, subjective qualities (tone, helpfulness, creativity), safety and policy review, high-stakes launch gates, and error analysis. Use automated evals for the rest and sample humans to keep them honest.

**Design**:
- **Rubric**: define each criterion with examples and edge cases; separate dimensions (correctness, helpfulness, harmlessness, style) rather than one "quality" score.
- **Format**: **pairwise preference** and binary or 3-5 point scales with anchors are more consistent than free 1-10 scales. Always randomize order and hide model identity (**blind**).
- **Annotators**: domain experts for specialized tasks; crowd workers for general ones. Train on a calibration set, include **gold questions** to catch inattentive raters, collect 2-3 labels per item, and **adjudicate** disagreements with an expert or majority vote.
- **Sampling**: stratified over slices and difficulty; budget the cost per label against the confidence interval you need.

**Inter-annotator agreement**:
- **Percent agreement**: simple but inflated by chance when classes are imbalanced.
- **Cohen's $\kappa$** (2 raters, nominal): $\kappa = \dfrac{p_o - p_e}{1 - p_e}$, with $p_o$ observed agreement and $p_e = \sum_c p_{1,c}\,p_{2,c}$ chance agreement from each rater's label marginals. Rough scale: $<0.2$ poor, $0.4$-$0.6$ moderate, $0.6$-$0.8$ substantial, $>0.8$ near-perfect.
- **Fleiss' $\kappa$** (many raters) and **Krippendorff's $\alpha$** (missing labels, ordinal/interval data).
- Low agreement usually means an ambiguous rubric, not bad raters; fix the guidelines first. Human-human agreement also caps how well any automatic judge can match "the truth".

**Ranking models**: from pairwise votes fit **Bradley-Terry** or **Elo** scores (as in chat arenas). Online signals (thumbs, edits, A/B test outcomes) complement offline human eval.

## Worked example
Two annotators label 100 answers pass/fail. Both pass 45; both fail 35; they disagree on 20 (10 each way). Observed agreement $p_o = (45 + 35)/100 = 0.80$.

Each rater passes $45 + 10 = 55$ items, so $P(\text{pass}) = 0.55$ and $P(\text{fail}) = 0.45$ for both. Chance agreement $p_e = 0.55^2 + 0.45^2 = 0.3025 + 0.2025 = 0.505$. Then $\kappa = (0.80 - 0.505)/(1 - 0.505) = 0.295/0.495 \approx 0.60$: moderate to substantial, even though raw agreement looks like a strong 80%. If the pass rate were 95% for both, chance agreement alone would be about 90%, which is why percent agreement misleads.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two raters agree on 90% of labels, but 95% of items are 'pass' for both. Why might kappa still be low?",
  "options": [
    "Kappa ignores agreement entirely",
    "Chance agreement is already about 90%, so little agreement is above chance",
    "Kappa only works for 3+ raters",
    "Kappa penalizes high pass rates"
  ],
  "answer": 1,
  "explanation": "With imbalanced classes, $p_e = 0.95^2 + 0.05^2 \\approx 0.905$, so $\\kappa \\approx (0.90-0.905)/0.095 \\approx 0$."
}
```

```quiz
{
  "id": "q2",
  "question": "Annotator agreement is low across all raters. What is the best first step?",
  "options": [
    "Fire the raters",
    "Clarify the rubric with examples and edge cases, then re-calibrate",
    "Average the scores and move on",
    "Switch to a bigger LLM judge"
  ],
  "answer": 1,
  "explanation": "Low agreement is most often a guideline problem. Fix definitions and train raters before collecting more labels."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `cohens_kappa(a, b)` for two equal-length label lists: $\\kappa = (p_o - p_e)/(1 - p_e)$ with $p_e = \\sum_c p_a(c)\\,p_b(c)$. If $p_e = 1$ (both raters always give the same single label) return 1.0. Then implement `majority_vote(labels_per_item)`: for each item (a list of labels from several raters) return the most common label, or `None` if two or more labels tie for the top count.",
  "starterCode": "def cohens_kappa(a, b):\n    pass\n\ndef majority_vote(labels_per_item):\n    pass\n\nprint(cohens_kappa(['p', 'f', 'p'], ['p', 'f', 'f']), majority_vote([['a', 'a', 'b']]))",
  "tests": "a = ['P'] * 45 + ['F'] * 35 + ['P'] * 10 + ['F'] * 10\nb = ['P'] * 45 + ['F'] * 35 + ['F'] * 10 + ['P'] * 10\nassert abs(cohens_kappa(a, b) - 0.295 / 0.495) < 1e-12\nassert abs(cohens_kappa(['x', 'y', 'x'], ['x', 'y', 'x']) - 1.0) < 1e-12\nassert cohens_kappa(['x', 'x'], ['x', 'x']) == 1.0\nassert abs(cohens_kappa(['x', 'y', 'x', 'y'], ['y', 'x', 'y', 'x']) - (-1.0)) < 1e-12\nassert majority_vote([['a', 'a', 'b'], ['b', 'a'], ['c'], ['x', 'y', 'z']]) == ['a', None, 'c', None]\nassert majority_vote([['p', 'p', 'f', 'f', 'p']]) == ['p']\nassert majority_vote([]) == []",
  "solution": "def cohens_kappa(a, b):\n    n = len(a)\n    po = sum(1 for x, y in zip(a, b) if x == y) / n\n    ca, cb = {}, {}\n    for x in a:\n        ca[x] = ca.get(x, 0) + 1\n    for y in b:\n        cb[y] = cb.get(y, 0) + 1\n    pe = sum((ca[c] / n) * (cb.get(c, 0) / n) for c in ca)\n    if pe == 1:\n        return 1.0\n    return (po - pe) / (1 - pe)\n\ndef majority_vote(labels_per_item):\n    out = []\n    for labels in labels_per_item:\n        counts = {}\n        for l in labels:\n            counts[l] = counts.get(l, 0) + 1\n        top = max(counts.values())\n        winners = [l for l, c in counts.items() if c == top]\n        out.append(winners[0] if len(winners) == 1 else None)\n    return out",
  "hints": [
    "Count labels with a dict; `p_o = sum(x == y) / n`.",
    "For `majority_vote`, find the max count and check how many labels reach it."
  ]
}
```

> [!TIP] Interview tips
> - Choose pairwise preference or anchored binary scales, blind and randomized, with gold questions and adjudication.
> - Quote Cohen's kappa and why percent agreement misleads under class imbalance.
> - Low agreement usually means a vague rubric; fix guidelines before blaming raters.
