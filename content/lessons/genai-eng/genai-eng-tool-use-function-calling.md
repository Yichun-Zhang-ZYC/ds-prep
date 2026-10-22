---
id: genai-eng-tool-use-function-calling
title: Tool use / function calling
estimatedMinutes: 11
difficulty: medium
tags: [genai, agents, tool-use, function-calling]
---

## Why it matters
Tool use turns an LLM from a text generator into something that can query databases, call APIs and take actions. Interviewers want to see that you understand who actually executes the tool, how to validate model-produced arguments, and how to handle errors.

## Concept
**The loop**: you send the model the conversation plus **tool definitions** (name, description, JSON Schema for parameters). If the model decides a tool is needed it returns a structured **tool call** (`name`, `arguments`, a call id) instead of final text. **Your code executes it** (the model never runs anything), appends a **tool result** message keyed by the call id, and calls the model again. Repeat until the model returns plain text. OpenAI calls this function calling (`tools`, `tool_calls`); Anthropic uses `tool_use` / `tool_result` content blocks; open-source models use chat-template conventions, and servers like vLLM expose an OpenAI-compatible interface.

**Good tool design**:
- Clear names and descriptions (the description is the prompt for when to use it), narrow purpose, typed parameters with enums and examples; few tools (accuracy drops as the list grows, so route or retrieve tool definitions).
- Return compact, model-readable results (trim huge payloads; include units and IDs), and **return errors as results** (`{"error": "city not found"}`) so the model can retry or ask the user.
- **Never trust arguments**: validate against the schema, enforce authorization on the server side, parametrize SQL, and require human confirmation for destructive or costly actions (payments, deletes).

**Controls**: `tool_choice` (auto, required, a specific tool, none); **parallel tool calls** when calls are independent; **strict / structured outputs** make arguments conform to the schema, though semantic validity (a real order id) still needs checks. Set a max number of iterations, timeouts and idempotency keys for side-effecting tools.

**Failure modes**: wrong tool, hallucinated arguments, missing required args (should ask the user), infinite loops, prompt injection arriving through tool results (treat results as untrusted data).

## Worked example
User: "What's the weather in Paris and Rome, in Fahrenheit?" Tools: `get_weather(city: string, unit: "c"|"f")`.

1. Model returns two independent calls in one turn: `get_weather(Paris, f)` id `c1`, `get_weather(Rome, f)` id `c2`.
2. App runs both concurrently, sends back results `{id: c1, 64}` and `{id: c2, 72}`.
3. Model replies: "Paris is 64F and Rome is 72F."

Total: 2 model calls (not 3), because the calls were parallel. If the user had instead said "the weather in my city", the model should ask which city rather than invent an argument; a validator returning `{"error": "missing argument: city"}` also prompts a correction.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In function calling, who executes the tool?",
  "options": [
    "The LLM, inside its forward pass",
    "The model provider's servers automatically for any function name",
    "Your application, which then returns the result to the model",
    "The vector database"
  ],
  "answer": 2,
  "explanation": "The model only emits a structured request (name plus arguments). Your code runs it, so validation, authorization and error handling are your responsibility."
}
```

```quiz
{
  "id": "q2",
  "question": "A tool fails with 'customer id not found'. Best handling?",
  "options": [
    "Crash the request with a 500",
    "Return the error as a tool result so the model can correct or ask the user",
    "Silently return an empty string",
    "Retry forever with the same arguments"
  ],
  "answer": 1,
  "explanation": "Errors as tool results let the model self-correct or ask for missing info. Add a retry cap and avoid silent empty results, which cause confident hallucinations."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `run_tool_call(call, registry)`. `call` is `{'name': str, 'arguments': dict}`; `registry` maps a tool name to `{'fn': callable, 'params': {arg_name: 'string'|'number'|'boolean'}}` where every param is required. Return `{'ok': True, 'result': value}` on success, or `{'ok': False, 'error': msg}` with msg exactly: `unknown tool: <name>`; `missing argument: <arg>` (check params in declared order); `invalid type for <arg>` (a bool is not a number); or `tool error: <exception message>` if the function raises.",
  "starterCode": "def run_tool_call(call, registry):\n    pass\n",
  "tests": "def div(a, b):\n    return a / b\n\nreg = {\n    'div': {'fn': div, 'params': {'a': 'number', 'b': 'number'}},\n    'greet': {'fn': lambda name, loud: name.upper() if loud else name, 'params': {'name': 'string', 'loud': 'boolean'}},\n}\nassert run_tool_call({'name': 'div', 'arguments': {'a': 6, 'b': 3}}, reg) == {'ok': True, 'result': 2.0}\nassert run_tool_call({'name': 'nope', 'arguments': {}}, reg) == {'ok': False, 'error': 'unknown tool: nope'}\nassert run_tool_call({'name': 'div', 'arguments': {'a': 1}}, reg) == {'ok': False, 'error': 'missing argument: b'}\nassert run_tool_call({'name': 'div', 'arguments': {'a': '1', 'b': 2}}, reg) == {'ok': False, 'error': 'invalid type for a'}\nassert run_tool_call({'name': 'div', 'arguments': {'a': True, 'b': 2}}, reg)['error'] == 'invalid type for a'\nassert run_tool_call({'name': 'div', 'arguments': {'a': 1, 'b': 0}}, reg) == {'ok': False, 'error': 'tool error: division by zero'}\nassert run_tool_call({'name': 'greet', 'arguments': {'name': 'ann', 'loud': True}}, reg) == {'ok': True, 'result': 'ANN'}",
  "solution": "def _valid(value, kind):\n    if kind == 'string':\n        return isinstance(value, str)\n    if kind == 'boolean':\n        return isinstance(value, bool)\n    if kind == 'number':\n        return isinstance(value, (int, float)) and not isinstance(value, bool)\n    return False\n\ndef run_tool_call(call, registry):\n    name = call['name']\n    if name not in registry:\n        return {'ok': False, 'error': 'unknown tool: ' + name}\n    tool = registry[name]\n    args = call.get('arguments', {})\n    for arg, kind in tool['params'].items():\n        if arg not in args:\n            return {'ok': False, 'error': 'missing argument: ' + arg}\n        if not _valid(args[arg], kind):\n            return {'ok': False, 'error': 'invalid type for ' + arg}\n    try:\n        return {'ok': True, 'result': tool['fn'](**{k: args[k] for k in tool['params']})}\n    except Exception as e:\n        return {'ok': False, 'error': 'tool error: ' + str(e)}\n",
  "hints": [
    "isinstance(True, int) is True in Python, so exclude bool explicitly for 'number'.",
    "Check unknown tool, then each param in order (missing before type), then call inside try/except."
  ]
}
```

> [!TIP] Interview tips
> - State clearly: the model proposes calls, your application executes them. That is where validation, permissions and sandboxing live.
> - Mention parallel calls, `tool_choice`, max iterations, timeouts, and returning errors as tool results for self-correction.
> - Security: tool results and arguments are untrusted input (prompt injection, SQL injection). Least privilege plus human approval for irreversible actions.
