---
id: analytics-bi-insight-recommendation
title: Insight → recommendation
estimatedMinutes: 10
difficulty: medium
tags: [analytics, workflow, recommendations, prioritization, interview-pattern]
---

## Why it matters
Findings don't change decisions; recommendations do. Interviewers look for the step from "conversion fell 8%" to "do X, expect Y, here is the risk", including sizing the impact and prioritizing among options.

## Concept
**Finding vs insight vs recommendation**:
- **Finding**: a fact ("checkout conversion fell from 4.0% to 3.6%").
- **Insight**: the *so what* and *why* ("the drop is entirely Android users on app version 5.2, after a payment SDK change").
- **Recommendation**: a specific action, owner, expected impact and risk ("roll back the SDK for 5.2; recovers about 800 orders per month; verify with a holdout").

**A strong recommendation has**:
1. A clear action and owner (not "improve checkout").
2. **Sized impact**: affected users × baseline rate × relative change × value per outcome.
3. **Confidence and evidence**: how sure, what could be wrong (confounders, small samples).
4. **Cost and effort**, and the trade-off or risk.
5. **A way to measure success** (metric, target, timeline), ideally an experiment or holdout.

**Impact sizing**: $\text{extra conversions} = N \times p_0 \times \text{lift}_{rel}$, then multiply by value per conversion. Use ranges, not a single point.

**Prioritizing options** with **RICE**: $\text{score} = \dfrac{\text{Reach} \times \text{Impact} \times \text{Confidence}}{\text{Effort}}$. ICE is the simpler variant. Scores are a conversation tool, not truth; check them against strategy.

Lead with the answer (pyramid principle): recommendation first, then the 2-3 supporting facts, then caveats.

## Worked example
A funnel analysis finds mobile users abandon at the shipping-cost step. The proposal: show shipping costs earlier on the product page.

Sizing: 200,000 monthly visitors reach checkout, baseline conversion $p_0 = 4\%$, expected relative lift $10\%$, value per order \$50.

$$200{,}000 \times 0.04 \times 0.10 = 800 \text{ extra orders} \Rightarrow 800 \times \$50 = \$40{,}000 \text{ per month}$$

Compare with two other ideas using RICE: (A) guest checkout, reach 10,000, impact 0.5, confidence 0.8, effort 2 → 2,000; (B) shipping on product page, reach 3,000, impact 2, confidence 0.5, effort 1 → 3,000; (C) loyalty banner, reach 50,000, impact 0.25, confidence 0.5, effort 5 → 1,250. Ranking: B, A, C. Recommend B as a 2-week A/B test, success metric checkout conversion, guardrail product-page bounce rate.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which statement is a recommendation rather than a finding or insight?",
  "options": [
    "Checkout conversion fell from 4.0% to 3.6%",
    "The drop is concentrated in Android app version 5.2",
    "Roll back the payment SDK in 5.2; expected recovery is about 800 orders per month; confirm with a 10% holdout",
    "Android users are more price sensitive"
  ],
  "answer": 2,
  "explanation": "A recommendation names an action, an expected impact and a way to verify. The others describe what happened or why."
}
```

```quiz
{
  "id": "q2",
  "question": "Two ideas have equal Reach and Impact. Idea X has Confidence 0.8 and Effort 4; idea Y has Confidence 0.5 and Effort 1. Which has the higher RICE score?",
  "options": [
    "X, because confidence is higher",
    "Y, because the score is 0.5 / 1 = 0.5 vs 0.8 / 4 = 0.2 (per unit of Reach × Impact)",
    "They tie",
    "Cannot be determined"
  ],
  "answer": 1,
  "explanation": "RICE divides by Effort: Y scores 2.5 times X per unit of Reach × Impact. Low-effort, moderate-confidence ideas often beat expensive ones."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `extra_revenue(n, base_rate, rel_lift, value)` = n × base_rate × rel_lift × value. Write `rice(item)` for a dict with keys reach, impact, confidence, effort = reach × impact × confidence / effort. Write `rank(items)` returning item names sorted by RICE score descending, ties broken by name ascending.",
  "starterCode": "def extra_revenue(n, base_rate, rel_lift, value):\n    pass\n\ndef rice(item):\n    pass\n\ndef rank(items):\n    pass\n",
  "tests": "assert abs(extra_revenue(200000, 0.04, 0.10, 50) - 40000) < 1e-6\nitems = [\n    {'name': 'A', 'reach': 10000, 'impact': 0.5, 'confidence': 0.8, 'effort': 2},\n    {'name': 'B', 'reach': 3000, 'impact': 2, 'confidence': 0.5, 'effort': 1},\n    {'name': 'C', 'reach': 50000, 'impact': 0.25, 'confidence': 0.5, 'effort': 5},\n]\nassert abs(rice(items[0]) - 2000) < 1e-9\nassert abs(rice(items[1]) - 3000) < 1e-9\nassert abs(rice(items[2]) - 1250) < 1e-9\nassert rank(items) == ['B', 'A', 'C']\ntie = [{'name': 'Z', 'reach': 1, 'impact': 1, 'confidence': 1, 'effort': 1}, {'name': 'Y', 'reach': 1, 'impact': 1, 'confidence': 1, 'effort': 1}]\nassert rank(tie) == ['Y', 'Z']",
  "solution": "def extra_revenue(n, base_rate, rel_lift, value):\n    return n * base_rate * rel_lift * value\n\ndef rice(item):\n    return item['reach'] * item['impact'] * item['confidence'] / item['effort']\n\ndef rank(items):\n    ordered = sorted(items, key=lambda it: (-rice(it), it['name']))\n    return [it['name'] for it in ordered]",
  "hints": [
    "Sort with a tuple key: (-score, name).",
    "Compare floats only with a tolerance in tests; the solution itself needs no rounding."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Conversion dropped 8% week over week. What do you tell the PM?' Structure your answer.",
  "answer": "Lead with the answer, then support it.\n\n**1. Headline**: 'Conversion fell from 4.0% to 3.68%; the drop is a real regression isolated to Android 5.2, not a tracking artifact. I recommend rolling back the payment SDK.'\n\n**2. Evidence (2-3 facts)**: instrumentation checked (raw event counts and server-side orders agree); drop is confined to one platform and version, and starts at the release time; mix shift ruled out (traffic by channel unchanged).\n\n**3. Impact**: about 800 orders and $40k per month at current volume (show the arithmetic and a range).\n\n**4. Risks and confidence**: observational evidence only; high confidence on location, medium on the SDK as the cause; the rollback itself is a quick test.\n\n**5. Next steps and measurement**: owner, rollback date, success metric (Android checkout conversion back to 4.0% within a week), guardrail (crash rate), and a holdout if rollout is staged."
}
```

> [!TIP] Interview tips
> - Answer first, evidence second, caveats third; never make the interviewer wait for the point.
> - Always size the impact with explicit arithmetic and give a range, then name the success metric and a guardrail.
> - State your confidence and what would change your mind; recommending an experiment is a valid recommendation.
