---
id: cloud-devops-environment-management
title: "环境管理（dev / staging / prod）"
---

## 为什么重要
“在 dev 里是好的”是经典的失败场景。面试官会追问你如何隔离环境、让它们足够接近而值得信任、把变更从 dev 安全推进到 prod，以及如何处理非生产环境中的数据和密钥。

## 概念
**典型环境**：**dev**（个人或共享沙箱，反馈快、成本低）、**staging / 预发布**（接近生产，用于集成与压力测试、发布演练）、**prod**（真实用户与数据，访问严格）。许多团队还会增加临时的**每个 PR 一个环境**以及 **CI** 目标。

**原则**：
- **隔离**：独立的云账号/项目（最强）、VPC、数据仓库，或至少独立的 schema，并使用各自独立的 IAM 角色和密钥。dev 任务绝不能有权写入 prod。要审计共享资源（“staging”任务使用了 prod 存储桶是典型的事故）。
- **一致性（parity）**：相同的代码、相同的容器镜像、相同的 IaC 模块；只有配置不同（规格、副本数、端点）。一致性问题隐藏在不同的版本、数据量和权限中。
- **配置与代码分离**（twelve-factor）：分层配置（基础配置 + 各环境覆盖）、环境变量、config map；密钥来自密钥管理服务，绝不放进 Git。
- **只构建一次，逐级晋升**：只构建一次不可变制品（以提交 SHA 标记的镜像、模型版本），然后把同一个制品从 dev -> staging -> prod 晋升。不要为每个环境重新构建。
- **基础设施即代码**：一个 Terraform 模块搭配各环境的变量文件或 workspace；变更经过 PR 评审，并在 `apply` 之前先看 `plan`。

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

**非生产环境的数据**：绝不要把原始的生产 PII 复制到 dev。使用合成数据、**采样并脱敏/匿名化**的子集，或带列脱敏的零拷贝克隆；让 staging 的数据保持足够新鲜，以暴露 schema 和数据量问题。在 dbt 中使用 target，让 dev 写入个人 schema，prod 写入正式 schema。

```yaml
# dbt profiles.yml: one project, three targets
analytics:
  target: dev
  outputs:
    dev:  {type: snowflake, schema: "dbt_{{ env_var('USER') }}", warehouse: XS}
    ci:   {type: snowflake, schema: "ci_pr_{{ env_var('PR') }}", warehouse: XS}
    prod: {type: snowflake, schema: analytics, warehouse: L}
```

**发布流程**：PR -> 在临时环境中跑 CI -> 合并 -> 自动部署到 staging -> 自动化冒烟/集成测试 -> 审批或渐进式发布（金丝雀、蓝绿、特性开关）-> prod，并支持快速回滚。对 ML 而言，**模型注册表**的阶段（staging/production）起着相同的作用，再加上影子流量或金丝雀流量。

**成本**：为较低的环境合理缩减规格，夜间自动关闭 dev 集群和数据仓库，并为临时环境设置 TTL。

## 示例讲解
某团队有一份基础配置和各环境的覆盖配置。prod 设置 `replicas: 4`、`debug: false`、`db.host: prod-db`，并从基础配置继承 `db.pool: 5`，即深度合并，而不是替换整个 `db` 块。对解析后的配置做审计时发现，staging 和 prod 都指向 `bucket: data-shared`。staging 的回填可能覆盖生产数据，因此团队在下一次发布前为 staging 配了独立的存储桶。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "“build once, deploy many”是什么意思？",
  "options": [
    "在每个环境中重新构建镜像以匹配其设置",
    "创建一个不可变制品，并把完全相同的制品逐级晋升，仅配置不同",
    "同时部署到所有环境",
    "只在生产环境构建"
  ],
  "explanation": "在 staging 中测试过的制品必须与 prod 中运行的完全一致；各环境之间的差异应放在配置里，而不是通过重新构建来实现。"
}
```

```quiz
{
  "id": "q2",
  "question": "对开发环境来说，最安全的数据来源是什么？",
  "options": [
    "包含 PII 的完整生产数据副本",
    "具有只读权限的生产凭据",
    "合成数据或经过脱敏/匿名化的样本",
    "开发者笔记本上现有的任何数据"
  ],
  "explanation": "非生产环境的管控较弱，因此应使用合成或脱敏数据，避免暴露敏感信息。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟分层配置与隔离审计。`deep_merge(base, override)` 返回一个新字典：嵌套字典递归合并，其他值以 `override` 中的为准替换 `base` 中的（不要修改输入）。`resolve_config(base, envs, env)` 把 `envs[env]` 叠加到 `base` 上（未知环境返回 base 的副本）。`shared_resources(configs, keys)` 接收 `{env: {key: value}}`，对每一对在某个 key 上取值相同的环境（对内按字母顺序）返回 `(key, env_a, env_b)` 的列表，先按 `keys` 的顺序，再按环境对的字母顺序排列。",
  "hints": [
    "用 dict(base) 复制 base，只有当两边的值都是字典时才递归。",
    "resolve_config 就是 deep_merge(base, envs.get(env, {}))。",
    "itertools.combinations(sorted(configs), 2) 按顺序给出每一对环境，且每对只出现一次。"
  ]
}
```

> [!TIP] 面试技巧
> - 先讲隔离（独立账号、角色、密钥）和一致性（同一制品，仅配置不同）。
> - 说“只构建一次，逐级晋升”，并按环境注入配置和密钥。
> - 覆盖数据：非生产环境使用合成或脱敏数据、访问控制，以及对较低环境的成本控制。
> - 对 ML 和数据团队，提到 dbt target、模型注册表阶段和每个 PR 一个临时环境。
