---
id: experimentation-heterogeneous-treatment-effects-segmentation
title: Heterogeneous treatment effects / segmentation
estimatedMinutes: 12
difficulty: medium
tags: [experimentation, segmentation, hte, interactions]
---

## Why it matters
"The test was flat overall. Did it work for anyone?" Average effects can hide groups that benefit and groups that are hurt. Interviewers want you to explore segments **responsibly**, without fishing for false wins.

## Concept
A **heterogeneous treatment effect (HTE)** means the effect differs across users, e.g. positive for new users, negative for power users.

How to analyze:
1. **Pre-register** a few segments with a reason (device, new vs existing, country, plan).
2. Estimate the effect per segment and **test the difference** between segments (an interaction term), not each segment's p-value separately.
3. Correct for multiple comparisons when exploring many segments.
4. Treat surprising post-hoc segment wins as **hypotheses** to confirm in a follow-up test.

Advanced: causal forests / uplift models estimate individual-level effects to target only users who benefit.

## Worked example
Overall lift: +0.2% (not significant). By segment:

| Segment | Lift | CI |
|---|---|---|
| New users (30%) | +2.0% | [+0.8%, +3.2%] |
| Existing users (70%) | −0.6% | [−1.3%, +0.1%] |

The interaction (difference 2.6 points) is significant. A sensible decision: launch for new users only, and investigate why existing users may be slightly hurt (change aversion?). Confirm with a targeted follow-up test.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You check 20 segments after a flat test and find one with p = 0.03. What should you do?",
  "options": ["Launch for that segment", "Treat it as a hypothesis: with 20 segments, one p < 0.05 is expected by chance; confirm in a new test", "Report it as the main result", "Increase α"],
  "answer": 1,
  "explanation": "With 20 independent looks, about one 'significant' segment is expected even with no real effects."
}
```

## Practice

```sql-exercise
{
  "id": "ex1",
  "prompt": "From `results(segment, variant, users, conversions)`, return each `segment` with control rate `ctrl_rate`, treatment rate `trt_rate`, and the absolute lift `lift` (trt − ctrl), all rounded to 4 decimals.",
  "setup": "CREATE TABLE results (segment TEXT, variant TEXT, users INTEGER, conversions INTEGER); INSERT INTO results VALUES ('new','control',3000,150),('new','treatment',3000,210),('existing','control',7000,700),('existing','treatment',7000,658);",
  "starterCode": "SELECT segment\nFROM results\nGROUP BY segment;",
  "solution": "SELECT segment,\n       ROUND(1.0 * SUM(CASE WHEN variant = 'control' THEN conversions END) / SUM(CASE WHEN variant = 'control' THEN users END), 4) AS ctrl_rate,\n       ROUND(1.0 * SUM(CASE WHEN variant = 'treatment' THEN conversions END) / SUM(CASE WHEN variant = 'treatment' THEN users END), 4) AS trt_rate,\n       ROUND(1.0 * SUM(CASE WHEN variant = 'treatment' THEN conversions END) / SUM(CASE WHEN variant = 'treatment' THEN users END)\n           - 1.0 * SUM(CASE WHEN variant = 'control' THEN conversions END) / SUM(CASE WHEN variant = 'control' THEN users END), 4) AS lift\nFROM results\nGROUP BY segment;",
  "hints": ["Use conditional aggregation to pull control and treatment numbers into the same row.", "Compute the lift from the unrounded rates, then round."]
}
```

> [!TIP] Interview tips
> - Pre-register a handful of segments and justify each.
> - Test segment differences with an interaction, and correct for multiple segments.
> - Present post-hoc segment findings as follow-up hypotheses, not launch evidence.
