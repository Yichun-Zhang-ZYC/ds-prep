---
id: cloud-devops-pipeline-stages-build-test-deploy
title: "Pipeline stages: build, test, deploy"
estimatedMinutes: 10
difficulty: easy
tags: [ci-cd, pipeline, deployment, devops]
---

## Why it matters

Every CI/CD question boils down to the same shape: what runs on each commit, in what order, and what gates a release. Interviewers want you to describe a pipeline that is fast, trustworthy and safe to deploy from, including for ML services.

## Concept

A pipeline is a **DAG of stages**; each stage is a set of jobs that either pass or fail, and a failure stops everything downstream (**fail fast**).

**Typical stages**:
- **Build**: compile or package once into an immutable, versioned artifact (wheel, Docker image tagged with the commit SHA). Later stages consume that artifact; never rebuild per environment.
- **Test**: lint and type-check (seconds), unit tests (fast, many), integration tests (services, DB), then slower end-to-end or model-quality checks. Order cheap checks first.
- **Security scan**: dependency and image vulnerability scan, secret detection.
- **Deploy**: push to staging, run smoke tests, then promote the *same artifact* to production.

**Speed levers**: run independent jobs in parallel, cache dependencies and Docker layers, run only affected tests, and keep the commit-to-feedback loop under about 10 minutes. Wall-clock time is the **critical path**: the longest chain of dependent stages, not the sum of all jobs.

**Delivery vs deployment**: *continuous delivery* keeps every green build releasable, with a manual approval before production; *continuous deployment* releases automatically. Production gates are usually a manual approval, an automated canary with metric checks, and a one-command rollback to the previous artifact.

```yaml
# .github/workflows/ci.yml (sketch)
jobs:
  lint:    { runs-on: ubuntu-latest, steps: [ ... ] }
  build:   { runs-on: ubuntu-latest, steps: [ ... ] }
  unit:    { needs: build, steps: [ ... ] }
  integration: { needs: build, steps: [ ... ] }
  deploy-staging:
    needs: [lint, unit, integration]
    if: github.ref == 'refs/heads/main'
```

**For ML**: add data validation and model-quality gates (metric not below the current champion) between test and deploy, and version data, code and model together.

## Worked example

Stage durations (minutes): lint 1, build 5, unit 3, integration 8, deploy-staging 2. `unit` and `integration` both need `build`; deploy needs lint, unit and integration. Run sequentially it takes $1+5+3+8+2 = 19$ minutes. With parallelism the critical path is build → integration → deploy $= 5+8+2 = 15$ minutes. Speeding up `unit` or `lint` changes nothing; speeding up `integration` does.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why build the artifact once and promote the same artifact through staging to production?",
  "options": [
    "It saves disk space",
    "What you tested is exactly what you ship, with no per-environment rebuild differences",
    "Production needs a different compiler",
    "It removes the need for tests"
  ],
  "answer": 1,
  "explanation": "Rebuilding per environment can pull different dependency versions, so staging results would not predict production. Promote one immutable artifact."
}
```

```quiz
{
  "id": "q2",
  "question": "A pipeline's jobs run in parallel where possible. What determines its total wall-clock time?",
  "options": [
    "The sum of all job durations",
    "The number of jobs",
    "The longest chain of dependent jobs (critical path)",
    "The fastest job"
  ],
  "answer": 2,
  "explanation": "Independent jobs overlap, so only the longest dependency chain matters. Optimise it, not the off-path jobs."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `stage_order(deps)` returning a valid execution order (list) for a dict `{stage: [stages it needs]}`: a stage appears only after all its needs, and ties are broken alphabetically so the result is deterministic. Raise `ValueError` on a cycle. Then write `critical_path(deps, minutes)` returning the minimum wall-clock time when independent stages run in parallel (the longest dependency-weighted path).",
  "starterCode": "def stage_order(deps):\n    pass\n\ndef critical_path(deps, minutes):\n    pass\n\ndeps = {'lint': [], 'build': [], 'unit': ['build'], 'integration': ['build'], 'deploy': ['lint', 'unit', 'integration']}\nminutes = {'lint': 1, 'build': 5, 'unit': 3, 'integration': 8, 'deploy': 2}\nprint(stage_order(deps), critical_path(deps, minutes))\n",
  "tests": "deps = {'lint': [], 'build': [], 'unit': ['build'], 'integration': ['build'], 'deploy': ['lint', 'unit', 'integration']}\nminutes = {'lint': 1, 'build': 5, 'unit': 3, 'integration': 8, 'deploy': 2}\no = stage_order(deps)\nassert o == ['build', 'integration', 'lint', 'unit', 'deploy'], o\nassert critical_path(deps, minutes) == 15\nassert critical_path({'a': []}, {'a': 4}) == 4\ntry:\n    stage_order({'a': ['b'], 'b': ['a']})\n    assert False\nexcept ValueError:\n    pass\nassert stage_order({'x': [], 'a': []}) == ['a', 'x']",
  "solution": "def stage_order(deps):\n    done = []\n    remaining = set(deps)\n    while remaining:\n        ready = sorted(s for s in remaining if all(d in done for d in deps[s]))\n        if not ready:\n            raise ValueError('cycle')\n        done.append(ready[0])\n        remaining.remove(ready[0])\n    return done\n\ndef critical_path(deps, minutes):\n    finish = {}\n    for s in stage_order(deps):\n        start = max((finish[d] for d in deps[s]), default=0)\n        finish[s] = start + minutes[s]\n    return max(finish.values())",
  "hints": [
    "Repeatedly pick the alphabetically first stage whose needs are all already scheduled; if none is ready but stages remain, there is a cycle.",
    "Earliest finish of a stage = max(finish of its needs) + its own minutes; the answer is the max finish."
  ]
}
```

> [!TIP] Interview tips
> - Describe stages in order: lint/unit (cheap) first, build once, integration, security scan, staging smoke test, gated production.
> - Say 'immutable artifact tagged by commit SHA' and 'one-command rollback'; mention caching and parallelism for speed.
> - For ML, add data and model-quality gates, and distinguish continuous delivery (manual approval) from continuous deployment.
