---
id: product-sense-trade-off-questions
title: "Trade-off questions"
estimatedMinutes: 12
difficulty: medium
tags: [product-sense, trade-offs, ltv, product-case]
---

## Why it matters
"Feature X raises engagement but lowers revenue. Ship it?" Trade-off questions test judgment: can you make the competing goods commensurable, name the assumptions, and commit to a recommendation instead of hedging?

## Concept
A repeatable approach:
1. **Clarify the objective and horizon**: which goal wins when they conflict (company strategy, stage: growth vs monetization), and over what time frame?
2. **Name the two sides precisely**: which metrics move, for whom, and by how much (get or assume numbers).
3. **Make them commensurable**: convert to a common unit, usually long-term value (LTV = ARPU / churn for a simple subscription model), dollars per user, or an explicit exchange rate ("1 pp retention is worth \$X").
4. **Check second-order effects**: ecosystem (creators, sellers, advertisers), trust and brand, cannibalization, habit formation, regulatory risk.
5. **Segment**: the trade-off may flip across users (heavy vs light, new vs existing, markets).
6. **Reversibility and information value**: prefer reversible decisions and cheap experiments; irreversible ones (price increases, privacy) need higher confidence.
7. **Recommend, state assumptions and a decision rule**: "Ship if X; here is what would change my mind."

Common trade-off axes: short-term revenue vs retention, engagement vs well-being or quality, growth vs unit economics, precision vs recall (cost of each error), speed vs quality, user vs supplier side of a marketplace, personalization vs privacy.

Simple LTV model: with monthly churn $c$ and ARPU $a$, expected lifetime is $1/c$ months, so $\text{LTV}=a/c$. Small churn changes matter a lot: the break-even churn for a new ARPU $a'$ and baseline LTV is $c^* = a'/\text{LTV}_{\text{base}}$.

## Worked example
A streaming service with a \$10 ARPU and 3.0% monthly churn considers raising ad load. Test results: ad revenue lifts ARPU to \$10.60 (+6%), but churn rises to 3.2%.

| Option | ARPU | Monthly churn | Lifetime (months) | LTV |
|---|---|---|---|---|
| Current | \$10.00 | 3.0% | 33.3 | \$333.33 |
| Higher ad load | \$10.60 | 3.2% | 31.25 | \$331.25 |

The new option wins on revenue this month (+6%) but loses on long-term value: -\$2.08 per user (-0.6%). Break-even churn is 10.60 / 333.33 = **3.18%**; the test shows 3.2%, essentially on the line.

So the trade-off is nearly neutral on this model, and the decision depends on the details:
- Uncertainty: the churn estimate has a confidence interval (say 3.2% +/- 0.15%), so the LTV effect could be positive or negative.
- Segments: heavy users may churn more because ads annoy them, while price-sensitive users may prefer ads over a subscription fee. Targeting ad load by segment could beat both options.
- Second-order: ad advertisers want engaged audiences, and brand perception takes a hit.

Recommendation: do not ship globally. Ship to the segment where churn stays under 3.18%, extend the test to narrow the interval, and set a rule: roll back if 90-day churn exceeds 3.3%.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Plan A: ARPU $12, monthly churn 4%. Plan B: ARPU $9, monthly churn 2.5%. Which has higher LTV under LTV = ARPU / churn?",
  "options": [
    "Plan A ($300)",
    "Plan B ($360)",
    "They are equal",
    "Cannot tell without CAC"
  ],
  "answer": 1,
  "explanation": "A = 12 / 0.04 = $300; B = 9 / 0.025 = $360. Retention differences compound, so the cheaper plan wins on lifetime value."
}
```

```quiz
{
  "id": "q2",
  "question": "What should be your first move on a question like 'Should we increase notification frequency to boost engagement at the cost of unsubscribes?'",
  "options": [
    "Immediately pick engagement",
    "Clarify the objective, time horizon and magnitudes, then make the two sides comparable",
    "List every possible metric",
    "Say it depends and stop"
  ],
  "answer": 1,
  "explanation": "Trade-off answers are scored on structure: clarify goal and horizon, quantify both sides, convert to a common unit, then commit to a recommendation."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ltv(arpu, churn)` (= arpu / churn), `breakeven_churn(arpu_new, ltv_base)` (the highest churn at which the new option still matches the baseline LTV), and `better_option(a, b)` where each option is an `(arpu, churn)` tuple; return `'A'` if option a has the higher LTV, otherwise `'B'`.",
  "starterCode": "def ltv(arpu, churn):\n    pass\n\ndef breakeven_churn(arpu_new, ltv_base):\n    pass\n\ndef better_option(a, b):\n    pass\n\nprint(ltv(10, 0.03), breakeven_churn(10.6, ltv(10, 0.03)), better_option((10, 0.03), (10.6, 0.032)))",
  "tests": "assert abs(ltv(10, 0.03) - 333.3333333333) < 1e-6\nassert abs(ltv(10.6, 0.032) - 331.25) < 1e-9\nassert abs(breakeven_churn(10.6, ltv(10, 0.03)) - 0.0318) < 1e-9\nassert better_option((10, 0.03), (10.6, 0.032)) == 'A'\nassert better_option((12, 0.04), (9, 0.025)) == 'B'\nassert better_option((10, 0.03), (10.6, 0.03)) == 'B'",
  "solution": "def ltv(arpu, churn):\n    return arpu / churn\n\ndef breakeven_churn(arpu_new, ltv_base):\n    return arpu_new / ltv_base\n\ndef better_option(a, b):\n    return 'A' if ltv(*a) > ltv(*b) else 'B'",
  "hints": [
    "Lifetime in months is 1 / churn, so LTV = ARPU x lifetime.",
    "Set arpu_new / churn = ltv_base and solve for churn."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'A change makes users spend 5% more time in your video app, but ad revenue per session drops 2% because the feed shows fewer ads. Ship?'",
  "answer": "**Clarify**: goal and stage (is the company optimizing for engagement or monetization this year?), horizon, and what drives the time increase (better content, or friction/autoplay?).\n\n**Quantify**: ad revenue per user = sessions x time x ad load x CPM. If time per user is +5% and revenue per session is -2%, the result depends on where the 5% comes from. If +5% is sessions per user, revenue per user = 1.05 x 0.98 = 1.029, or **+2.9%**; if +5% is longer sessions with fewer ads per minute, the net could be roughly neutral. Get the decomposition first.\n\n**Long-term**: higher engagement improves retention and creator supply, which compounds; convert retention gains to LTV with an exchange rate.\n\n**Guardrails**: content quality (does the extra time come from better recommendations or from autoplay?), user satisfaction, advertiser metrics (ad viewability, CPM).\n\n**Segments**: heavy users vs light users, ad-supported vs premium.\n\n**Recommendation**: ship if revenue per user is neutral-to-positive and retention is up; otherwise run a test of ad-load adjustments to recover revenue, with a rule to roll back if 30-day revenue per user falls more than 1%."
}
```

> [!TIP] Interview tips
> - Commit to a recommendation and state the assumption that would flip it; hedging with 'it depends' alone fails.
> - Convert both sides to one unit (LTV, dollars per user) to show you can compare them.
> - Pitfall: ignoring second-order effects (marketplace supply, trust) and irreversibility.
