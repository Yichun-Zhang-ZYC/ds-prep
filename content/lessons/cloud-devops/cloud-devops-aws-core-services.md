---
id: cloud-devops-aws-core-services
title: "AWS core services (EC2, S3, IAM, Lambda, RDS, SageMaker)"
estimatedMinutes: 14
difficulty: medium
tags: [aws, cloud, iam, s3, lambda, sagemaker]
---

## Why it matters

Most data science and ML roles run on AWS. Interviewers expect you to name the right service for storage, compute, identity, databases and model serving, and to explain the trade-offs between them.

## Concept

**Compute**:
- **EC2**: virtual machines you manage (instance families: general `m`, compute `c`, memory `r`, GPU `p`/`g`). Pricing: on-demand, reserved/savings plans (about 30-70% off for commitment), **spot** (up to ~90% off, can be reclaimed with 2 minutes' notice, good for fault-tolerant training).
- **Lambda**: functions triggered by events, billed per request and per GB-second, up to 15 minutes, scales to zero.
- **ECS/EKS/Fargate**: containers on your VMs or serverless.

**Storage and databases**:
- **S3**: object storage, 11 nines of durability, flat key namespace, the data-lake foundation. Storage classes (Standard, Infrequent Access, Glacier) trade retrieval cost for storage cost; lifecycle rules move data automatically; versioning and encryption are options. Strong read-after-write consistency.
- **EBS** (block disk for one EC2) vs **EFS** (shared file system).
- **RDS/Aurora**: managed relational DB (Postgres, MySQL) with backups, Multi-AZ failover and read replicas. **DynamoDB**: key-value, single-digit-millisecond at any scale. **Redshift**: columnar warehouse. **Athena**: SQL directly on S3, billed per data scanned.

**IAM** (identity and access management) controls who can do what. Principals (users, **roles**) get **policies**: JSON with `Effect`, `Action`, `Resource` and optional `Condition`. Evaluation order: everything is denied by default; an explicit `Allow` grants access; an explicit `Deny` always wins. Prefer **roles** with temporary credentials (EC2 instance profiles, Lambda execution roles) over long-lived access keys, and grant least privilege.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::acme-features/*" },
    { "Effect": "Deny", "Action": "s3:*",
      "Resource": "arn:aws:s3:::acme-features/pii/*" }
  ]
}
```

**SageMaker** is the managed ML platform: notebooks/Studio, processing and training jobs (on-demand or spot, distributed), hyperparameter tuning, a model registry, real-time endpoints (autoscaled, multi-model, A/B production variants), serverless and async inference, batch transform, and Pipelines for orchestration. Related: **Bedrock** for hosted foundation models, **ECR** for images, **CloudWatch** for logs and metrics, **VPC** for network isolation.

## Worked example

Design a fraud-model stack: raw events land in **S3** (lifecycle to Infrequent Access after 30 days); **Athena** and a nightly **SageMaker** training job (spot instances, checkpoints to S3) build the model; the model goes to a SageMaker real-time **endpoint** behind autoscaling; features and decisions are stored in **DynamoDB**; the training role can read `s3://acme-features/*` but is explicitly denied `pii/*`. In the policy above, `s3:GetObject` on `acme-features/pii/x.csv` matches both the Allow and the Deny, so the result is **denied**.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A role has an Allow for `s3:*` on a bucket and a separate Deny for `s3:DeleteObject`. Can it delete objects?",
  "options": [
    "Yes, Allow is more specific",
    "Yes, the later statement wins",
    "No, an explicit Deny always overrides Allow",
    "Only with MFA"
  ],
  "answer": 2,
  "explanation": "IAM evaluation: default deny, Allow grants, but any explicit Deny takes precedence."
}
```

```quiz
{
  "id": "q2",
  "question": "You need cheap GPU capacity for a restartable training job. Which purchase option fits best?",
  "options": [
    "On-demand only",
    "Spot instances with checkpointing",
    "Reserved instances for one year",
    "Lambda"
  ],
  "answer": 1,
  "explanation": "Spot is much cheaper but can be reclaimed; checkpoints let the job resume, so interruption costs little."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate IAM policy evaluation. Write `is_allowed(statements, action, resource)` where each statement is a dict with `Effect` (`'Allow'` or `'Deny'`), `Action` and `Resource` (each a string or a list of strings, with `*` wildcards; use `fnmatch.fnmatchcase`). A statement matches when both action and resource match. Return `False` if any matching statement is a Deny, `True` if some matching statement is an Allow, otherwise `False` (implicit deny).",
  "starterCode": "from fnmatch import fnmatchcase\n\ndef is_allowed(statements, action, resource):\n    pass\n\nst = [{'Effect': 'Allow', 'Action': 's3:*', 'Resource': 'arn:aws:s3:::b/*'}]\nprint(is_allowed(st, 's3:GetObject', 'arn:aws:s3:::b/x'))\n",
  "tests": "st = [\n    {'Effect': 'Allow', 'Action': ['s3:GetObject', 's3:PutObject'], 'Resource': 'arn:aws:s3:::acme-features/*'},\n    {'Effect': 'Deny', 'Action': 's3:*', 'Resource': 'arn:aws:s3:::acme-features/pii/*'},\n]\nassert is_allowed(st, 's3:GetObject', 'arn:aws:s3:::acme-features/train.csv') is True\nassert is_allowed(st, 's3:GetObject', 'arn:aws:s3:::acme-features/pii/u.csv') is False\nassert is_allowed(st, 's3:DeleteObject', 'arn:aws:s3:::acme-features/train.csv') is False\nassert is_allowed(st, 's3:GetObject', 'arn:aws:s3:::other/x') is False\nassert is_allowed([], 'ec2:RunInstances', '*') is False\nassert is_allowed([{'Effect': 'Allow', 'Action': '*', 'Resource': '*'}], 'iam:CreateUser', 'arn:aws:iam::1:user/a') is True\nassert is_allowed([{'Effect': 'Allow', 'Action': 'S3:getobject', 'Resource': '*'}], 's3:GetObject', 'x') is False",
  "solution": "from fnmatch import fnmatchcase\n\ndef _match(patterns, value):\n    if isinstance(patterns, str):\n        patterns = [patterns]\n    return any(fnmatchcase(value, p) for p in patterns)\n\ndef is_allowed(statements, action, resource):\n    allowed = False\n    for s in statements:\n        if _match(s['Action'], action) and _match(s['Resource'], resource):\n            if s['Effect'] == 'Deny':\n                return False\n            if s['Effect'] == 'Allow':\n                allowed = True\n    return allowed",
  "hints": [
    "Normalise a string into a one-element list so Action and Resource are handled the same way.",
    "Don't return True early on the first Allow; a later Deny must still win."
  ]
}
```

> [!TIP] Interview tips
> - Match services to needs: S3 for the lake, Athena/Redshift for SQL, Lambda for light event work, EC2/EKS for heavy compute, SageMaker for training and serving.
> - State the IAM rules precisely: default deny, explicit deny wins, prefer roles over access keys, least privilege.
> - Cost angles interviewers like: spot for training, S3 lifecycle tiers, serverless for spiky traffic, Savings Plans for steady load.
