---
id: cloud-devops-github-actions-jenkins-gitlab-ci
title: GitHub Actions / Jenkins / GitLab CI
estimatedMinutes: 12
difficulty: easy
tags: [cloud-devops, ci-cd, github-actions, jenkins, gitlab-ci]
---

## Why it matters
CI/CD tools automate build, test and deploy on every change. Interviewers ask you to read or write a pipeline and compare the major tools, so know the shared model and each tool's flavour.

## Concept
All three tools share one model: a **trigger** (push, pull request, schedule, manual) starts a **pipeline** of **jobs** made of **steps**, run on **runners/agents**, with **dependencies** between jobs, **artifacts** and **caches**, and **secrets** injected at run time. The pipeline definition lives in the repo (**pipeline as code**).

**GitHub Actions**: YAML in `.github/workflows/`. Hosted runners or self-hosted; huge marketplace of reusable **actions**; `needs:` orders jobs; matrix builds; OIDC federation to clouds avoids long-lived keys.

```yaml
name: ci
on:
  pull_request:
  push: {branches: [main]}
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: {python: ["3.11", "3.12"]}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: "${{ matrix.python }}", cache: pip}
      - run: pip install -r requirements.txt && pytest
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
        env: {TOKEN: "${{ secrets.DEPLOY_TOKEN }}"}
```

**GitLab CI**: `.gitlab-ci.yml`; **stages** run in order, jobs in a stage run in parallel; `rules:`/`only:` control when jobs run; built-in container registry, environments and review apps; runners can be shared or self-hosted.

**Jenkins**: self-hosted automation server with a `Jenkinsfile` (declarative or scripted Groovy), controller plus agents, and a huge plugin ecosystem. Most flexible but you operate and patch it yourself.

| | GitHub Actions | GitLab CI | Jenkins |
|---|---|---|---|
| Hosting | SaaS or self-hosted runners | SaaS or self-managed | Self-hosted |
| Config | YAML workflows | YAML stages | Jenkinsfile (Groovy) |
| Strength | Ecosystem, tight GitHub fit | All-in-one DevOps platform | Flexibility, legacy and on-prem |

**Good practice**: fast feedback (cache dependencies, run tests in parallel), pin action versions (or SHAs), least-privilege tokens, never echo secrets, protect branches so main requires a green pipeline.

## Worked example
The workflow above runs on every pull request and push to main. The `test` job fans out into 2 matrix jobs (Python 3.11 and 3.12) that run in parallel, about 3 minutes each, so wall-clock time is about 3 minutes instead of 6. `deploy` has `needs: test` and an `if` on the branch: on a pull request it is skipped, on a push to main it runs only if both matrix jobs passed. A failed test blocks deploy, and the secret `DEPLOY_TOKEN` is masked in logs.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In GitHub Actions, what does `needs: test` on the `deploy` job do?",
  "options": [
    "Runs deploy before test",
    "Makes deploy wait for test and skip if test fails",
    "Copies the test job's steps",
    "Runs deploy on a different branch"
  ],
  "answer": 1,
  "explanation": "`needs` creates a dependency edge: deploy starts only after test succeeds, and is skipped if it fails."
}
```

```quiz
{
  "id": "q2",
  "question": "Which statement best distinguishes Jenkins from GitHub Actions or GitLab CI SaaS?",
  "options": [
    "Jenkins cannot run tests",
    "Jenkins is typically self-hosted, so you operate the controller, agents and plugins yourself",
    "Jenkins has no pipeline as code",
    "Jenkins only builds Java"
  ],
  "answer": 1,
  "explanation": "Jenkins is very flexible via plugins and Jenkinsfiles, but you manage upgrades, security and scaling of the controller and agents."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Plan a CI pipeline. `jobs` maps a job name to a dict with optional `needs` (list of job names) and optional `branches` (list of branches it runs on; absent means all). `plan(jobs, branch)` returns a list of stages; each stage is a sorted list of jobs that can run in parallel. A job is skipped if it is filtered out by `branches`, or if any job in its `needs` is skipped. A job runs in the earliest stage after all its needs. Raise `ValueError` on a dependency cycle or an unknown `needs` entry among all jobs.",
  "starterCode": "def plan(jobs, branch):\n    pass\n",
  "tests": "jobs = {\n    'lint': {},\n    'build': {},\n    'test': {'needs': ['build']},\n    'deploy': {'needs': ['test', 'lint'], 'branches': ['main']},\n}\nassert plan(jobs, 'main') == [['build', 'lint'], ['test'], ['deploy']]\nassert plan(jobs, 'feature') == [['build', 'lint'], ['test']]\nassert plan({'a': {}}, 'x') == [['a']]\nassert plan({'a': {'branches': ['main']}, 'b': {'needs': ['a']}}, 'dev') == []\nfor bad in ({'a': {'needs': ['b']}, 'b': {'needs': ['a']}}, {'a': {'needs': ['zzz']}}):\n    try:\n        plan(bad, 'main')\n        raise AssertionError('expected ValueError')\n    except ValueError:\n        pass",
  "solution": "def plan(jobs, branch):\n    for n, j in jobs.items():\n        for d in j.get('needs', []):\n            if d not in jobs:\n                raise ValueError('unknown job ' + d)\n    level = {}\n    visiting = set()\n\n    def resolve(n):\n        # returns stage index, or None if skipped\n        if n in level:\n            return level[n]\n        if n in visiting:\n            raise ValueError('cycle')\n        visiting.add(n)\n        j = jobs[n]\n        res = 0\n        if 'branches' in j and branch not in j['branches']:\n            res = None\n        for d in j.get('needs', []):\n            dl = resolve(d)\n            if dl is None:\n                res = None\n            elif res is not None:\n                res = max(res, dl + 1)\n        visiting.discard(n)\n        level[n] = res\n        return res\n\n    for n in jobs:\n        resolve(n)\n    stages = {}\n    for n, l in level.items():\n        if l is not None:\n            stages.setdefault(l, []).append(n)\n    return [sorted(stages[k]) for k in sorted(stages)]",
  "hints": [
    "A job's stage is 0 with no needs, otherwise 1 + the maximum stage of its needs; compute it recursively with memoisation.",
    "Track nodes currently being visited to detect a cycle, and propagate 'skipped' (None) up from needs."
  ]
}
```

> [!TIP] Interview tips
> - Describe the shared model (trigger, jobs, steps, runners, artifacts, secrets) before comparing tools.
> - Be ready to read a YAML pipeline and explain `needs`, matrix and conditional deploys.
> - Pitfall: unpinned third-party actions, long-lived cloud keys and secrets exposed to pull requests from forks.
