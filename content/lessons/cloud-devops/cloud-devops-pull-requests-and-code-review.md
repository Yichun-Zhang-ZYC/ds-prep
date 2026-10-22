---
id: cloud-devops-pull-requests-and-code-review
title: "Pull requests & code review"
estimatedMinutes: 11
difficulty: easy
tags: [git, pull-requests, code-review, ci]
---

## Why it matters
Pull requests are where code, CI, security and team norms meet. Interviewers ask how you write reviewable PRs, what you look for in review, and how branch protection keeps main releasable.

## Concept
A **pull request** (PR/MR) proposes merging a branch, with a discussion thread, CI results and approvals attached. It is the unit of review, audit and (often) deployment.

**Authoring a good PR**
- Small and single-purpose (rule of thumb: under ~400 changed lines); split refactors from behavior changes.
- Description: what, why, how tested, risks, rollout/rollback, links to the ticket. Add screenshots or sample output.
- Self-review the diff first; keep commits meaningful; run tests locally; mark **draft** until ready.

**Reviewing well**: check correctness and edge cases, tests, naming and readability, security (secrets, injection, permissions), performance, observability and backwards compatibility. Be specific and kind; separate blocking issues from nits (`nit:`); ask questions instead of dictating; approve when it is good enough, not perfect. Aim to respond within a business day.

**Automation and protection** (branch rules on `main`):

```yaml
# .github/CODEOWNERS
*            @org/platform
infra/       @org/sre
*.sql        @org/data-eng

# branch protection (conceptually)
required_approvals: 2
required_status_checks: [ci, lint, security-scan]
dismiss_stale_reviews: true
require_linear_history: false
```

Typical gates: required approvals, passing CI, up-to-date branch, signed commits, no force-push to `main`, code-owner review. Merge methods: **merge commit**, **squash** (one commit per PR, tidy main) or **rebase and merge** (linear). Larger orgs add stacked PRs, merge queues (serialize merges, re-test on the latest main) and feature flags to ship incomplete work safely.

## Worked example
Policy: 2 approvals, checks `ci` and `lint`, `infra/*` owned by `dana`. A PR by `ann` touches `infra/main.tf` and gets: bob APPROVED, cy APPROVED, ann APPROVED (her own), CI green, lint green.

- Valid approvals: bob and cy = 2, since the author's approval is ignored, so the approval count passes.
- Checks pass.
- CODEOWNERS: `infra/main.tf` needs `dana`, who has not approved, so the PR is blocked with reason `codeowner`.

Dana approves, then bob later pushes a review `CHANGES_REQUESTED`: his latest state replaces his approval, leaving 2 approvals (cy, dana), but a blocking `changes_requested` reason appears. The PR merges only after bob re-approves.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which PR practice most improves review quality and turnaround?",
  "options": [
    "One large PR per release so reviewers see everything",
    "Small, focused PRs with a clear description and passing CI before requesting review",
    "Skipping review for trusted authors",
    "Squashing unrelated fixes into one commit"
  ],
  "answer": 1,
  "explanation": "Review effectiveness drops sharply with diff size. Small, single-purpose PRs with context and green automation get faster, deeper reviews and are easier to revert."
}
```

```quiz
{
  "id": "q2",
  "question": "What does a CODEOWNERS file plus branch protection \"require review from code owners\" enforce?",
  "options": [
    "Only owners can push to any branch",
    "Owners must write all the code",
    "Changes to owned paths cannot merge without approval from the matching owner",
    "CI is skipped for owned paths"
  ],
  "answer": 2,
  "explanation": "CODEOWNERS maps path patterns to people or teams; with branch protection, a PR touching those paths needs an approving review from an owner before it can merge."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement the merge gate of a branch-protection policy as `can_merge(pr, rules)`. Only each reviewer's latest non-COMMENTED state counts; the author's own approval is ignored; any current CHANGES_REQUESTED blocks; required checks must all be `success`; and every changed file matching a CODEOWNERS glob needs that owner's approval. Return `(ok, sorted_reasons)` using the reason names in the docstring.",
  "starterCode": "from fnmatch import fnmatchcase\n\ndef can_merge(pr, rules):\n    \"\"\"pr = {\"author\": str, \"reviews\": [(user, state), ...] in time order,\n             \"checks\": {name: \"success\"|\"failure\"|\"pending\"}, \"files\": [paths]}\n    rules = {\"required_approvals\": int, \"required_checks\": [names],\n             \"codeowners\": {glob_pattern: owner}}\n    Review states: APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED.\n    - Only each reviewer's latest APPROVED/CHANGES_REQUESTED/DISMISSED state counts (COMMENTED changes nothing).\n    - The author cannot approve their own PR.\n    - Any current CHANGES_REQUESTED blocks. Every required check must be \"success\".\n    - For each changed file matching a codeowners pattern, that owner must have approved.\n    Return (ok, sorted list of blocking reasons from: \"approvals\", \"changes_requested\", \"checks\", \"codeowner\").\"\"\"\n    pass\n\npr = {\"author\": \"ann\", \"reviews\": [(\"bob\", \"APPROVED\")], \"checks\": {\"ci\": \"success\"}, \"files\": [\"a.py\"]}\nprint(can_merge(pr, {\"required_approvals\": 1, \"required_checks\": [\"ci\"], \"codeowners\": {}}))",
  "tests": "rules = {\"required_approvals\": 2, \"required_checks\": [\"ci\", \"lint\"], \"codeowners\": {\"infra/*\": \"dana\", \"*.sql\": \"sam\"}}\ndef pr(reviews, checks=None, files=None, author=\"ann\"):\n    return {\"author\": author, \"reviews\": reviews,\n            \"checks\": checks or {\"ci\": \"success\", \"lint\": \"success\"}, \"files\": files or [\"app/x.py\"]}\n\nassert can_merge(pr([(\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\")]), rules) == (True, [])\nassert can_merge(pr([(\"bob\", \"APPROVED\")]), rules) == (False, [\"approvals\"])\n# author self-approval does not count\nassert can_merge(pr([(\"bob\", \"APPROVED\"), (\"ann\", \"APPROVED\")]), rules) == (False, [\"approvals\"])\n# a later CHANGES_REQUESTED overrides an earlier approval; a COMMENT does not\nassert can_merge(pr([(\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\"), (\"bob\", \"CHANGES_REQUESTED\")]), rules) == (False, [\"approvals\", \"changes_requested\"])\nassert can_merge(pr([(\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\"), (\"bob\", \"COMMENTED\")]), rules) == (True, [])\n# re-approval after changes requested clears it\nassert can_merge(pr([(\"bob\", \"CHANGES_REQUESTED\"), (\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\")]), rules)[0] is True\n# dismissed review no longer counts\nassert can_merge(pr([(\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\"), (\"cy\", \"DISMISSED\")]), rules) == (False, [\"approvals\"])\n# checks\nassert can_merge(pr([(\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\")], {\"ci\": \"pending\", \"lint\": \"success\"}), rules) == (False, [\"checks\"])\nassert can_merge(pr([(\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\")], {\"ci\": \"success\"}), rules) == (False, [\"checks\"])\n# codeowners\ntwo = [(\"bob\", \"APPROVED\"), (\"cy\", \"APPROVED\")]\nassert can_merge(pr(two, files=[\"infra/main.tf\"]), rules) == (False, [\"codeowner\"])\nassert can_merge(pr(two + [(\"dana\", \"APPROVED\")], files=[\"infra/main.tf\"]), rules) == (True, [])\nassert can_merge(pr(two, files=[\"db/m.sql\", \"app/y.py\"]), rules) == (False, [\"codeowner\"])",
  "solution": "from fnmatch import fnmatchcase\n\ndef can_merge(pr, rules):\n    state = {}\n    for user, st in pr[\"reviews\"]:\n        if st == \"COMMENTED\":\n            continue\n        state[user] = st\n    approvers = {u for u, s in state.items() if s == \"APPROVED\" and u != pr[\"author\"]}\n    reasons = set()\n    if len(approvers) < rules[\"required_approvals\"]:\n        reasons.add(\"approvals\")\n    if any(s == \"CHANGES_REQUESTED\" for s in state.values()):\n        reasons.add(\"changes_requested\")\n    for name in rules[\"required_checks\"]:\n        if pr[\"checks\"].get(name) != \"success\":\n            reasons.add(\"checks\")\n    for f in pr[\"files\"]:\n        for pat, owner in rules[\"codeowners\"].items():\n            if fnmatchcase(f, pat) and owner not in approvers:\n                reasons.add(\"codeowner\")\n    return (not reasons, sorted(reasons))",
  "hints": [
    "Replay `reviews` in order into a `{user: state}` dict, skipping COMMENTED.",
    "Collect reasons in a set so each appears once; `fnmatchcase(path, pattern)` handles the globs."
  ]
}
```

> [!TIP] Interview tips
> - Frame review as a quality gate and a knowledge-sharing tool; mention small PRs, fast turnaround and automation for style (linters) so humans focus on design.
> - Pitfall: approving without reading or a rubber-stamp culture; conversely, nitpicking style that a formatter should enforce.
> - Know merge methods and when to pick each (squash for tidy history, merge commit to preserve branch context) and what a merge queue solves.
