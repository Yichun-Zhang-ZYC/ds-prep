---
id: cloud-devops-iam-and-least-privilege
title: IAM & least privilege
estimatedMinutes: 12
difficulty: medium
tags: [security, iam, least-privilege, aws, access-control]
---

## Why it matters
Most cloud breaches come from over-permissioned identities and leaked credentials, not exotic exploits. Interviewers ask you to design access for a pipeline or ML job and explain how you limit the blast radius.

## Concept
**IAM** (Identity and Access Management) answers *who* (principal) can do *what* (action) on *which* resource, under *what conditions*. The same model exists on AWS IAM, GCP IAM and Azure RBAC.

- **Principals**: human users (prefer SSO / federation), **roles** / service accounts for workloads, and groups.
- **Policies**: JSON documents with `Effect`, `Action`, `Resource`, optional `Condition`. **Identity-based** policies attach to principals; **resource-based** policies attach to a resource (an S3 bucket policy, trust policy). Guardrails sit above them: **permission boundaries** and organization-level **SCPs** cap what is possible regardless of attached policies.
- **Evaluation logic (AWS)**: default is deny; an **explicit Deny always wins**; otherwise an Allow is needed; guardrails must also allow.
- **Wildcards**: `s3:Get*` and `arn:...:ml-data/*` match by pattern. `Action: "*"` with `Resource: "*"` is administrator access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::ml-data", "arn:aws:s3:::ml-data/train/*"]
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::ml-models/*",
      "Condition": {"StringEquals": {"aws:RequestedRegion": "us-east-1"}}
    }
  ]
}
```

**Least privilege** means granting only the actions, on only the resources, for only as long as needed:
- Separate roles per workload and environment (training job, serving, CI); never share one admin role.
- **Roles with temporary credentials** (STS `AssumeRole`, GCP workload identity, Azure managed identity, EKS IRSA) instead of long-lived access keys.
- Scope with **conditions** (source VPC/IP, MFA, region, tags, time).
- Start narrow and widen from access-denied errors; or start from logs and tighten using **last-accessed data**, IAM Access Analyzer or policy generation.
- Review regularly; remove unused roles/keys; require MFA for humans; alert on root usage and policy changes (CloudTrail / audit logs).

```bash
# Short-lived credentials instead of long-lived access keys
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/training-job \
  --role-session-name run-42 --duration-seconds 3600
```

**Common pitfalls**: `iam:PassRole` or `iam:*` permissions allow privilege escalation; wildcard resources on `s3:*`; overly broad trust policies (`Principal: "*"`); embedding keys in code or notebooks; granting data scientists production write access.

## Worked example
A nightly training job reads `s3://ml-data/train/` and writes a model to `s3://ml-models/`. Start with a role whose only statements are the two in the policy above. A request to `s3:DeleteObject` on `ml-models` matches no Allow, so it is denied by default. If an engineer later adds a blanket `Allow s3:*`, an organization SCP or an explicit `Deny s3:Delete*` still blocks deletion, because explicit deny overrides any allow. After 90 days, last-accessed data shows `s3:ListBucket` was never used, so it is removed.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A principal has an identity policy that allows s3:* and a permission boundary that does not mention S3. What is the effective result for S3 access?",
  "options": [
    "Allowed, because the identity policy allows it",
    "Denied, because effective permissions are the intersection of the identity policy and the boundary",
    "Allowed, because the boundary only applies to roles",
    "Denied only if there is an explicit Deny in the boundary"
  ],
  "answer": 1,
  "explanation": "A permission boundary is a cap: the effective permissions are what both the identity policy and the boundary allow. No allow in the boundary means no S3 access."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the best way to give an ML training job on Kubernetes access to cloud storage?",
  "options": [
    "Store an admin access key in a ConfigMap",
    "Bake an access key into the container image",
    "Bind a narrowly-scoped role to the pod's service account (workload identity) with short-lived credentials",
    "Use the root account credentials"
  ],
  "answer": 2,
  "explanation": "Workload identity issues short-lived, auto-rotated credentials tied to the pod, with a role scoped to exactly the needed buckets."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate IAM policy evaluation. Each statement is `{\"effect\": \"Allow\"|\"Deny\", \"actions\": [patterns], \"resources\": [patterns]}` with `*` wildcards (use `fnmatchcase`). `is_allowed(statements, action, resource)` returns True only if some Allow matches both action and resource and no Deny matches (explicit deny wins, default deny). `excess_actions(granted, used)` returns a sorted list of granted actions never used, the candidates to remove.",
  "starterCode": "from fnmatch import fnmatchcase\n\ndef is_allowed(statements, action, resource):\n    pass\n\ndef excess_actions(granted, used):\n    pass\n\nstmts = [{\"effect\": \"Allow\", \"actions\": [\"s3:*\"], \"resources\": [\"arn:aws:s3:::ml-data/*\"]}]\nprint(is_allowed(stmts, \"s3:GetObject\", \"arn:aws:s3:::ml-data/a.csv\"))",
  "tests": "A, D = \"Allow\", \"Deny\"\nstmts = [\n    {\"effect\": A, \"actions\": [\"s3:*\"], \"resources\": [\"arn:aws:s3:::ml-data/*\"]},\n    {\"effect\": D, \"actions\": [\"s3:Delete*\"], \"resources\": [\"*\"]},\n    {\"effect\": A, \"actions\": [\"sagemaker:CreateTrainingJob\"], \"resources\": [\"*\"]},\n]\nassert is_allowed(stmts, \"s3:GetObject\", \"arn:aws:s3:::ml-data/x.csv\") is True\nassert is_allowed(stmts, \"s3:DeleteObject\", \"arn:aws:s3:::ml-data/x.csv\") is False\nassert is_allowed(stmts, \"s3:GetObject\", \"arn:aws:s3:::other/x.csv\") is False\nassert is_allowed(stmts, \"ec2:StartInstances\", \"*\") is False\nassert is_allowed(stmts, \"sagemaker:CreateTrainingJob\", \"arn:aws:sagemaker:us-east-1:1:training-job/j\") is True\nassert is_allowed([], \"s3:GetObject\", \"x\") is False\nassert excess_actions([\"s3:GetObject\", \"s3:PutObject\", \"s3:DeleteObject\"], [\"s3:GetObject\"]) == [\"s3:DeleteObject\", \"s3:PutObject\"]\nassert excess_actions([\"a:b\"], [\"a:b\", \"c:d\"]) == []",
  "solution": "from fnmatch import fnmatchcase\n\ndef _match(patterns, value):\n    return any(fnmatchcase(value, p) for p in patterns)\n\ndef is_allowed(statements, action, resource):\n    allowed = False\n    for s in statements:\n        if _match(s[\"actions\"], action) and _match(s[\"resources\"], resource):\n            if s[\"effect\"] == \"Deny\":\n                return False\n            allowed = True\n    return allowed\n\ndef excess_actions(granted, used):\n    return sorted(set(granted) - set(used))",
  "hints": [
    "A statement applies when both an action pattern and a resource pattern match.",
    "Return False immediately on a matching Deny; otherwise remember whether any Allow matched.",
    "excess = sorted(set(granted) - set(used))."
  ]
}
```

> [!TIP] Interview tips
> - State the evaluation rule: default deny, explicit deny beats allow, guardrails (SCP/boundary) intersect with grants.
> - Prefer roles and short-lived credentials over access keys; mention workload identity for pods and CI OIDC federation.
> - Show a concrete narrow policy (specific actions, specific ARNs, conditions) rather than saying "least privilege" abstractly.
> - Mention continuous tightening: last-accessed data, Access Analyzer, audit logs, periodic access reviews.
