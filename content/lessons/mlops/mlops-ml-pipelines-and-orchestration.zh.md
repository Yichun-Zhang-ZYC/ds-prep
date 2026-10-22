---
id: mlops-ml-pipelines-and-orchestration
title: ML 流水线与编排（Kubeflow、Airflow、SageMaker / Vertex AI Pipelines）
---

## 为什么重要
notebook 不会自己重训练。面试官会问你如何把数据准备、训练、评估和部署变成可复现、可调度、可观测的流水线，以及你会选哪个编排器。

## 概念
**ML 流水线**是由多个步骤组成的 DAG：摄取并校验数据、构建特征、训练、评估、注册、部署（有时还包括批量打分）。**编排器**负责调度 DAG、在步骤之间传递产物、重试失败并记录血缘。

**设计原则**：
- **幂等、参数化的步骤**，以运行日期或数据版本为键，使重跑和回填是安全的。
- 步骤之间传递的是**产物，而不是内存对象**（对象存储中的路径，元数据存放在 ML Metadata 或 MLflow 等存储中）。
- **容器化的步骤**并固定依赖，使同样的代码在笔记本电脑和集群上都能运行。
- **缓存**：如果代码、输入和参数都没变，就跳过该步骤（Kubeflow 和 Vertex 按输入哈希缓存）。
- **关卡**：数据校验、与 champion 对比评估，以及部署前的人工批准。关卡失败会终止 DAG。
- **触发器**：定时、新数据到达、漂移告警，或代码合并（流水线本身的 CI/CD）。

**工具**：
- **Airflow**（以及 Dagster、Prefect）：通用，Python 编写的 DAG，算子丰富；适合数据管道，原生的 ML 产物跟踪较弱。
- **Kubeflow Pipelines（KFP）**：Kubernetes 原生，组件即容器，带类型的输入输出，产物血缘和缓存，另有 Katib（超参数调优）和 KServe（服务）。
- **Vertex AI Pipelines**（GCP 上托管的 KFP/TFX）和 **SageMaker Pipelines**（AWS）：托管服务，与各云的注册表、feature store 和 endpoint 集成；可移植性较差。
- **Metaflow、ZenML、Flyte**：以 Python 为先，从本地到云的工作流。

**如何选择**：用数据平台已有的工具（数据团队用 Airflow 就用 Airflow）；想免运维就用托管服务；Kubernetes 团队想要带类型的 ML 组件就用 KFP/Flyte。常见的分工是由 Airflow 的数据管道触发 ML 流水线。

**持续训练**把这一切串起来：监控或定时触发流水线，流水线重训练、与 champion 对比评估，只有通过关卡才注册或部署。

## 示例讲解
流水线：`ingest -> validate -> features -> train -> evaluate -> register`。昨天的运行耗时 60 分钟：validate 5，features 20，train 30，evaluate 5。

今天只改了 **train 步骤中的一个超参数**。启用缓存后，`ingest`、`validate` 和 `features` 的代码、输入和参数都相同，因此被跳过。重跑 `train`、`evaluate`、`register`：30 + 5 + 几秒，约 35 分钟而不是 60 分钟。如果变的是*原始数据*，则所有下游步骤都会失效，因为每个步骤的输入哈希都包含其上游的输出。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某个步骤的代码和参数都没变，但其上游步骤产生了新的输出。带缓存的编排器应该重跑它吗？",
  "options": ["不，缓存只看代码", "是，输入产物的哈希变了", "只有当它是最后一步时", "只有周一"],
  "explanation": "缓存键包含输入产物，所以上游输出变化会使下游步骤失效。"
}
```

```quiz
{
  "id": "q2",
  "question": "在步骤之间传递产物路径而不是内存对象，最好的理由是什么？",
  "options": ["路径序列化更快", "步骤运行在不同的容器或机器上，必须可重跑且可追踪", "Python 禁止传对象", "这会降低模型准确率"],
  "explanation": "独立的进程只能共享持久化的产物，而持久化的产物能提供血缘和重跑能力。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "为带缓存的流水线建模。`topo_order(deps)`：`deps` 把步骤映射到其上游步骤列表；返回执行顺序，每次选择字母序最小的就绪步骤。`steps_to_run(deps, changed)`：`changed` 是自身代码或参数发生变化的步骤集合（或原始数据步骤）；按拓扑顺序返回所有必须重跑的步骤，即变化的步骤及其所有下游。未变化且不受影响的步骤直接使用缓存。",
  "hints": ["Kahn 算法：反复选择上游都已完成的步骤。", "重跑集合 = changed 加上所有（传递性地）依赖于它们的步骤；对 topo_order 的结果做过滤即可。"]
}
```

> [!TIP] 面试技巧
> - 把它框架化为带幂等、容器化步骤、缓存、关卡和触发器的 DAG，然后按谁来运维来比较工具（数据用 Airflow，ML 用 KFP/Vertex/SageMaker）。
> - 提到持续训练：触发器加上与 champion 对比的评估关卡，绝不盲目自动部署。
> - 陷阱：业务逻辑与某个编排器的 SDK 紧耦合；应把步骤代码写成普通的、可测试的函数或容器。
