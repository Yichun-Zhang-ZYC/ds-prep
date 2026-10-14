---
id: statistics-correlation-vs-causation
title: Correlation vs causation
estimatedMinutes: 10
difficulty: easy
tags: [statistics, causal-inference, confounding]
---

## Why it matters
"Users who use feature X retain better. Should we push everyone to use X?" This is the most common product-analytics trap. Interviewers want you to list alternative explanations and propose how to get a causal answer.

## Concept
A correlation between X and Y can come from:

| Explanation | Example |
|---|---|
| X causes Y | the onboarding checklist increases retention |
| **Reverse causation**: Y causes X | retained users have more time to discover the checklist |
| **Confounding**: Z causes both | highly motivated users both finish the checklist and retain |
| **Selection bias** | only users who survived day 1 can see the checklist |
| Chance | many metrics tested, one looks related |

Ways to get causal evidence:
1. **Randomized experiment** (A/B test): the gold standard.
2. Quasi-experiments: difference-in-differences, regression discontinuity, instrumental variables.
3. Adjustment for confounders (matching, regression), only as good as the confounders you measured.

## Worked example
"Customers who contact support have 2× higher churn. Support is hurting retention."

Alternative: customers contact support **because** they have problems, and problems cause churn (confounding by issue severity). A better analysis compares customers with similar issues who did and didn't get support, or tests a support improvement (e.g. faster response) in an experiment.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Cities with more firefighters have more fire damage. What's the best explanation?",
  "options": ["Firefighters cause damage", "Bigger fires (and bigger cities) cause both more firefighters on scene and more damage", "It's a coincidence", "Damage causes firefighters to be hired"],
  "answer": 1,
  "explanation": "Fire size is a confounder driving both variables."
}
```

```reveal
{
  "prompt": "A PM says: \"Users who enable notifications have 30% higher retention. Let's force-enable notifications for everyone.\" How do you respond?",
  "answer": "The comparison is confounded: engaged users are more likely to opt in **and** to retain. Forcing notifications on unengaged users might even annoy them and increase uninstalls.\n\nPropose an experiment: randomize a stronger notification prompt (or default-on for a subset of new users), measure retention and guardrails (uninstalls, opt-out rate). Meanwhile, a matched comparison (users with similar early engagement) gives a less biased estimate, but it's still not proof."
}
```

> [!TIP] Interview tips
> - List at least confounding, reverse causation and selection bias before concluding anything.
> - Propose the experiment that would answer the causal question, plus guardrail metrics.
> - Use "associated with" in writing until you have causal evidence.
