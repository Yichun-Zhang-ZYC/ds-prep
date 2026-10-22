---
id: genai-eng-case-debugging-agent-failures
title: "Case: Debugging agent failures"
estimatedMinutes: 14
difficulty: hard
tags: [genai, case-study, agents, debugging, observability]
---

## Why it matters
Agents fail in confusing ways: they loop, call tools with bad arguments, ignore errors and then claim success, or stop early. Interviewers ask "your agent works in the demo but fails 15% in production; how do you debug it?" The answer is a method (see ReAct pattern, Tool use, Tracing & observability, Multi-agent systems) rather than prompt tweaking by trial and error.

## Concept
**Method**
1. **Capture the whole trace**: every model call (prompt, model/version, parameters, output), every tool call (name, arguments, result, error, latency) and the agent's state at each step. Without traces you are guessing.
2. **Quantify before fixing**: sample failures (and successes), label each with a root-cause category, and build a Pareto table. Fix the largest category first. Run failing tasks several times to estimate the failure *rate*, since agents are stochastic.
3. **Find the first bad step**, not the last: compare with a successful trace of the same task and look for the first divergence. Errors compound, so the visible failure is often 5 steps after the cause.
4. **Reproduce deterministically**: replay with recorded tool outputs (so only the model varies), low temperature, pinned versions. Then change one thing at a time.
5. **Fix at the right layer, add a regression case, re-run the eval set** and the taxonomy to confirm the category shrank without growing another.

**Common failure categories and fixes**
- **Bad tool arguments / wrong tool**: tighten schemas (enums, patterns, required fields), clearer tool descriptions with examples, fewer overlapping tools, validate in code and return an actionable error message to the model.
- **Loops / no progress**: repeated identical calls or oscillation. Add a step budget, a loop detector (same call N times, then nudge, change strategy or escalate), and make the "what I already tried" visible.
- **Ignored or misread tool errors**: structured errors (code, message, retryable), instruct the model never to claim success without confirmation, and verify post-conditions in code ("was the refund row created?").
- **Missing or stale context**: history truncation dropped a key fact, retrieval returned irrelevant text, or a long context buried it. Use pinned state (a structured scratchpad), summarization with fact preservation, better retrieval.
- **Premature termination / skipped steps**: add a completion check or required-step validator; planner-executor split.
- **Hallucinated tool results or capabilities**, **prompt injection through tool output**, **timeouts and rate limits** (retries with backoff, idempotency keys), and **model/provider changes** (silent regressions: pin versions, run evals on upgrade).

Prefer deterministic code for control flow and validation, and keep the LLM for judgment. Evaluate trajectories (right tools, order, no wasted steps) and outcomes, not only final answers.

## Worked example
Scenario: a refund agent with tools `lookup_order`, `check_policy`, `issue_refund`. About 15% of 1,000 sampled production runs fail. Reviewers label 100 failed traces by root cause:

| Category | Count | Share | Cumulative |
|---|---|---|---|
| Bad tool arguments | 34 | 34% | 34% |
| Loops | 21 | 21% | 55% |
| Ignored tool error | 18 | 18% | 73% |
| Missing context | 15 | 15% | 88% |
| Premature answer | 12 | 12% | 100% |

The top two categories cover 55% of failures. Looking at a bad-args trace against a good one, the first divergence is step 1: the model passes `order_id` as an integer `4821` while the API wants `"ORD-4821"`; the API returns a 400 with an empty body, and the model retries the same call (that is the loop category too, so one root cause feeds two buckets).

Fixes, in order: (1) schema with a pattern for `order_id` and code-side validation that returns "order_id must look like ORD-1234"; (2) a loop guard that stops after 3 identical calls and escalates; (3) structured errors plus a code check that an `issue_refund` result exists before the reply says "refunded". Add 12 representative failed traces as regression cases, replay them with recorded tool outputs, and re-measure on the 1,000-run sample (illustrative target: failures from 15% to under 6%). Track the taxonomy weekly because the next largest bucket becomes the next target.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An agent calls the same search tool with the same query 9 times in a row. What is the most targeted fix?",
  "options": [
    "Switch to a larger model",
    "Add loop detection and a step budget, return useful feedback on the repeated result, and escalate or change strategy",
    "Raise the temperature to 1.5",
    "Remove the search tool"
  ],
  "answer": 1,
  "explanation": "A loop guard plus feedback directly addresses no-progress behaviour. Model upgrades and temperature changes are guesses without evidence."
}
```

```quiz
{
  "id": "q2",
  "question": "Why replay a failing trace with the recorded tool outputs while you iterate on the prompt?",
  "options": [
    "It is cheaper because tools are free",
    "It isolates the model's behaviour from nondeterministic tools, so each change can be compared fairly",
    "The API requires it",
    "It guarantees the model becomes deterministic"
  ],
  "answer": 1,
  "explanation": "Holding the environment fixed lets you attribute differences to the prompt or model change, though you still need multiple runs because sampling is stochastic."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `first_repeat`: scan a list of (tool, args) calls and return the index at which any identical call reaches `max_repeats` occurrences, else -1. This is the core of a loop guard.",
  "starterCode": "def first_repeat(calls, max_repeats):\n    \"\"\"calls: list of (tool_name, args_string). Return the index at which some identical call\n    has been made max_repeats times (the loop is detected), or -1 if it never happens.\"\"\"\n    pass\n",
  "tests": "calls = [(\"search\", \"a\"), (\"search\", \"b\"), (\"search\", \"a\"), (\"fetch\", \"x\"), (\"search\", \"a\")]\nassert first_repeat(calls, 3) == 4\nassert first_repeat(calls, 2) == 2\nassert first_repeat(calls, 4) == -1\nassert first_repeat([], 2) == -1\n",
  "solution": "def first_repeat(calls, max_repeats):\n    seen = {}\n    for i, c in enumerate(calls):\n        seen[c] = seen.get(c, 0) + 1\n        if seen[c] >= max_repeats:\n            return i\n    return -1\n",
  "hints": [
    "Keep a dict of counts keyed by the (tool, args) tuple.",
    "Return as soon as a count reaches the threshold."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `first_divergence` between a good and a bad trace. Return the first differing index; if one is a strict prefix of the other return the shorter length; -1 if identical.",
  "starterCode": "def first_divergence(good, bad):\n    \"\"\"good/bad: lists of step labels from a successful and a failed trace of the same task.\n    Return the index of the first step that differs. If one trace is a strict prefix of the\n    other, return the length of the shorter one. Return -1 if they are identical.\"\"\"\n    pass\n",
  "tests": "g = [\"lookup_order\", \"check_policy\", \"issue_refund\", \"reply\"]\nassert first_divergence(g, [\"lookup_order\", \"check_policy\", \"reply\"]) == 2\nassert first_divergence(g, g) == -1\nassert first_divergence(g, g[:2]) == 2\nassert first_divergence([\"a\"], [\"b\"]) == 0\n",
  "solution": "def first_divergence(good, bad):\n    for i, (x, y) in enumerate(zip(good, bad)):\n        if x != y:\n            return i\n    if len(good) == len(bad):\n        return -1\n    return min(len(good), len(bad))\n",
  "hints": [
    "Use `zip` for the common length.",
    "A prefix case means the bad trace stopped early (or went on too long)."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `failure_taxonomy`: build the Pareto table of failure categories with count, percent and cumulative percent, ignoring successful runs (category None).",
  "starterCode": "def failure_taxonomy(traces):\n    \"\"\"traces: list of dicts with key \"category\" (None for a successful run, otherwise a\n    failure category). Return a list of (category, count, pct, cum_pct) for failures only,\n    sorted by count desc then name. pct and cum_pct are percentages of all failures, rounded\n    to 1 decimal.\"\"\"\n    pass\n",
  "tests": "cats = [\"bad_args\"] * 34 + [\"loop\"] * 21 + [\"ignored_error\"] * 18 + [\"missing_context\"] * 15 + [\"premature_answer\"] * 12\ntraces = [{\"category\": c} for c in cats] + [{\"category\": None}] * 100\nr = failure_taxonomy(traces)\nassert r[0] == (\"bad_args\", 34, 34.0, 34.0)\nassert r[1] == (\"loop\", 21, 21.0, 55.0)\nassert r[-1] == (\"premature_answer\", 12, 12.0, 100.0)\nassert len(r) == 5\nt = [{\"category\": \"b\"}, {\"category\": \"a\"}, {\"category\": None}]\nassert failure_taxonomy(t) == [(\"a\", 1, 50.0, 50.0), (\"b\", 1, 50.0, 100.0)]\nassert failure_taxonomy([{\"category\": None}]) == []\n",
  "solution": "def failure_taxonomy(traces):\n    counts = {}\n    for t in traces:\n        c = t[\"category\"]\n        if c is not None:\n            counts[c] = counts.get(c, 0) + 1\n    total = sum(counts.values())\n    rows = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))\n    out, cum = [], 0\n    for c, n in rows:\n        cum += n\n        out.append((c, n, round(100 * n / total, 1), round(100 * cum / total, 1)))\n    return out\n",
  "hints": [
    "Sort by count descending, then by name for ties.",
    "Cumulative percent is computed from the running count, then rounded."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Our support agent succeeds in demos but 20% of production conversations go wrong. Walk me through debugging it.'",
  "answer": "**1. Make failures visible**: ensure full tracing (prompts, tool I/O, state, versions, latency) and a way to flag bad conversations (thumbs, escalations, abandonment, an LLM judge on a sample). Without this, fix that first.\n\n**2. Sample and label**: pull around 100 failed and 50 successful traces. Label each failure with the first bad step and a root-cause category (bad args, wrong tool, loop, ignored error, missing context, retrieval miss, premature end, policy violation, injection, provider error). Build the Pareto table; check the failure rate by intent, language and tenant to find slices.\n\n**3. Diagnose the top categories** by diffing against successful traces of similar tasks and by replaying with recorded tool outputs at low temperature, several times each, to separate systematic failures from sampling noise.\n\n**4. Fix at the right layer**: tool schemas and descriptions, input validation and actionable error messages; loop guard and step budget; deterministic checks for post-conditions and required steps; pinned structured state for key facts; better retrieval; simpler tool set; for risky actions, human approval. Use prompt changes last, and only with a test.\n\n**5. Prevent regressions**: add the failed traces to the eval set (with tool mocks), run trajectory and outcome metrics in CI, track the taxonomy weekly, pin model versions and run the suite on every upgrade, and alert on loop rate, tool error rate, steps per task, and cost per task.\n\n**6. Report**: before/after failure rate with confidence intervals, remaining taxonomy, and what you would do next. **Tradeoffs to mention**: more guardrails add latency and rigidity; deterministic workflows beat free-form agents for stable processes; over-fitting to the labeled sample."
}
```

> [!TIP] Interview tips
> - Say 'trace first, quantify, then fix the largest category', and never start by editing the prompt.
> - Look for the first bad step by diffing against a good trace, since errors compound downstream.
> - Name concrete categories and their code-level fixes (schema validation, loop guard, structured errors, post-condition checks), then regression tests.
