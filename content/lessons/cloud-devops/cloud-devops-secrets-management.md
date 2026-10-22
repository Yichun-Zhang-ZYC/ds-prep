---
id: cloud-devops-secrets-management
title: Secrets management
estimatedMinutes: 10
difficulty: medium
tags: [security, secrets, vault, kms, rotation]
---

## Why it matters
Leaked API keys and database passwords in Git, notebooks and container images are among the most common real-world breaches. Interviewers check that you know where secrets should live, how they reach the workload, and what to do when one leaks.

## Concept
A **secret** is any credential: passwords, API keys, tokens, private keys, connection strings. Rules of thumb:
- **Never** commit secrets to Git, bake them into images, put them in notebooks, or print them in logs. Environment variables are convenient but leak through crash dumps, `docker inspect` and child processes.
- Store them in a **secrets manager**: AWS Secrets Manager / SSM Parameter Store, GCP Secret Manager, Azure Key Vault, or HashiCorp Vault. They provide encryption (envelope encryption with a **KMS** key), access control via IAM, versioning, audit logs and rotation.
- Let the workload **fetch at runtime using its own identity** (IAM role, workload identity). Then there is no "secret zero" to distribute.

```bash
# Fetch at runtime with the workload's own identity; nothing stored in the image or repo
aws secretsmanager get-secret-value --secret-id prod/feature-store/db \
  --query SecretString --output text
```

**Kubernetes**: a `Secret` is only base64-encoded, not encrypted. Turn on encryption at rest, restrict RBAC, and prefer syncing from a real manager with the **External Secrets Operator** or the Secrets Store CSI driver. GitOps repos can hold encrypted secrets (**Sealed Secrets**, **SOPS**) but never plaintext.

```yaml
# External Secrets Operator: sync from the cloud secret manager into a Kubernetes Secret
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata: {name: db-creds}
spec:
  refreshInterval: 1h
  secretStoreRef: {name: aws-secrets, kind: ClusterSecretStore}
  target: {name: db-creds}
  data:
    - secretKey: password
      remoteRef: {key: prod/feature-store/db, property: password}
```

**Rotation**: rotate on a schedule (e.g. 90 days) and immediately after any suspected exposure. Applications must reload without redeploying, or use two valid versions during the swap. **Dynamic secrets** (Vault database engine, STS tokens) are generated per workload with a short TTL and revoked automatically, which is better than rotating shared passwords.

**CI/CD**: use **OIDC federation** from the CI provider to the cloud (no stored cloud keys); mask secrets in logs; scope secrets per environment; do not expose production secrets to pull-request builds from forks.

**Detect and respond**: run pre-commit and CI scanners (gitleaks, trufflehog, detect-secrets, GitHub push protection). If a secret leaks: **revoke and rotate first**, then investigate usage in audit logs, then remove it from history. Rewriting Git history does not un-leak a key that was already pushed.

## Worked example
A feature-store service needs a Postgres password. Instead of `DB_PASSWORD=... ` in the repo, the password sits in Secrets Manager encrypted with a KMS key. The pod's service account maps to a role allowed `secretsmanager:GetSecretValue` on that one secret only. The External Secrets Operator syncs it hourly. Rotation every 90 days creates a new version; pods pick it up at their next refresh. A scanner flags a developer's accidental `password = "hunter2hunter2"` in a PR, blocking the merge before it reaches `main`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A developer pushes an AWS access key to a public repo and force-pushes to remove the commit. What is the right response?",
  "options": [
    "Nothing; the history was rewritten",
    "Revoke/rotate the key immediately, then review audit logs for misuse",
    "Make the repo private",
    "Wait for the scanner to disable it"
  ],
  "answer": 1,
  "explanation": "Assume the key is compromised once pushed (bots scrape within minutes). Revoke and rotate first, then check CloudTrail for use."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is a Kubernetes Secret not sufficient protection by default?",
  "options": [
    "It is limited to 1 KB",
    "It is only base64-encoded, so anyone who can read it (or etcd) sees the value unless encryption at rest and RBAC are configured",
    "It cannot be mounted into pods",
    "It is deleted when the pod restarts"
  ],
  "answer": 1,
  "explanation": "Base64 is an encoding, not encryption. Enable etcd encryption, restrict access, and prefer an external manager."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build two small secrets-hygiene tools. `scan_secrets(lines)` returns `(line_number, kind)` tuples (1-based): `aws_access_key` if the line matches `AKIA` followed by 16 uppercase letters or digits; otherwise `hardcoded_credential` if a name containing password/passwd/secret/api_key/token is assigned (`=` or `:`) a literal value of 8+ non-space, non-quote characters that does not start with `$`, `os.environ` or `getenv`. `rotation_status(age_days, max_age_days, warn_fraction=0.8)` returns `\"expired\"`, `\"rotate_soon\"` or `\"ok\"`.",
  "starterCode": "import re\n\ndef scan_secrets(lines):\n    pass\n\ndef rotation_status(age_days, max_age_days, warn_fraction=0.8):\n    pass\n\nprint(scan_secrets(['aws_key = \"AKIAIOSFODNN7EXAMPLE\"', 'password = os.environ[\"DB_PASSWORD\"]']))",
  "tests": "lines = [\n    'aws_key = \"AKIAIOSFODNN7EXAMPLE\"',\n    'password = \"hunter2hunter2\"',\n    'password = os.environ[\"DB_PASSWORD\"]',\n    'API_TOKEN: ${API_TOKEN}',\n    'print(\"hello\")',\n    'token=abc',\n    \"db_secret: 's3cr3t-value-123'\",\n]\nassert scan_secrets(lines) == [(1, \"aws_access_key\"), (2, \"hardcoded_credential\"), (7, \"hardcoded_credential\")]\nassert scan_secrets([]) == []\nassert rotation_status(30, 90) == \"ok\"\nassert rotation_status(71, 90) == \"ok\"\nassert rotation_status(72, 90) == \"rotate_soon\"\nassert rotation_status(89, 90) == \"rotate_soon\"\nassert rotation_status(90, 90) == \"expired\"\nassert rotation_status(200, 90) == \"expired\"",
  "solution": "import re\n\nAWS_KEY = re.compile(r\"AKIA[0-9A-Z]{16}\")\nCRED = re.compile(\n    r\"(?i)(password|passwd|secret|api_?key|token)\\s*[=:]\\s*['\\\"]?(?!\\$|os\\.environ|getenv)[^\\s'\\\"]{8,}\"\n)\n\ndef scan_secrets(lines):\n    findings = []\n    for i, line in enumerate(lines, start=1):\n        if AWS_KEY.search(line):\n            findings.append((i, \"aws_access_key\"))\n        elif CRED.search(line):\n            findings.append((i, \"hardcoded_credential\"))\n    return findings\n\ndef rotation_status(age_days, max_age_days, warn_fraction=0.8):\n    if age_days >= max_age_days:\n        return \"expired\"\n    if age_days >= warn_fraction * max_age_days:\n        return \"rotate_soon\"\n    return \"ok\"",
  "hints": [
    "Check the AWS pattern first with `elif` for the generic one so each line yields one finding.",
    "Use a negative lookahead `(?!\\$|os\\.environ|getenv)` right after the optional opening quote.",
    "expired when age >= max; rotate_soon when age >= warn_fraction * max."
  ]
}
```

> [!TIP] Interview tips
> - Describe the full lifecycle: store (encrypted, KMS), deliver (runtime fetch by identity), rotate, audit, and revoke.
> - Mention short-lived and dynamic credentials and OIDC for CI, which remove long-lived keys.
> - Know the leak playbook: rotate first, then investigate, then clean history.
> - Call out that env vars, `.env` files and base64 Kubernetes Secrets are not real protection on their own.
