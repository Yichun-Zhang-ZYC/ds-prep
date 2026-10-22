---
id: genai-eng-case-code-assistant
title: "Case: Code review and coding assistant"
estimatedMinutes: 14
difficulty: hard
tags: [genai, case-study, code, agents, evaluation]
---

## Why it matters
Code assistants are the flagship LLM product, and interviewers use them to probe context engineering (what do you put in the prompt from a million-line repo?), agent loops with real tools, and evaluation where tests give a verifiable signal. The same skeleton covers inline completion, chat, automated PR review and autonomous bug-fixing agents.

## Concept
Separate the three products; they have different latency, context and risk.

- **Inline completion**: latency budget of a few hundred ms. Small/fast model, fill-in-the-middle (prefix + suffix) prompt, context from the open file, neighbouring tabs and recent edits, aggressive caching and cancellation as the user types. Metric: acceptance rate, characters accepted per user, latency p50/p95.
- **Chat / Q&A on a repo**: retrieval over code, not prose. Chunk by AST units (function, class) with file path and signature, combine embeddings with exact search (grep, symbol index, call graph), then rerank. Include the definitions of symbols referenced in the edit, not just similar text.
- **Automated PR review**: input is the diff plus context (changed files in full, callers/callees, tests, style guide, the PR description). Output must be *few, specific, actionable* comments with file/line anchors and severity. Run static analysis and tests first and let the model explain or triage their findings; the model is best at logic slips, missing edge cases and unclear naming. Filter by confidence, dedupe against existing comments, and learn from "resolved / dismissed" feedback.
- **Agentic coding**: a loop of read files → edit → run tests/linter → read errors → fix, in a sandbox with a bounded budget (steps, tokens, wall clock). Tools: search, read, patch/apply-edit, shell, test runner. Tests are the reward signal; require a failing test that passes after the fix. Keep a human approval step before merge.

**Safety**: treat repo content, issues and web pages as untrusted (prompt injection can request secrets or exfiltration); sandbox execution without network or secrets; scan generated code for secrets, vulnerable patterns and license issues; never let the agent push to protected branches.

**Evaluation**: executable benchmarks (unit tests; SWE-bench-style issue resolution; $pass@k$ for generation), plus your own regression set of real tickets. For review, label a sample of comments (useful / noise / wrong) and track precision and the *resolved rate*; for completion, acceptance and retained-after-edit rate. LLM-judged quality needs human calibration.

**Pitfalls**: hallucinated functions or library versions (ground in the repo's dependency files and docs), stale index, context stuffed with irrelevant files, noisy review comments that teach developers to ignore the bot, tests the agent can game by editing them, evaluating only on public benchmarks the model may have seen.

## Worked example
Illustrative review-bot launch: 1,000 PRs/week. The raw model emits 5 comments per PR = 5,000 comments; a human-labeled sample says 35% are useful, so 1,750 useful comments sit among 3,250 noisy ones, and developers start muting the bot.

Add a pipeline: static-analysis grounding, a second-pass "is this actually a bug?" verifier, a confidence cutoff, dedupe, and a cap of 3 comments per PR, ranked by severity. Result: 1.5 comments per PR = 1,500 comments with 70% useful = 1,050 useful.
- Precision doubled from 35% to 70%; useful comments retained $= 1050/1750 = 60\%$.
- That is the right trade: a bot is judged on trust. Track resolved rate (comment followed by a code change) as the online metric and tune the cutoff to it.
- Cost: about 16k input tokens (6k diff + 10k context) and 1k output per PR, with 3 calls (review, verify, summarize): about 50k tokens per PR, and prompt caching of the shared repo context cuts the input bill substantially.

For the agentic variant: a bug-fix agent gets 10 samples per issue; 3 of 10 pass the tests, so $pass@1 = 0.3$ but $pass@5 = 1 - \binom{7}{5}/\binom{10}{5} = 1 - 21/252 \approx 0.917$. Pairing samples with a verifier or tests-as-selector turns pass@k into a real success rate.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Developers have started ignoring the PR-review bot. Which change is most likely to restore trust?",
  "options": [
    "Make the model comment on every line",
    "Cap comments per PR, keep only high-confidence verified findings, and tune on the resolved rate",
    "Switch to a longer system prompt only",
    "Hide the bot's comments"
  ],
  "answer": 1,
  "explanation": "Review quality is precision and signal-to-noise; fewer, verified comments earn trust."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is retrieval for code assistants usually hybrid rather than embeddings alone?",
  "options": [
    "Code has no semantics",
    "Identifiers, symbol names and error strings need exact matching, while embeddings help find conceptually similar code; structure (call graph, definitions) adds precision",
    "Embeddings cannot encode code",
    "Because grep is cheaper than anything else"
  ],
  "answer": 1,
  "explanation": "Exact symbol lookups and semantic similarity are complementary, as in text hybrid search."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement the unbiased estimator `pass_at_k(n, c, k)`: with `n` samples of which `c` pass the tests, $1 - \\binom{n-c}{k} / \\binom{n}{k}$. If `n - c < k` the result is 1.0. Use `math.comb`.",
  "starterCode": "import math\n\ndef pass_at_k(n, c, k):\n    pass\n",
  "tests": "assert abs(pass_at_k(10, 3, 1) - 0.3) < 1e-12\nassert abs(pass_at_k(10, 3, 5) - (1 - 21 / 252)) < 1e-12\nassert pass_at_k(10, 0, 3) == 0.0\nassert pass_at_k(5, 3, 3) == 1.0\nassert pass_at_k(4, 4, 1) == 1.0\nassert pass_at_k(10, 3, 5) > pass_at_k(10, 3, 2)",
  "solution": "import math\n\ndef pass_at_k(n, c, k):\n    if n - c < k:\n        return 1.0\n    return 1.0 - math.comb(n - c, k) / math.comb(n, k)",
  "hints": [
    "The probability that all k drawn samples fail is `comb(n - c, k) / comb(n, k)`.",
    "`math.comb(a, b)` is 0 when b > a, which already gives 1.0, but an explicit guard is clearer."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Chunk code by syntax. Implement `chunk_python(source)` using `ast`: return a list of `(name, start_line, end_line)` for every top-level function (name `f`) and every method of a top-level class (name `Cls.m`), including async functions, in source order. `start_line` is the first decorator line if the function has decorators, otherwise the `def` line; `end_line` is `end_lineno`.",
  "starterCode": "import ast\n\ndef chunk_python(source):\n    pass\n",
  "tests": "src = '\\n'.join([\n    'import os',\n    '',\n    'def alpha(x):',\n    '    return x',\n    '',\n    '',\n    'class Box:',\n    '    def __init__(self):',\n    '        self.v = 1',\n    '',\n    '    @property',\n    '    def val(self):',\n    '        return self.v',\n    '',\n    '',\n    'async def beta():',\n    '    pass',\n])\nassert chunk_python(src) == [('alpha', 3, 4), ('Box.__init__', 8, 9), ('Box.val', 11, 13), ('beta', 16, 17)]\nassert chunk_python('x = 1\\n') == []",
  "solution": "import ast\n\ndef chunk_python(source):\n    tree = ast.parse(source)\n    funcs = (ast.FunctionDef, ast.AsyncFunctionDef)\n\n    def span(node):\n        start = min([node.lineno] + [d.lineno for d in node.decorator_list])\n        return start, node.end_lineno\n\n    out = []\n    for node in tree.body:\n        if isinstance(node, funcs):\n            s, e = span(node)\n            out.append((node.name, s, e))\n        elif isinstance(node, ast.ClassDef):\n            for item in node.body:\n                if isinstance(item, funcs):\n                    s, e = span(item)\n                    out.append((node.name + '.' + item.name, s, e))\n    return out",
  "hints": [
    "Iterate `tree.body` for top-level nodes; for `ast.ClassDef`, iterate its own `body`.",
    "Each decorator is an expression node with a `lineno`; take the minimum with the def line."
  ]
}
```

> [!TIP] Interview tips
> - Split the product into completion, chat, review and agent; each has different latency, context and risk.
> - Talk about context engineering: AST chunks, symbol and call-graph retrieval, hybrid search, caching.
> - Use verifiable signals (tests, pass@k, resolved rate), sandbox the agent, treat repo text as untrusted input.
