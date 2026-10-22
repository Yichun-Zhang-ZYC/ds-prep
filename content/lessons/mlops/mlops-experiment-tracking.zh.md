---
id: mlops-experiment-tracking
title: 实验跟踪（MLflow、Weights & Biases）
---

## 为什么重要
“生产环境里的模型是哪次 run 产出的？你能复现吗？”是经典的 MLOps 问题。实验跟踪把零散的 notebook 试验变成可搜索、可复现的记录。

## 概念
跟踪工具会为每次 **run** 记录：**参数**（超参数、特征集合）、**指标**（通常按 step 记录为曲线）、**产物**（模型文件、图表、混淆矩阵）以及**上下文**（通过 git SHA 记录的代码版本、数据版本、环境、随机种子、硬件、运行者）。

**MLflow**（开源，可自托管）：
- **Tracking**：`mlflow.start_run()`、`log_param`、`log_metric(name, value, step)`、`log_artifact`；run 按**实验（experiment）**分组。自动记录（`mlflow.sklearn.autolog()`）会为常见库捕获参数、指标和模型。
- **Models / Registry**：打包的模型 flavor 以及带版本的注册（下一课）。
- 用后端存储（SQL 数据库）保存元数据，用产物存储（S3、GCS）保存文件。

**Weights & Biases**（托管 SaaS）：实时仪表盘、run 对比、超参数 **sweep**、带血缘的 artifact，以及团队报告。其他：Neptune、Comet、TensorBoard（仅曲线）。

**什么让 run 可复现**：固定的代码（commit SHA，并标记是否有未提交修改）、固定的数据（版本或内容哈希）、完整配置、随机种子，以及依赖锁文件或容器镜像。

**良好实践**：
- 记录*配置对象*，而不是零散变量，并给 run 打标签（`baseline`、`ablation`）。
- 在固定的验证集上记录评估结果，使 run 之间可比；测试集不参与选择。
- 对交叉验证折或 sweep 使用**嵌套 run**，由父 run 保存汇总结果。
- 用规则来选择，例如“在延迟约束下验证指标最好”，并记录原因。
- 小心比较不同数据版本或不同指标定义下的 run。

**搜索与比较**：按指标（`metrics.val_auc > 0.9`）、标签或参数过滤，并用平行坐标图查看哪些超参数重要。

## 示例讲解
同一数据版本（`d7`）上的三个 run：

| run | lr | depth | val AUC | 训练时间 |
|---|---|---|---|---|
| a1 | 0.1 | 4 | 0.871 | 40 s |
| a2 | 0.05 | 6 | 0.884 | 95 s |
| a3 | 0.05 | 8 | 0.885 | 210 s |

`a3` 的 AUC 最高，但比 `a2` 只高 0.001，训练时间却是 2.2 倍。按照“在最优 AUC 的 0.002 范围内选最快者”的规则，选择 `a2`。跟踪工具让你能说明这个决策，并根据记录的 SHA、配置和数据版本重新运行 `a2`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "下面哪一项对复现已跟踪的 run 至关重要，却常被遗忘？",
  "options": ["run 的显示名称", "数据版本和随机种子", "图表的颜色", "打开的浏览器标签数"],
  "explanation": "仅有代码和参数还不够：没有确切的数据版本和随机种子，结果可能无法复现。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 MLflow 中，模型文件等大型产物通常存放在哪里？",
  "options": ["后端元数据存储的那一行里", "S3 或 GCS 等产物存储，并由 run 引用", "Git 历史", "Python 进程内存"],
  "explanation": "MLflow 把轻量元数据放在后端存储（SQL 数据库），把文件放在产物存储里。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现一个简易跟踪器。`Tracker.log_run(params, metrics)` 保存一次 run 并返回其 id（`'run-1'`、`'run-2'`……）。`best_run(metric, mode='max')` 返回该指标最优 run 的 id（并列时取最早的；缺少该指标的 run 忽略；都没有则返回 `None`）。`filter_runs(**params)` 按顺序返回参数包含所有给定键值对的 run 的 id。",
  "hints": ["用列表按顺序保存 run，id 为 f'run-{len(runs)+1}'。", "用严格的 > 或 < 比较，这样并列时会保留最早的 run。"]
}
```

> [!TIP] 面试技巧
> - 说出你会跟踪什么：参数、按 step 的指标、产物、git SHA、数据版本、随机种子、环境。
> - 对比 MLflow（开源、自托管、注册表强）与 W&B（托管、仪表盘和 sweep 丰富），并坦率地说两者都可行。
> - 陷阱：在不同数据版本或有泄漏的验证划分上比较 run，会让排行榜失去意义。
