---
id: genai-eng-prompt-versioning
title: Prompt versioning
estimatedMinutes: 9
difficulty: easy
tags: [genai, llmops, prompts, versioning, evaluation]
---

## Why it matters

A prompt is code that changes behavior without a compiler, and a one-word edit can silently break a downstream parser. Interviewers ask how you ship prompt changes safely: versioning, evaluation gates, rollout and rollback.


## Concept

**Treat prompts as versioned artifacts**, not strings buried in application code.

**What to version together**: the template text, the model name and snapshot, sampling parameters (temperature, max tokens), the output schema, tool definitions, few-shot examples, and retrieval settings. A "prompt version" is really a **config bundle**; changing the model alone can change behavior as much as changing the text.

**Storage options**: in git next to the code (reviewable, tied to releases) or in a prompt registry/CMS (LangSmith, Langfuse, PromptLayer, a database) so non-engineers can edit and you can change prompts without redeploying. Either way keep **immutable versions** (1, 2, 3 or a content hash) plus **mutable aliases** (`prod`, `staging`) that point to a version. Rollback is just moving the alias.

**Release workflow**:
1. Edit in a branch; log the reason for the change.
2. Run the **offline eval** (golden set + regression cases + schema-validity and safety checks) against the baseline. Compare paired on the same inputs.
3. **Shadow or canary**: run the candidate on a slice of live traffic (1-5%), compare online metrics (thumbs-down rate, escalation rate, cost, latency).
4. Promote the alias; keep the old version for instant rollback.

**Traceability**: stamp every request log/trace with `prompt_name`, `prompt_version` and model, so a regression can be tied to a change. Store inputs and outputs for replay.

**Pitfalls**: evals too small to detect a difference; prompt edits that fix one case and regress others; template variables that change silently (missing field renders as empty text); and drift when the provider updates a model alias. Pin dated model snapshots.


## Worked example

`support-reply` v3 is in prod and passes 184 of 200 golden cases (92%). A candidate v4 passes 178 (89%) but is 30% cheaper because it is shorter.

Is v4 worse? The standard error of each pass rate is about $\sqrt{0.9 \cdot 0.1 / 200} \approx 0.021$, so the difference of 3 points has SE $\approx 0.021\sqrt2 \approx 0.03$. That is about 1 SE: within noise. Do not decide on this alone. Check the 6-case net difference **paired** (which cases flipped, and are they the critical ones?), grow the eval set, then canary at 5% and watch escalation rate and cost per ticket.

If the canary regresses, `set_alias("support-reply", "prod", 3)` rolls back in seconds, because v3 was never deleted.


## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which change should be tracked as part of the 'prompt version'?",
  "options": [
    "Only the template text",
    "Template, model snapshot, sampling parameters, output schema and few-shot examples",
    "Only the model name",
    "Only the UI copy"
  ],
  "answer": 1,
  "explanation": "Any of these can change outputs, so they must be versioned and evaluated together as one bundle."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use aliases like `prod` that point to immutable versions?",
  "options": [
    "They make prompts shorter",
    "Promotion and rollback become a pointer move with no redeploy, and old versions stay reproducible",
    "Aliases are required by the API",
    "They reduce token cost"
  ],
  "answer": 1,
  "explanation": "Immutable versions give reproducibility; mutable aliases give fast, auditable release control."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a small `PromptRegistry`. `register(name, template)` appends a new version and returns its 1-based number, but returns the existing number if the template equals the latest one. `set_alias(name, alias, version)` points an alias at a version (raise `KeyError` if it does not exist). `get(name, ref=None)` returns the latest template when `ref` is None, a specific version when it is an int, or the aliased version when it is a str (raise `KeyError` for unknown refs). `render(name, ref=None, **variables)` formats the template with `str.format`.",
  "starterCode": "class PromptRegistry:\n    def __init__(self):\n        pass\n\n    def register(self, name, template):\n        # new version number (1, 2, ...); identical to the latest -> return the same number\n        pass\n\n    def set_alias(self, name, alias, version):\n        # KeyError if the version does not exist\n        pass\n\n    def get(self, name, ref=None):\n        # ref None -> latest, int -> that version, str -> alias\n        pass\n\n    def render(self, name, ref=None, **variables):\n        pass\n\nreg = PromptRegistry()\nprint(reg.register(\"sum\", \"Summarize: {text}\"))",
  "tests": "reg = PromptRegistry()\nassert reg.register('sum', 'Summarize: {text}') == 1\nassert reg.register('sum', 'Summarize: {text}') == 1\nassert reg.register('sum', 'Summarize in 3 bullets: {text}') == 2\nassert reg.register('other', 'Hi {x}') == 1\nreg.set_alias('sum', 'prod', 1)\nassert reg.get('sum', 'prod') == 'Summarize: {text}'\nassert reg.get('sum') == 'Summarize in 3 bullets: {text}'\nassert reg.get('sum', 2) == 'Summarize in 3 bullets: {text}'\nreg.set_alias('sum', 'prod', 2)\nassert reg.render('sum', 'prod', text='abc') == 'Summarize in 3 bullets: abc'\nassert reg.render('sum', 1, text='abc') == 'Summarize: abc'\nfor bad in (lambda: reg.set_alias('sum', 'x', 5), lambda: reg.get('sum', 0), lambda: reg.get('sum', 'nope')):\n    try:\n        bad()\n        raise AssertionError('expected KeyError')\n    except KeyError:\n        pass",
  "solution": "class PromptRegistry:\n    def __init__(self):\n        self.versions = {}\n        self.aliases = {}\n\n    def register(self, name, template):\n        vs = self.versions.setdefault(name, [])\n        if vs and vs[-1] == template:\n            return len(vs)\n        vs.append(template)\n        return len(vs)\n\n    def set_alias(self, name, alias, version):\n        if name not in self.versions or not 1 <= version <= len(self.versions[name]):\n            raise KeyError(version)\n        self.aliases[(name, alias)] = version\n\n    def get(self, name, ref=None):\n        vs = self.versions[name]\n        if ref is None:\n            return vs[-1]\n        if isinstance(ref, str):\n            ref = self.aliases[(name, ref)]\n        if not 1 <= ref <= len(vs):\n            raise KeyError(ref)\n        return vs[ref - 1]\n\n    def render(self, name, ref=None, **variables):\n        return self.get(name, ref).format(**variables)",
  "hints": [
    "Store versions as a list per name; version n is index n - 1.",
    "Resolve a str ref through the alias dict first, then bounds-check the integer."
  ]
}
```

> [!TIP] Interview tips
> - Describe a prompt version as a bundle (text + model + params + schema + examples), with immutable versions and mutable aliases.
> - Walk the release path: offline eval on a golden set, canary on live traffic, promote, instant rollback; tag every trace with the prompt version.
> - Pitfall: declaring a winner from a few points of difference on a small eval set; mention paired comparison and confidence intervals.
