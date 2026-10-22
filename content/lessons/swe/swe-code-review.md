---
id: swe-code-review
title: Code review
estimatedMinutes: 10
difficulty: easy
tags: [code-review, pull-requests, quality, collaboration, linting]
---

## Why it matters
Code review is how teams keep quality high and spread knowledge. Interviewers ask how you review and how you take feedback, and ML teams in particular worry about notebooks and experiments that never get reviewed before they reach production.

## Concept
**Goals of review**: catch defects early, keep the codebase consistent and maintainable, share knowledge, and align on design. It is not for proving who is smarter, and style nitpicks belong to automation.

**Author checklist (before requesting review)**:
- Keep PRs **small** (ideally under about 400 changed lines) and focused on one change. Large PRs get skimmed, not reviewed.
- Write a clear description: what, why, how tested, risks, screenshots or metrics. Link the ticket.
- Self-review the diff, run tests, linters and type checks locally; make CI green first.
- Don't mix refactors with behavior changes.

**Reviewer checklist** (roughly in order of importance):
1. **Design**: does it fit the architecture, is it the right place and the right abstraction?
2. **Correctness**: logic, edge cases (empty input, nulls, timezones), concurrency, error handling.
3. **Tests**: do they cover new behavior and failure paths, and would they fail if the code broke?
4. **Readability**: names, small functions, comments explain why, not what.
5. **Security and data**: input validation, secrets, SQL injection, PII in logs.
6. **Performance and cost**: accidental O(n^2), N+1 queries, loading a full dataset into memory.
7. **Operations**: logging, metrics, migrations, backwards compatibility, rollback.

**Data and ML specifics**: check for **data leakage** (fitting on the test set, using future information), reproducibility (seeds, pinned versions, config not hard-coded), train/serve skew, evaluation on the right split and metric, large files or secrets accidentally committed, and clear notebook output stripping.

**Automate the boring parts**: formatters (black, ruff format), linters (ruff, flake8), type checkers (mypy), pre-commit hooks, and CI tests, so humans focus on design and logic.

**Giving feedback**: be specific, kind and about the code, not the person. Ask questions ("what happens if `x` is empty?"). Label severity: `nit:` (optional), `suggestion:`, and blocking issues. Explain why, and offer an alternative. Approve when remaining comments are minor.

**Receiving feedback**: assume good intent, respond to every comment, push back with reasons or data, don't take it personally. Review turnaround matters: aim for a first response within a working day.

```python
# review comment example
# blocking: bare `except:` hides KeyboardInterrupt and real bugs.
try:
    score = model.predict(x)
except Exception:        # catch what you can handle, log, and re-raise or fall back
    logger.exception("prediction failed")
    raise
```

## Worked example
A 1,200-line PR adds a feature store client, refactors config loading and changes the training loop. Review feedback: split into three PRs (refactor, client, training change) so each can be reasoned about and reverted independently. In the client PR the reviewer finds `df.fillna(df.mean())` computed on the full dataset before the train/test split (leakage), an un-pinned dependency, and no test for an empty response. Comments: one blocking (leakage), one blocking (no test for the error path), one `nit:` on naming. After fixes and green CI the PR is approved and merged.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which PR is most likely to get a thorough, useful review?",
  "options": ["2,000 lines mixing refactor and new feature", "A focused 150-line change with a clear description and tests", "A PR with no description, since the code speaks for itself", "A PR that is merged first and reviewed afterwards"],
  "answer": 1,
  "explanation": "Small, focused PRs with context and tests are easier to review accurately and faster to approve."
}
```

```quiz
{
  "id": "q2",
  "question": "Which concern is best left to automated tooling rather than human reviewers?",
  "options": ["Whether the abstraction is right", "Code formatting and import order", "Whether edge cases are tested", "Security implications of a new endpoint"],
  "answer": 1,
  "explanation": "Formatters and linters handle style consistently, so human attention goes to design, correctness and risk."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write a tiny automated reviewer. `review_flags(source, max_args=4, max_lines=20)` parses Python source with `ast` and returns a sorted list of strings: `'<name>:too_many_args'` for each function with more than `max_args` parameters (count positional and keyword-only), `'<name>:too_long'` for each function spanning more than `max_lines` lines (end_lineno - lineno + 1), and `'bare_except:<lineno>'` for each bare `except:` handler.",
  "setup": "import ast",
  "starterCode": "def review_flags(source, max_args=4, max_lines=20):\n    pass\n\nsrc = 'def f(a, b, c, d, e):\\n    return 1\\n'\nprint(review_flags(src))",
  "tests": "src = 'def f(a, b, c, d, e):\\n    return 1\\n\\ndef g():\\n    try:\\n        pass\\n    except:\\n        pass\\n'\nassert review_flags(src, max_lines=2) == ['bare_except:7', 'f:too_many_args', 'g:too_long']\nassert review_flags(src) == ['bare_except:7', 'f:too_many_args']\nassert review_flags('def h(a, *, b=1):\\n    return a\\n', max_args=1) == ['h:too_many_args']\nassert review_flags('x = 1\\n') == []",
  "solution": "def review_flags(source, max_args=4, max_lines=20):\n    tree = ast.parse(source)\n    out = []\n    for node in ast.walk(tree):\n        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):\n            a = node.args\n            n = len(a.posonlyargs) + len(a.args) + len(a.kwonlyargs)\n            if n > max_args:\n                out.append(node.name + ':too_many_args')\n            if node.end_lineno - node.lineno + 1 > max_lines:\n                out.append(node.name + ':too_long')\n        elif isinstance(node, ast.ExceptHandler) and node.type is None:\n            out.append('bare_except:' + str(node.lineno))\n    return sorted(out)",
  "hints": ["ast.walk visits every node; check isinstance for FunctionDef and ExceptHandler.", "A bare except has handler.type is None; function params live in node.args.args, .posonlyargs and .kwonlyargs."]
}
```

> [!TIP] Interview tips
> - Describe a process: small PRs, automated checks first, humans review design, correctness, tests and risk.
> - Give an example of feedback you gave or received and how you handled disagreement (data, a prototype, escalate to a tech lead only when stuck).
> - For ML code mention leakage, reproducibility and train/serve skew as review items.
