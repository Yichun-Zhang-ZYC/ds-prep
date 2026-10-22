---
id: genai-eng-tracing-and-observability
title: Tracing & observability
estimatedMinutes: 11
difficulty: medium
tags: [genai, observability, tracing, latency, llmops]
---

## Why it matters

LLM apps are multi-step pipelines (retrieve, rerank, call, tool, call again) with non-deterministic steps. When an answer is wrong or slow you need to see exactly which step did it. "How would you debug a bad answer in production?" is a standard question.


## Concept

**Trace** = one end-to-end request; **span** = one timed step inside it (retrieval, an LLM call, a tool call), with a parent id forming a tree. This is the OpenTelemetry model; LLM tools (LangSmith, Langfuse, Arize Phoenix, Helicone) and OTel GenAI semantic conventions follow it.

**What to record per span**:
- Identity and timing: trace id, span id, parent, name, start/end, status or error.
- LLM spans: model + snapshot, prompt version, **full prompt and completion** (or a redacted/sampled copy), input/output **token counts**, parameters, finish reason, time to first token (TTFT), cost.
- Retrieval spans: query, top-k doc ids and scores, filters.
- Tool spans: name, arguments, result, error.
- Request level: user/session id (hashed), feature flag, feedback (thumbs, edits), eval scores.

**Metrics to chart** (aggregate from traces): p50/p95/p99 latency per step, error and timeout rate, tokens and cost per request, cache hit rate, retrieval hit quality, refusal and guardrail-trigger rate, user feedback rate.

**Self time vs total time**: a span's total duration includes its children. **Self time** = duration $-$ sum of child durations (for sequential children) shows where time is actually spent. Optimize the largest self time, or run independent steps in parallel.

**LLM-specific needs**: inspect inputs/outputs (not just status codes), compare runs side by side, turn failing traces into **eval cases**, and run online evals (LLM-judge or rules) on sampled production traces. For streaming, record TTFT and tokens/second, not just total time.

**Practical concerns**: sample (e.g. 100% of errors, 5% of successes) to control storage; redact PII before export; propagate trace context across services and async queues; keep retention short for raw prompts.


## Worked example

A RAG request takes 1,800 ms. The trace tree (ms):

| span | parent | start | end | total | self |
|---|---|---|---|---|---|
| request | none | 0 | 1800 | 1800 | 40 |
| embed_query | request | 10 | 50 | 40 | 40 |
| retrieve | request | 50 | 170 | 120 | 30 |
| vector_search | retrieve | 60 | 150 | 90 | 90 |
| rerank | request | 170 | 370 | 200 | 200 |
| llm_call | request | 370 | 1770 | 1400 | 1400 |

Check: the root's children sum to $40+120+200+1400 = 1760$, so root self time $= 1800 - 1760 = 40$ ms (glue code). `llm_call` is 78% of latency ($1400/1800$). The levers are a smaller model, a shorter prompt or output, streaming (TTFT makes it *feel* faster), and caching, not a faster vector DB (90 ms).


## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A request is slow. The `agent` span is 6 s total, with child spans `llm_call` (2 s), `search_tool` (1 s) and `llm_call` (2 s), run sequentially. What is the agent span's self time?",
  "options": [
    "0 s",
    "1 s",
    "5 s",
    "6 s"
  ],
  "answer": 1,
  "explanation": "Self time = 6 - (2 + 1 + 2) = 1 s, spent in the agent's own code (parsing, orchestration, waiting)."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is logging the full prompt and completion more important for LLM apps than for typical web services?",
  "options": [
    "Because status codes are always 500",
    "A request can return HTTP 200 and still be wrong, so quality debugging needs the actual inputs and outputs",
    "To reduce token cost",
    "Because logs improve model accuracy"
  ],
  "answer": 1,
  "explanation": "Failures are often semantic, not exceptions. Redact PII and set short retention, but keep content for debugging and building eval cases."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Spans are dicts with `id`, `parent` (None for the root), `start`, `end` (ms), listed in any order; children of a span run sequentially. Write `self_times(spans)` returning `{id: self_time}` where self time = duration minus the summed durations of its direct children. Write `slowest_self(spans)` returning the id with the largest self time, and `max_depth(spans)` returning the tree depth (root = 1).",
  "starterCode": "def self_times(spans):\n    # spans: list of {\"id\", \"parent\", \"start\", \"end\"}; return {id: self_time}\n    pass\n\ndef slowest_self(spans):\n    # id of the span with the largest self time\n    pass\n\ndef max_depth(spans):\n    # root has depth 1\n    pass\n\nspans = [\n    {\"id\": \"root\", \"parent\": None, \"start\": 0, \"end\": 100},\n    {\"id\": \"a\", \"parent\": \"root\", \"start\": 0, \"end\": 60},\n]\nprint(self_times(spans))",
  "tests": "spans = [\n    {'id': 'llm', 'parent': 'root', 'start': 370, 'end': 1770},\n    {'id': 'vs', 'parent': 'retrieve', 'start': 60, 'end': 150},\n    {'id': 'root', 'parent': None, 'start': 0, 'end': 1800},\n    {'id': 'embed', 'parent': 'root', 'start': 10, 'end': 50},\n    {'id': 'retrieve', 'parent': 'root', 'start': 50, 'end': 170},\n    {'id': 'rerank', 'parent': 'root', 'start': 170, 'end': 370},\n]\nassert self_times(spans) == {'root': 40, 'embed': 40, 'retrieve': 30, 'vs': 90, 'rerank': 200, 'llm': 1400}, self_times(spans)\nassert slowest_self(spans) == 'llm'\nassert max_depth(spans) == 3\nassert max_depth([{'id': 'x', 'parent': None, 'start': 0, 'end': 1}]) == 1",
  "solution": "def self_times(spans):\n    child_total = {}\n    for s in spans:\n        if s[\"parent\"] is not None:\n            child_total[s[\"parent\"]] = child_total.get(s[\"parent\"], 0) + s[\"end\"] - s[\"start\"]\n    return {s[\"id\"]: s[\"end\"] - s[\"start\"] - child_total.get(s[\"id\"], 0) for s in spans}\n\ndef slowest_self(spans):\n    st = self_times(spans)\n    return max(st, key=st.get)\n\ndef max_depth(spans):\n    parent = {s[\"id\"]: s[\"parent\"] for s in spans}\n    def depth(i):\n        return 1 if parent[i] is None else 1 + depth(parent[i])\n    return max(depth(i) for i in parent)",
  "hints": [
    "First pass: add each span's duration to its parent's child total.",
    "Depth is recursive: 1 for the root, else 1 + depth(parent)."
  ]
}
```

> [!TIP] Interview tips
> - Define trace vs span, and say what you record on an LLM span: prompt version, full I/O, tokens, TTFT, cost.
> - Use self time to find the bottleneck; in LLM pipelines it is usually the generation step, so talk about output length, model size, streaming and caching.
> - Close the loop: failing production traces become eval cases, and sampled traces get online evals; mention sampling and PII redaction.
