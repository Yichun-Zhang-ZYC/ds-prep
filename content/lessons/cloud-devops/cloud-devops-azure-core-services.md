---
id: cloud-devops-azure-core-services
title: "Azure core services"
estimatedMinutes: 11
difficulty: medium
tags: [azure, cloud, rbac, azure-ml]
---

## Why it matters

Many enterprises run on Azure, especially those on Microsoft 365 or SQL Server. Interviewers expect you to map familiar AWS/GCP concepts to Azure and to know its resource hierarchy and role-based access control.

## Concept

**Resource hierarchy**: management group → **subscription** (billing and quota boundary) → **resource group** (a lifecycle container, delete the group to delete everything in it) → **resource**. Policy, RBAC and tags are inherited down the tree. Everything is managed through **Azure Resource Manager (ARM)**, with ARM/Bicep templates as the native infrastructure-as-code (Terraform also works).

**Identity**: **Microsoft Entra ID** (formerly Azure AD) is the identity provider for users, groups, service principals and **managed identities** (credential-free identities for Azure resources, the analogue of AWS roles). **Azure RBAC** assigns a **role** (Owner, Contributor, Reader, or fine-grained ones like *Storage Blob Data Reader*) to a principal at a **scope**; the assignment applies to that scope and everything beneath it. Store secrets in **Key Vault**.

**Compute**: **Virtual Machines** (+ scale sets, spot VMs), **App Service** (managed web apps), **Functions** (serverless, event-driven), **Container Apps** (serverless containers on Kubernetes with scale to zero), **AKS** (managed Kubernetes), **Batch** for large jobs.

**Storage and data**:
- **Blob Storage** is object storage (hot/cool/cold/archive tiers); with a hierarchical namespace it becomes **ADLS Gen2**, the data-lake format.
- **Azure SQL Database**, **Cosmos DB** (multi-model, globally distributed NoSQL with tunable consistency levels), **Synapse** and **Microsoft Fabric** (warehouse, lakehouse and BI in one SaaS), **Data Factory** (ETL/ELT orchestration), **Event Hubs** (Kafka-compatible streaming), **Databricks** (first-party Spark).

**ML and AI**: **Azure Machine Learning** (workspaces, compute clusters, jobs, pipelines, model registry, managed online/batch endpoints, MLflow tracking) and **Azure OpenAI / AI Foundry** for hosted GPT-family models with enterprise controls such as private networking, content filtering and regional data residency. **Azure Monitor** and **Log Analytics** (queried with KQL) handle logs and metrics.

```bash
az group create -n rg-ml-prod -l eastus
az role assignment create --assignee <principal-id> --role "Storage Blob Data Reader" \
  --scope /subscriptions/<sub>/resourceGroups/rg-ml-prod
az ml online-endpoint create -f endpoint.yml -g rg-ml-prod -w mlw-prod
```

**Rough mapping**: S3 ≈ Blob/ADLS, EC2 ≈ VMs, Lambda ≈ Functions, EKS ≈ AKS, IAM role ≈ managed identity, SageMaker ≈ Azure ML, Redshift ≈ Synapse/Fabric, CloudWatch ≈ Monitor.

## Worked example

Alice is assigned *Reader* on subscription `sub-1` and *Storage Blob Data Contributor* on resource group `rg-ml`. Can she write a blob in storage account `sa1` inside `rg-ml`? Yes: the contributor role at `rg-ml` is inherited by `sa1`. Can she write a blob in `sa2` in another group `rg-web`? No: Reader only grants read, and the contributor assignment does not cover `rg-web`. Giving a training job a **managed identity** with *Storage Blob Data Reader* on just the data account removes the need for any stored connection string.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A role is assigned to a user at the resource-group scope. Which resources does it apply to?",
  "options": [
    "All resources in that group, through inheritance",
    "Only the group object itself",
    "Every resource in the subscription",
    "Only resources created by that user"
  ],
  "answer": 0,
  "explanation": "RBAC assignments apply at the scope and are inherited by everything beneath it."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main benefit of a managed identity for an Azure ML job accessing storage?",
  "options": [
    "Faster network",
    "No credentials to store or rotate; Entra ID issues short-lived tokens to the resource",
    "It bypasses RBAC",
    "It removes the need for a storage account"
  ],
  "answer": 1,
  "explanation": "Managed identities let Azure resources authenticate without secrets, and access is still governed by RBAC."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate Azure RBAC scope inheritance. Scopes are path strings like `/sub1/rg-ml/sa1`. A role assignment `(principal, role, scope)` applies to a resource if the scope equals the resource path or is a path ancestor (the resource path starts with `scope + '/'`). Write `roles_for(assignments, principal, resource)` returning the sorted list of distinct roles that apply, and `can(assignments, role_actions, principal, resource, action)` where `role_actions` maps a role to a set of allowed actions (a role may contain `'*'` meaning all). Return True if any applicable role allows the action.",
  "starterCode": "def roles_for(assignments, principal, resource):\n    pass\n\ndef can(assignments, role_actions, principal, resource, action):\n    pass\n\na = [('alice', 'Reader', '/sub1')]\nprint(roles_for(a, 'alice', '/sub1/rg-ml/sa1'))\n",
  "tests": "A = [('alice', 'Reader', '/sub1'), ('alice', 'Contributor', '/sub1/rg-ml'), ('bob', 'Owner', '/sub1/rg-web')]\nRA = {'Reader': {'read'}, 'Contributor': {'read', 'write'}, 'Owner': {'*'}}\nassert roles_for(A, 'alice', '/sub1/rg-ml/sa1') == ['Contributor', 'Reader']\nassert roles_for(A, 'alice', '/sub1/rg-web/sa2') == ['Reader']\nassert roles_for(A, 'alice', '/sub10/x') == []\nassert roles_for(A, 'alice', '/sub1/rg-ml') == ['Contributor', 'Reader']\nassert roles_for(A, 'carol', '/sub1') == []\nassert can(A, RA, 'alice', '/sub1/rg-ml/sa1', 'write') is True\nassert can(A, RA, 'alice', '/sub1/rg-web/sa2', 'write') is False\nassert can(A, RA, 'bob', '/sub1/rg-web/x', 'delete') is True\nassert can(A, RA, 'bob', '/sub1/rg-ml/x', 'read') is False\nassert roles_for(A + [('alice', 'Reader', '/sub1/rg-ml')], 'alice', '/sub1/rg-ml/x') == ['Contributor', 'Reader']",
  "solution": "def roles_for(assignments, principal, resource):\n    out = set()\n    for p, role, scope in assignments:\n        if p == principal and (resource == scope or resource.startswith(scope + '/')):\n            out.add(role)\n    return sorted(out)\n\ndef can(assignments, role_actions, principal, resource, action):\n    for role in roles_for(assignments, principal, resource):\n        acts = role_actions.get(role, set())\n        if '*' in acts or action in acts:\n            return True\n    return False",
  "hints": [
    "Compare with scope + '/' so `/sub1` does not wrongly match `/sub10/x`.",
    "Collect roles in a set to deduplicate, then sort."
  ]
}
```

> [!TIP] Interview tips
> - Draw the hierarchy (management group, subscription, resource group, resource) and say RBAC, policy and tags inherit downward.
> - Prefer managed identities and Key Vault over stored credentials; mention Entra ID as the identity layer.
> - Show you can translate: Azure ML ~ SageMaker/Vertex, ADLS ~ S3, Fabric/Synapse ~ Redshift/BigQuery, Container Apps ~ Cloud Run.
