---
id: cloud-devops-aws-core-services
title: "AWS 核心服务（EC2、S3、IAM、Lambda、RDS、SageMaker）"
---

## 为什么重要

大多数数据科学和 ML 岗位都跑在 AWS 上。面试官期望你能为存储、计算、身份、数据库和模型服务选出合适的服务，并解释它们之间的取舍。

## 概念

**计算**：
- **EC2**：由你管理的虚拟机（实例族：通用 `m`、计算型 `c`、内存型 `r`、GPU `p`/`g`）。计价方式：按需、预留/Savings Plans（承诺使用可省约 30-70%）、**Spot**（最多约便宜 90%，可能提前 2 分钟通知被回收，适合可容错的训练）。
- **Lambda**：由事件触发的函数，按请求数和 GB-秒计费，最长 15 分钟，可缩容到零。
- **ECS/EKS/Fargate**：跑在你的虚拟机上或无服务器形式的容器。

**存储与数据库**：
- **S3**：对象存储，11 个 9 的持久性，扁平的键命名空间，是数据湖的基础。存储类别（Standard、Infrequent Access、Glacier）以取回成本换存储成本；生命周期规则可自动迁移数据；可选版本控制和加密。具备强一致的写后读。
- **EBS**（单台 EC2 的块存储）与 **EFS**（共享文件系统）。
- **RDS/Aurora**：托管关系型数据库（Postgres、MySQL），含备份、Multi-AZ 故障切换和只读副本。**DynamoDB**：键值存储，任意规模下个位数毫秒。**Redshift**：列式数据仓库。**Athena**：直接在 S3 上跑 SQL，按扫描数据量计费。

**IAM**（身份与访问管理）控制谁能做什么。主体（用户、**角色**）绑定**策略**：包含 `Effect`、`Action`、`Resource` 和可选 `Condition` 的 JSON。评估顺序：默认全部拒绝；显式 `Allow` 授予访问；显式 `Deny` 永远优先。优先使用带临时凭证的**角色**（EC2 实例配置文件、Lambda 执行角色），而不是长期访问密钥，并遵循最小权限。

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

**SageMaker** 是托管的 ML 平台：Notebook/Studio、处理与训练作业（按需或 Spot、分布式）、超参调优、模型注册表、实时 endpoint（自动扩缩、多模型、A/B 生产变体）、无服务器与异步推理、批量转换，以及用于编排的 Pipelines。相关服务：用于托管基础模型的 **Bedrock**、用于镜像的 **ECR**、用于日志和指标的 **CloudWatch**、用于网络隔离的 **VPC**。

## 示例讲解

设计一个欺诈模型的技术栈：原始事件落到 **S3**（30 天后生命周期转入 Infrequent Access）；**Athena** 和每晚的 **SageMaker** 训练作业（Spot 实例，检查点存到 S3）构建模型；模型部署到带自动扩缩的 SageMaker 实时 **endpoint**；特征和决策存放在 **DynamoDB**；训练角色可以读取 `s3://acme-features/*`，但明确禁止访问 `pii/*`。在上面的策略中，对 `acme-features/pii/x.csv` 执行 `s3:GetObject` 同时匹配 Allow 和 Deny，因此结果是**拒绝**。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某个角色对一个桶拥有 `s3:*` 的 Allow，另有一条针对 `s3:DeleteObject` 的 Deny。它能删除对象吗？",
  "options": [
    "能，因为 Allow 更具体",
    "能，后面的语句优先",
    "不能，显式 Deny 永远覆盖 Allow",
    "只有启用 MFA 才能"
  ],
  "explanation": "IAM 评估：默认拒绝，Allow 授权，但任何显式 Deny 都优先。"
}
```

```quiz
{
  "id": "q2",
  "question": "你需要为一个可重启的训练作业获取便宜的 GPU 容量。哪种购买方式最合适？",
  "options": [
    "仅按需",
    "带检查点的 Spot 实例",
    "一年期预留实例",
    "Lambda"
  ],
  "explanation": "Spot 便宜很多但可能被回收；检查点让作业可以恢复，因此被中断的代价很小。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 IAM 策略评估。编写 `is_allowed(statements, action, resource)`，其中每条语句是含 `Effect`（`'Allow'` 或 `'Deny'`）、`Action` 和 `Resource` 的字典（后两者为字符串或字符串列表，支持 `*` 通配符；使用 `fnmatch.fnmatchcase`）。当 action 和 resource 都匹配时语句才匹配。如果任何匹配的语句是 Deny 则返回 `False`；如果有匹配的 Allow 则返回 `True`；否则返回 `False`（隐式拒绝）。",
  "hints": [
    "把字符串规范化为单元素列表，这样 Action 和 Resource 的处理方式一致。",
    "不要在遇到第一个 Allow 时就提前返回 True；后面的 Deny 仍然必须优先。"
  ]
}
```

> [!TIP] 面试技巧
> - 按需求匹配服务：S3 做数据湖，Athena/Redshift 做 SQL，Lambda 处理轻量事件，EC2/EKS 做重计算，SageMaker 做训练与服务。
> - 准确陈述 IAM 规则：默认拒绝、显式拒绝优先、优先用角色而非访问密钥、最小权限。
> - 面试官喜欢的成本角度：训练用 Spot、S3 生命周期分层、流量尖峰用无服务器、稳定负载用 Savings Plans。
