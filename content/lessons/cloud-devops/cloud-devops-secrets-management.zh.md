---
id: cloud-devops-secrets-management
title: "密钥管理"
---

## 为什么重要
API 密钥和数据库密码泄露在 Git、notebook 和容器镜像中，是现实里最常见的安全事件之一。面试官会考察你是否知道密钥应该放在哪里、如何送达工作负载，以及泄露后该怎么办。

## 概念
**密钥（secret）**指任何凭据：密码、API 密钥、令牌、私钥、连接字符串。经验法则：
- **绝不**把密钥提交到 Git、打包进镜像、写进 notebook，或打印到日志。环境变量很方便，但会通过崩溃转储、`docker inspect` 和子进程泄露。
- 把它们存放在**密钥管理服务**中：AWS Secrets Manager / SSM Parameter Store、GCP Secret Manager、Azure Key Vault 或 HashiCorp Vault。它们提供加密（使用 **KMS** 密钥的信封加密）、基于 IAM 的访问控制、版本管理、审计日志和轮换。
- 让工作负载**用自己的身份在运行时获取**（IAM 角色、workload identity）。这样就没有需要分发的“第零个密钥”。

```bash
# Fetch at runtime with the workload's own identity; nothing stored in the image or repo
aws secretsmanager get-secret-value --secret-id prod/feature-store/db \
  --query SecretString --output text
```

**Kubernetes**：`Secret` 只是 base64 编码，并未加密。应开启静态加密、限制 RBAC，并优先使用 **External Secrets Operator** 或 Secrets Store CSI driver 从真正的密钥管理服务同步。GitOps 仓库可以保存加密后的密钥（**Sealed Secrets**、**SOPS**），但绝不能存放明文。

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

**轮换**：按计划轮换（如每 90 天），任何疑似暴露后立即轮换。应用必须无需重新部署即可重新加载，或在切换期间同时接受两个有效版本。**动态密钥**（Vault 数据库引擎、STS 令牌）按工作负载生成并带有短 TTL，自动撤销，这比轮换共享密码更好。

**CI/CD**：使用从 CI 提供方到云的 **OIDC 联合身份**（无需存储云密钥）；在日志中屏蔽密钥；按环境划分密钥范围；不要向来自 fork 的 pull request 构建暴露生产密钥。

**检测与响应**：在 pre-commit 和 CI 中运行扫描器（gitleaks、trufflehog、detect-secrets、GitHub push protection）。若密钥泄露：**先撤销并轮换**，然后在审计日志中调查使用情况，最后再从历史中清除。改写 Git 历史并不能让已经推送过的密钥“恢复未泄露”。

## 示例讲解
某特征存储服务需要一个 Postgres 密码。密码不再以 `DB_PASSWORD=... ` 的形式放在仓库里，而是存放在用 KMS 密钥加密的 Secrets Manager 中。pod 的服务账号映射到一个角色，该角色只被允许对这一个密钥执行 `secretsmanager:GetSecretValue`。External Secrets Operator 每小时同步一次。每 90 天轮换会创建新版本；pod 在下次刷新时获取。扫描器在 PR 中发现开发者误写的 `password = "hunter2hunter2"`，在其进入 `main` 之前阻止合并。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "开发者把 AWS 访问密钥推送到了公开仓库，随后强制推送删掉了该提交。正确的处理方式是什么？",
  "options": [
    "不用做什么，历史已被改写",
    "立即撤销/轮换密钥，然后检查审计日志中是否有滥用",
    "把仓库设为私有",
    "等扫描器自动停用它"
  ],
  "explanation": "密钥一旦推送就应视为已泄露（机器人几分钟内就会抓取）。先撤销并轮换，再查看 CloudTrail 中的使用记录。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么 Kubernetes Secret 默认并不足以保护密钥？",
  "options": [
    "它限制为 1 KB",
    "它只是 base64 编码，除非配置了静态加密和 RBAC，否则任何能读取它（或 etcd）的人都能看到明文",
    "它不能挂载到 pod 中",
    "pod 重启时它会被删除"
  ],
  "explanation": "Base64 是编码，不是加密。应启用 etcd 加密、限制访问，并优先使用外部密钥管理服务。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现两个简单的密钥卫生工具。`scan_secrets(lines)` 返回 `(行号, 类型)` 元组（行号从 1 开始）：若该行匹配 `AKIA` 后跟 16 个大写字母或数字，类型为 `aws_access_key`；否则，若名称中含 password/passwd/secret/api_key/token 的变量被赋予（`=` 或 `:`）一个 8 个以上非空白、非引号字符的字面值，且该值不以 `$`、`os.environ` 或 `getenv` 开头，则类型为 `hardcoded_credential`。`rotation_status(age_days, max_age_days, warn_fraction=0.8)` 返回 `\"expired\"`、`\"rotate_soon\"` 或 `\"ok\"`。",
  "hints": [
    "先检查 AWS 模式，通用模式用 `elif`，使每行只产生一个结果。",
    "在可选的起始引号之后使用负向先行断言 `(?!\\$|os\\.environ|getenv)`。",
    "age >= max 时为 expired；age >= warn_fraction * max 时为 rotate_soon。"
  ]
}
```

> [!TIP] 面试技巧
> - 描述完整生命周期：存储（加密、KMS）、交付（按身份在运行时获取）、轮换、审计和撤销。
> - 提到短期凭据、动态凭据，以及 CI 的 OIDC，它们能消除长期密钥。
> - 掌握泄露处置流程：先轮换，再调查，最后清理历史。
> - 指出环境变量、`.env` 文件和 base64 的 Kubernetes Secret 本身都不是真正的保护。
