---
id: statistics-null-and-alternative-hypotheses
title: Null and alternative hypotheses
estimatedMinutes: 8
difficulty: easy
tags: [statistics, hypothesis-testing, ab-testing]
---

## Why it matters
Every A/B test and statistical test starts by writing two hypotheses. Interviewers check that you put the "no effect" claim in the null, choose the direction deliberately, and state what result would change a decision.

## Concept
- **Null hypothesis $H_0$**: the default, "nothing interesting" claim, usually *no difference* or *no effect*. It's the claim we try to find evidence against.
- **Alternative $H_1$**: what we'd conclude if the data contradicts $H_0$.

| Question | $H_0$ | $H_1$ |
|---|---|---|
| Does the new checkout change conversion? | $p_B = p_A$ | $p_B \ne p_A$ (two-sided) |
| Is average delivery time above the 3-day SLA? | $\mu \le 3$ | $\mu > 3$ (one-sided) |
| Is the coin fair? | $p = 0.5$ | $p \ne 0.5$ |

We never "accept" $H_0$. We either **reject** it or **fail to reject** it. Failing to reject means the data isn't strong enough, not that there's no effect.

## Worked example
"We redesigned onboarding. Did 7-day retention change?"

- Metric: 7-day retention per user.
- $H_0$: retention(new) = retention(old). $H_1$: retention(new) ≠ retention(old).
- Decision rule set **before** the test: α = 0.05, two-sided; ship if the lift is significant and at least +0.5 points.

Writing the rule upfront prevents moving the goalposts after seeing data.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A test gives p = 0.30. Which statement is correct?",
  "options": ["We accept the null: there is no effect", "We fail to reject the null; the data doesn't give strong evidence of an effect", "The effect is 30%", "The alternative is false"],
  "answer": 1,
  "explanation": "Absence of evidence isn't evidence of absence. The test may simply lack power."
}
```

## Practice

```reveal
{
  "prompt": "A PM asks: \"Prove that the new feature didn't hurt engagement.\" How do you set up the hypotheses?",
  "answer": "A standard test can't prove \"no effect\"; failing to reject $H_0$ isn't proof. Use a **non-inferiority test** instead: pick a margin δ (e.g. engagement may drop at most 1%).\n\n- $H_0$: new − old ≤ −δ (the feature is worse by at least the margin)\n- $H_1$: new − old > −δ (any drop is smaller than the margin)\n\nRejecting $H_0$ gives positive evidence that the feature is \"not meaningfully worse\". Agreeing on δ with the PM upfront is the key business step."
}
```

> [!TIP] Interview tips
> - Write $H_0$, $H_1$, the metric, α and the decision rule before any data talk.
> - Say "fail to reject", never "accept the null".
> - Mention non-inferiority tests when the goal is "make sure we didn't break anything".
