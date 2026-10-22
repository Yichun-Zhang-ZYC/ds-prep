---
id: genai-eng-frameworks-langchain-langgraph-llamaindex
title: "Frameworks: LangChain, LangGraph, LlamaIndex"
estimatedMinutes: 10
difficulty: medium
tags: [genai, agents, langchain, langgraph, llamaindex]
---

## Why it matters
LLM frameworks promise faster prototypes, but they also add abstraction, dependency churn and debugging pain. Interviewers want to know what each framework is for, when you would skip frameworks entirely, and how a stateful agent is modeled as a graph.

## Concept
**LangChain**: a library of integrations and building blocks (chat models, prompt templates, output parsers, retrievers, tools) composed with the Runnable interface (LCEL pipe syntax: `prompt | model | parser`). Strength: breadth of integrations and a common interface across providers. Modern LangChain agents are built on LangGraph.

**LangGraph**: a low-level orchestration framework for **stateful, long-running agents** modeled as a graph:
- **State**: a typed shared object; each node returns updates, merged by per-key **reducers** (e.g. append to a message list).
- **Nodes**: functions (an LLM call, a tool call, a check). **Edges**: fixed transitions; **conditional edges** route on state, which gives loops (agent $\to$ tools $\to$ agent) and branching.
- **Checkpointers** persist state each step, enabling memory across sessions, **human-in-the-loop** interrupts, time travel and resuming after failure. Needs a recursion/step limit to stop runaway loops.

**LlamaIndex**: data-centric. Strong at ingestion and RAG: loaders and parsers, node/chunk parsing, indices, retrievers, query engines, postprocessors (rerankers), plus an event-driven Workflows API and agents.

**Choosing**:
- Single prompt or simple RAG: call the provider SDK directly; fewer layers, easier debugging.
- Document-heavy RAG with many sources: LlamaIndex.
- Branching, loops, persistence, human approval: LangGraph.
- Costs of frameworks: leaky abstractions, fast API churn, hidden prompts, harder tracing (mitigate with LangSmith or OpenTelemetry-based tracing), vendor lock-in of state formats. Keep your business logic framework-independent.

## Worked example
A support agent as a LangGraph-style graph: `classify` $\to$ conditional edge to `billing`, `tech`, or `escalate`; `tech` $\to$ `check_resolved`, which loops back to `tech` if unresolved and exits to `END` if resolved. Every step checkpoints state, so if the process dies after `classify`, it resumes at `tech` rather than re-calling the LLM.

A quick sanity check on loop risk: if each `tech` pass costs 2 LLM calls and the model never marks resolution, an unbounded loop makes unlimited calls. With a `max_steps = 25` guard, the worst case is bounded at $25 \times 2 = 50$ calls (fewer in practice, since not every step calls the LLM), then you escalate to a human.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Your agent must loop between reasoning and tool calls, pause for human approval before refunds, and resume after crashes. Which tool fits best?",
  "options": [
    "A plain `prompt | model | parser` chain",
    "LangGraph with a checkpointer and conditional edges",
    "A vector index",
    "A single large prompt"
  ],
  "answer": 1,
  "explanation": "Loops, interrupts and durable state are exactly what LangGraph graphs with checkpointers provide."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a legitimate reason to avoid a framework for a small feature?",
  "options": [
    "Frameworks cannot call LLMs",
    "Fewer layers means simpler debugging, fewer dependencies and less API churn",
    "Frameworks forbid streaming",
    "SDKs are always slower"
  ],
  "answer": 1,
  "explanation": "For one or two LLM calls the direct SDK is simpler and more stable; frameworks pay off as orchestration complexity grows."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `run_graph(nodes, edges, start, state, max_steps=20)`, a mini state-graph runner. `nodes` maps a name to `fn(state) -> dict` of updates, merged into a copy of the state (do not mutate the input). `edges` maps a node name to the next node: either a string or a callable `fn(state) -> str` (a conditional edge). The string `\"END\"` stops execution. Return `(final_state, path)` where `path` is the list of executed node names. If more than `max_steps` nodes would run, raise `RuntimeError`.",
  "starterCode": "def run_graph(nodes, edges, start, state, max_steps=20):\n    pass\n\nnodes = {'inc': lambda s: {'n': s['n'] + 1}}\nedges = {'inc': lambda s: 'inc' if s['n'] < 3 else 'END'}\nprint(run_graph(nodes, edges, 'inc', {'n': 0}))",
  "tests": "nodes = {'inc': lambda s: {'n': s['n'] + 1}}\nedges = {'inc': lambda s: 'inc' if s['n'] < 3 else 'END'}\ninit = {'n': 0}\nst, path = run_graph(nodes, edges, 'inc', init)\nassert st == {'n': 3} and path == ['inc', 'inc', 'inc']\nassert init == {'n': 0}\nnodes2 = {\n    'a': lambda s: {'log': s['log'] + ['a']},\n    'b': lambda s: {'log': s['log'] + ['b'], 'done': True},\n}\nedges2 = {'a': 'b', 'b': 'END'}\nst, path = run_graph(nodes2, edges2, 'a', {'log': []})\nassert st == {'log': ['a', 'b'], 'done': True} and path == ['a', 'b']\nloop_edges = {'inc': 'inc'}\ntry:\n    run_graph(nodes, loop_edges, 'inc', {'n': 0}, max_steps=5)\n    raise AssertionError('should raise')\nexcept RuntimeError:\n    pass\nst, path = run_graph(nodes, {'inc': 'END'}, 'inc', {'n': 0}, max_steps=1)\nassert path == ['inc'] and st['n'] == 1",
  "solution": "def run_graph(nodes, edges, start, state, max_steps=20):\n    state = dict(state)\n    path = []\n    name = start\n    while name != 'END':\n        if len(path) >= max_steps:\n            raise RuntimeError('max_steps exceeded')\n        state.update(nodes[name](state))\n        path.append(name)\n        nxt = edges[name]\n        name = nxt(state) if callable(nxt) else nxt\n    return state, path",
  "hints": [
    "Loop: name = start; while name != 'END': check the step count, run the node, merge updates, then resolve the next name.",
    "`nxt = edges[name]; name = nxt(state) if callable(nxt) else nxt`."
  ]
}
```

> [!TIP] Interview tips
> - Describe LangGraph as state + nodes + (conditional) edges + checkpointer; mention reducers and step limits.
> - Show judgment: direct SDK for simple tasks, framework when you need loops, persistence or HITL.
> - Name the costs: abstraction leaks, version churn, hidden prompts, and keep core logic framework-independent.
