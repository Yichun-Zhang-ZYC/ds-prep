---
id: cloud-devops-data-observability
title: Data observability
estimatedMinutes: 10
difficulty: medium
tags: [dataops, observability, data-quality, lineage, monitoring]
---

## Why it matters
Tests cover what you thought of; observability catches what you did not. Interviewers ask how you find out that a table is late, half-empty or silently changed before a stakeholder emails you, and how you trace the impact.

## Concept
**Data observability** applies monitoring ideas (metrics, logs, lineage, alerts) to the health of data itself, reducing **data downtime**: periods when data is missing, wrong or stale. It complements tests, which check explicit rules, by learning normal behavior automatically.

**The five pillars**:
- **Freshness**: when was the table last updated vs its expected cadence/SLA?
- **Volume**: row counts and bytes per load vs history (sudden drops or spikes).
- **Schema**: columns added, removed, renamed or retyped.
- **Distribution / quality**: null rate, distinct counts, min/max, mean, category shares, duplicate keys; drift versus baseline.
- **Lineage**: upstream and downstream dependencies (tables, jobs, dashboards, models) to find root cause and blast radius.

```yaml
# dbt source freshness
sources:
  - name: app
    loaded_at_field: _loaded_at
    freshness:
      warn_after:  {count: 6,  period: hour}
      error_after: {count: 12, period: hour}
    tables: [{name: orders}, {name: users}]
```

**Detection approaches**: static rules for hard guarantees (not null, freshness under 6 h); **anomaly detection** for the rest, such as a z-score $|x - \mu| / \sigma > k$ versus a rolling window, with seasonality handled (compare Monday to previous Mondays) and holidays flagged. Prefer a few high-signal monitors on critical tables over thousands of noisy ones.

**Incident workflow**: detect -> **alert the owner** (route by table ownership, not a shared channel) -> triage using lineage (which jobs failed upstream, which dashboards and models are affected) -> mitigate (pause downstream, backfill, communicate) -> postmortem and add a test. Track metrics like time to detect and time to resolve, plus incident counts per table.

**Tools**: Monte Carlo, Bigeye, Soda, Great Expectations, Elementary (dbt), dbt source freshness, OpenLineage/Marquez, DataHub or Atlan for catalog and lineage; plus warehouse logs and orchestrator metrics (Airflow task durations and failures).

**Related practices**: **data contracts** between producers and consumers, SLAs on critical datasets, row-level quarantine of bad records (dead-letter tables), and data quality dashboards owned by the data team. ML systems add **feature and prediction drift** monitoring (PSI, KS) on the same foundation.

## Worked example
The `orders` table normally loads 98 to 102 rows in the test sample; today only 40 rows arrive. The history mean is 100 with population standard deviation $\sqrt{2} \approx 1.41$, so the z-score is $60 / 1.41 \approx 42 > 3$: a volume anomaly alert fires, even though no explicit test existed. Freshness is fine (last load 5 h ago vs a 6 h SLA). A schema monitor also notes `amount` changed from `float` to `string`. Lineage shows 3 dashboards and a churn model depend on `orders`, so the owner pauses their refresh and traces the issue to a vendor export change.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which scenario is best caught by data observability monitors rather than a hand-written not_null test?",
  "options": [
    "A primary key column contains NULL",
    "Daily row count silently drops by 60% compared to the usual pattern",
    "A column must be one of three allowed values",
    "A foreign key has no match"
  ],
  "answer": 1,
  "explanation": "Volume anomalies relative to history are learned from patterns, so you do not have to anticipate and encode each rule up front."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main value of lineage during an incident?",
  "options": [
    "It makes queries faster",
    "It shows upstream root causes and downstream assets affected, speeding triage and communication",
    "It encrypts the data",
    "It replaces alerting"
  ],
  "answer": 1,
  "explanation": "Lineage lets you move upstream to find the cause and downstream to notify consumers and pause affected jobs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement three monitors. `freshness_ok(last_loaded_hour, now_hour, sla_hours)` is True if the lag is at most the SLA. `volume_anomaly(history, today, k=3)` flags `today` if it is more than `k` population standard deviations from the history mean (if the standard deviation is 0, anomaly means `today != mean`). `schema_diff(old, new)` takes `{column: type}` dicts and returns `{\"added\": [...], \"removed\": [...], \"changed\": [...]}` with sorted lists, where changed means the column exists in both with a different type.",
  "starterCode": "import statistics\n\ndef freshness_ok(last_loaded_hour, now_hour, sla_hours):\n    pass\n\ndef volume_anomaly(history, today, k=3):\n    pass\n\ndef schema_diff(old, new):\n    pass\n\nprint(freshness_ok(3, 8, 6), volume_anomaly([100, 102, 98, 101, 99], 40))",
  "tests": "assert freshness_ok(3, 8, 6) is True\nassert freshness_ok(0, 9, 6) is False\nassert freshness_ok(0, 6, 6) is True\nh = [100, 102, 98, 101, 99]\nassert volume_anomaly(h, 100) is False\nassert volume_anomaly(h, 103) is False\nassert volume_anomaly(h, 40) is True\nassert volume_anomaly(h, 110) is True\nassert volume_anomaly([5, 5, 5], 5) is False\nassert volume_anomaly([5, 5, 5], 6) is True\nold = {\"id\": \"int\", \"amt\": \"float\", \"c\": \"str\"}\nnew = {\"id\": \"int\", \"amt\": \"str\", \"d\": \"str\"}\nassert schema_diff(old, new) == {\"added\": [\"d\"], \"removed\": [\"c\"], \"changed\": [\"amt\"]}\nassert schema_diff(old, old) == {\"added\": [], \"removed\": [], \"changed\": []}",
  "solution": "import statistics\n\ndef freshness_ok(last_loaded_hour, now_hour, sla_hours):\n    return (now_hour - last_loaded_hour) <= sla_hours\n\ndef volume_anomaly(history, today, k=3):\n    mean = statistics.fmean(history)\n    std = statistics.pstdev(history)\n    if std == 0:\n        return today != mean\n    return abs(today - mean) / std > k\n\ndef schema_diff(old, new):\n    return {\n        \"added\": sorted(set(new) - set(old)),\n        \"removed\": sorted(set(old) - set(new)),\n        \"changed\": sorted(c for c in set(old) & set(new) if old[c] != new[c]),\n    }",
  "hints": [
    "Use statistics.pstdev for the population standard deviation.",
    "Handle std == 0 separately to avoid division by zero.",
    "Use set differences on the column names, then compare types for the common columns."
  ]
}
```

> [!TIP] Interview tips
> - Name the five pillars (freshness, volume, schema, distribution, lineage) and give one signal for each.
> - Contrast tests (known rules) with observability (learned baselines, unknown unknowns), and say you need both.
> - Discuss alert fatigue: monitor critical tables, route to owners, handle seasonality.
> - Close the loop with incident process: lineage-based triage, communication, postmortem, new tests.
