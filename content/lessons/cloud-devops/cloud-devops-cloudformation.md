---
id: cloud-devops-cloudformation
title: "CloudFormation"
estimatedMinutes: 10
difficulty: medium
tags: [cloudformation, iac, aws, devops]
---

## Why it matters

CloudFormation is AWS's native infrastructure-as-code service. Interviewers ask how it differs from Terraform, how stacks update safely and what happens when an update fails.

## Concept

You write a **template** (YAML or JSON) and deploy it as a **stack**: the unit of create, update and delete. CloudFormation (CFN) is managed by AWS, so there is no state file to host or lock; AWS holds the state and supports only AWS resources (plus custom resources via Lambda).

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  Env: { Type: String, AllowedValues: [dev, prod] }
Conditions:
  IsProd: !Equals [!Ref Env, prod]
Resources:
  FeatureBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: Retain
    Properties:
      BucketName: !Sub "acme-features-${Env}"
      VersioningConfiguration:
        Status: !If [IsProd, Enabled, Suspended]
  JobRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument: { ... }
Outputs:
  BucketArn:
    Value: !GetAtt FeatureBucket.Arn
    Export: { Name: !Sub "${AWS::StackName}-BucketArn" }
```

**Template sections**: `Parameters` (inputs), `Mappings` and `Conditions` (per-environment logic), `Resources` (the only required section), `Outputs` (values, optionally **exported** for cross-stack references). **Intrinsic functions** wire things together: `!Ref` (parameter value or resource ID), `!GetAtt` (an attribute such as an ARN), `!Sub`, `!Join`, `!If`, `!ImportValue`.

**Dependencies** are inferred from `!Ref` and `!GetAtt`; use `DependsOn` for hidden ones. CFN creates independent resources in parallel and deletes in reverse order.

```bash
aws cloudformation deploy --stack-name ml-platform --template-file t.yaml \
  --parameter-overrides Env=prod --capabilities CAPABILITY_IAM
aws cloudformation create-change-set ...   # preview before executing
aws cloudformation detect-stack-drift --stack-name ml-platform
```

**Safe updates**:
- A **change set** previews adds, modifications and replacements before execution (the analogue of `terraform plan`).
- Each resource update is *no interruption*, *some interruption* or *replacement*; check the docs per property.
- If an update fails, the stack **rolls back** automatically to the last good state (`UPDATE_ROLLBACK_COMPLETE`).
- `DeletionPolicy: Retain` or `Snapshot` protects data resources; **stack policies** block updates to critical resources.
- **Drift detection** reports resources changed outside CFN.
- **Nested stacks** or **StackSets** reuse templates and fan out across accounts and regions. The **CDK** generates CFN templates from TypeScript or Python.

**CFN vs Terraform**: CFN is AWS-only, has no state to manage and gets day-one support for new AWS features plus automatic rollback; Terraform is multi-cloud, has a richer module ecosystem and a more readable plan, but you operate the state.

## Worked example

Deploying the template with `Env=prod`: the `Condition` `IsProd` is true, so versioning is `Enabled` and the bucket name resolves to `acme-features-prod`. `JobRole` and `FeatureBucket` have no references between them, so they are created in parallel. Suppose a later update changes a property that requires replacement of an RDS instance: the change set shows `Replacement: True`, and with no snapshot policy the data is gone. That is why you read change sets and set `DeletionPolicy: Snapshot` on databases.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Before executing a stack update, how do you preview what CloudFormation will add, modify or replace?",
  "options": [
    "Create a change set",
    "Run drift detection",
    "Delete and recreate the stack",
    "Read the stack events after the update"
  ],
  "answer": 0,
  "explanation": "A change set is the preview step; drift detection compares to out-of-band changes, and stack events only show what already happened."
}
```

```quiz
{
  "id": "q2",
  "question": "A stack update fails halfway through. What does CloudFormation do by default?",
  "options": [
    "Leaves the half-updated resources in place",
    "Deletes the stack",
    "Rolls back to the last known good state",
    "Retries forever"
  ],
  "answer": 2,
  "explanation": "Default behaviour is automatic rollback, so the stack returns to its previous working configuration."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate how CloudFormation resolves a template. Implement `resolve(node, params, refs)`: a dict `{'Ref': name}` returns `params[name]` if present, else `refs[name]` (a resource ID); `{'Fn::Join': [sep, items]}` joins the resolved items with `sep`; `{'Fn::If': [cond, a, b]}` returns resolved `a` if `params[cond]` is truthy, else `b`; lists and other dicts are resolved recursively; scalars are returned unchanged. Then implement `creation_order(resources)` where `resources` maps a logical id to its (unresolved) properties; a resource depends on any other resource named in a `Ref` inside its properties. Return a dependency-respecting order, breaking ties alphabetically.",
  "starterCode": "def resolve(node, params, refs):\n    pass\n\ndef creation_order(resources):\n    pass\n\nprint(resolve({'Fn::Join': ['-', ['acme', {'Ref': 'Env'}]]}, {'Env': 'prod'}, {}))\n",
  "tests": "p = {'Env': 'prod', 'IsProd': True, 'IsDev': False}\nassert resolve({'Fn::Join': ['-', ['acme', {'Ref': 'Env'}]]}, p, {}) == 'acme-prod'\nassert resolve({'Ref': 'Bucket'}, p, {'Bucket': 'b-123'}) == 'b-123'\nassert resolve({'Fn::If': ['IsProd', 'Enabled', 'Suspended']}, p, {}) == 'Enabled'\nassert resolve({'Fn::If': ['IsDev', 'Enabled', {'Ref': 'Env'}]}, p, {}) == 'prod'\nassert resolve({'a': [1, {'Ref': 'Env'}], 'b': 2}, p, {}) == {'a': [1, 'prod'], 'b': 2}\nres = {\n    'Role': {'Name': 'r'},\n    'Bucket': {'Name': 'b'},\n    'Func': {'Role': {'Ref': 'Role'}, 'Src': {'Fn::Join': ['/', [{'Ref': 'Bucket'}, 'code']]}},\n    'Alarm': {'Target': {'Ref': 'Func'}},\n}\nassert creation_order(res) == ['Bucket', 'Role', 'Func', 'Alarm'], creation_order(res)\nassert creation_order({'B': {}, 'A': {}}) == ['A', 'B']",
  "solution": "def resolve(node, params, refs):\n    if isinstance(node, dict):\n        if set(node) == {'Ref'}:\n            n = node['Ref']\n            return params[n] if n in params else refs[n]\n        if set(node) == {'Fn::Join'}:\n            sep, items = node['Fn::Join']\n            return sep.join(str(resolve(i, params, refs)) for i in items)\n        if set(node) == {'Fn::If'}:\n            cond, a, b = node['Fn::If']\n            return resolve(a if params[cond] else b, params, refs)\n        return {k: resolve(v, params, refs) for k, v in node.items()}\n    if isinstance(node, list):\n        return [resolve(x, params, refs) for x in node]\n    return node\n\ndef _refs(node):\n    if isinstance(node, dict):\n        if set(node) == {'Ref'}:\n            return {node['Ref']}\n        out = set()\n        for v in node.values():\n            out |= _refs(v)\n        return out\n    if isinstance(node, list):\n        out = set()\n        for x in node:\n            out |= _refs(x)\n        return out\n    return set()\n\ndef creation_order(resources):\n    deps = {r: _refs(props) & set(resources) for r, props in resources.items()}\n    done = []\n    remaining = set(resources)\n    while remaining:\n        ready = sorted(r for r in remaining if deps[r] <= set(done))\n        if not ready:\n            raise ValueError('circular dependency')\n        done.append(ready[0])\n        remaining.remove(ready[0])\n    return done",
  "hints": [
    "Check for the single-key dict shapes ('Ref', 'Fn::Join', 'Fn::If') before treating a dict as a plain mapping.",
    "Collect Ref names recursively, keep only those that are resource ids (parameters are not dependencies), then repeatedly pick the alphabetically first resource whose dependencies are already placed."
  ]
}
```

> [!TIP] Interview tips
> - Lead with the model: template, stack, change set, rollback; no state file to manage because AWS owns it.
> - For CFN vs Terraform, give a balanced answer: AWS-only and auto-rollback vs multi-cloud, richer modules and a readable plan.
> - Mention `DeletionPolicy`, stack policies, drift detection, StackSets for multi-account, and CDK as the higher-level authoring layer.
