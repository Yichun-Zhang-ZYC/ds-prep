---
id: genai-eng-case-llm-eval-platform
title: "Case: Designing an LLM evaluation platform"
estimatedMinutes: 15
difficulty: hard
tags: [genai, case-study, evaluation, system-design, ci]
---

## Why it matters
Every LLM team eventually asks "did this prompt/model change make things better or worse?" and gets burned by vibes. "Design an eval platform" tests whether you can turn scattered metrics (see Offline eval sets, LLM-as-a-judge, Human evaluation, RAG metrics) into a system that gates releases, catches regressions and stays trustworthy over time.

## Concept
**Core objects**: a *dataset* (versioned cases with inputs, optional reference outputs, tags/slices), a *task* (the system under test: prompt + model + tools + retriever, identified by a version/config hash), *scorers* (code checks, reference-based metrics, LLM judges, human labels) and a *run* (task × dataset → per-case outputs, scores, cost, latency, trace link). Results land in a store keyed by (dataset version, task version, scorer version) so runs are reproducible and comparable.

**Three loops** (a platform serves all of them):
1. **Offline / CI**: on each PR that touches a prompt, model or retriever, run the golden set and block on regressions. Keep it fast (parallelism, caching of model calls, a small "smoke" tier plus a larger nightly tier).
2. **Online**: sample production traces (see Tracing & observability), score them with cheap scorers and judges, watch dashboards per slice, run A/B tests on real outcomes (task success, escalation, thumbs).
3. **Data flywheel**: failures from production and human review get triaged into new dataset cases, so the set tracks real traffic.

**Scorer design**: prefer deterministic checks (schema validity, exact match on extracted fields, tool-call correctness) wherever possible; use LLM judges for fuzzy quality with a rubric, pairwise comparison and position swapping; **calibrate judges against a human-labeled set** (agreement, e.g. Cohen's kappa $\kappa = (p_o - p_e)/(1 - p_e)$) and re-check when the judge model changes. Pin judge model versions and temperature 0.

**Statistics**: with a few hundred cases, differences are noisy. Use *paired* comparison (same cases both runs): list fixed vs regressed cases and run a sign test or paired bootstrap on the discordant pairs; report confidence intervals; slice by intent/language/difficulty, because an aggregate gain can hide a collapse on one slice. Re-run flaky (non-deterministic) cases several times.

**Platform concerns**: dataset and prompt versioning, immutable run artifacts, cost and time budgets per run, secrets and PII handling in stored outputs, contamination (do not tune on the test split), access control, and a diff UI that shows side-by-side outputs of regressed cases. Build vs buy: open-source or hosted eval tools cover the basics; custom pieces are usually the scorers and the data pipeline from your own traffic.

## Worked example
Scenario: a support-answer bot with a 400-case golden set (tagged by intent). A PR changes the system prompt.

Baseline passes 332/400 = 83.0%; the candidate passes 348/400 = 87.0%. Paired view: 28 cases fixed, 12 regressed, net $28 - 12 = 16 = 348 - 332$. The 95% Wilson intervals for the two rates are about 79.0 to 86.4% and 83.3 to 89.9%, which overlap, so unpaired reasoning would call it inconclusive. But the paired sign test on 40 discordant cases gives $p = 2\sum_{k\ge 28}\binom{40}{k}/2^{40} \approx 0.017$, so the gain is likely real.

The gate does not stop there. Slice view: billing intents improved 20 cases, but the "refund policy" slice regressed 6 of 12 cases, all hallucinated amounts. CI rule: block if any slice with at least 20 cases drops more than 5 points or any case tagged `critical` regresses. The team inspects the 12 regressed cases in the diff view, adds 3 new refund cases, fixes the prompt, and re-runs. Judge scores are accepted only because the judge agrees with humans at $\kappa = 0.70$ on 100 double-labeled items (85% raw agreement, 50% expected by chance).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Two runs have overlapping confidence intervals on pass rate, but the candidate fixes 28 cases and regresses 12 on the same dataset. What is the better analysis?",
  "options": [
    "Declare no difference since the intervals overlap",
    "Average the two pass rates",
    "Use a paired test on the discordant cases (for example a sign test), because the cases are the same in both runs",
    "Rerun with a different dataset"
  ],
  "answer": 2,
  "explanation": "Pairing removes between-case variance. The discordant pairs carry the information about the change."
}
```

```quiz
{
  "id": "q2",
  "question": "Why calibrate an LLM judge against human labels before using it as a CI gate?",
  "options": [
    "It makes the judge cheaper",
    "To measure agreement with humans and detect bias, so scores mean something",
    "Judges cannot be run without human labels",
    "It guarantees the judge never changes"
  ],
  "answer": 1,
  "explanation": "Agreement statistics such as kappa show whether the judge tracks human judgment; re-check them when the judge model or rubric changes."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `compare_runs`: for ids present in both runs return the sorted `fixed` and `regressed` case ids and both pass rates.",
  "starterCode": "def compare_runs(baseline, candidate):\n    \"\"\"baseline/candidate: dict case_id -> bool (passed). Use only ids present in both.\n    Return {\"fixed\": sorted ids failing before and passing now,\n            \"regressed\": sorted ids passing before and failing now,\n            \"base_rate\": float, \"cand_rate\": float}.\"\"\"\n    pass\n",
  "tests": "b = {\"a\": True, \"b\": True, \"c\": False, \"d\": False, \"e\": True, \"zz\": True}\nc = {\"a\": True, \"b\": False, \"c\": True, \"d\": False, \"e\": True}\nr = compare_runs(b, c)\nassert r[\"fixed\"] == [\"c\"]\nassert r[\"regressed\"] == [\"b\"]\nassert abs(r[\"base_rate\"] - 0.6) < 1e-9\nassert abs(r[\"cand_rate\"] - 0.6) < 1e-9\n",
  "solution": "def compare_runs(baseline, candidate):\n    ids = sorted(set(baseline) & set(candidate))\n    fixed = [i for i in ids if not baseline[i] and candidate[i]]\n    regressed = [i for i in ids if baseline[i] and not candidate[i]]\n    n = len(ids)\n    return {\n        \"fixed\": fixed,\n        \"regressed\": regressed,\n        \"base_rate\": sum(baseline[i] for i in ids) / n,\n        \"cand_rate\": sum(candidate[i] for i in ids) / n,\n    }\n",
  "hints": [
    "Intersect the key sets first.",
    "Fixed = failed before and passes now; regressed is the opposite."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `cohen_kappa` for two label lists: observed agreement $p_o$, chance agreement $p_e = \\sum_c P_a(c)P_b(c)$, then $(p_o - p_e)/(1 - p_e)$.",
  "starterCode": "def cohen_kappa(a, b):\n    \"\"\"Cohen's kappa between two equal-length label lists (any hashable labels).\"\"\"\n    pass\n",
  "tests": "a = [1] * 50 + [0] * 50\nb = [1] * 45 + [0] * 5 + [1] * 10 + [0] * 40\nassert abs(cohen_kappa(a, b) - 0.7) < 1e-9\nassert abs(cohen_kappa([1, 0, 1, 0], [1, 0, 1, 0]) - 1.0) < 1e-9\nassert abs(cohen_kappa([\"x\", \"y\", \"x\", \"y\"], [\"y\", \"x\", \"y\", \"x\"]) - (-1.0)) < 1e-9\n",
  "solution": "def cohen_kappa(a, b):\n    n = len(a)\n    po = sum(x == y for x, y in zip(a, b)) / n\n    pe = sum((a.count(c) / n) * (b.count(c) / n) for c in set(a) | set(b))\n    return (po - pe) / (1 - pe)\n",
  "hints": [
    "Count labels with `a.count(c)` over the union of labels.",
    "Perfect disagreement on a balanced binary set gives -1."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement an exact two-sided `sign_test_p(fixed, regressed)`: with $n$ discordant pairs and $k=\\max$ of the two, $p = \\min(1, 2\\sum_{i\\ge k}\\binom{n}{i}/2^n)$.",
  "starterCode": "from math import comb\n\ndef sign_test_p(fixed, regressed):\n    \"\"\"Exact two-sided sign test p-value on the discordant pairs (null: each is 50/50).\n    Return 1.0 when there are no discordant pairs.\"\"\"\n    pass\n",
  "tests": "assert round(sign_test_p(28, 12), 4) == 0.0166\nassert sign_test_p(5, 5) == 1.0\nassert sign_test_p(0, 0) == 1.0\nassert abs(sign_test_p(10, 0) - 2 / 1024) < 1e-12\nassert abs(sign_test_p(3, 9) - sign_test_p(9, 3)) < 1e-12\n",
  "solution": "from math import comb\n\ndef sign_test_p(fixed, regressed):\n    n = fixed + regressed\n    if n == 0:\n        return 1.0\n    k = max(fixed, regressed)\n    tail = sum(comb(n, i) for i in range(k, n + 1)) / 2 ** n\n    return min(1.0, 2 * tail)\n",
  "hints": [
    "Use `math.comb`.",
    "Return 1.0 when n is 0."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design an internal LLM evaluation platform used by 20 product teams.' Outline your answer.",
  "answer": "**Requirements**: teams run evals in CI and nightly; compare prompts/models/retrievers; track production quality; low friction; trustworthy numbers; cost controlled; PII-safe. Scale (illustrative): 20 teams, about 500 runs/day, up to 2,000 cases each.\n\n**Data model**: `Dataset` (versioned, with splits and slice tags), `Case` (input, reference/rubric, metadata), `TaskVersion` (prompt + model + params + tool/retriever config hash), `Scorer` (type: code/judge/human; version), `Run`, `Result` (case, output, scores, tokens, latency, cost, trace id). Immutable runs, content-hashed datasets.\n\n**Execution**: a job queue and worker pool calls the team's task through a thin adapter (HTTP endpoint or SDK function), with concurrency limits per provider key, retries, and a response cache keyed by (task version, input) so reruns after a scorer change cost nothing. Judges run as a second stage. Tiers: smoke (50 cases, under 2 min, every PR), full (nightly), expanded (pre-release).\n\n**Scoring**: deterministic scorers library (JSON schema, regex, exact/F1, tool-call match, citation present), judge templates with rubrics, pairwise and position-swapped comparison, and a human-review queue for low-confidence or disputed items. Judge calibration set per template with kappa tracked on a dashboard; alert on drift.\n\n**Analysis and gating**: paired diff against the baseline run (fixed/regressed lists, sign test or bootstrap, slice breakdown, cost and latency deltas). Policy per team: block on critical-case regression, slice drop over a threshold, or cost over budget; otherwise warn. Flaky cases get n repeats and a variance flag.\n\n**Online loop**: trace ingestion, sampling and scoring in production, dashboards, alerts, and a one-click \"add to dataset\" from a bad trace after human triage. A/B test hooks tie offline scores to business metrics, to check that the offline metric predicts the online one.\n\n**Governance**: dataset ownership and review, access control, PII redaction before storage, retention, test-split hygiene, audit trail. **Pitfalls to name**: judge bias (position, verbosity, self-preference), overfitting to the golden set, stale datasets, and averaging away slice failures."
}
```

> [!TIP] Interview tips
> - Frame it as dataset, task version, scorer, run, then say how three loops (CI, online, flywheel) reuse them.
> - Bring up paired comparisons, slices and judge calibration; that is what separates a platform from a notebook.
> - Say how bad production traces become new test cases, and how you validate that offline scores predict online outcomes.
