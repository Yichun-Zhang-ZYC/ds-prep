---
id: cloud-devops-branching-merge-vs-rebase
title: "Branching, merge vs rebase"
estimatedMinutes: 12
difficulty: medium
tags: [git, branching, merge, rebase]
---

## Why it matters
Every team has a branching convention and a merge-vs-rebase opinion. Interviewers want to know you understand git's commit graph, not just commands, and can choose a strategy that keeps history useful and safe.

## Concept
Git history is a **DAG of commits**; a **branch** is just a movable pointer to a commit and `HEAD` points to the current branch. Creating branches is free.

```bash
git switch -c feature/login        # new branch from HEAD
git switch main && git merge feature/login
git rebase main                    # replay my commits on top of main
git log --oneline --graph --all    # see the DAG
git reflog                         # recover "lost" commits
```

**Merge** joins two lines of work. If the target is an ancestor, it **fast-forwards** (moves the pointer). Otherwise it creates a **merge commit** with two parents, preserving true history and never rewriting commits. Use `--no-ff` to always keep a merge bubble.

**Rebase** re-creates your commits (new SHAs) on top of another base, giving a linear history. `git rebase -i` can reorder, squash and reword. **Squash merge** collapses a PR into one commit on main.

| | Merge | Rebase |
|---|---|---|
| History | Non-linear, accurate | Linear, rewritten |
| Safe on shared branches | Yes | No (needs force-push) |
| Bisect / revert | Revert a merge needs `-m 1` | Simple, one commit each |

**Golden rule**: never rebase commits others have based work on. Workflows: **trunk-based** (short-lived branches, feature flags, merge often) vs **GitFlow** (long-lived `develop`/`release`). When force-pushing your own branch use `--force-with-lease`. Other tools: `cherry-pick` (copy one commit), `revert` (new commit undoing one), `reset --hard` (moves the branch, destructive).

## Worked example
History: `main` is A-B-C and `feature` branched at B with D, E.

```
A - B - C        (main)
     \
      D - E      (feature)
```

The merge base of C and E is B. `git merge feature` on main creates merge commit M with parents C and E (graph: 5 commits plus M). `git rebase main` on feature instead replays the 2 commits reachable from E but not from C, namely D and E, onto C as D' and E' (new SHAs): the result is linear A-B-C-D'-E', and main can then fast-forward to E'. Same code, different history: merge keeps 6 commits and the fork; rebase keeps 5 and rewrites 2.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is `git rebase main` on a branch that teammates have already pulled risky?",
  "options": [
    "Rebase deletes the remote branch",
    "Rebase cannot handle conflicts",
    "It rewrites commits into new SHAs, so others' history diverges and must be reconciled",
    "It merges main into the branch twice"
  ],
  "answer": 2,
  "explanation": "Rebase replays commits as new objects. Anyone holding the old commits sees diverged history, and a force-push can discard their work. Rebase local/private branches; merge shared ones."
}
```

```quiz
{
  "id": "q2",
  "question": "Which statement about `git merge --ff-only feature` is true?",
  "options": [
    "It always creates a merge commit",
    "It succeeds only when the current branch is an ancestor of `feature`, and then just moves the pointer",
    "It squashes the commits",
    "It rebases `feature` first"
  ],
  "answer": 1,
  "explanation": "A fast-forward is possible only when history is linear (current tip is an ancestor of the target). Otherwise `--ff-only` refuses, which is useful to enforce linear history."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Model a commit graph as `{commit: [parents]}`. Implement `ancestors(graph, c)` (including `c`), `merge_base(graph, a, b)` (the common ancestor that is not an ancestor of another common ancestor), `is_fast_forward(graph, current, target)` and `commits_to_replay(graph, branch, onto)` (what a rebase re-creates: reachable from `branch` but not from `onto`, returned sorted).",
  "starterCode": "def ancestors(graph, c):\n    \"\"\"graph: {commit: [parent, ...]}. Return the set of c and all its ancestors.\"\"\"\n    pass\n\ndef merge_base(graph, a, b):\n    \"\"\"Best common ancestor: a common ancestor that is not an ancestor of another common ancestor.\n    (Assume a unique one exists.)\"\"\"\n    pass\n\ndef is_fast_forward(graph, current, target):\n    \"\"\"True if `current` is an ancestor of (or equal to) `target`.\"\"\"\n    pass\n\ndef commits_to_replay(graph, branch, onto):\n    \"\"\"Commits `git rebase onto` would re-create: reachable from branch, not from onto.\n    Return sorted list.\"\"\"\n    pass\n\ng = {\"A\": [], \"B\": [\"A\"], \"C\": [\"B\"], \"D\": [\"B\"], \"E\": [\"D\"]}\nprint(merge_base(g, \"C\", \"E\"))",
  "tests": "g = {\"A\": [], \"B\": [\"A\"], \"C\": [\"B\"],          # main: A-B-C\n     \"D\": [\"B\"], \"E\": [\"D\"]}                   # feature: B-D-E\nassert ancestors(g, \"E\") == {\"A\", \"B\", \"D\", \"E\"}\nassert merge_base(g, \"C\", \"E\") == \"B\"\nassert merge_base(g, \"E\", \"C\") == \"B\"\nassert merge_base(g, \"B\", \"E\") == \"B\"\nassert is_fast_forward(g, \"B\", \"E\") is True\nassert is_fast_forward(g, \"C\", \"E\") is False\nassert commits_to_replay(g, \"E\", \"C\") == [\"D\", \"E\"]\nassert commits_to_replay(g, \"C\", \"E\") == [\"C\"]\n# after a merge commit M (parents C and E)\ng2 = dict(g, M=[\"C\", \"E\"], F=[\"M\"])\nassert merge_base(g2, \"F\", \"E\") == \"E\"\nassert commits_to_replay(g2, \"F\", \"C\") == [\"D\", \"E\", \"F\", \"M\"]\nassert is_fast_forward(g2, \"C\", \"F\") is True",
  "solution": "def ancestors(graph, c):\n    seen, stack = set(), [c]\n    while stack:\n        x = stack.pop()\n        if x in seen:\n            continue\n        seen.add(x)\n        stack.extend(graph[x])\n    return seen\n\ndef merge_base(graph, a, b):\n    common = ancestors(graph, a) & ancestors(graph, b)\n    for c in common:\n        if not any(c != o and c in ancestors(graph, o) for o in common):\n            return c\n\ndef is_fast_forward(graph, current, target):\n    return current in ancestors(graph, target)\n\ndef commits_to_replay(graph, branch, onto):\n    return sorted(ancestors(graph, branch) - ancestors(graph, onto))",
  "hints": [
    "An iterative DFS with a `seen` set gives all ancestors; merge commits have two parents.",
    "`commits_to_replay` is a set difference, mirroring `git log onto..branch`."
  ]
}
```

> [!TIP] Interview tips
> - Give a policy, not a religion: rebase your private branch to stay current, merge (or squash) into shared main, never rewrite published history.
> - Pitfall: after a rebase you must push with `--force-with-lease`, never plain `--force`, so you don't overwrite a teammate's push.
> - Know recovery: `git reflog` + `git reset --hard <sha>` rescues most "lost" work after a bad rebase.
