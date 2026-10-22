---
id: cloud-devops-cost-management-finops
title: Cloud cost management (FinOps)
estimatedMinutes: 11
difficulty: medium
tags: [finops, cost, cloud, spot, commitments]
---

## Why it matters
Cloud bills grow quietly, and data and ML workloads (warehouses, big clusters, GPUs, egress) are often the biggest line items. FinOps questions test whether you can find waste, attribute cost to owners and choose the right pricing model without hurting reliability. They show up in cloud, platform and ML-infrastructure interviews.

## Concept
**FinOps loop**: **inform** (visibility and allocation), **optimise** (reduce waste, buy smarter), **operate** (governance, continuous review). Engineers, finance and product share ownership.

**Visibility**: enforce **tags/labels** (team, service, env, cost-center) and track the untagged share as a KPI; use per-account or per-project separation; set **budgets and anomaly alerts**; show unit economics such as cost per 1,000 predictions or per TB processed rather than only totals.

**Pricing levers** (names are AWS-style; GCP and Azure have equivalents):
- **On-demand**: flexible, most expensive.
- **Commitments** (Savings Plans, Reserved Instances, committed use discounts): about 30-70% off in exchange for a 1-3 year spend commitment. Pay whether used or not, so commit only to the steady baseline.
- **Spot / preemptible**: up to roughly 60-90% off, can be reclaimed with short notice. Good for stateless, checkpointed, retryable work (batch, training with checkpoints, CI).
- **Free-tier/tiering**: storage classes and lifecycle rules (hot, infrequent, archive).

**Rightsizing and waste**: idle or over-provisioned instances (look at CPU, memory, GPU utilisation), unattached volumes and old snapshots, dev/test left on overnight (schedule shutdown), over-retained logs, oversized warehouse clusters (auto-suspend, auto-scale), and **data transfer**: egress, cross-AZ and cross-region traffic and NAT gateways are classic surprises. Keep compute near the data.

**Architecture choices** matter more than discounts: columnar formats and partition pruning cut bytes scanned; caching and batching reduce calls; smaller or distilled models cut GPU spend; serverless wins at spiky low utilisation, reserved capacity at steady high utilisation.

**Break-even**: a commitment at rate $c$ versus on-demand rate $o$ pays off when utilisation exceeds $c/o$.

**Pitfalls**: committing before rightsizing; committing to peak instead of baseline; spot for non-resilient jobs; cost cuts that remove redundancy; forgetting that engineers' time is also a cost.

## Worked example
Illustrative numbers. A dev cluster has 8 nodes at \$2.00/h running 24x7 (730 h): 8 × 2 × 730 = \$11,680/month. Scheduling it for 12 h on 22 weekdays (264 h) gives 8 × 2 × 264 = \$4,224, saving \$7,456 (about 64%) with no architecture change.

A nightly batch job needs 3,000 instance-hours at \$3.00/h on-demand = \$9,000. On spot at \$0.90/h (70% off) with 15% extra reruns from interruptions: 3000 × 1.15 × 0.90 = \$3,105, saving \$5,895 (about 65%), as long as the job checkpoints.

A steady inference service uses a GPU instance 700 of 730 hours. A 1-year commitment at 60% of on-demand breaks even at 60% utilisation (438 h), so commit for the baseline and keep bursts on-demand or spot.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A team's workload is steady at about 20 instances 24x7 with bursts to 50. How should they buy compute?",
  "options": [
    "All on-demand",
    "Commit to about 20 instances, run bursts on on-demand or spot",
    "Commit to 50 instances",
    "All spot, including stateful databases"
  ],
  "answer": 1,
  "explanation": "Commitments pay off for the steady baseline. Committing to peak wastes money during troughs."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the most likely hidden cost when a Spark job in region A reads a 50 TB dataset stored in region B repeatedly?",
  "options": [
    "Idle CPU",
    "Cross-region data transfer charges",
    "Tag storage",
    "IAM policy evaluation"
  ],
  "answer": 1,
  "explanation": "Cross-region egress is billed per GB, so move compute to the data or replicate once."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Cost allocation. Implement `cost_by_team(items)` where each item is `(service, team_or_None, cost)`. Return `(totals, untagged_pct)`: a dict of team to total cost for tagged items, and the untagged cost as a percentage of all cost (`0.0` when there is no cost).",
  "starterCode": "def cost_by_team(items):\n    \"\"\"items: list of (service, team_or_None, cost).\n    Return (totals, untagged_pct): totals maps team -> total cost for tagged items;\n    untagged_pct is untagged cost as a percentage of all cost (0.0 if no cost).\"\"\"\n    pass\n\nitems = [(\"ec2\", \"ml\", 100.0), (\"s3\", \"ml\", 20.0), (\"ec2\", \"data\", 50.0), (\"nat\", None, 30.0)]\nprint(cost_by_team(items))",
  "tests": "items = [(\"ec2\", \"ml\", 100.0), (\"s3\", \"ml\", 20.0), (\"ec2\", \"data\", 50.0), (\"nat\", None, 30.0)]\ntotals, pct = cost_by_team(items)\nassert totals == {\"ml\": 120.0, \"data\": 50.0}\nassert abs(pct - 15.0) < 1e-9\nt, p = cost_by_team([])\nassert t == {} and p == 0.0\nt, p = cost_by_team([(\"a\", None, 10.0)])\nassert t == {} and abs(p - 100.0) < 1e-9",
  "solution": "def cost_by_team(items):\n    totals = {}\n    total = 0.0\n    untagged = 0.0\n    for svc, team, cost in items:\n        total += cost\n        if team is None:\n            untagged += cost\n        else:\n            totals[team] = totals.get(team, 0.0) + cost\n    pct = 100.0 * untagged / total if total else 0.0\n    return totals, pct",
  "hints": [
    "Accumulate the overall total and the untagged total in the same loop.",
    "Only add to the team dict when team is not None."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Commit or not? Implement `breakeven_utilization(od_rate, commit_rate)` (the usage fraction at which both options cost the same) and `best_option(od_rate, commit_rate, used_hours, total_hours=730)`. A commitment is paid for every hour; on-demand only for used hours. Return `'commit'` only if strictly cheaper.",
  "starterCode": "def breakeven_utilization(od_rate, commit_rate):\n    \"\"\"Fraction of hours the resource must be used for a commitment to beat on-demand.\"\"\"\n    pass\n\ndef best_option(od_rate, commit_rate, used_hours, total_hours=730):\n    \"\"\"Return 'commit' if paying commit_rate for ALL total_hours is cheaper than\n    paying od_rate only for used_hours, else 'on-demand'.\"\"\"\n    pass\n\nprint(breakeven_utilization(1.0, 0.6), best_option(1.0, 0.6, 500))",
  "tests": "assert abs(breakeven_utilization(1.0, 0.6) - 0.6) < 1e-9\nassert abs(breakeven_utilization(2.0, 1.0) - 0.5) < 1e-9\nassert best_option(1.0, 0.6, 500) == \"commit\"\nassert best_option(1.0, 0.6, 400) == \"on-demand\"\nassert best_option(1.0, 0.6, 438.0) == \"on-demand\"\nassert best_option(2.0, 1.0, 400, total_hours=730) == \"commit\"",
  "solution": "def breakeven_utilization(od_rate, commit_rate):\n    return commit_rate / od_rate\n\ndef best_option(od_rate, commit_rate, used_hours, total_hours=730):\n    if commit_rate * total_hours < od_rate * used_hours:\n        return \"commit\"\n    return \"on-demand\"",
  "hints": [
    "Break-even utilisation is commit_rate / od_rate.",
    "Compare commit_rate * total_hours with od_rate * used_hours."
  ]
}
```

> [!TIP] Interview tips
- Structure the answer as visibility (tags, budgets), optimisation (rightsize, spot, commitments), governance.
- Quote the break-even idea: commit to the steady baseline, spot for fault-tolerant work.
- Mention data transfer, idle dev environments and unit economics (cost per prediction).
- Always weigh savings against reliability and engineer time.
