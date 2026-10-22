---
id: product-sense-evaluate-a-new-feature-launch
title: "Evaluate a new feature launch"
estimatedMinutes: 13
difficulty: medium
tags: [product-sense, ab-testing, launch-decision, product-case]
---

## Why it matters
"The A/B test shows conversion up 0.4 pp. Do we launch?" is a staple product-sense and DS question. It tests whether you can combine statistical evidence, business impact, guardrails and judgment into a clear recommendation.

## Concept
A launch decision rests on five layers:
1. **Trustworthy experiment**: sample ratio mismatch (SRM) check, correct randomization unit, no overlapping experiments, full business cycles, pre-registered primary metric.
2. **Statistical evidence**: effect size with a confidence interval, not just p-value. For a conversion difference with unpooled standard error: $\text{SE}=\sqrt{\frac{p_c(1-p_c)}{n_c}+\frac{p_t(1-p_t)}{n_t}}$, 95% CI $=\Delta\pm1.96\,\text{SE}$.
3. **Practical significance**: is even the CI lower bound worth the cost? Translate into revenue or users per month.
4. **Guardrails and segments**: revenue per visitor, refunds, latency, retention; effects by new vs returning, platform and country (beware of slicing noise and Simpson effects).
5. **Durability and cost**: novelty or primacy effects (does the lift decay?), long-term holdback, engineering and maintenance cost, risk, strategic fit, reversibility.

Decision patterns:
- Primary significant and guardrails fine: launch (maybe ramp gradually).
- Flat but CI tight around zero: kill or simplify (cost with no benefit).
- Flat but CI wide: underpowered; extend or redesign.
- Primary up, key guardrail down: iterate or launch to segments where it is net positive.
- Positive but small: weigh against maintenance cost and alternatives.

## Worked example
A one-tap checkout is tested for 3 weeks with 100,000 visitors per arm.

| | Visitors | Orders | Conversion |
|---|---|---|---|
| Control | 100,000 | 10,000 | 10.0% |
| Treatment | 100,000 | 10,400 | 10.4% |

Difference $\Delta = 0.4$ pp (+4% relative). SE = $\sqrt{0.1\cdot0.9/10^5 + 0.104\cdot0.896/10^5} \approx 0.00135$, so $z \approx 2.96$ and the 95% CI is $0.004 \pm 0.00265 = [0.13, 0.67]$ pp: significant, but the lower bound is small.

Business impact with 5,000,000 visitors per month and a \$60 average order value: point estimate 5,000,000 x 0.004 x \$60 = **\$1.2M per month**; range \$0.40M to \$2.0M.

Checks before recommending:
- SRM: arms are 100,000 vs 100,000, fine. Revenue per visitor and AOV: AOV flat at \$60, so extra orders are incremental revenue, not discount-driven.
- Guardrails: refund rate 2.0% vs 2.1% (within tolerance), payment error rate flat, p95 latency flat.
- Segments: new users +0.6 pp, returning +0.2 pp, no segment negative.
- Novelty: weekly lift is +0.45, +0.40, +0.35 pp, drifting down, so plan on roughly +0.3 pp in steady state and keep a 5% holdback for 8 weeks.

Recommendation: launch with gradual ramp (10% to 50% to 100%), keep a long-term holdback, and re-estimate impact at the steady-state lift.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An experiment has a statistically significant +0.1% lift but costs six engineer-months to maintain. What is the best framing?",
  "options": [
    "Launch, because p < 0.05",
    "Compare the dollar value of the CI range to the cost and alternatives; statistical significance is not practical significance",
    "Reject, because the lift is under 1%",
    "Run it for longer until the lift grows"
  ],
  "answer": 1,
  "explanation": "Decide on expected value: translate the lift (and its interval) into revenue and compare to cost and opportunity cost."
}
```

```quiz
{
  "id": "q2",
  "question": "The treatment arm has 5% more users than control in a 50/50 test with millions of users. What should you do first?",
  "options": [
    "Ignore it, since the effect is significant",
    "Treat it as a sample ratio mismatch and debug assignment/logging before trusting any result",
    "Re-weight the arms and proceed",
    "Lower the alpha"
  ],
  "answer": 1,
  "explanation": "SRM signals broken randomization or logging (bot filtering, redirects, crashes). Any metric comparison can be biased until it is understood."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `ab_summary(n_c, x_c, n_t, x_t)` returning `(diff, ci_low, ci_high, z)` for conversion with the unpooled standard error and a 95% interval (1.96), and `monthly_impact(visitors, diff, aov)` returning extra revenue per month.",
  "starterCode": "import math\n\ndef ab_summary(n_c, x_c, n_t, x_t):\n    pass\n\ndef monthly_impact(visitors, diff, aov):\n    pass\n\nprint(ab_summary(100000, 10000, 100000, 10400), monthly_impact(5_000_000, 0.004, 60))",
  "tests": "d, lo, hi, z = ab_summary(100000, 10000, 100000, 10400)\nse = math.sqrt(0.1 * 0.9 / 100000 + 0.104 * 0.896 / 100000)\nassert abs(d - 0.004) < 1e-12\nassert abs(lo - (0.004 - 1.96 * se)) < 1e-9\nassert abs(hi - (0.004 + 1.96 * se)) < 1e-9\nassert abs(z - 0.004 / se) < 1e-9\nassert lo > 0\nd2, lo2, hi2, z2 = ab_summary(1000, 100, 1000, 100)\nassert d2 == 0 and lo2 < 0 < hi2 and z2 == 0\nassert abs(monthly_impact(5_000_000, 0.004, 60) - 1_200_000) < 1e-6",
  "solution": "import math\n\ndef ab_summary(n_c, x_c, n_t, x_t):\n    pc, pt = x_c / n_c, x_t / n_t\n    d = pt - pc\n    se = math.sqrt(pc * (1 - pc) / n_c + pt * (1 - pt) / n_t)\n    return d, d - 1.96 * se, d + 1.96 * se, d / se\n\ndef monthly_impact(visitors, diff, aov):\n    return visitors * diff * aov",
  "hints": [
    "diff = p_t - p_c; z = diff / SE.",
    "Revenue impact = visitors x absolute lift x average order value."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'A new recommendations carousel raises click-through by 12% but add-to-cart is flat and page load is 200 ms slower. Do you launch?'",
  "answer": "**Frame**: clicks are an intermediate metric; the goal is purchases and long-term satisfaction. Flat add-to-cart means the extra clicks may be low-intent curiosity.\n\n**Check**: (1) experiment validity (SRM, duration, novelty: does the CTR lift decay?); (2) primary: revenue or orders per visitor with CI, which is likely flat; (3) guardrail: +200 ms latency typically costs conversion (often about 1% of conversion per 100 ms in e-commerce), so the net may be negative; quantify with a latency-only test.\n\n**Segments**: heavy browsers vs buyers, new vs returning, mobile vs desktop (the latency hit is worse on mobile).\n\n**Decision**: do not launch as is. Options: optimize latency (lazy-load the carousel, cache), improve ranking quality to move add-to-cart, or launch only where net revenue per visitor is positive. Re-test with revenue per visitor as primary and a latency guardrail.\n\n**Close**: say what evidence would flip the decision (for example a significant lift in 30-day purchases among exposed users)."
}
```

> [!TIP] Interview tips
> - Structure the answer: trustworthy test, effect size with CI, business impact in dollars, guardrails and segments, durability, decision.
> - Pitfall: recommending launch on p-value alone; quantify the interval's lower bound and the cost.
> - Mention ramping and a long-term holdback to confirm the effect persists.
