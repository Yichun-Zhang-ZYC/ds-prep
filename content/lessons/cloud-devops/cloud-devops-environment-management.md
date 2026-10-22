---
id: cloud-devops-environment-management
title: Environment management (dev / staging / prod)
estimatedMinutes: 10
difficulty: medium
tags: [dataops, environments, iac, config, promotion]
---

## Why it matters
"It worked in dev" is the classic failure. Interviewers probe how you separate environments, keep them close enough to trust, move changes safely from dev to prod, and handle data and secrets in non-production.

## Concept
**Typical environments**: **dev** (individual or shared sandbox, fast feedback, cheap), **staging / pre-prod** (production-like, integration and load tests, release rehearsal), **prod** (real users and data, strict access). Many teams add ephemeral **per-PR environments** and a **CI** target.

**Principles**:
- **Isolation**: separate cloud accounts/projects (strongest), VPCs, warehouses or at least schemas, with separate IAM roles and secrets. A dev job must never be able to write to prod. Audit for shared resources (a "staging" job using a prod bucket is a classic incident).
- **Parity**: same code, same container image, same IaC modules; only configuration differs (sizes, replica counts, endpoints). Parity bugs hide in different versions, data volumes and permissions.
- **Config outside code** (twelve-factor): layered config (base + per-environment overrides), environment variables, config maps; secrets from a secrets manager, never in Git.
- **Build once, promote**: build an immutable artifact (image tagged by commit SHA, model version) once, then promote the same artifact dev -> staging -> prod. Do not rebuild per environment.
- **Infrastructure as code**: one Terraform module with per-environment variable files or workspaces; changes go through PR review and `plan` before `apply`.

```hcl
# Same module, different variables per environment
# envs/prod.tfvars
env            = "prod"
instance_type  = "m6i.2xlarge"
min_replicas   = 3
db_name        = "analytics_prod"
enable_alerts  = true

# envs/dev.tfvars
env            = "dev"
instance_type  = "t3.medium"
min_replicas   = 1
db_name        = "analytics_dev"
enable_alerts  = false
```

**Data in non-prod**: never copy raw production PII into dev. Use synthetic data, a **sampled and masked/anonymized** subset, or zero-copy clones with column masking; keep staging data fresh enough to expose schema and volume issues. In dbt, use targets so dev writes to a personal schema and prod to the real one.

```yaml
# dbt profiles.yml: one project, three targets
analytics:
  target: dev
  outputs:
    dev:  {type: snowflake, schema: "dbt_{{ env_var('USER') }}", warehouse: XS}
    ci:   {type: snowflake, schema: "ci_pr_{{ env_var('PR') }}", warehouse: XS}
    prod: {type: snowflake, schema: analytics, warehouse: L}
```

**Release flow**: PR -> CI in an ephemeral env -> merge -> auto-deploy to staging -> automated smoke/integration tests -> approval or progressive rollout (canary, blue/green, feature flags) -> prod, with fast rollback. For ML, the **model registry** stages (staging/production) play the same role, plus shadow or canary traffic.

**Cost**: right-size lower envs, auto-shutdown dev clusters and warehouses at night, TTL on ephemeral environments.

## Worked example
A team has one base config and per-environment overrides. Prod sets `replicas: 4`, `debug: false`, `db.host: prod-db`, and inherits `db.pool: 5` from base, a deep merge rather than replacing the whole `db` block. An audit of resolved configs finds staging and prod both point at `bucket: data-shared`. A staging backfill could overwrite production data, so the team gives staging its own bucket before the next release.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does \"build once, deploy many\" mean?",
  "options": [
    "Rebuild the image in each environment to match its settings",
    "Create one immutable artifact and promote the identical artifact through environments, varying only configuration",
    "Deploy to all environments at once",
    "Build only in production"
  ],
  "answer": 1,
  "explanation": "The artifact tested in staging must be exactly what runs in prod; per-environment differences belong in configuration, not in a rebuild."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the safest source of data for a development environment?",
  "options": [
    "A full copy of production including PII",
    "Production credentials with read-only access",
    "Synthetic data or a masked/anonymized sample",
    "Whatever is on a developer's laptop"
  ],
  "answer": 2,
  "explanation": "Non-prod environments have weaker controls, so use synthetic or masked data to avoid exposing sensitive information."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate layered config and an isolation audit. `deep_merge(base, override)` returns a new dict where nested dicts are merged recursively and other values from `override` replace those in `base` (do not mutate the inputs). `resolve_config(base, envs, env)` applies `envs[env]` over `base` (an unknown env returns a copy of base). `shared_resources(configs, keys)` takes `{env: {key: value}}` and returns a list of `(key, env_a, env_b)` for every pair of environments (alphabetical order within a pair) that have the same value for that key, ordered by the order of `keys`, then pairs in alphabetical order.",
  "starterCode": "from itertools import combinations\n\ndef deep_merge(base, override):\n    pass\n\ndef resolve_config(base, envs, env):\n    pass\n\ndef shared_resources(configs, keys):\n    pass\n\nbase = {\"replicas\": 1, \"db\": {\"host\": \"localhost\", \"pool\": 5}}\nprint(resolve_config(base, {\"prod\": {\"replicas\": 4}}, \"prod\"))",
  "tests": "base = {\"a\": 1, \"db\": {\"host\": \"x\", \"port\": 5432}}\nover = {\"db\": {\"host\": \"y\"}, \"b\": 2}\nmerged = deep_merge(base, over)\nassert merged == {\"a\": 1, \"db\": {\"host\": \"y\", \"port\": 5432}, \"b\": 2}\nassert base == {\"a\": 1, \"db\": {\"host\": \"x\", \"port\": 5432}}\nassert over == {\"db\": {\"host\": \"y\"}, \"b\": 2}\ncfg = {\"replicas\": 1, \"debug\": True, \"db\": {\"host\": \"localhost\", \"pool\": 5}}\nenvs = {\"prod\": {\"replicas\": 4, \"debug\": False, \"db\": {\"host\": \"prod-db\"}}}\nassert resolve_config(cfg, envs, \"prod\") == {\"replicas\": 4, \"debug\": False, \"db\": {\"host\": \"prod-db\", \"pool\": 5}}\nassert resolve_config(cfg, envs, \"dev\") == cfg\nconfigs = {\n    \"dev\": {\"db\": \"dev-db\", \"bucket\": \"data-dev\", \"region\": \"us-east-1\"},\n    \"staging\": {\"db\": \"stg-db\", \"bucket\": \"data-shared\", \"region\": \"us-east-1\"},\n    \"prod\": {\"db\": \"prod-db\", \"bucket\": \"data-shared\", \"region\": \"us-east-1\"},\n}\nassert shared_resources(configs, [\"db\", \"bucket\"]) == [(\"bucket\", \"prod\", \"staging\")]\nassert shared_resources(configs, [\"region\"]) == [(\"region\", \"dev\", \"prod\"), (\"region\", \"dev\", \"staging\"), (\"region\", \"prod\", \"staging\")]\nassert shared_resources(configs, [\"missing\"]) == []",
  "solution": "from itertools import combinations\n\ndef deep_merge(base, override):\n    out = dict(base)\n    for k, v in override.items():\n        if isinstance(v, dict) and isinstance(out.get(k), dict):\n            out[k] = deep_merge(out[k], v)\n        else:\n            out[k] = v\n    return out\n\ndef resolve_config(base, envs, env):\n    return deep_merge(base, envs.get(env, {}))\n\ndef shared_resources(configs, keys):\n    found = []\n    for key in keys:\n        for a, b in combinations(sorted(configs), 2):\n            if key in configs[a] and key in configs[b] and configs[a][key] == configs[b][key]:\n                found.append((key, a, b))\n    return found",
  "hints": [
    "Copy base with dict(base), then recurse only when both values are dicts.",
    "resolve_config is deep_merge(base, envs.get(env, {})).",
    "itertools.combinations(sorted(configs), 2) yields each environment pair once in order."
  ]
}
```

> [!TIP] Interview tips
> - Lead with isolation (separate accounts, roles, secrets) and parity (same artifact, config differs).
> - Say "build once, promote", with config and secrets injected per environment.
> - Cover data: synthetic or masked data outside prod, access controls, and cost controls for lower envs.
> - For ML and data teams, mention dbt targets, model registry stages and ephemeral per-PR environments.
