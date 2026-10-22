---
id: genai-eng-multi-agent-systems
title: Multi-agent systems
estimatedMinutes: 11
difficulty: hard
tags: [genai, agents, multi-agent, orchestration]
---

## Why it matters
"Should we use multiple agents?" is a classic design question. The honest answer is usually "not at first": multi-agent systems cost more tokens and are harder to debug, but they win when work parallelizes or needs isolated contexts and specialized tools.

## Concept
**Common topologies**:
- **Orchestrator-worker (supervisor)**: a lead agent plans, delegates subtasks to workers (often in parallel), and synthesizes results. Used by deep-research systems.
- **Handoffs / routing**: a triage agent passes the conversation to a specialist (billing, tech support) which then owns it.
- **Pipeline / sequential**: planner, then coder, then reviewer; each agent's output is the next one's input.
- **Debate / critic**: agents propose and critique; a judge or voting decides. Improves reasoning or factuality on some tasks at high cost.
- **Peer-to-peer / swarm** with shared state or blackboard: flexible, hardest to control.

**Why split**: (1) **context isolation**: each worker gets a fresh window with only what it needs, avoiding one overloaded context; (2) **parallelism**: breadth-first tasks (research, many files) finish faster; (3) **specialization**: distinct prompts, tools and models per role (cheap model for extraction, strong one for planning); (4) **permissions**: least-privilege tools per agent.

**Why not**: multi-agent runs often use several times the tokens of a single agent (public reports of research systems cite roughly an order of magnitude over chat), coordination errors (duplicated work, conflicting edits, lost information when summarizing between agents), non-determinism and hard debugging. Tasks that are tightly coupled or require shared state (most coding within one module) fit single agents better.

**Engineering essentials**: structured, minimal handoff messages (summaries plus references, not raw transcripts); explicit task descriptions with scope, output format and stop conditions for each worker; step/token budgets and timeouts; retries and fallbacks for failed workers; shared memory or artifacts store; tracing per agent (see Tracing & observability); evaluation of the whole system and of each role. Frameworks: LangGraph, AutoGen, CrewAI, OpenAI Agents SDK, Claude Agent SDK, and the A2A protocol for cross-vendor agent communication.

**Default advice**: start with one agent plus good tools; add a second agent only when you can name the bottleneck it removes (context, parallelism, specialization, permissions).

## Worked example
Task: compare 4 competitors. Single agent: one context of 30k tokens total.

Orchestrator-worker: planner 3k tokens, 4 workers (parallel) at 25k each = 100k, synthesis 8k. Total = $3 + 100 + 8 = 111$k tokens, which is $111/30 = 3.7\times$ the tokens. Wall-clock: roughly the slowest worker plus planning and synthesis instead of the sum of four sequential researches, so latency falls to about a third (illustrative). If each worker has independent 90% success, the chance all four succeed is $0.9^4 = 0.656$, so the orchestrator needs retries and partial-result handling rather than assuming all workers succeed.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which is the strongest justification for splitting work across multiple agents?",
  "options": [
    "It always lowers token cost",
    "A research task has independent subtasks that can run in parallel in separate contexts",
    "Agents never make errors when they talk to each other",
    "It removes the need for tools"
  ],
  "answer": 1,
  "explanation": "Parallelizable, breadth-first work with isolated contexts is the sweet spot. Multi-agent usually costs more tokens and adds coordination risk."
}
```

```quiz
{
  "id": "q2",
  "question": "An orchestrator fans out to 5 workers, each succeeding independently with probability 0.95. Probability all succeed?",
  "options": [
    "0.95",
    "About 0.77",
    "About 0.50",
    "0.25"
  ],
  "answer": 1,
  "explanation": "0.95^5 is about 0.774. Failures compound with fan-out, so design for retries and partial results."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `orchestrate(subtasks, workers, max_retries=1)`. `subtasks` is a list of `(skill, payload)`; `workers` maps skill to a callable `fn(payload)`. Run subtasks in order and return a list of results in the same order. Unknown skill: `{'error': 'no worker for skill: <skill>'}`. If a worker raises, retry up to `max_retries` more times; if it still fails return `{'error': '<exception message>'}`. Successful results are returned as `{'result': value}`.",
  "starterCode": "def orchestrate(subtasks, workers, max_retries=1):\n    pass\n",
  "tests": "calls = {'n': 0}\ndef flaky(x):\n    calls['n'] += 1\n    if calls['n'] == 1:\n        raise RuntimeError('timeout')\n    return x * 2\n\ndef bad(x):\n    raise ValueError('boom')\n\nworkers = {'double': lambda x: x * 2, 'flaky': flaky, 'bad': bad}\nout = orchestrate([('double', 4), ('flaky', 5), ('bad', 1), ('legal', 'q')], workers)\nassert out[0] == {'result': 8}\nassert out[1] == {'result': 10}\nassert calls['n'] == 2\nassert out[2] == {'error': 'boom'}\nassert out[3] == {'error': 'no worker for skill: legal'}\n\ncount = {'n': 0}\ndef always(x):\n    count['n'] += 1\n    raise RuntimeError('x')\nout = orchestrate([('a', 0)], {'a': always}, max_retries=2)\nassert count['n'] == 3 and out == [{'error': 'x'}]\ncount['n'] = 0\norchestrate([('a', 0)], {'a': always}, max_retries=0)\nassert count['n'] == 1\nassert orchestrate([], {}) == []",
  "solution": "def orchestrate(subtasks, workers, max_retries=1):\n    results = []\n    for skill, payload in subtasks:\n        if skill not in workers:\n            results.append({'error': 'no worker for skill: ' + skill})\n            continue\n        err = None\n        for _ in range(max_retries + 1):\n            try:\n                results.append({'result': workers[skill](payload)})\n                err = None\n                break\n            except Exception as e:\n                err = str(e)\n        if err is not None:\n            results.append({'error': err})\n    return results\n",
  "hints": [
    "A worker gets max_retries + 1 attempts in total.",
    "Track the last error and append it only if every attempt failed."
  ]
}
```

> [!TIP] Interview tips
> - Start with "single agent first" and justify multi-agent by a concrete bottleneck: parallelism, context isolation, specialization or permissions.
> - Quantify cost: more tokens, more latency variance (tail workers), failure probability compounding across workers.
> - Discuss handoff contracts, budgets, per-agent tracing, and how you would evaluate the system end to end.
