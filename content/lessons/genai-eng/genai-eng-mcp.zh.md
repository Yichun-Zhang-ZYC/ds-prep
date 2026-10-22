---
id: genai-eng-mcp
title: "MCP（模型上下文协议）"
---

## 为什么重要
每个智能体都需要工具和数据，而在 MCP 之前，每个应用都要为每个服务编写定制的对接代码。MCP 是连接 AI 应用与工具和上下文的开放标准（由 Anthropic 于 2024 年底提出，现已被广泛采用）。面试官会问它是什么、与函数调用有何不同，以及有哪些安全风险。

## 概念
**架构**：**宿主**（AI 应用，如 IDE 或聊天客户端）为每个**服务器**运行一个**客户端**。服务器暴露某个系统（文件、GitHub、数据库）的能力。消息采用 **JSON-RPC 2.0**。

**服务器原语**：
- **工具（Tools）**：模型可以调用的函数（由模型控制），每个都有名称、描述和 JSON Schema 的 `inputSchema`。
- **资源（Resources）**：以 URI 标识的只读数据，如文件或记录（由应用控制）。
- **提示词（Prompts）**：用户可以调用的可复用模板（由用户控制）。

服务器可以请求的**客户端功能**：**sampling**（请求宿主的模型生成补全）、**roots**（服务器可访问哪些目录/URI）、**elicitation**（向用户请求输入）。

**生命周期**：`initialize`（协商协议版本和能力）→ `tools/list`（发现；工具列表变化时服务器可发送通知）→ 带 `name` 和 `arguments` 的 `tools/call`。工具失败通常在结果中以 `isError: true` 返回，让模型能看到并恢复；协议错误（未知方法 `-32601`、参数错误 `-32602`）使用 JSON-RPC 的 `error` 字段。

**传输方式**：**stdio**（本地子进程）和 **Streamable HTTP**（远程服务器，基于 OAuth 的授权）。

**MCP 与函数调用**：函数调用是*模型 API* 输出结构化工具调用的方式；MCP 标准化的是*应用如何发现并托管*工具。宿主把 MCP 的工具 schema 转换为模型的函数调用格式。好处：$N$ 个应用 $\times$ $M$ 个服务只需 $N + M$ 个集成，而不是 $N \times M$ 个。

**安全**：把工具描述和结果视为不可信（**工具投毒**和提示词注入），遵循最小权限，对有副作用的工具要求人工批准，按服务器限定令牌范围，并警惕远程服务器上的混淆代理（confused deputy）问题。

## 示例讲解
五个 AI 应用（IDE、聊天、CLI、客服机器人、笔记本）要接入八个服务（GitHub、Slack、Postgres、Drive、Jira、Sentry、Stripe、Notion）。定制集成：$5 \times 8 = 40$ 个。使用 MCP：8 个服务器加 5 个客户端 $= 13$ 个。

线路上的一次调用：

```json
{"jsonrpc": "2.0", "id": 7, "method": "tools/call",
 "params": {"name": "query_db", "arguments": {"sql": "SELECT 1"}}}
```

服务器回复 `{"jsonrpc": "2.0", "id": 7, "result": {"content": [{"type": "text", "text": "1"}]}}`。如果查询失败，它会在结果中设置 `"isError": true`，让模型读取错误信息并重试。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪种 MCP 原语由模型控制，由模型决定何时调用？",
  "options": [
    "资源",
    "提示词",
    "工具",
    "Roots"
  ],
  "explanation": "工具是由模型控制的函数。资源是由应用控制的数据，提示词是由用户控制的模板。"
}
```

```quiz
{
  "id": "q2",
  "question": "一次工具调用因 SQL 语法错误而失败。MCP 服务器通常应如何报告？",
  "options": [
    "让服务器进程崩溃",
    "返回 isError 为 true 且带错误信息的结果，让模型自行调整",
    "返回 JSON-RPC 错误 -32601",
    "静默返回空结果"
  ],
  "explanation": "执行错误放在工具结果中（isError），让 LLM 能看到并自我纠正。-32601 表示方法不存在。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `handle_request(req, tools)`，一个迷你的 MCP 风格 JSON-RPC 处理器。`tools` 把名称映射到 `{\"description\": str, \"required\": [参数名], \"fn\": callable}`。始终回显 `\"jsonrpc\": \"2.0\"` 和请求的 `id`。方法：`tools/list` 返回 `{\"result\": {\"tools\": [{\"name\", \"description\"}, ...]}}`，按名称排序。`tools/call`（参数 `name`、`arguments`）返回 `{\"result\": {\"content\": [{\"type\": \"text\", \"text\": str(output)}]}}`；未知工具或缺少必需参数时返回 `{\"error\": {\"code\": -32602, \"message\": ...}}`；如果 `fn` 抛出异常，返回带 `\"isError\": True` 的结果，并把异常信息作为文本。其他任何方法返回错误码 -32601。",
  "hints": [
    "先构建带有 jsonrpc 和 id 的响应字典，再添加 `result` 或 `error`。",
    "在 try/except Exception 中调用 `fn(**arguments)`；调用之前先检查必需参数。"
  ]
}
```

> [!TIP] 面试技巧
> - 把 MCP 比作 USB-C 式标准：它把 N x M 的集成问题变成 N + M。
> - 掌握三种原语（工具、资源、提示词）以及各自由谁控制。
> - 以安全开场：不可信的工具描述/结果、最小权限、人工批准、远程服务器使用 OAuth。
