---
id: swe-documentation
title: 文档
---

## 为什么重要
没有文档的代码和模型会变成部落知识，人一走就带走了。面试官用“你如何记录你的工作？”来考察资历，而对 ML 岗位来说，记录数据、假设和模型局限是负责任实践的一部分。

## 概念
好的文档在合适的层次回答读者的真实问题，并且贴近代码，不至于腐烂。一个有用的划分（**Diataxis** 框架）：
- **教程（Tutorials）**：面向学习，一步一步。
- **操作指南（How-to guides）**：面向任务的做法（“如何重新训练模型”）。
- **参考（Reference）**：精确、完整，尽可能自动生成（API 文档、配置选项）。
- **解释（Explanation）**：背景和“为什么”（架构、权衡）。

**代码中**
- 公共模块、类和函数的 **docstring**：做什么、参数、返回值、抛出的错误、单位和形状。选定一种风格（Google、NumPy 或 reST）并强制执行。包含简短示例，可以兼作 **doctest**。
- **类型提示**以可检查的方式记录类型（`def predict(x: np.ndarray) -> float`）。
- **注释**解释*为什么*（不明显的约束、变通办法），而不是代码已经表达的内容。避免过时的注释。
- 好的命名和小函数可以减少对注释的需求。

```python
def zscore(xs: list[float]) -> list[float]:
    """Standardize values to zero mean and unit variance.

    Args:
        xs: Non-empty list of numbers.

    Returns:
        List of (x - mean) / std using the population std.

    Raises:
        ValueError: If xs is empty or has zero variance.

    Example:
        >>> zscore([1.0, 3.0])
        [-1.0, 1.0]
    """
```

**项目层面**
- **README**：它是什么、如何安装、快速上手、如何运行测试、去哪里求助。新同事应该能在几分钟内跑起来。
- **架构文档/图**和 **ADR**（架构决策记录）：每个决策一个简短文件，包含背景、决策、备选方案和后果。它们记录*为什么*。
- **API 文档**：FastAPI 生成的 OpenAPI/Swagger，加上示例；**变更日志**和版本管理（SemVer）。
- **运维手册（Runbook）**：如何操作、调试和恢复（告警、回滚步骤）。
- **文档即代码**：Markdown 放在仓库里，在 PR 中评审，用 MkDocs 或 Sphinx 构建，并在 CI 中检查（文档覆盖率、链接检查、doctest）。

**数据和 ML**
- **数据字典/数据表（datasheet）**：列、类型、单位、来源、新鲜度、已知的质量问题。
- **模型卡（Model card）**：预期用途、训练数据、指标（包括分组指标）、局限、伦理考量、版本和负责人。
- **实验追踪**（MLflow、W&B），记录参数、数据版本和代码 commit，使结果可复现。

保持文档简短、最新、易于发现；错误的文档比没有文档更糟。

## 示例讲解
接手一个没有文档的流失预测模型，会让新员工花上好几天。补上：带有 `make setup && make train` 的 README（30 分钟完成首次运行）、模型卡（在 2023-24 年美国订阅用户上训练，AUC 0.84，对在网时长不足 30 天的用户召回率从 0.71 降到 0.55，不要用于企业账户）、ADR “选择梯度提升而非神经网络：AUC 相近，服务成本低 10 倍，更易解释”，以及运维手册（“如果 `tenure` 的 PSI 超过 0.2，使用 `make train DATE=...` 重新训练”）。CI 中检查公共函数的 docstring 覆盖率为 90%。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "ADR（架构决策记录）的主要目的是什么？",
  "options": ["自动生成 API 参考", "记录为什么做出某个决策，包括备选方案和权衡", "列出代码库中所有函数", "追踪 bug"],
  "explanation": "ADR 记录背景和理由，让未来的工程师理解系统为何是现在这个样子。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪条注释最有用？",
  "options": ["# increment i", "# loop over rows", "# API rounds timestamps to the minute, so subtract 60 s to avoid double counting", "# TODO fix later"],
  "explanation": "好的注释解释不明显的原因和约束，而不是重复代码显而易见的内容。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `doc_coverage(source)`，用 `ast` 解析 Python 源码，考察每个名称不以下划线开头的函数、异步函数和类。返回元组 `(documented, total, missing)`，其中 `missing` 是没有 docstring 的名称的排序列表（使用 `ast.get_docstring`）。",
  "hints": ["ast.walk 会产生所有节点，包括嵌套在类中的方法。", "documented = total - len(missing)。"]
}
```

> [!TIP] 面试技巧
> - 说明你记录什么、记录在哪里：代码中的 docstring 和类型，仓库中的 README 和 ADR，ML 的模型卡和数据字典。
> - 强调让文档贴近代码、在 PR 中评审并接受测试（doctest、链接检查），这样它们不会腐烂。
> - 解释注释说的是为什么而不是做什么，以及好的 README 能让新工程师在一小时内上手。
