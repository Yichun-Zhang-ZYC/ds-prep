---
id: genai-eng-mcp
title: "MCP (Model Context Protocol)"
estimatedMinutes: 11
difficulty: medium
tags: [genai, agents, mcp, tools, protocol]
---

## Why it matters
Every agent needs tools and data, and before MCP each app wrote custom glue for each service. MCP is the open standard (introduced by Anthropic in late 2024, now widely adopted) for connecting AI applications to tools and context. Interviewers ask what it is, how it differs from function calling, and what the security risks are.

## Concept
**Architecture**: a **host** (the AI app, e.g. an IDE or chat client) runs one **client** per **server**. A server exposes capabilities from a system (files, GitHub, a database). Messages are **JSON-RPC 2.0**.

**Server primitives**:
- **Tools**: functions the model can call (model-controlled), each with a name, description and JSON Schema `inputSchema`.
- **Resources**: read-only data identified by URI, such as files or records (application-controlled).
- **Prompts**: reusable templates the user can invoke (user-controlled).

**Client features** servers can request: **sampling** (ask the host's model for a completion), **roots** (which directories/URIs the server may touch), **elicitation** (ask the user for input).

**Lifecycle**: `initialize` (negotiate protocol version and capabilities) → `tools/list` (discovery; servers can notify when the list changes) → `tools/call` with `name` and `arguments`. Tool failures are normally returned inside the result with `isError: true` so the model can see and recover; protocol errors (unknown method `-32601`, bad params `-32602`) use the JSON-RPC `error` field.

**Transports**: **stdio** (local subprocess) and **Streamable HTTP** (remote servers, with OAuth-based authorization).

**MCP vs function calling**: function calling is how a *model API* emits structured tool calls; MCP standardizes how an *application discovers and hosts* tools. The host converts MCP tool schemas into the model's function-calling format. Benefit: $N$ apps $\times$ $M$ services needs $N + M$ integrations instead of $N \times M$.

**Security**: treat tool descriptions and results as untrusted (**tool poisoning** and prompt injection), apply least privilege, require human approval for side-effecting tools, scope tokens per server, and beware the confused-deputy problem on remote servers.

## Worked example
Five AI apps (IDE, chat, CLI, support bot, notebook) must reach eight services (GitHub, Slack, Postgres, Drive, Jira, Sentry, Stripe, Notion). Custom integrations: $5 \times 8 = 40$. With MCP: 8 servers plus 5 clients $= 13$.

A call on the wire:

```json
{"jsonrpc": "2.0", "id": 7, "method": "tools/call",
 "params": {"name": "query_db", "arguments": {"sql": "SELECT 1"}}}
```

The server replies `{"jsonrpc": "2.0", "id": 7, "result": {"content": [{"type": "text", "text": "1"}]}}`. If the query fails, it sets `"isError": true` in the result instead, so the model can read the message and retry.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which MCP primitive is controlled by the model, which decides when to invoke it?",
  "options": [
    "Resources",
    "Prompts",
    "Tools",
    "Roots"
  ],
  "answer": 2,
  "explanation": "Tools are model-controlled functions. Resources are application-controlled data and prompts are user-controlled templates."
}
```

```quiz
{
  "id": "q2",
  "question": "A tool call fails because a SQL query has a syntax error. How should an MCP server normally report it?",
  "options": [
    "Crash the server process",
    "Return a result with isError true and the message, so the model can adapt",
    "Return JSON-RPC error -32601",
    "Silently return an empty result"
  ],
  "answer": 1,
  "explanation": "Execution errors go in the tool result (isError) so the LLM can see and self-correct. -32601 means the method does not exist."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `handle_request(req, tools)`, a tiny MCP-style JSON-RPC handler. `tools` maps a name to `{\"description\": str, \"required\": [arg names], \"fn\": callable}`. Always echo `\"jsonrpc\": \"2.0\"` and the request `id`. Methods: `tools/list` returns `{\"result\": {\"tools\": [{\"name\", \"description\"}, ...]}}` sorted by name. `tools/call` (params `name`, `arguments`) returns `{\"result\": {\"content\": [{\"type\": \"text\", \"text\": str(output)}]}}`; an unknown tool or a missing required argument returns `{\"error\": {\"code\": -32602, \"message\": ...}}`; if `fn` raises, return a result with `\"isError\": True` and the exception message as text. Any other method returns error code -32601.",
  "starterCode": "def handle_request(req, tools):\n    pass\n\ntools = {'add': {'description': 'Add', 'required': ['a', 'b'], 'fn': lambda a, b: a + b}}\nprint(handle_request({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list'}, tools))",
  "tests": "tools = {\n    'add': {'description': 'Add two numbers', 'required': ['a', 'b'], 'fn': lambda a, b: a + b},\n    'boom': {'description': 'Fails', 'required': [], 'fn': lambda: 1 / 0},\n}\nr = handle_request({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list'}, tools)\nassert r['jsonrpc'] == '2.0' and r['id'] == 1\nassert r['result']['tools'] == [{'name': 'add', 'description': 'Add two numbers'}, {'name': 'boom', 'description': 'Fails'}]\nr = handle_request({'jsonrpc': '2.0', 'id': 2, 'method': 'tools/call', 'params': {'name': 'add', 'arguments': {'a': 2, 'b': 3}}}, tools)\nassert r['id'] == 2 and r['result']['content'] == [{'type': 'text', 'text': '5'}]\nassert not r['result'].get('isError')\nr = handle_request({'jsonrpc': '2.0', 'id': 3, 'method': 'tools/call', 'params': {'name': 'nope', 'arguments': {}}}, tools)\nassert r['error']['code'] == -32602 and 'result' not in r\nr = handle_request({'jsonrpc': '2.0', 'id': 4, 'method': 'tools/call', 'params': {'name': 'add', 'arguments': {'a': 1}}}, tools)\nassert r['error']['code'] == -32602\nr = handle_request({'jsonrpc': '2.0', 'id': 5, 'method': 'tools/call', 'params': {'name': 'boom', 'arguments': {}}}, tools)\nassert r['result']['isError'] is True and 'division' in r['result']['content'][0]['text']\nr = handle_request({'jsonrpc': '2.0', 'id': 6, 'method': 'resources/list'}, tools)\nassert r['error']['code'] == -32601 and r['id'] == 6",
  "solution": "def handle_request(req, tools):\n    resp = {'jsonrpc': '2.0', 'id': req.get('id')}\n    method = req.get('method')\n    if method == 'tools/list':\n        resp['result'] = {'tools': [{'name': n, 'description': tools[n]['description']} for n in sorted(tools)]}\n    elif method == 'tools/call':\n        params = req.get('params', {})\n        name = params.get('name')\n        args = params.get('arguments', {})\n        if name not in tools:\n            resp['error'] = {'code': -32602, 'message': 'Unknown tool: %s' % name}\n        else:\n            missing = [a for a in tools[name]['required'] if a not in args]\n            if missing:\n                resp['error'] = {'code': -32602, 'message': 'Missing arguments: %s' % ', '.join(missing)}\n            else:\n                try:\n                    out = tools[name]['fn'](**args)\n                    resp['result'] = {'content': [{'type': 'text', 'text': str(out)}]}\n                except Exception as e:\n                    resp['result'] = {'content': [{'type': 'text', 'text': str(e)}], 'isError': True}\n    else:\n        resp['error'] = {'code': -32601, 'message': 'Method not found'}\n    return resp",
  "hints": [
    "Build the response dict first with jsonrpc and id, then add either `result` or `error`.",
    "Call `fn(**arguments)` inside try/except Exception; check required args before calling."
  ]
}
```

> [!TIP] Interview tips
> - Frame MCP as a USB-C-style standard: it turns an N x M integration problem into N + M.
> - Know the three primitives (tools, resources, prompts) and who controls each.
> - Lead with security: untrusted tool descriptions/results, least privilege, human approval, OAuth for remote servers.
