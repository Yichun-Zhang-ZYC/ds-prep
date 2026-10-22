---
id: cloud-devops-resolving-conflicts
title: Resolving conflicts
estimatedMinutes: 10
difficulty: easy
tags: [git, merge-conflicts, rebase]
---

## Why it matters
Conflicts are inevitable on a team, and fumbling one can silently drop a colleague's change. Interviewers check that you can resolve them calmly, verify the result and prevent them in the first place.

## Concept
A **conflict** happens when two branches change the same lines (or one edits what the other deletes/renames) since their merge base. Git merges non-overlapping changes automatically and stops on the rest, leaving markers:

```
<<<<<<< HEAD
timeout = 30
=======
timeout = 60
>>>>>>> feature/retries
```

Above `=======` is your current side (`HEAD`), below is the incoming side. With `merge.conflictStyle diff3` (or `zdiff3`) a `||||||| base` section also shows the original, which makes intent much clearer.

```bash
git merge feature            # CONFLICT (content): ... Automatic merge failed
git status                   # "both modified:" lists the files
# edit files: keep ours, theirs, or a combination; delete ALL markers
git add path/to/file         # marks as resolved
git merge --continue         # or: git commit   (rebase: git rebase --continue)
git merge --abort            # bail out to the pre-merge state
git checkout --ours file     # take a whole side (--theirs for the other)
git rerere                   # remember how you resolved, replay next time
```

**Roles flip in rebase**: "ours" is the branch you rebase onto and "theirs" is your commit being replayed.

**Resolve, then verify**: grep for leftover `<<<<<<<`, run the build and tests (a textually clean merge can still be semantically broken), and review `git diff` against both parents. Use a visual three-way merge tool for big files.

**Prevent them**: small short-lived branches, merge or rebase from main often, avoid mass reformatting and file moves mixed with edits, agree code ownership, and keep lockfiles/generated files out of hand-merging (regenerate them).

## Worked example
`main` and `feature` both edit `config.py` since the merge base, where `timeout = 10`. Main raised it to 30; feature changed it to 60 and added `retries = 3`.

The result has one hunk: ours `timeout = 30`, theirs `timeout = 60`, while `retries = 3` merged cleanly in a non-overlapping region. The resolution is a decision, not a mechanical pick: with retries enabled the team wants 60. You keep `timeout = 60`, remove the 3 marker lines, `git add config.py`, run tests, and commit. Choosing `ours` would silently drop the intent of the feature; choosing `both` would leave two `timeout` assignments, valid Python but a latent bug.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Git stopped a merge with conflicts. What are the steps to finish it?",
  "options": [
    "`git commit` immediately; markers are ignored",
    "Delete the conflicted files and re-clone",
    "Edit the files to remove the markers and choose the right content, `git add` them, then `git commit` (or `git merge --continue`)",
    "Run `git push --force`"
  ],
  "answer": 2,
  "explanation": "Conflict markers are just text in the working tree. You resolve the content, stage the files to mark them resolved, and conclude the merge. `git merge --abort` returns to the pre-merge state."
}
```

```quiz
{
  "id": "q2",
  "question": "During `git rebase main`, in the conflict markers, what does the `HEAD` (\"ours\") side represent?",
  "options": [
    "The upstream commits you are rebasing onto (main plus already replayed commits)",
    "Your own commit being replayed",
    "The common ancestor",
    "The remote branch"
  ],
  "answer": 0,
  "explanation": "Rebase checks out the new base and applies your commits one by one, so \"ours\" is the base side and \"theirs\" is your commit being replayed, the reverse of a merge. A classic source of confusion."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Parse Git conflict markers. `parse_conflicts(text)` returns a list of `(ours_lines, theirs_lines)` for each hunk delimited by `<<<<<<<`, `=======` and `>>>>>>>`. `resolve(text, strategy)` returns the text with each hunk replaced by `ours`, `theirs` or `both` (ours first) while keeping the other lines; keep a trailing newline if the input had one.",
  "starterCode": "def parse_conflicts(text):\n    \"\"\"Find conflict hunks delimited by <<<<<<<, =======, >>>>>>> (marker lines start with the marker).\n    Return a list of (ours_lines, theirs_lines).\"\"\"\n    pass\n\ndef resolve(text, strategy):\n    \"\"\"Return text with every hunk replaced by:\n    'ours'   -> our side only\n    'theirs' -> their side only\n    'both'   -> ours then theirs\n    Lines outside hunks are kept. Result keeps the trailing newline style of the input.\"\"\"\n    pass\n\nt = \"a\\n<<<<<<< HEAD\\nx = 1\\n=======\\nx = 2\\n>>>>>>> feature\\nb\\n\"\nprint(parse_conflicts(t), repr(resolve(t, \"theirs\")))",
  "tests": "t = \"a\\n<<<<<<< HEAD\\nx = 1\\ny = 1\\n=======\\nx = 2\\n>>>>>>> feature\\nb\\n<<<<<<< HEAD\\nz\\n=======\\n>>>>>>> feature\\nc\\n\"\nh = parse_conflicts(t)\nassert h == [([\"x = 1\", \"y = 1\"], [\"x = 2\"]), ([\"z\"], [])]\nassert resolve(t, \"ours\") == \"a\\nx = 1\\ny = 1\\nb\\nz\\nc\\n\"\nassert resolve(t, \"theirs\") == \"a\\nx = 2\\nb\\nc\\n\"\nassert resolve(t, \"both\") == \"a\\nx = 1\\ny = 1\\nx = 2\\nb\\nz\\nc\\n\"\nassert parse_conflicts(\"no conflicts\\nhere\\n\") == []\nassert resolve(\"no conflicts\\nhere\\n\", \"ours\") == \"no conflicts\\nhere\\n\"\nassert resolve(\"p\\n<<<<<<< a\\n1\\n=======\\n2\\n>>>>>>> b\", \"theirs\") == \"p\\n2\"",
  "solution": "def _walk(text):\n    \"\"\"Yield (\"text\", line) or (\"hunk\", ours, theirs).\"\"\"\n    items, ours, theirs, mode = [], None, None, None\n    for line in text.splitlines():\n        if line.startswith(\"<<<<<<<\"):\n            ours, theirs, mode = [], [], \"ours\"\n        elif line.startswith(\"=======\") and mode == \"ours\":\n            mode = \"theirs\"\n        elif line.startswith(\">>>>>>>\") and mode == \"theirs\":\n            items.append((\"hunk\", ours, theirs))\n            mode = None\n        elif mode == \"ours\":\n            ours.append(line)\n        elif mode == \"theirs\":\n            theirs.append(line)\n        else:\n            items.append((\"text\", line))\n    return items\n\ndef parse_conflicts(text):\n    return [(i[1], i[2]) for i in _walk(text) if i[0] == \"hunk\"]\n\ndef resolve(text, strategy):\n    out = []\n    for i in _walk(text):\n        if i[0] == \"text\":\n            out.append(i[1])\n        elif strategy == \"ours\":\n            out.extend(i[1])\n        elif strategy == \"theirs\":\n            out.extend(i[2])\n        else:\n            out.extend(i[1] + i[2])\n    return \"\\n\".join(out) + (\"\\n\" if out and text.endswith(\"\\n\") else \"\")",
  "hints": [
    "Walk the lines with a small state machine: outside, in ours, in theirs.",
    "Build one helper that yields plain lines and hunks, and reuse it in both functions."
  ]
}
```

> [!TIP] Interview tips
> - Describe a process: understand both intents (ask the author if unsure), resolve, build and test, then commit; never blindly `--ours`/`--theirs` a whole file.
> - Pitfall: committing leftover conflict markers, or resolving a rebase conflict and forgetting `git rebase --continue`.
> - Mention `merge.conflictStyle diff3`, `git rerere`, and reducing conflicts through small PRs and frequent integration.
