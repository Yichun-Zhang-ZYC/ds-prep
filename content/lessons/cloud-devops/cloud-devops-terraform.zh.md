---
id: cloud-devops-terraform
title: "Terraform"
---

## 为什么重要

基础设施即代码把集群、存储桶和 IAM 角色变成可评审、可版本化、可复现的文本。Terraform 是最常用的工具，所以常被问到状态（state）、plan/apply、模块以及团队如何安全协作。

## 概念

Terraform 是**声明式**的：你用 HCL 描述期望的最终状态，引擎自己算出创建/更新/删除的步骤。通过 **provider**（AWS、GCP、Azure、Kubernetes、Datadog 等）它与具体云无关。

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

**核心流程**：`init` → `plan` → `apply`。plan 会比较三样东西：你的配置（期望）、**状态文件**（Terraform 认为它管理的内容）以及真实基础设施（通过 provider API 刷新）。输出会把每个资源标记为 `+` 创建、`~` 原地更新、`-/+` 替换（销毁后重建）或 `-` 销毁。

```bash
terraform init      # download providers, configure backend
terraform plan -out=tfplan   # diff desired vs state vs real; changes nothing
terraform apply tfplan       # execute exactly that plan
terraform destroy            # tear everything down
```

**状态**把配置中的地址映射到真实资源 ID。它可能包含密钥，所以不要提交到仓库。团队应使用**远程后端**（S3 + 锁表、GCS、Terraform Cloud），既有唯一的事实来源，又能用**锁**防止两个并发 apply。按环境或组件拆分状态以缩小爆炸半径。

**复用与安全**：
- **模块**把一组资源封装在输入变量和输出之后（VPC 模块、SageMaker endpoint 模块）；要固定其版本。
- **漂移**指真实基础设施被 Terraform 之外的方式修改；`plan` 会暴露它。可以重新 apply 或用 `terraform import` 修复。
- 某些属性变更会强制**替换**（例如重命名实例）；要留意 plan 中的 `-/+`，并对有状态资源使用 `lifecycle { prevent_destroy = true }`。
- `count`/`for_each` 用来创建多个实例；优先用带稳定键的 `for_each`，这样删除其中一项不会让其余项错位。
- Terraform 根据引用构建依赖图，所以相互独立的资源会并行创建。

## 示例讲解

队友对上面的配置在 `env = "prod"` 下运行 `terraform plan`。状态中已有 `acme-features-prod`，标签为 `{team = "ml"}`。你把标签改为 `{team = "ml", owner = "fraud"}`，并新增一个存储桶资源。plan 会对第一个桶显示 `~ update in place`（仅标签），对第二个显示 `+ create`：**1 个新增、1 个变更、0 个销毁**。如果改的是桶的*名称*，plan 会显示 `-/+ replace`，因为桶名不可变，面试官会期望你指出其中的数据丢失风险。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Terraform 状态文件的作用是什么？",
  "options": [
    "缓存 provider 插件",
    "把配置中的资源映射到真实资源 ID 和属性，使 plan 能计算差异",
    "存放 HCL 源码",
    "记录 apply 的日志"
  ],
  "explanation": "状态记录了 Terraform 管理的内容。没有它，Terraform 无法知道哪些真实资源对应你的配置。"
}
```

```quiz
{
  "id": "q2",
  "question": "两名工程师同时对同一个远程状态执行 `terraform apply`。什么机制能避免状态损坏？",
  "options": [
    "Terraform 会合并两个 plan",
    "没有，最后写入者胜出",
    "后端的状态锁（例如 DynamoDB 锁表）",
    "先运行 plan"
  ],
  "explanation": "支持锁的后端会在 apply 期间持有锁，因此第二次运行会等待或失败，而不是竞争写入。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 `terraform plan`。编写 `plan(state, desired, immutable=())`，其中 `state` 和 `desired` 把资源名映射为属性字典。返回包含已排序列表 `create`、`update`、`replace`、`destroy`（以及 `noop`）的字典。只在 desired 中的名称为创建；只在 state 中的为销毁；属性相同的为 noop；否则为更新，但如果任何发生变化的属性键在 `immutable` 中，则为替换。",
  "hints": [
    "遍历名称并集的排序结果，这样每个列表都是有序的。",
    "发生变化的键 = 两个字典中值不同的键；缺失的键视为 None。"
  ]
}
```

> [!TIP] 面试技巧
> - 要讲清三方比较（配置 vs 状态 vs 真实环境），以及为什么 apply 前先 plan 是安全网；在 CI 中应用已保存的 plan。
> - 带锁的远程状态、按环境拆分状态、绝不提交状态文件（可能含密钥）是常见追问。
> - 要了解漂移、`import`、替换（`-/+`）、`prevent_destroy`，以及为什么模块要固定版本。
