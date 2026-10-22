---
id: cloud-devops-terraform-state-and-modules
title: Terraform 状态与模块
---

## 为什么重要
Terraform 是默认的基础设施即代码工具，面试不会只问 `terraform apply`：状态存在哪里、两个人同时 apply 为什么会损坏状态、如何把单体拆成模块，以及现实与代码漂移时会发生什么。数据和机器学习团队用代码管理数据仓库、存储桶、IAM 和 GPU 集群时都会遇到这些问题。HCL 基础见 Terraform 课程；本课讲状态与结构。

## 概念
**状态**（`terraform.tfstate`）把代码中的每个资源地址（`aws_s3_bucket.raw`）映射到真实对象 ID 及其最近已知的属性。Terraform 通过对比三者来制定计划：配置（期望）、状态（最近已知）以及对真实环境的刷新。

**带锁的远程状态**：绝不要把状态放在笔记本上。使用远程后端（S3 加锁机制如 S3 原生锁或 DynamoDB、GCS、Azure Blob、Terraform Cloud）。锁可防止两个并发 apply 损坏状态。状态中常含明文密钥，因此要加密、开启版本管理并限制访问。

**常见状态操作**：
- `terraform import`（或 `import` 块）把已有资源纳入状态。
- `terraform state mv` / `moved` 块在不销毁重建的情况下重命名或迁移资源。
- `terraform state rm` 停止管理资源但不删除它。
- `terraform plan -refresh-only` 检测**漂移**（有人在控制台改了配置）。

**模块**是可复用的 `.tf` 文件夹，带 `variable` 输入和 `output` 输出。准则：小而单一职责、有版本（固定 `version` 或 git tag）、必填输入少且默认值合理、内部不配置 provider（由根模块传入）。优先组合而不是深层嵌套。

**拆分状态**：一个巨大的状态意味着计划缓慢、爆炸半径巨大。按生命周期和归属（网络、数据平台、各服务）以及按环境拆分（独立的状态 key 或目录，而不是只依赖 workspace）。用输出加 `terraform_remote_state` 或数据源查询在不同栈之间共享值。

**常见陷阱**：手工编辑状态；对列表使用 `count`（删除第 0 项会让地址整体移位，应优先用带稳定键的 `for_each`）；变量中的密钥最终写进状态；习惯性使用 `-target`；在代码中重命名资源却不加 `moved` 块（会计划销毁再创建）。

## 示例讲解
团队把代码中的 `aws_s3_bucket.data` 重命名为 `aws_s3_bucket.raw`。计划显示 **1 个销毁、1 个新增**，这会删除存储桶中的数据。修复：添加

```hcl
moved {
  from = aws_s3_bucket.data
  to   = aws_s3_bucket.raw
}
```

计划就变成“0 新增、0 修改、0 销毁”（只更新状态中的地址）。

第二种情况：同事在控制台把存储桶改成公开。`terraform plan` 报告 `acl: "public-read" -> "private"`（1 个修改）。应用后漂移被还原；如果控制台的修改是有意的，则应改代码，让代码始终是事实来源。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "两位工程师同时对同一个远程状态运行 `terraform apply`，什么保护了状态？",
  "options": [
    "Terraform 自动合并两个计划",
    "后端的状态锁，第二次运行会等待或失败",
    "每次 apply 都有自己的状态副本",
    "什么都没有；按设计最后写入者获胜"
  ],
  "explanation": "带锁的后端在写操作期间持有锁，防止并发 apply 损坏状态。"
}
```

```quiz
{
  "id": "q2",
  "question": "你在代码中重命名了资源，计划显示销毁加创建。最安全的修复是什么？",
  "options": [
    "直接 apply 并重建",
    "删除状态文件",
    "添加 `moved` 块（或 `terraform state mv`），让状态跟随重命名",
    "对新资源使用 `-target`"
  ],
  "explanation": "`moved` 块或 `state mv` 会更新状态中的地址，真实基础设施不会改变。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `plan(desired, state)` 来模拟 Terraform 的差异比较。两者都是资源地址到属性字典的映射。返回一个字典，其中 `create`（仅在 desired 中）、`update`（两者都有但属性不同）和 `delete`（仅在 state 中）都是排序后的列表。",
  "hints": [
    "对字典的键使用集合式的成员判断。",
    "用 `!=` 比较属性字典。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Terraform 会构建依赖图。实现 `apply_order(deps)`，返回每个资源都排在其依赖之后的顺序，平局按字母序。遇到环时抛出 `ValueError`。",
  "hints": [
    "反复选取没有剩余依赖的、字母序最小的资源。",
    "如果没有可选资源但仍有剩余，说明存在环。"
  ]
}
```

> [!TIP] 面试技巧
- 先讲状态：它是什么、远程后端加锁、加密、绝不手工编辑。
- 提到 `moved`、`import` 以及用 `for_each` 代替 `count`，体现实战经验。
- 解释爆炸半径：按生命周期和环境拆分状态，给模块打版本。
- 了解漂移：`plan -refresh-only`，并决定以代码还是控制台为事实来源。
