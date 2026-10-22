---
id: cloud-devops-sla-slo-sli
title: SLA / SLO / SLI
estimatedMinutes: 12
difficulty: medium
tags: [sre, slo, sli, sla, error-budget, reliability]
---

## Why it matters
"How do you decide how reliable a service needs to be?" is a standard SRE and MLOps interview question. SLIs, SLOs and error budgets turn reliability into a number you can alert on and trade against feature velocity.

## Concept
- **SLI (indicator)**: a measured ratio of good events to valid events, e.g. requests under 300 ms / all requests. Pick user-centric signals: availability, latency, correctness, freshness, throughput.
- **SLO (objective)**: the internal target for an SLI over a window, e.g. 99.9% of requests succeed over 30 days.
- **SLA (agreement)**: a contract with consequences (credits, penalties). It is looser than the SLO so you breach your own target before the customer's.
- **Error budget**: $1 - \text{SLO}$. At 99.9% over 30 days the budget is $0.001 \cdot 43{,}200 = 43.2$ minutes of full downtime, or 0.1% of requests. When the budget is spent, freeze risky launches and prioritize reliability work.

```yaml
# Illustrative SLO definition
service: model-api
slis:
  availability: "good = non-5xx responses, valid = all responses except 4xx client errors"
  latency: "good = responses < 300 ms"
slos:
  - sli: availability
    target: 99.9
    window: 30d
  - sli: latency
    target: 95.0
    window: 30d
```

**Nines**: 99% allows 7.2 h per 30 days; 99.9% allows 43.2 min; 99.99% allows 4.32 min. Each extra nine costs roughly 10x in redundancy and engineering effort, so do not promise more than users need.

**Composition**: dependencies in series multiply, $A = \prod_i A_i$, so two 99.9% services in a chain give 99.8%. Redundant replicas in parallel give $1 - \prod_i (1 - A_i)$.

**Burn rate** is how fast the budget is consumed: $\text{burn} = \dfrac{\text{error ratio}}{1 - \text{SLO}}$. Burn 1 spends exactly the whole budget by the end of the window; burn 14.4 spends 2% in one hour. **Multi-window, multi-burn-rate alerts** (Google SRE workbook) page on fast burn (e.g. 14.4x over 1 h and 5 m) and open a ticket on slow burn (1x over 3 days). The short window makes the alert reset quickly after recovery.

```promql
# Page when the 1h and 5m burn rates both exceed 14.4x (budget 0.1%)
(sum(rate(http_requests_total{code=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))) > (14.4 * 0.001)
and
(sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > (14.4 * 0.001)
```

**Choosing SLIs for ML systems**: prediction latency, availability, feature **freshness**, and a quality proxy (share of predictions with a valid score, or delayed-label accuracy). Prefer a few SLOs per service, based on what users feel, not CPU or memory.

## Worked example
A prediction API has a 99.9% availability SLO over 30 days and serves 10M requests per month, so the budget is 10,000 failed requests. A bad deploy raises the 5xx ratio to 1.44% for the last hour: burn $= 0.0144 / 0.001 = 14.4$. At that rate the whole budget is gone in $720 / 14.4 = 50$ hours, and one hour already consumed 2% of it. The fast-burn alert pages the on-call; rolling back stops the burn. If 80% of the budget has been spent by day 20, the team pauses feature launches.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How do an SLO and an SLA usually relate?",
  "options": [
    "They are the same number",
    "The SLA is stricter than the SLO",
    "The SLO is an internal target that is stricter than the contractual SLA",
    "The SLA is an SLI measured per request"
  ],
  "answer": 2,
  "explanation": "Teams set the SLO tighter than the SLA so they notice and fix problems before breaching the customer contract."
}
```

```quiz
{
  "id": "q2",
  "question": "A 99.9% SLO sees a burn rate of 6 sustained. About how long until a 30-day budget is exhausted?",
  "options": [
    "5 hours",
    "5 days",
    "30 days",
    "6 days"
  ],
  "answer": 1,
  "explanation": "$720\\text{ h} / 6 = 120$ h = 5 days. Burn rate divides the window length: burn 1 lasts exactly the window."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement the error-budget math. `allowed_downtime_minutes(slo, days=30)` returns the downtime budget in minutes. `burn_rate(bad, total, slo)` returns observed error ratio divided by the budget. `hours_to_exhaustion(rate, days=30)` returns hours until a window's budget is spent at a constant burn rate (infinity if the rate is not positive). `should_page(long_burn, short_burn, threshold=14.4)` is True only if both windows are at or above the threshold. `serial_availability(parts)` multiplies availabilities of chained dependencies.",
  "starterCode": "def allowed_downtime_minutes(slo, days=30):\n    pass\n\ndef burn_rate(bad, total, slo):\n    pass\n\ndef hours_to_exhaustion(rate, days=30):\n    pass\n\ndef should_page(long_burn, short_burn, threshold=14.4):\n    pass\n\ndef serial_availability(parts):\n    pass\n\nprint(allowed_downtime_minutes(0.999), burn_rate(144, 10000, 0.999))",
  "tests": "assert abs(allowed_downtime_minutes(0.999) - 43.2) < 1e-6\nassert abs(allowed_downtime_minutes(0.99, days=7) - 100.8) < 1e-6\nassert abs(allowed_downtime_minutes(0.9999) - 4.32) < 1e-6\nassert abs(burn_rate(144, 10000, 0.999) - 14.4) < 1e-9\nassert abs(burn_rate(10, 10000, 0.999) - 1.0) < 1e-9\nassert abs(hours_to_exhaustion(14.4) - 50) < 1e-9\nassert abs(hours_to_exhaustion(1) - 720) < 1e-9\nassert hours_to_exhaustion(0) == float(\"inf\")\nassert should_page(15, 15) is True\nassert should_page(15, 3) is False\nassert should_page(3, 20) is False\nassert abs(serial_availability([0.999, 0.999]) - 0.998001) < 1e-12\nassert abs(serial_availability([0.9995, 0.999, 0.9999]) - 0.9995 * 0.999 * 0.9999) < 1e-12",
  "solution": "def allowed_downtime_minutes(slo, days=30):\n    return (1 - slo) * days * 24 * 60\n\ndef burn_rate(bad, total, slo):\n    return (bad / total) / (1 - slo)\n\ndef hours_to_exhaustion(rate, days=30):\n    if rate <= 0:\n        return float(\"inf\")\n    return days * 24 / rate\n\ndef should_page(long_burn, short_burn, threshold=14.4):\n    return long_burn >= threshold and short_burn >= threshold\n\ndef serial_availability(parts):\n    out = 1.0\n    for a in parts:\n        out *= a\n    return out",
  "hints": [
    "Budget fraction = 1 - slo; a 30-day window has 30 * 24 * 60 minutes.",
    "burn = (bad / total) / (1 - slo); time to exhaust = window hours / burn.",
    "Requiring both windows avoids paging on an old spike that has already recovered."
  ]
}
```

> [!TIP] Interview tips
> - Define the three terms in one sentence each, then bring up the error budget as the decision tool between reliability and velocity.
> - Pick SLIs from the user's point of view and say what counts as a "valid" event (exclude client 4xx).
> - Explain burn rate and why multi-window alerts beat a static error-rate threshold.
> - Mention that chained dependencies multiply, so a 99.99% target is impossible on top of a 99.9% dependency without redundancy or fallbacks.
