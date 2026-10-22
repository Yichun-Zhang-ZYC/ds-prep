---
id: cloud-devops-terraform
title: "Terraform"
estimatedMinutes: 12
difficulty: medium
tags: [terraform, iac, devops, cloud]
---

## Why it matters

Infrastructure as code turns clusters, buckets and IAM roles into reviewed, versioned, reproducible text. Terraform is the most common tool, so expect questions on state, plan/apply, modules and how teams collaborate safely.

## Concept

Terraform is **declarative**: you describe the desired end state in HCL and the engine works out the create/update/delete steps. It is cloud-agnostic through **providers** (AWS, GCP, Azure, Kubernetes, Datadog, ...).

```hcl
terraform {
  backend "s3" {                       # remote state + locking
    bucket         = "acme-tf-state"
    key            = "ml-platform/prod.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-locks"
  }
}

variable "env" { type = string }

resource "aws_s3_bucket" "features" {
  bucket = "acme-features-${var.env}"
  tags   = { team = "ml" }
}

output "bucket_arn" { value = aws_s3_bucket.features.arn }
```

**Core workflow**: `init` → `plan` → `apply`. Plan compares three things: your configuration (desired), the **state file** (what Terraform believes it manages) and the real infrastructure (refreshed from the provider's API). The output marks each resource `+` create, `~` update in place, `-/+` replace (destroy and recreate) or `-` destroy.

```bash
terraform init      # download providers, configure backend
terraform plan -out=tfplan   # diff desired vs state vs real; changes nothing
terraform apply tfplan       # execute exactly that plan
terraform destroy            # tear everything down
```

**State** maps config addresses to real resource IDs. It can contain secrets, so never commit it. For teams use a **remote backend** (S3 + lock table, GCS, Terraform Cloud) so there is one source of truth and **locking** prevents two concurrent applies. Use separate state per environment or component to limit blast radius.

**Reuse and safety**:
- **Modules** package a set of resources behind input variables and outputs (a VPC module, a SageMaker endpoint module); pin their versions.
- **Drift** is real infrastructure changed outside Terraform; `plan` surfaces it. Fix by re-applying or `terraform import`.
- Some attribute changes force **replacement** (e.g. renaming an instance); read the plan for `-/+` and use `lifecycle { prevent_destroy = true }` on stateful resources.
- `count`/`for_each` create multiple instances; prefer `for_each` with stable keys so removing one item does not shift the rest.
- Terraform keeps a dependency graph from references, so independent resources are created in parallel.

## Worked example

A teammate runs `terraform plan` on the config above with `env = "prod"`. State already has `acme-features-prod` with tags `{team = "ml"}`. You change the tags to `{team = "ml", owner = "fraud"}` and add a new bucket resource. The plan shows `~ update in place` for the first bucket (tags only) and `+ create` for the second: **1 to add, 1 to change, 0 to destroy**. If instead you changed the bucket *name*, the plan would show `-/+ replace` because bucket names are immutable, and an interviewer would expect you to flag the data-loss risk.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the Terraform state file for?",
  "options": [
    "Caching provider plugins",
    "Mapping config resources to real resource IDs and attributes so plan can compute a diff",
    "Storing the HCL source",
    "Logging apply output"
  ],
  "answer": 1,
  "explanation": "State records what Terraform manages. Without it, Terraform could not tell which real resources correspond to your config."
}
```

```quiz
{
  "id": "q2",
  "question": "Two engineers run `terraform apply` against the same remote state at once. What prevents corruption?",
  "options": [
    "Terraform merges the plans",
    "Nothing; the last write wins",
    "State locking in the backend (e.g. a DynamoDB lock table)",
    "Running plan first"
  ],
  "answer": 2,
  "explanation": "Backends that support locking hold a lock during apply, so the second run waits or fails instead of racing."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate `terraform plan`. Write `plan(state, desired, immutable=())` where `state` and `desired` map resource names to attribute dicts. Return a dict with sorted lists `create`, `update`, `replace`, `destroy` (and `noop`). A name only in desired is created; only in state is destroyed; with equal attributes is a no-op; otherwise it is an update, unless any changed attribute key is in `immutable`, in which case it is a replace.",
  "starterCode": "def plan(state, desired, immutable=()):\n    pass\n\nstate = {'bucket': {'name': 'a', 'tags': 1}, 'old': {'x': 1}}\ndesired = {'bucket': {'name': 'a', 'tags': 2}, 'new': {'x': 1}}\nprint(plan(state, desired))\n",
  "tests": "state = {'bucket': {'name': 'a', 'tags': 1}, 'old': {'x': 1}, 'same': {'k': 1}, 'db': {'name': 'd1', 'size': 10}}\ndesired = {'bucket': {'name': 'a', 'tags': 2}, 'new': {'x': 1}, 'same': {'k': 1}, 'db': {'name': 'd2', 'size': 10}}\np = plan(state, desired, immutable=('name',))\nassert p['create'] == ['new'], p\nassert p['update'] == ['bucket'], p\nassert p['replace'] == ['db'], p\nassert p['destroy'] == ['old'], p\nassert p['noop'] == ['same'], p\nq = plan({}, {})\nassert q == {'create': [], 'update': [], 'replace': [], 'destroy': [], 'noop': []}\nr = plan({'a': {'n': 1}}, {'a': {'n': 1, 'extra': 2}}, immutable=('n',))\nassert r['update'] == ['a'] and r['replace'] == []",
  "solution": "def plan(state, desired, immutable=()):\n    out = {'create': [], 'update': [], 'replace': [], 'destroy': [], 'noop': []}\n    for name in sorted(set(state) | set(desired)):\n        if name not in state:\n            out['create'].append(name)\n        elif name not in desired:\n            out['destroy'].append(name)\n        elif state[name] == desired[name]:\n            out['noop'].append(name)\n        else:\n            keys = set(state[name]) | set(desired[name])\n            changed = {k for k in keys if state[name].get(k) != desired[name].get(k)}\n            if changed & set(immutable):\n                out['replace'].append(name)\n            else:\n                out['update'].append(name)\n    return out",
  "hints": [
    "Iterate over the sorted union of names so every list comes out sorted.",
    "Changed keys = keys (from both dicts) whose values differ; a missing key counts as None."
  ]
}
```

> [!TIP] Interview tips
> - Explain the three-way compare (config vs state vs real) and why `plan` before `apply` is the safety net; apply a saved plan in CI.
> - Remote state with locking, separate state per environment, and never committing state (it can hold secrets) are standard follow-ups.
> - Know drift, `import`, replacement (`-/+`), `prevent_destroy`, and why modules should be version-pinned.
