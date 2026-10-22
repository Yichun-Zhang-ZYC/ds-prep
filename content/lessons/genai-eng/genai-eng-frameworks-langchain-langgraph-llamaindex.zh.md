---
id: genai-eng-frameworks-langchain-langgraph-llamaindex
title: "框架：LangChain、LangGraph、LlamaIndex"
---

## 为什么重要
LLM 框架承诺更快地做出原型，但也带来抽象层、依赖变动和调试困难。面试官想知道每个框架适用于什么、什么时候完全不用框架，以及如何把有状态的智能体建模为图。

## 概念
**LangChain**：集成与基础组件库（聊天模型、提示词模板、输出解析器、检索器、工具），通过 Runnable 接口组合（LCEL 管道语法：`prompt | model | parser`）。优势：集成广泛，并提供跨供应商的统一接口。现代 LangChain 智能体构建在 LangGraph 之上。

**LangGraph**：面向**有状态、长时间运行智能体**的底层编排框架，把智能体建模为图：
- **状态（State）**：带类型的共享对象；每个节点返回更新，按每个键的 **reducer** 合并（例如向消息列表追加）。
- **节点**：函数（一次 LLM 调用、一次工具调用、一次检查）。**边**：固定转移；**条件边**根据状态路由，从而实现循环（智能体 $\to$ 工具 $\to$ 智能体）和分支。
- **检查点（checkpointer）**每步持久化状态，支持跨会话记忆、**人在回路（human-in-the-loop）**中断、时间回溯以及失败后恢复。需要递归/步数上限来阻止失控循环。

**LlamaIndex**：以数据为中心。擅长摄取和 RAG：加载器与解析器、节点/分块解析、索引、检索器、查询引擎、后处理器（重排序器），以及事件驱动的 Workflows API 和智能体。

**如何选择**：
- 单个提示词或简单 RAG：直接调用供应商 SDK；层数更少，更易调试。
- 多来源、文档密集的 RAG：LlamaIndex。
- 需要分支、循环、持久化、人工审批：LangGraph。
- 框架的代价：抽象泄漏、API 变动快、隐藏的提示词、更难追踪（用 LangSmith 或基于 OpenTelemetry 的追踪缓解）、状态格式的供应商锁定。保持业务逻辑独立于框架。

## 示例讲解
一个 LangGraph 风格的客服智能体图：`classify` $\to$ 条件边指向 `billing`、`tech` 或 `escalate`；`tech` $\to$ `check_resolved`，未解决则回到 `tech`，已解决则到 `END`。每一步都对状态做检查点，所以如果进程在 `classify` 之后崩溃，会从 `tech` 恢复，而不是重新调用 LLM。

关于循环风险的快速估算：如果每次 `tech` 循环花费 2 次 LLM 调用，而模型始终不标记已解决，无界循环会产生无限多次调用。加上 `max_steps = 25` 的保护后，最坏情况被限制在 $25 \times 2 = 50$ 次调用（实际更少，因为并非每一步都调用 LLM），然后转交人工。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你的智能体需要在推理与工具调用之间循环，在退款前暂停等待人工批准，并在崩溃后恢复。哪个工具最合适？",
  "options": [
    "普通的 `prompt | model | parser` 链",
    "带检查点和条件边的 LangGraph",
    "向量索引",
    "一个很大的单一提示词"
  ],
  "explanation": "循环、中断和持久状态正是带检查点的 LangGraph 图所提供的。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于一个小功能，下列哪项是避免使用框架的合理理由？",
  "options": [
    "框架无法调用 LLM",
    "层数少意味着调试更简单、依赖更少、API 变动更少",
    "框架禁止流式输出",
    "SDK 总是更慢"
  ],
  "explanation": "对于一两次 LLM 调用，直接用 SDK 更简单也更稳定；随着编排复杂度上升，框架才物有所值。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `run_graph(nodes, edges, start, state, max_steps=20)`，一个迷你状态图运行器。`nodes` 把名称映射到 `fn(state) -> dict`（更新），合并进状态的副本（不要修改输入）。`edges` 把节点名映射到下一个节点：要么是字符串，要么是可调用的 `fn(state) -> str`（条件边）。字符串 `\"END\"` 表示停止执行。返回 `(final_state, path)`，其中 `path` 是已执行节点名称的列表。如果将要运行的节点数超过 `max_steps`，抛出 `RuntimeError`。",
  "hints": [
    "循环：name = start；当 name != 'END' 时：检查步数，运行节点，合并更新，然后解析下一个名称。",
    "`nxt = edges[name]; name = nxt(state) if callable(nxt) else nxt`。"
  ]
}
```

> [!TIP] 面试技巧
> - 把 LangGraph 描述为 状态 + 节点 + （条件）边 + 检查点；提到 reducer 和步数上限。
> - 展示判断力：简单任务直接用 SDK，需要循环、持久化或人在回路时用框架。
> - 说出代价：抽象泄漏、版本变动、隐藏提示词，并让核心逻辑独立于框架。
