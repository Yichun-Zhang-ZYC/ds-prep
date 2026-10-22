---
id: cloud-devops-terraform-state-and-modules
title: Terraform state and modules
estimatedMinutes: 12
difficulty: medium
tags: [terraform, iac, state, modules]
---

## Why it matters
Terraform is the default infrastructure-as-code tool, and interviews go beyond `terraform apply`: where state lives, why two people applying at once corrupts things, how to split a monolith into modules, and what happens when the real world drifts from the code. Data and ML teams hit this when they manage warehouses, buckets, IAM and GPU clusters as code. See the Terraform lesson for HCL basics; this one is about state and structure.

## Concept
**State** (`terraform.tfstate`) maps each resource address in your code (`aws_s3_bucket.raw`) to a real object ID and its last known attributes. Terraform plans by diffing three things: config (desired), state (last known) and a refresh of the real world.

**Remote state with locking**: never keep state on a laptop. Use a remote backend (S3 plus a lock mechanism such as S3 native locking or DynamoDB, GCS, Azure Blob, Terraform Cloud). The lock stops two concurrent applies from corrupting state. State often contains secrets in plaintext, so encrypt it, version it and restrict access.

**Common state operations**:
- `terraform import` (or `import` blocks) adopts an existing resource into state.
- `terraform state mv` / `moved` blocks rename or relocate a resource without destroy and recreate.
- `terraform state rm` stops managing a resource without deleting it.
- `terraform plan -refresh-only` detects **drift** (someone changed it in the console).

**Modules** are reusable folders of `.tf` files with `variable` inputs and `output` values. Guidelines: small, single-purpose, versioned (pin `version` or a git tag), few required inputs with sane defaults, no provider configuration inside (pass it from the root). Prefer composition over deep nesting.

**Splitting state**: one giant state means slow plans and a huge blast radius. Split by lifecycle and ownership (network, data platform, per-service) and per environment (separate state keys or directories rather than relying on workspaces alone). Share values across stacks with outputs plus `terraform_remote_state` or a data source lookup.

**Pitfalls**: editing state by hand; `count` with lists (removing item 0 shifts addresses, so prefer `for_each` with stable keys); secrets in variables ending up in state; `-target` as a habit; renaming a resource in code without a `moved` block (plans a destroy and create).

## Worked example
A team renames `aws_s3_bucket.data` to `aws_s3_bucket.raw` in code. The plan shows **1 to destroy, 1 to add**, which would delete the bucket's data. Fix: add

```hcl
moved {
  from = aws_s3_bucket.data
  to   = aws_s3_bucket.raw
}
```

and the plan becomes "0 to add, 0 to change, 0 to destroy" (state address updated only).

Second case: a teammate opens a bucket to public in the console. `terraform plan` reports `acl: "public-read" -> "private"` (1 to change). Applying reverts the drift; if the console change was intentional, update the code instead so code stays the source of truth.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two engineers run `terraform apply` at the same time against the same remote state. What protects the state?",
  "options": [
    "Terraform merges both plans automatically",
    "State locking in the backend, so the second run waits or fails",
    "Each apply gets its own copy of state",
    "Nothing; the last writer wins by design"
  ],
  "answer": 1,
  "explanation": "Backends with locking take a lock for the duration of a write operation, preventing concurrent applies from corrupting state."
}
```

```quiz
{
  "id": "q2",
  "question": "You rename a resource in code and plan shows destroy plus create. What is the safest fix?",
  "options": [
    "Run apply and recreate it",
    "Delete the state file",
    "Add a `moved` block (or `terraform state mv`) so state follows the rename",
    "Use `-target` on the new resource"
  ],
  "answer": 2,
  "explanation": "`moved` blocks or `state mv` update the address in state so no real infrastructure changes."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `plan(desired, state)` mimicking Terraform's diff. Both are dicts of resource address to attribute dict. Return a dict with sorted lists under `create` (in desired only), `update` (in both but attributes differ) and `delete` (in state only).",
  "starterCode": "def plan(desired, state):\n    \"\"\"Return {'create': [...], 'update': [...], 'delete': [...]} (sorted address lists).\"\"\"\n    pass\n\ndesired = {\"aws_s3_bucket.raw\": {\"acl\": \"private\"}, \"aws_s3_bucket.logs\": {\"acl\": \"private\"}}\nstate = {\"aws_s3_bucket.raw\": {\"acl\": \"public-read\"}, \"aws_s3_bucket.old\": {\"acl\": \"private\"}}\nprint(plan(desired, state))",
  "tests": "d = {\"a\": {\"x\": 1}, \"b\": {\"x\": 2}}\ns = {\"a\": {\"x\": 1}, \"c\": {\"x\": 3}}\nassert plan(d, s) == {\"create\": [\"b\"], \"update\": [], \"delete\": [\"c\"]}\nd2 = {\"a\": {\"x\": 2}, \"b\": {\"x\": 2}}\ns2 = {\"a\": {\"x\": 1}, \"b\": {\"x\": 2}}\nassert plan(d2, s2) == {\"create\": [], \"update\": [\"a\"], \"delete\": []}\nassert plan({}, {}) == {\"create\": [], \"update\": [], \"delete\": []}\nr = plan({\"z\": {}, \"m\": {}}, {})\nassert r[\"create\"] == [\"m\", \"z\"]",
  "solution": "def plan(desired, state):\n    create = sorted(k for k in desired if k not in state)\n    delete = sorted(k for k in state if k not in desired)\n    update = sorted(k for k in desired if k in state and desired[k] != state[k])\n    return {\"create\": create, \"update\": update, \"delete\": delete}",
  "hints": [
    "Use set-like membership tests on the dict keys.",
    "Compare attribute dicts with `!=`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Terraform builds a dependency graph. Implement `apply_order(deps)` returning an order where each resource comes after everything it depends on, breaking ties alphabetically. Raise `ValueError` on a cycle.",
  "starterCode": "def apply_order(deps):\n    \"\"\"deps: {resource: [resources it depends on]}. Return a list where every\n    resource appears after its dependencies (ties broken alphabetically).\n    Raise ValueError on a cycle.\"\"\"\n    pass\n\nprint(apply_order({\"vm\": [\"subnet\", \"sg\"], \"subnet\": [\"vpc\"], \"sg\": [\"vpc\"], \"vpc\": []}))",
  "tests": "o = apply_order({\"vm\": [\"subnet\", \"sg\"], \"subnet\": [\"vpc\"], \"sg\": [\"vpc\"], \"vpc\": []})\nassert o == [\"vpc\", \"sg\", \"subnet\", \"vm\"]\nassert apply_order({\"b\": [], \"a\": []}) == [\"a\", \"b\"]\nassert apply_order({\"a\": [\"b\"], \"b\": []}) == [\"b\", \"a\"]\ntry:\n    apply_order({\"a\": [\"b\"], \"b\": [\"a\"]})\n    assert False\nexcept ValueError:\n    pass",
  "solution": "def apply_order(deps):\n    remaining = {k: set(v) for k, v in deps.items()}\n    out = []\n    while remaining:\n        ready = sorted(k for k, v in remaining.items() if not v)\n        if not ready:\n            raise ValueError(\"cycle\")\n        n = ready[0]\n        out.append(n)\n        del remaining[n]\n        for v in remaining.values():\n            v.discard(n)\n    return out",
  "hints": [
    "Repeatedly pick the alphabetically first resource with no remaining dependencies.",
    "If nothing is ready but resources remain, there is a cycle."
  ]
}
```

> [!TIP] Interview tips
- Lead with state: what it is, remote backend plus locking, encryption, never hand-edit.
- Mention `moved`, `import` and `for_each` over `count` to show real-world experience.
- Explain blast radius: split state by lifecycle and environment, version your modules.
- Know drift: `plan -refresh-only`, and decide whether code or console is the source of truth.
