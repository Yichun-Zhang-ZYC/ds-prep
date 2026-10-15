---
id: ml-association-rules
title: Association rules
estimatedMinutes: 10
difficulty: easy
tags: [ml, unsupervised, market-basket, recommendations]
---

## Why it matters
"People who bought X also bought Y" analysis drives cross-sell, store layout and bundle pricing. Interviewers expect you to define support, confidence and lift and explain why confidence alone misleads.

## Concept
For a rule $X \Rightarrow Y$ over a set of transactions (baskets):

$$
\text{support}(X) = P(X) \qquad \text{confidence}(X \Rightarrow Y) = P(Y \mid X) = \frac{\text{support}(X \cup Y)}{\text{support}(X)}
$$

$$
\text{lift}(X \Rightarrow Y) = \frac{\text{confidence}(X \Rightarrow Y)}{\text{support}(Y)} = \frac{P(X, Y)}{P(X)P(Y)}
$$

- Lift > 1: buying X makes Y more likely than baseline; = 1: independent; < 1: substitutes.
- High confidence can be meaningless if Y is popular anyway (e.g. "anything ⇒ milk").

**Apriori algorithm**: find all itemsets with support ≥ a threshold, using the **downward-closure** property: every subset of a frequent itemset is frequent, so candidates of size $k+1$ are built only from frequent $k$-itemsets. Then generate rules that pass confidence/lift thresholds. **FP-Growth** avoids candidate generation with a compressed prefix tree and is faster on large data.

Caveats: rules are correlations, not causal; many rules are trivial or redundant; set a minimum support to avoid rules from a handful of baskets.

## Worked example
1,000 baskets: 200 contain bread, 150 contain butter, 100 contain both. support(bread, butter) = 0.10. confidence(bread ⇒ butter) = 0.10/0.20 = 0.50. lift = 0.50/0.15 ≈ 3.3: bread buyers are 3.3× as likely as average to buy butter.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Rule {chips} ⇒ {water} has confidence 0.6, and 60% of all baskets contain water. What is the lift?",
  "options": ["0.36", "0.6", "1.0", "1.67"],
  "answer": 2,
  "explanation": "lift = 0.6 / 0.6 = 1: buying chips tells you nothing about water."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Each basket is a set of items. Write `support(baskets, items)`, `confidence(baskets, lhs, rhs)` and `lift(baskets, lhs, rhs)`, where `items`, `lhs`, `rhs` are sets. Then write `frequent_pairs(baskets, min_support)` returning a sorted list of 2-item tuples (items sorted) whose support ≥ min_support.",
  "starterCode": "from itertools import combinations\n\ndef support(baskets, items):\n    pass\n\ndef confidence(baskets, lhs, rhs):\n    pass\n\ndef lift(baskets, lhs, rhs):\n    pass\n\ndef frequent_pairs(baskets, min_support):\n    pass\n\nb = [{'bread', 'butter'}, {'bread', 'butter', 'jam'}, {'bread'}, {'milk'}, {'butter', 'milk'}]\nprint(lift(b, {'bread'}, {'butter'}), frequent_pairs(b, 0.4))",
  "tests": "b = [{'bread', 'butter'}, {'bread', 'butter', 'jam'}, {'bread'}, {'milk'}, {'butter', 'milk'}]\nassert support(b, {'bread'}) == 0.6\nassert abs(confidence(b, {'bread'}, {'butter'}) - 2 / 3) < 1e-12\nassert abs(lift(b, {'bread'}, {'butter'}) - (2 / 3) / 0.6) < 1e-12\nassert frequent_pairs(b, 0.4) == [('bread', 'butter')]\nassert frequent_pairs(b, 0.2) == [('bread', 'butter'), ('bread', 'jam'), ('butter', 'jam'), ('butter', 'milk')]",
  "solution": "from itertools import combinations\n\ndef support(baskets, items):\n    return sum(1 for b in baskets if items <= b) / len(baskets)\n\ndef confidence(baskets, lhs, rhs):\n    return support(baskets, lhs | rhs) / support(baskets, lhs)\n\ndef lift(baskets, lhs, rhs):\n    return confidence(baskets, lhs, rhs) / support(baskets, rhs)\n\ndef frequent_pairs(baskets, min_support):\n    items = sorted({i for b in baskets for i in b})\n    return [p for p in combinations(items, 2) if support(baskets, set(p)) >= min_support]",
  "hints": ["`items <= basket` checks subset.", "combinations over the sorted item list gives sorted tuples."]
}
```

> [!TIP] Interview tips
> - Define support, confidence and lift precisely, and say why lift beats confidence.
> - Mention Apriori's downward-closure pruning; it's the one algorithmic idea to know.
> - Caveat: co-purchase isn't causation; validate a cross-sell idea with an A/B test.
