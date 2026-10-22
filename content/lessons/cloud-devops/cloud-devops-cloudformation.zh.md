---
id: cloud-devops-cloudformation
title: "CloudFormation"
---

## 为什么重要

CloudFormation 是 AWS 原生的基础设施即代码服务。面试官会问它与 Terraform 有何不同、栈如何安全更新，以及更新失败时会发生什么。

## 概念

你编写**模板**（YAML 或 JSON），并将其部署为**栈（stack）**：创建、更新和删除的基本单位。CloudFormation（CFN）由 AWS 托管，因此无需自己托管或加锁状态文件；状态由 AWS 保存，它只支持 AWS 资源（可通过 Lambda 自定义资源扩展）。

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

**模板各部分**：`Parameters`（输入）、`Mappings` 和 `Conditions`（按环境区分的逻辑）、`Resources`（唯一必需的部分）、`Outputs`（输出值，可选择**导出**以供跨栈引用）。**内置函数**把各部分连接起来：`!Ref`（参数值或资源 ID）、`!GetAtt`（如 ARN 之类的属性）、`!Sub`、`!Join`、`!If`、`!ImportValue`。

**依赖关系**由 `!Ref` 和 `!GetAtt` 推断；隐含依赖用 `DependsOn` 声明。CFN 并行创建相互独立的资源，并按相反顺序删除。

```bash
aws cloudformation deploy --stack-name ml-platform --template-file t.yaml \
  --parameter-overrides Env=prod --capabilities CAPABILITY_IAM
aws cloudformation create-change-set ...   # preview before executing
aws cloudformation detect-stack-drift --stack-name ml-platform
```

**安全更新**：
- **变更集（change set）**在执行前预览新增、修改和替换（相当于 `terraform plan`）。
- 每个资源的更新分为*无中断*、*部分中断*或*替换*；需按属性查文档确认。
- 更新失败时，栈会自动**回滚**到上一个正常状态（`UPDATE_ROLLBACK_COMPLETE`）。
- `DeletionPolicy: Retain` 或 `Snapshot` 保护数据类资源；**栈策略**阻止对关键资源的更新。
- **漂移检测**会报告在 CFN 之外被修改的资源。
- **嵌套栈**或 **StackSets** 复用模板，并可扇出到多个账号和区域。**CDK** 可用 TypeScript 或 Python 生成 CFN 模板。

**CFN 与 Terraform 对比**：CFN 仅限 AWS，无需管理状态，AWS 新功能首日即支持，并有自动回滚；Terraform 支持多云、模块生态更丰富、plan 更易读，但你需要自己运维状态。

## 示例讲解

用 `Env=prod` 部署该模板：`Condition` `IsProd` 为真，所以版本控制为 `Enabled`，桶名解析为 `acme-features-prod`。`JobRole` 与 `FeatureBucket` 之间没有引用，因此并行创建。假设之后的更新修改了某个需要替换 RDS 实例的属性：变更集会显示 `Replacement: True`，如果没有快照策略，数据就会丢失。这就是要阅读变更集并对数据库设置 `DeletionPolicy: Snapshot` 的原因。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在执行栈更新之前，如何预览 CloudFormation 将新增、修改或替换什么？",
  "options": [
    "创建变更集",
    "运行漂移检测",
    "删除并重建栈",
    "更新之后再看栈事件"
  ],
  "explanation": "变更集就是预览步骤；漂移检测比较的是带外修改，栈事件只显示已经发生的事。"
}
```

```quiz
{
  "id": "q2",
  "question": "栈更新进行到一半失败。CloudFormation 默认会怎么做？",
  "options": [
    "保留已更新一半的资源",
    "删除整个栈",
    "回滚到上一个已知的正常状态",
    "无限重试"
  ],
  "explanation": "默认行为是自动回滚，栈会恢复到之前可用的配置。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 CloudFormation 如何解析模板。实现 `resolve(node, params, refs)`：字典 `{'Ref': name}` 若 `params` 中有则返回 `params[name]`，否则返回 `refs[name]`（资源 ID）；`{'Fn::Join': [sep, items]}` 用 `sep` 连接已解析的 items；`{'Fn::If': [cond, a, b]}` 在 `params[cond]` 为真时返回解析后的 `a`，否则返回 `b`；列表和其他字典递归解析；标量原样返回。然后实现 `creation_order(resources)`，其中 `resources` 把逻辑 id 映射到（未解析的）属性；一个资源依赖其属性中 `Ref` 引用的其他资源。返回满足依赖的顺序，并列时按字母序。",
  "hints": [
    "在把字典当作普通映射之前，先检查单键字典的形式（'Ref'、'Fn::Join'、'Fn::If'）。",
    "递归收集 Ref 名称，只保留属于资源 id 的那些（参数不是依赖），然后反复选择依赖都已排好且字母序最靠前的资源。"
  ]
}
```

> [!TIP] 面试技巧
> - 先讲清模型：模板、栈、变更集、回滚；无需管理状态文件，因为状态由 AWS 持有。
> - 回答 CFN 与 Terraform 的区别要平衡：仅限 AWS 且自动回滚，对比多云、更丰富的模块和更易读的 plan。
> - 要提到 `DeletionPolicy`、栈策略、漂移检测、用于多账号的 StackSets，以及作为更高层编写方式的 CDK。
