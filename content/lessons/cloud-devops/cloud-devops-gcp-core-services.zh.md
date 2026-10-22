---
id: cloud-devops-gcp-core-services
title: "GCP 核心服务（GCS、BigQuery、Vertex AI、Cloud Run）"
---

## 为什么重要

由于 BigQuery 和 Vertex AI，GCP 在数据和 ML 团队中很受欢迎。面试官会问每个服务的用途、BigQuery 如何计费，以及何时选 Cloud Run 而不是虚拟机或 Kubernetes。

## 概念

**Cloud Storage（GCS）**：以桶为单位的对象存储（Standard、Nearline、Coldline、Archive 等类别）。它是原始数据、模型制品和训练数据集的落地区，BigQuery 和 Vertex AI 可直接读取。通过 IAM（统一的桶级访问）和签名 URL 控制访问。

**BigQuery**：无服务器的列式数据仓库，存储与计算分离。你只写 SQL，Google 负责分配 slot，无需规划集群规模。要点：
- **计费**：*按需*模式按**扫描**的数据量（每 TiB，标价约 \$6.25/TiB，请以当前价格为准）收费，*容量*模式则以固定费率预留 slot。存储单独计费，长期存储（90 天未修改）更便宜。
- **列式**：只读取你选择的列，所以 `SELECT *` 是典型的成本错误。
- **分区**（按日期或整数范围）和**聚簇**（最多按 4 列对数据块排序）能减少扫描字节数。**dry run** 可在运行前显示成本。
- **BigQuery ML** 用 SQL 训练模型（`CREATE MODEL`），还支持对 GCS 的联邦查询和流式写入。

```sql
-- Partitioned by DATE(event_ts), clustered by user_id
SELECT user_id, amount
FROM `proj.ds.transactions`
WHERE DATE(event_ts) BETWEEN '2026-01-01' AND '2026-01-07'   -- prunes partitions
  AND user_id = 42;                                           -- clustering prunes blocks
```

**Vertex AI**：托管的 ML 平台：Workbench Notebook、自定义训练作业（你自己的容器，GPU/TPU）、AutoML、超参调优、Pipelines（基于 Kubeflow）、模型注册表、支持自动扩缩和流量切分的在线 endpoint、批量预测、Feature Store，以及可接地和微调的基础模型（Gemini）。它对应 AWS 的 SageMaker。

**Cloud Run**：运行任意无状态容器（或函数），随请求并发自动扩缩，可**缩容到零**；你为处理请求的时间付费（处理请求期间按每 100 毫秒的 CPU/内存计费，除非设置为始终分配 CPU）。非常适合流量有尖峰的模型 API 和 webhook。限制：请求超时、没有本地持久磁盘、冷启动（可用 `--min-instances` 缓解）。需要精细控制、大规模 GPU 或许多协同服务时选 **GKE**；长时间运行或特殊虚拟机选 **Compute Engine**。其他常用服务：**Pub/Sub**（消息）、**Dataflow**（Beam 批/流）、**Dataproc**（托管 Spark）、**Cloud Composer**（托管 Airflow）。

```bash
bq query --dry_run --use_legacy_sql=false 'SELECT ...'   # prints bytes that would be processed
gcloud run deploy scorer --image gcr.io/proj/scorer --min-instances 0 --concurrency 80
```

## 示例讲解

`transactions` 表共 1,024 GB：`user_id` 100 GB、`event_ts` 100 GB、`payload` 800 GB、`amount` 24 GB，分成 365 个按日分区。按 \$6.25/TiB 计：对整张表执行 `SELECT *` 扫描 1,024 GB $= 1$ TiB，费用 **\$6.25**。只选 `user_id, amount` 扫描 124 GB，约 \$0.757。再加上只过滤 365 个日期分区中的 7 个，则扫描 $124 \times 7/365 \approx 2.38$ GB，费用 $2.38/1024 \times 6.25 \approx$ **\$0.0145**。结果相同，仅靠列裁剪和分区裁剪就便宜了约 430 倍。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 BigQuery 按需计费下，什么最直接地决定一次查询的成本？",
  "options": [
    "查询运行时间",
    "所读取的列和分区所扫描的字节数",
    "返回的行数",
    "JOIN 的数量"
  ],
  "explanation": "按需计费按处理的字节数收费。选择更少的列并裁剪分区可以降低成本；LIMIT 不会。"
}
```

```quiz
{
  "id": "q2",
  "question": "你有一个流量有突发、空闲期很长且没有特殊硬件需求的模型 API。哪个服务最合适？",
  "options": [
    "专用的 GKE 集群",
    "24/7 运行的 Compute Engine 虚拟机",
    "最小实例数为 0 的 Cloud Run",
    "Dataproc"
  ],
  "explanation": "Cloud Run 空闲时缩容到零、负载上升时扩容，所以只为处理的请求付费。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "构建一个 BigQuery 成本估算器。编写 `bytes_scanned_gb(col_gb, selected, partitions_total, partitions_hit)`，其中 `col_gb` 把列名映射到其大小（GB，各分区大小相同）：对所选列求和（`None` 表示所有列），再乘以 `partitions_hit / partitions_total`。编写 `query_cost(gb, price_per_tib=6.25)`，其中 1 TiB = 1024 GB。最后编写 `best_pricing(monthly_tib, flat_monthly, price_per_tib=6.25)`：如果按需成本低于 `flat_monthly` 则返回 `'on-demand'`，否则返回 `'capacity'`。",
  "hints": [
    "把 selected=None 当作所有列，然后乘以读取的分区比例。",
    "每月 240 TiB 时按需成本恰好为 1,500，不低于固定费用，所以在边界处选 capacity。"
  ]
}
```

> [!TIP] 面试技巧
> - 要说明 BigQuery 按扫描字节数计费：只选需要的列、分区和聚簇、先 dry run，避免 `SELECT *`（LIMIT 不会减少扫描量）。
> - 能跨云对应服务：GCS=S3，BigQuery=Redshift/Athena，Vertex AI=SageMaker，Cloud Run=Fargate/Lambda 容器。
> - 按流量形态、是否有状态、硬件需求和运维负担来论证选择 Cloud Run、GKE 还是虚拟机。
