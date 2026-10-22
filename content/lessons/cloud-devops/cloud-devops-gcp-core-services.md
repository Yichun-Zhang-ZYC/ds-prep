---
id: cloud-devops-gcp-core-services
title: "GCP core services (GCS, BigQuery, Vertex AI, Cloud Run)"
estimatedMinutes: 12
difficulty: medium
tags: [gcp, cloud, bigquery, vertex-ai, cloud-run]
---

## Why it matters

GCP is popular in data and ML teams because of BigQuery and Vertex AI. Interviewers ask what each service is for, how BigQuery is billed, and when to pick Cloud Run over a VM or Kubernetes.

## Concept

**Cloud Storage (GCS)**: object storage in buckets (Standard, Nearline, Coldline, Archive classes). It is the landing zone for raw data, model artifacts and training datasets, and BigQuery and Vertex AI read from it directly. Access is controlled with IAM (uniform bucket-level access) and signed URLs.

**BigQuery**: a serverless, columnar data warehouse that separates storage from compute. You write SQL and Google allocates slots; there are no clusters to size. Key ideas:
- **Billing**: *on-demand* charges per TiB of data **scanned** (about \$6.25/TiB at list price; check current rates), *capacity* pricing reserves slots at a flat rate. Storage is billed separately and cheaper for long-term (unmodified for 90 days).
- **Columnar**: only the columns you select are read, so `SELECT *` is the classic cost mistake.
- **Partitioning** (by date or integer range) and **clustering** (sorted blocks by up to 4 columns) cut bytes scanned. A **dry run** shows the cost before you run.
- **BigQuery ML** trains models with SQL (`CREATE MODEL`), plus federated queries on GCS, and streaming inserts.

```sql
-- Partitioned by DATE(event_ts), clustered by user_id
SELECT user_id, amount
FROM `proj.ds.transactions`
WHERE DATE(event_ts) BETWEEN '2026-01-01' AND '2026-01-07'   -- prunes partitions
  AND user_id = 42;                                           -- clustering prunes blocks
```

**Vertex AI**: the managed ML platform: Workbench notebooks, custom training jobs (your container, GPUs/TPUs), AutoML, hyperparameter tuning, Pipelines (Kubeflow-based), Model Registry, online endpoints with autoscaling and traffic splitting, batch prediction, Feature Store, and access to foundation models (Gemini) with grounding and tuning. It is the counterpart of SageMaker.

**Cloud Run**: runs any stateless container (or functions) and scales automatically **to zero** and up with request concurrency; you pay for request time (billed per 100 ms of CPU/memory while handling requests, unless you keep CPU always allocated). Great for model APIs and webhooks with spiky traffic. Limits: request timeouts, no local persistent disk, cold starts (mitigate with `--min-instances`). Choose **GKE** when you need fine control, GPUs at scale or many coordinated services; **Compute Engine** for long-running or special VMs. Other staples: **Pub/Sub** (messaging), **Dataflow** (Beam batch/stream), **Dataproc** (managed Spark), **Cloud Composer** (managed Airflow).

```bash
bq query --dry_run --use_legacy_sql=false 'SELECT ...'   # prints bytes that would be processed
gcloud run deploy scorer --image gcr.io/proj/scorer --min-instances 0 --concurrency 80
```

## Worked example

A `transactions` table is 1,024 GB: `user_id` 100 GB, `event_ts` 100 GB, `payload` 800 GB, `amount` 24 GB, split into 365 daily partitions. At \$6.25/TiB: `SELECT *` over the whole table scans 1,024 GB $= 1$ TiB, costing **\$6.25**. Selecting only `user_id, amount` scans 124 GB, about \$0.757. Adding a filter on 7 of the 365 date partitions scans $124 \times 7/365 \approx 2.38$ GB, costing $2.38/1024 \times 6.25 \approx$ **\$0.0145**. Same answer, roughly 430 times cheaper, just from column and partition pruning.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In BigQuery on-demand pricing, what most directly drives the cost of a query?",
  "options": [
    "Query runtime",
    "Bytes scanned in the columns and partitions read",
    "Rows returned",
    "Number of joins"
  ],
  "answer": 1,
  "explanation": "On-demand bills for bytes processed. Selecting fewer columns and pruning partitions reduces it; LIMIT does not."
}
```

```quiz
{
  "id": "q2",
  "question": "You have a bursty model API with long idle periods and no special hardware needs. Which service is the best fit?",
  "options": [
    "A dedicated GKE cluster",
    "A Compute Engine VM running 24/7",
    "Cloud Run with min instances 0",
    "Dataproc"
  ],
  "answer": 2,
  "explanation": "Cloud Run scales to zero when idle and up under load, so you pay only for handled requests."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build a BigQuery cost estimator. Write `bytes_scanned_gb(col_gb, selected, partitions_total, partitions_hit)` where `col_gb` maps column name to its size in GB (partitions are equal-sized): sum the selected columns (`None` means all columns) and scale by `partitions_hit / partitions_total`. Write `query_cost(gb, price_per_tib=6.25)` using 1 TiB = 1024 GB. Finally write `best_pricing(monthly_tib, flat_monthly, price_per_tib=6.25)` returning `'on-demand'` if on-demand cost is below `flat_monthly`, else `'capacity'`.",
  "starterCode": "def bytes_scanned_gb(col_gb, selected, partitions_total, partitions_hit):\n    pass\n\ndef query_cost(gb, price_per_tib=6.25):\n    pass\n\ndef best_pricing(monthly_tib, flat_monthly, price_per_tib=6.25):\n    pass\n\ncols = {'user_id': 100, 'event_ts': 100, 'payload': 800, 'amount': 24}\nprint(query_cost(bytes_scanned_gb(cols, ['user_id', 'amount'], 365, 7)))\n",
  "tests": "cols = {'user_id': 100, 'event_ts': 100, 'payload': 800, 'amount': 24}\nassert bytes_scanned_gb(cols, None, 365, 365) == 1024\nassert bytes_scanned_gb(cols, ['user_id', 'amount'], 365, 365) == 124\nassert abs(bytes_scanned_gb(cols, ['user_id', 'amount'], 365, 7) - 124 * 7 / 365) < 1e-9\nassert abs(query_cost(1024) - 6.25) < 1e-9\nassert abs(query_cost(124 * 7 / 365) - 0.014515) < 1e-5\nassert abs(query_cost(512, price_per_tib=5.0) - 2.5) < 1e-9\nassert best_pricing(100, 1500) == 'on-demand'\nassert best_pricing(300, 1500) == 'capacity'\nassert best_pricing(240, 1500) == 'capacity'",
  "solution": "def bytes_scanned_gb(col_gb, selected, partitions_total, partitions_hit):\n    cols = col_gb.keys() if selected is None else selected\n    return sum(col_gb[c] for c in cols) * partitions_hit / partitions_total\n\ndef query_cost(gb, price_per_tib=6.25):\n    return gb / 1024 * price_per_tib\n\ndef best_pricing(monthly_tib, flat_monthly, price_per_tib=6.25):\n    return 'on-demand' if monthly_tib * price_per_tib < flat_monthly else 'capacity'",
  "hints": [
    "Treat selected=None as all columns, then multiply by the fraction of partitions read.",
    "At 240 TiB/month on-demand is exactly 1,500, which is not below the flat fee, so capacity wins at the boundary."
  ]
}
```

> [!TIP] Interview tips
> - Say BigQuery bills by bytes scanned: select needed columns, partition and cluster, dry-run, and avoid `SELECT *` (LIMIT does not reduce the scan).
> - Map services across clouds: GCS=S3, BigQuery=Redshift/Athena, Vertex AI=SageMaker, Cloud Run=Fargate/Lambda containers.
> - Justify Cloud Run vs GKE vs VM by traffic shape, statefulness, hardware needs and operational burden.
