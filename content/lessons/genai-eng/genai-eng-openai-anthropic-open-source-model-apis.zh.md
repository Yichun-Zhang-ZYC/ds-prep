---
id: genai-eng-openai-anthropic-open-source-model-apis
title: OpenAI / Anthropic / 开源模型 API
---

## 为什么重要
大多数 GenAI 岗位都涉及调用托管或自托管的模型。面试官会检查你是否了解聊天 API 的共同形态、各厂商的差异，以及如何避免厂商锁定并处理失败情况（结束原因、截断、工具调用），而不是只会写 `client.chat(...)`。

## 概念
**共同形态**：无状态请求，包含带角色标签的消息列表（`system`、`user`、`assistant`，以及工具结果）、采样参数和输出上限。服务器不保存对话：**每一轮你都要重新发送历史**，并且要为此付费。

| | OpenAI（Chat Completions） | Anthropic（Messages） |
|---|---|---|
| System prompt | 消息列表中的 `system`/`developer` 消息 | 单独的顶层 `system` 字段 |
| 输出上限 | `max_completion_tokens`（可选） | `max_tokens`（**必填**） |
| 回复 | `choices[0].message.content` | `content`：带类型的块列表（`text`、`tool_use`、thinking） |
| 停止信号 | `finish_reason`：`stop`、`length`、`tool_calls` | `stop_reason`：`end_turn`、`max_tokens`、`tool_use` |
| 用量 | `prompt_tokens`、`completion_tokens` | `input_tokens`、`output_tokens` |

OpenAI 还提供较新的 Responses API，带有服务端状态和内置工具；上述无状态模式仍然适用。

**开源模型**（Llama、Qwen、Mistral、DeepSeek）：可以用 vLLM、TGI、llama.cpp 或 Ollama 自托管，它们通常会暴露**兼容 OpenAI 的端点**（把 SDK 的 `base_url` 指向你的服务器），也可以使用接口相同的托管推理服务。权衡：大规模下的控制权、数据驻留和单 token 成本，对比 GPU 运维、容量规划，以及通常低于前沿模型的质量。

**工程要点**：
- 一定要检查停止信号：`length`/`max_tokens` 表示输出被截断；工具调用的停止需要处理，而不是直接展示。
- 固定**模型版本**，因为别名会改变行为；保留评测集，在升级时捕获回归。
- 把厂商调用放在一层薄接口（自己的 `LLMClient`）后面，以便切换模型、添加回退并统一记录日志；避免让厂商特有的功能到处泄漏。
- 参数：`temperature`（随机性；抽取任务用 0）、`top_p`、停止序列、seed（尽力而为，不保证确定性）。部分推理模型会限制采样参数。
- 密钥只放在服务端，设置超时，并使用厂商的重试/退避（见后续课程）。

## 示例讲解
同一个请求用于两家厂商。OpenAI 风格：

```json
{"model": "gpt-...", "messages": [
  {"role": "system", "content": "Be brief."},
  {"role": "user", "content": "What is RAG?"}]}
```

Anthropic 风格：

```json
{"model": "claude-...", "max_tokens": 256, "system": "Be brief.",
 "messages": [{"role": "user", "content": "What is RAG?"}]}
```

如果响应中 `stop_reason: "max_tokens"`，用量为 12 个输入 token 和 256 个输出 token，说明答案在上限处被截断；把它当作完整答案展示就是 bug。一个把两种格式规范化为 `(text, input_tokens, output_tokens, truncated)` 的封装，可以让应用的其余部分、日志和成本看板与厂商无关。LiteLLM 之类的网关或你自己的路由器在基础设施层面也做同样的事。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一次聊天 API 调用返回 `finish_reason: \"length\"`。发生了什么，你应该怎么做？",
  "options": [
    "模型正常结束",
    "输出达到 token 上限被截断；提高上限、缩短请求，或继续生成",
    "请求被限流",
    "模型拒绝回答"
  ],
  "explanation": "`length`（Anthropic 为 `max_tokens`）表示输出被截断。对结构化输出来说这是失败，需要显式处理。"
}
```

```quiz
{
  "id": "q2",
  "question": "你想运行开源模型，同时保留使用 OpenAI SDK 的应用代码。通常的做法是什么？",
  "options": [
    "用 C++ 重写所有代码",
    "用 vLLM/Ollama 部署，并把 SDK 的 `base_url` 指向它兼容 OpenAI 的端点",
    "微调 OpenAI 的模型",
    "不可能做到"
  ],
  "explanation": "大多数推理服务器都模拟了 OpenAI 聊天 API，所以通常只需更换 `base_url` 和模型名。要检查功能差距，例如工具调用和结构化输出。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "规范化两种厂商格式。`to_anthropic(messages, max_tokens=1024)` 把 OpenAI 风格的消息列表转换为 dict，包含 `max_tokens`、`messages`（非 system 消息，保持顺序），以及仅当存在 system 消息时才有的 `system`（内容用空行连接）。`extract_text(resp)` 从 OpenAI 风格响应（`choices`）或 Anthropic 风格响应（`content` 块；只拼接 `text` 块）中返回回复文本。`usage_tokens(resp)` 从任一格式返回 `(input_tokens, output_tokens)`。",
  "hints": [
    "通过检查是否存在 `choices` 键来判断格式。",
    "忽略 `type` 不是 `text` 的块（例如 `tool_use`）。"
  ]
}
```

> [!TIP] 面试技巧
> - 描述无状态的消息模型，以及为什么重发历史会推高成本和延迟。
> - 说出真正的差异（system 字段、必填的 `max_tokens`、内容块、停止原因），以及你如何用自己的客户端和回退机制把它们隐藏起来。
> - 对于开源模型，说 vLLM 加兼容 OpenAI 的端点，并权衡成本、隐私和运维负担。
