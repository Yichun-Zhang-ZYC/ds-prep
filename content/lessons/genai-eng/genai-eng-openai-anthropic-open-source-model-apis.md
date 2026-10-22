---
id: genai-eng-openai-anthropic-open-source-model-apis
title: OpenAI / Anthropic / open-source model APIs
estimatedMinutes: 11
difficulty: medium
tags: [genai, llm-api, openai, anthropic]
---

## Why it matters
Most GenAI roles involve calling hosted or self-hosted models. Interviewers check that you know the shared shape of chat APIs, where providers differ, and how to avoid vendor lock-in and handle failures (finish reasons, truncation, tool calls) rather than just `client.chat(...)`.

## Concept
**Common shape**: stateless request with a list of role-tagged messages (`system`, `user`, `assistant`, plus tool results), sampling parameters, and an output limit. The server keeps no conversation: **you resend history every turn**, and you pay for it.

| | OpenAI (Chat Completions) | Anthropic (Messages) |
|---|---|---|
| System prompt | a `system`/`developer` message in the list | separate top-level `system` field |
| Output limit | `max_completion_tokens` (optional) | `max_tokens` (**required**) |
| Reply | `choices[0].message.content` | `content`: list of typed blocks (`text`, `tool_use`, thinking) |
| Stop signal | `finish_reason`: `stop`, `length`, `tool_calls` | `stop_reason`: `end_turn`, `max_tokens`, `tool_use` |
| Usage | `prompt_tokens`, `completion_tokens` | `input_tokens`, `output_tokens` |

OpenAI also offers a newer Responses API with server-side state and built-in tools; the stateless pattern above still applies.

**Open-source models** (Llama, Qwen, Mistral, DeepSeek): either self-host with vLLM, TGI, llama.cpp or Ollama, which usually expose an **OpenAI-compatible endpoint** (point the SDK `base_url` at your server), or use hosted inference providers with the same interface. Trade-offs: control, data residency and per-token cost at scale versus GPU ops, capacity planning, and typically lower frontier quality.

**Engineering essentials**:
- Always check the stop signal: `length`/`max_tokens` means truncated output; tool-call stops need handling, not display.
- Pin **model versions**, because aliases change behaviour; keep an eval set to catch regressions on upgrade.
- Put provider calls behind a thin interface (own `LLMClient`) so you can swap models, add fallbacks and log uniformly; avoid leaking provider-specific features everywhere.
- Parameters: `temperature` (randomness; 0 for extraction), `top_p`, stop sequences, seed (best effort, not guaranteed deterministic). Some reasoning models restrict sampling parameters.
- Keep keys server-side, set timeouts, and use the provider's retry/backoff (next lessons).

## Worked example
The same request for two providers. OpenAI-style:

```json
{"model": "gpt-...", "messages": [
  {"role": "system", "content": "Be brief."},
  {"role": "user", "content": "What is RAG?"}]}
```

Anthropic-style:

```json
{"model": "claude-...", "max_tokens": 256, "system": "Be brief.",
 "messages": [{"role": "user", "content": "What is RAG?"}]}
```

A response with `stop_reason: "max_tokens"` and usage of 12 input and 256 output tokens means the answer was cut off at the limit; showing it as complete is a bug. A wrapper that normalizes both formats to `(text, input_tokens, output_tokens, truncated)` lets the rest of the app, the logger and the cost dashboard stay provider-agnostic. A gateway such as LiteLLM or your own router does the same at the infrastructure level.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A chat API call returns `finish_reason: \"length\"`. What happened and what should you do?",
  "options": [
    "The model finished normally",
    "Output hit the token limit and is truncated; raise the limit, shorten the request, or continue the generation",
    "The request was rate limited",
    "The model refused"
  ],
  "answer": 1,
  "explanation": "`length` (Anthropic: `max_tokens`) means the output was cut off. Treat it as a failure for structured output and handle it explicitly."
}
```

```quiz
{
  "id": "q2",
  "question": "You want to run an open-source model while keeping application code that uses the OpenAI SDK. What is the usual approach?",
  "options": [
    "Rewrite all code in C++",
    "Serve it with vLLM/Ollama and point the SDK `base_url` at its OpenAI-compatible endpoint",
    "Fine-tune the OpenAI model",
    "It is impossible"
  ],
  "answer": 1,
  "explanation": "Most inference servers emulate the OpenAI chat API, so swapping `base_url` and the model name is often enough. Check feature gaps such as tool calling and structured output."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Normalize two provider formats. `to_anthropic(messages, max_tokens=1024)` converts an OpenAI-style message list into a dict with `max_tokens`, `messages` (non-system messages, order preserved) and, only if system messages exist, `system` (their contents joined with a blank line). `extract_text(resp)` returns the reply text from either an OpenAI-style response (`choices`) or Anthropic-style (`content` blocks; concatenate only `text` blocks). `usage_tokens(resp)` returns `(input_tokens, output_tokens)` from either format.",
  "starterCode": "def to_anthropic(messages, max_tokens=1024):\n    pass\n\ndef extract_text(resp):\n    pass\n\ndef usage_tokens(resp):\n    pass\n",
  "tests": "msgs = [\n    {\"role\": \"system\", \"content\": \"Be brief.\"},\n    {\"role\": \"system\", \"content\": \"Answer in English.\"},\n    {\"role\": \"user\", \"content\": \"Hi\"},\n    {\"role\": \"assistant\", \"content\": \"Hello!\"},\n    {\"role\": \"user\", \"content\": \"Bye\"},\n]\na = to_anthropic(msgs, 256)\nassert a[\"system\"] == \"Be brief.\\n\\nAnswer in English.\"\nassert a[\"max_tokens\"] == 256\nassert [m[\"role\"] for m in a[\"messages\"]] == [\"user\", \"assistant\", \"user\"]\nb = to_anthropic([{\"role\": \"user\", \"content\": \"x\"}])\nassert \"system\" not in b and b[\"max_tokens\"] == 1024\n\noa = {\"choices\": [{\"message\": {\"role\": \"assistant\", \"content\": \"hi\"}, \"finish_reason\": \"stop\"}],\n      \"usage\": {\"prompt_tokens\": 10, \"completion_tokens\": 3}}\nan = {\"content\": [{\"type\": \"text\", \"text\": \"hel\"}, {\"type\": \"tool_use\", \"name\": \"f\"}, {\"type\": \"text\", \"text\": \"lo\"}],\n      \"stop_reason\": \"end_turn\", \"usage\": {\"input_tokens\": 12, \"output_tokens\": 5}}\nassert extract_text(oa) == \"hi\"\nassert extract_text(an) == \"hello\"\nassert usage_tokens(oa) == (10, 3)\nassert usage_tokens(an) == (12, 5)",
  "solution": "def to_anthropic(messages, max_tokens=1024):\n    system = [m[\"content\"] for m in messages if m[\"role\"] == \"system\"]\n    out = {\n        \"max_tokens\": max_tokens,\n        \"messages\": [m for m in messages if m[\"role\"] != \"system\"],\n    }\n    if system:\n        out[\"system\"] = \"\\n\\n\".join(system)\n    return out\n\ndef extract_text(resp):\n    if \"choices\" in resp:\n        return resp[\"choices\"][0][\"message\"][\"content\"]\n    return \"\".join(b[\"text\"] for b in resp[\"content\"] if b[\"type\"] == \"text\")\n\ndef usage_tokens(resp):\n    u = resp[\"usage\"]\n    if \"prompt_tokens\" in u:\n        return (u[\"prompt_tokens\"], u[\"completion_tokens\"])\n    return (u[\"input_tokens\"], u[\"output_tokens\"])",
  "hints": [
    "Detect the format by checking for the `choices` key.",
    "Ignore blocks whose `type` is not `text` (for example `tool_use`)."
  ]
}
```

> [!TIP] Interview tips
> - Describe the stateless message model and why history resend drives cost and latency.
> - Name the real differences (system field, required `max_tokens`, content blocks, stop reasons) and how you hide them behind your own client with fallbacks.
> - For open source, say vLLM plus OpenAI-compatible endpoint, and weigh cost, privacy and ops burden.
