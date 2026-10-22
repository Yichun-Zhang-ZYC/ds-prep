---
id: cloud-devops-iam-and-least-privilege
title: "IAM 与最小权限"
---

## 为什么重要
大多数云上安全事件源于权限过大的身份和泄露的凭据，而不是什么高深的漏洞。面试官会让你为流水线或 ML 任务设计访问权限，并说明如何缩小爆炸半径。

## 概念
**IAM**（身份与访问管理）回答的是：*谁*（主体）可以在*什么条件*下，对*哪个资源*执行*什么操作*。AWS IAM、GCP IAM 和 Azure RBAC 采用相同的模型。

- **主体**：人类用户（优先使用 SSO / 联合身份）、供工作负载使用的**角色** / 服务账号，以及用户组。
- **策略**：包含 `Effect`、`Action`、`Resource` 和可选 `Condition` 的 JSON 文档。**基于身份**的策略附加在主体上；**基于资源**的策略附加在资源上（S3 存储桶策略、信任策略）。上方还有护栏：**权限边界**和组织级 **SCP**，无论附加了什么策略，它们都限定了权限的上限。
- **评估逻辑（AWS）**：默认拒绝；**显式 Deny 永远优先**；否则需要有 Allow；护栏也必须允许。
- **通配符**：`s3:Get*` 与 `arn:...:ml-data/*` 按模式匹配。`Action: "*"` 加 `Resource: "*"` 就是管理员权限。

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

**最小权限**意味着只授予所需的操作、只针对所需的资源、只持续所需的时间：
- 每个工作负载和环境使用独立角色（训练任务、服务、CI）；绝不共用一个管理员角色。
- 使用带临时凭据的**角色**（STS `AssumeRole`、GCP workload identity、Azure managed identity、EKS IRSA），而不是长期访问密钥。
- 用**条件**限定范围（来源 VPC/IP、MFA、区域、标签、时间）。
- 从收窄开始，根据访问被拒的错误逐步放宽；或从日志出发，借助**最近访问数据**、IAM Access Analyzer 或策略生成来收紧。
- 定期复查；删除未使用的角色与密钥；要求人类用户使用 MFA；对 root 使用和策略变更告警（CloudTrail / 审计日志）。

```bash
# Short-lived credentials instead of long-lived access keys
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/training-job \
  --role-session-name run-42 --duration-seconds 3600
```

**常见陷阱**：`iam:PassRole` 或 `iam:*` 权限会导致提权；对 `s3:*` 使用通配资源；过宽的信任策略（`Principal: "*"`）；把密钥嵌入代码或 notebook；给数据科学家生产环境的写权限。

## 示例讲解
一个夜间训练任务从 `s3://ml-data/train/` 读取数据，并把模型写入 `s3://ml-models/`。从一个只包含上面策略中两条语句的角色开始。对 `ml-models` 发起 `s3:DeleteObject` 请求时没有匹配的 Allow，因此默认被拒绝。如果工程师之后加了一条全面的 `Allow s3:*`，组织 SCP 或显式的 `Deny s3:Delete*` 仍会阻止删除，因为显式拒绝覆盖任何允许。90 天后，最近访问数据显示 `s3:ListBucket` 从未被使用，于是将其移除。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某主体的身份策略允许 s3:*，而其权限边界没有提到 S3。对 S3 的有效访问结果是什么？",
  "options": [
    "允许，因为身份策略允许",
    "拒绝，因为有效权限是身份策略与边界的交集",
    "允许，因为边界只适用于角色",
    "仅当边界中有显式 Deny 时才拒绝"
  ],
  "explanation": "权限边界是一个上限：有效权限是身份策略与边界都允许的部分。边界中没有 Allow，就没有 S3 访问权限。"
}
```

```quiz
{
  "id": "q2",
  "question": "让 Kubernetes 上的 ML 训练任务访问云存储，最佳方式是什么？",
  "options": [
    "把管理员访问密钥存放在 ConfigMap 中",
    "把访问密钥打包进容器镜像",
    "把权限范围很窄的角色绑定到 pod 的服务账号（workload identity），使用短期凭据",
    "使用 root 账号凭据"
  ],
  "explanation": "Workload identity 签发与 pod 绑定的、自动轮换的短期凭据，角色只覆盖所需的存储桶。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 IAM 策略评估。每条语句为 `{\"effect\": \"Allow\"|\"Deny\", \"actions\": [模式], \"resources\": [模式]}`，支持 `*` 通配符（使用 `fnmatchcase`）。`is_allowed(statements, action, resource)` 仅当存在同时匹配操作与资源的 Allow，且没有匹配的 Deny 时返回 True（显式拒绝优先，默认拒绝）。`excess_actions(granted, used)` 返回已授予但从未使用的操作的有序列表，它们是可以移除的候选项。",
  "hints": [
    "当操作模式与资源模式都匹配时，该语句才适用。",
    "遇到匹配的 Deny 立即返回 False；否则记录是否有任何 Allow 匹配。",
    "excess = sorted(set(granted) - set(used))。"
  ]
}
```

> [!TIP] 面试技巧
> - 说出评估规则：默认拒绝，显式拒绝优先于允许，护栏（SCP/边界）与授权取交集。
> - 优先使用角色和短期凭据，而不是访问密钥；提到 pod 的 workload identity 和 CI 的 OIDC 联合身份。
> - 给出具体而窄的策略（明确的操作、明确的 ARN、条件），而不是空谈“最小权限”。
> - 提到持续收紧：最近访问数据、Access Analyzer、审计日志、定期权限复查。
