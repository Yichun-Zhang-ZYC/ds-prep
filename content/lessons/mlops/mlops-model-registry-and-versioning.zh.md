---
id: mlops-model-registry-and-versioning
title: 模型注册表与版本管理
---

## 为什么重要
注册表是训练与服务之间的交接点：它回答“生产环境里是哪个模型、谁批准的、怎么回滚？”预计会被问到晋升流程和血缘。

## 概念
**模型注册表（model registry）**是已训练模型的中央版本化目录，附带元数据和生命周期状态。在 MLflow 中，每个**已注册模型**（一个名字）有不可变的**版本**（1、2、3……），每个版本指向产生它的 run 和产物。

**每个版本保存**：产物 URI、来源 run、代码 SHA、训练数据版本、指标、签名（输入/输出 schema）、依赖、描述、标签、批准人。

**生命周期**：
- 经典的**阶段（stage）**：`None` 到 `Staging` 到 `Production` 再到 `Archived`。较新的 MLflow 版本弃用阶段，改用**别名（alias）**（`champion`、`challenger`）和标签，因为一个模型可以同时承担多个角色。
- 服务代码通过别名加载（`models:/fraud@champion`），而不是写死版本号，所以晋升只是元数据变更，**回滚**就是把别名指回去。

**晋升关卡**（在 CI 中自动化）：
1. 候选模型在固定评估集上以一定幅度超过 champion（例如 AUC +0.5%）。
2. 关键切片（地区、新用户）以及延迟和成本没有退化。
3. 公平性与合规检查、签名检查，以及模型卡（model card）。
4. 高风险模型需要人工批准，然后进行 canary 或 shadow 发布。

**版本管理**：只有固定了代码、数据和配置，模型版本才可复现。在注册表中使用递增的版本号，并把*服务镜像*版本与*模型*版本分开。

**其他选择**：SageMaker Model Registry、Vertex AI Model Registry、Hugging Face Hub，小团队可用 DVC 或 Git-LFS。

**陷阱**：原地覆盖产物、手动晋升而没有审计记录，以及模型版本没有记录它所依赖的特征流水线版本。

## 示例讲解
Champion `fraud` v7 的 AUC 为 0.912，p99 延迟 40 ms。候选 v8 训练后 AUC 为 0.918（+0.006），p99 为 38 ms，但新账户的召回率从 0.71 降到 0.64。

关卡：AUC 提升幅度通过（要求至少 +0.005），延迟通过，**切片检查未通过**（最大允许下降 0.02）。v8 保持 `challenger`，`champion` 别名仍指向 v7。如果通过了，就先做 5% 的 canary，再把 `champion` 移到 v8。如果错误率飙升，把别名设回 v7 就是全部回滚操作。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么服务代码应加载 `models:/fraud@champion` 而不是 `models:/fraud/8`？",
  "options": ["别名让模型更小", "晋升和回滚变成元数据变更，无需重新部署", "版本号是随机的", "别名能加快推理"],
  "explanation": "通过别名间接引用，使发布与代码部署解耦，并支持一步回滚。"
}
```

```quiz
{
  "id": "q2",
  "question": "候选模型的总体 AUC 更高，但在关键细分群体上差得多。晋升关卡应该怎么做？",
  "options": ["晋升它，因为总体 AUC 更好", "阻止或上报，因为切片退化是明确的关卡标准", "删除 champion", "数据量大时忽略切片"],
  "explanation": "总体提升可能掩盖有害的退化；关卡应包含切片、延迟和成本检查。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `Registry`。`register(name, metrics)` 为 `name` 创建下一个版本（1、2……）并返回该版本号。`promote(name, version, gate)`，其中 `gate = {'metric': str, 'min_gain': float, 'max_slice_drop': float}`：比较候选的 `metrics[gate['metric']]` 与当前 champion 的；如果没有 champion 则直接晋升。否则仅当 `candidate - champion >= min_gain - 1e-12`，且两者都有的每个切片指标（键以 `'slice_'` 开头）满足下降量 `champion - candidate <= max_slice_drop + 1e-12` 时才晋升。晋升则返回 True 并设置别名，否则返回 False。`champion(name)` 返回 champion 版本或 None。`rollback(name)` 把 champion 设回上一个 champion（并返回它；没有历史则返回 None）。",
  "hints": ["为每个模型名保存 versions 列表和 champion 历史栈。", "rollback 时弹出当前 champion，新的栈顶就是上一个 champion。"]
}
```

> [!TIP] 面试技巧
> - 描述流程：训练、记录、注册版本、与 champion 对比评估、过关卡、canary、通过别名晋升，通过重新指向别名回滚。
> - 说明哪些元数据使版本可复现：run、代码 SHA、数据版本、签名、依赖。
> - 陷阱：只跟踪模型文件，而不跟踪它依赖的特征代码或 schema；模型即使“正确”也可能无法使用。
