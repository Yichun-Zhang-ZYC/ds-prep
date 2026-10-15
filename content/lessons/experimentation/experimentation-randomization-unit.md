---
id: experimentation-randomization-unit
title: Randomization unit
estimatedMinutes: 10
difficulty: medium
tags: [experimentation, ab-testing, randomization]
---

## Why it matters
Randomizing by the wrong unit causes inconsistent user experiences, contaminated comparisons and wrong standard errors. "What would you randomize on?" is a standard follow-up to any test design.

## Concept
Common units: **user** (logged-in ID), **device / cookie**, **session**, **pageview**, or **cluster** (city, store, school).

| Unit | Pros | Cons |
|---|---|---|
| User | consistent experience; measures long-term effects | needs a stable ID; fewer units |
| Cookie / device | works for logged-out traffic | same person on 2 devices may see both variants |
| Session / pageview | many units → more power | inconsistent experience; can't measure retention |
| Cluster (city, store) | handles interference / network effects | few units → low power |

Rules of thumb:
- Randomize at the level where the user **experiences** the change (usually the user).
- The **analysis unit should match the randomization unit**. If you randomize users but analyze pageviews, observations aren't independent and naive standard errors are too small (use the delta method or cluster-robust SEs).
- Assignment must be **deterministic and sticky**: hash(user_id + experiment_id) → bucket.

## Worked example
Testing a new pricing page. Randomizing by pageview would show the same user different prices on reload, which is confusing and possibly unfair. Randomize by user (or by account for B2B, so colleagues see the same price).

Testing a search ranking tweak with no visible UI change and a metric per query: randomizing by query can be acceptable and gives more power.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You randomize by user but compute click-through rate per pageview and use a standard binomial SE. What's the problem?",
  "options": ["None", "Pageviews from the same user are correlated, so the SE is underestimated and false positives increase", "The CTR will be biased upward", "Users can't be randomized"],
  "answer": 1,
  "explanation": "The analysis unit (pageview) differs from the randomization unit (user). Use the delta method or bootstrap by user."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `assign(user_id, experiment, treatment_share=0.5)` returning 'treatment' or 'control' deterministically: hash `f\"{experiment}:{user_id}\"` with `hashlib.md5`, take the first 8 hex digits as an integer, map to [0, 1) by dividing by 16**8, and compare with `treatment_share`.",
  "starterCode": "import hashlib\n\ndef assign(user_id, experiment, treatment_share=0.5):\n    pass\n\nprint(assign(42, 'new-checkout'))",
  "tests": "assert assign(42, 'exp') == assign(42, 'exp')\nshares = sum(assign(i, 'exp-a') == 'treatment' for i in range(20000)) / 20000\nassert abs(shares - 0.5) < 0.02, shares\nt10 = sum(assign(i, 'exp-b', 0.1) == 'treatment' for i in range(20000)) / 20000\nassert abs(t10 - 0.1) < 0.01, t10\nsame = sum(assign(i, 'exp-a') == assign(i, 'exp-c') for i in range(20000)) / 20000\nassert abs(same - 0.5) < 0.03, same",
  "solution": "import hashlib\n\ndef assign(user_id, experiment, treatment_share=0.5):\n    h = hashlib.md5(f\"{experiment}:{user_id}\".encode()).hexdigest()\n    u = int(h[:8], 16) / 16 ** 8\n    return 'treatment' if u < treatment_share else 'control'",
  "hints": ["Including the experiment name in the hash makes assignments independent across experiments.", "The same user and experiment always produce the same hash, so assignment is sticky."]
}
```

> [!TIP] Interview tips
> - Default to user-level randomization and say why (consistent experience, retention metrics).
> - Mention matching the analysis unit to the randomization unit, and the delta method for ratio metrics.
> - Bring up cluster randomization when users interact (marketplaces, social features).
