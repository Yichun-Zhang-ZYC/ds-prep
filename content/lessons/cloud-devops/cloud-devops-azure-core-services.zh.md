---
id: cloud-devops-azure-core-services
title: "Azure 核心服务"
---

## 为什么重要

许多企业（尤其是使用 Microsoft 365 或 SQL Server 的企业）运行在 Azure 上。面试官期望你能把熟悉的 AWS/GCP 概念对应到 Azure，并了解其资源层级和基于角色的访问控制。

## 概念

**资源层级**：管理组 → **订阅**（计费和配额边界）→ **资源组**（生命周期容器，删除资源组即删除其中所有资源）→ **资源**。策略、RBAC 和标签沿树向下继承。一切都通过 **Azure Resource Manager（ARM）** 管理，原生的基础设施即代码是 ARM/Bicep 模板（也可以用 Terraform）。

**身份**：**Microsoft Entra ID**（原 Azure AD）是用户、组、服务主体和**托管标识**（Azure 资源无需凭据的身份，对应 AWS 角色）的身份提供方。**Azure RBAC** 在某个**作用域**上把**角色**（Owner、Contributor、Reader，或 *Storage Blob Data Reader* 这类细粒度角色）分配给主体；该分配对此作用域及其下的所有内容生效。密钥存放在 **Key Vault** 中。

**计算**：**Virtual Machines**（及规模集、Spot 虚拟机）、**App Service**（托管 Web 应用）、**Functions**（无服务器、事件驱动）、**Container Apps**（基于 Kubernetes 的无服务器容器，可缩容到零）、**AKS**（托管 Kubernetes）、用于大型作业的 **Batch**。

**存储与数据**：
- **Blob Storage** 是对象存储（热/冷/更冷/归档层）；启用分层命名空间后即为 **ADLS Gen2**，也就是数据湖格式。
- **Azure SQL Database**、**Cosmos DB**（多模型、全球分布、一致性级别可调的 NoSQL）、**Synapse** 和 **Microsoft Fabric**（把数据仓库、湖仓和 BI 集成在一个 SaaS 中）、**Data Factory**（ETL/ELT 编排）、**Event Hubs**（兼容 Kafka 的流式服务）、**Databricks**（第一方 Spark）。

**ML 与 AI**：**Azure Machine Learning**（工作区、计算集群、作业、流水线、模型注册表、托管在线/批量 endpoint、MLflow 跟踪）以及 **Azure OpenAI / AI Foundry**（托管 GPT 系列模型，并提供私有网络、内容过滤和区域数据驻留等企业级控制）。**Azure Monitor** 和 **Log Analytics**（用 KQL 查询）负责日志和指标。

```bash
az group create -n rg-ml-prod -l eastus
az role assignment create --assignee <principal-id> --role "Storage Blob Data Reader" \
  --scope /subscriptions/<sub>/resourceGroups/rg-ml-prod
az ml online-endpoint create -f endpoint.yml -g rg-ml-prod -w mlw-prod
```

**大致对应**：S3 ≈ Blob/ADLS，EC2 ≈ VM，Lambda ≈ Functions，EKS ≈ AKS，IAM 角色 ≈ 托管标识，SageMaker ≈ Azure ML，Redshift ≈ Synapse/Fabric，CloudWatch ≈ Monitor。

## 示例讲解

Alice 在订阅 `sub-1` 上被分配 *Reader*，在资源组 `rg-ml` 上被分配 *Storage Blob Data Contributor*。她能否向 `rg-ml` 中的存储账户 `sa1` 写入 blob？可以：`rg-ml` 上的 contributor 角色被 `sa1` 继承。她能否向另一个资源组 `rg-web` 中的 `sa2` 写入 blob？不能：Reader 只授予读取权限，而 contributor 分配不覆盖 `rg-web`。给训练作业配置一个仅对数据账户拥有 *Storage Blob Data Reader* 的**托管标识**，就不再需要保存任何连接字符串。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某角色在资源组作用域上分配给一个用户。它适用于哪些资源？",
  "options": [
    "通过继承适用于该资源组内的所有资源",
    "只适用于资源组对象本身",
    "订阅内的所有资源",
    "只适用于该用户创建的资源"
  ],
  "explanation": "RBAC 分配在其作用域上生效，并被其下的所有内容继承。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于访问存储的 Azure ML 作业，托管标识的主要好处是什么？",
  "options": [
    "网络更快",
    "无需保存或轮换凭据；Entra ID 向资源签发短期令牌",
    "可以绕过 RBAC",
    "不再需要存储账户"
  ],
  "explanation": "托管标识让 Azure 资源无需密钥即可认证，访问权限仍由 RBAC 管控。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 Azure RBAC 的作用域继承。作用域是形如 `/sub1/rg-ml/sa1` 的路径字符串。角色分配 `(principal, role, scope)` 在作用域等于资源路径，或是资源路径的祖先（资源路径以 `scope + '/'` 开头）时对该资源生效。编写 `roles_for(assignments, principal, resource)`，返回生效的不同角色的已排序列表；以及 `can(assignments, role_actions, principal, resource, action)`，其中 `role_actions` 把角色映射到允许的操作集合（角色可包含 `'*'` 表示所有操作）。只要任一生效角色允许该操作就返回 True。",
  "hints": [
    "与 scope + '/' 比较，这样 `/sub1` 不会错误地匹配 `/sub10/x`。",
    "用集合收集角色以去重，然后排序。"
  ]
}
```

> [!TIP] 面试技巧
> - 画出层级（管理组、订阅、资源组、资源），并说明 RBAC、策略和标签向下继承。
> - 优先使用托管标识和 Key Vault，而不是保存凭据；提到 Entra ID 是身份层。
> - 展示你能做对应转换：Azure ML ~ SageMaker/Vertex，ADLS ~ S3，Fabric/Synapse ~ Redshift/BigQuery，Container Apps ~ Cloud Run。
