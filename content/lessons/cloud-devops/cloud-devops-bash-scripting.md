---
id: cloud-devops-bash-scripting
title: Bash scripting
estimatedMinutes: 12
difficulty: medium
tags: [bash, scripting, automation, error-handling]
---

## Why it matters
Glue scripts for deploys, backups and data pulls are everywhere, and a silent failure in one can ship a broken release. Interviewers probe strict mode, quoting, exit codes and when to stop using Bash.

## Concept
Every command returns an **exit status** (`0` = success, non-zero = failure) in `$?`. Scripts compose them with `&&`, `||`, `if`, and pipes.

```bash
#!/usr/bin/env bash
set -euo pipefail            # -e exit on error, -u error on unset var, pipefail: any failed pipe stage fails
IFS=$'\n\t'
trap 'rm -rf "$tmp"' EXIT    # cleanup runs on any exit

usage() { echo "usage: $0 <env>" >&2; exit 2; }
[[ $# -eq 1 ]] || usage
env=$1
tmp=$(mktemp -d)             # command substitution

for f in "$@"; do            # iterate safely
  [[ -f $f ]] && echo "ok $f"
done

retry() { local n=0; until "$@"; do ((++n >= 3)) && return 1; sleep $((2 ** n)); done; }
retry curl -fsS "https://example.com/health"
```

Essentials: **always quote** `"$var"` and `"$@"`; `[[ ... ]]` is safer than `[ ... ]`; `${var:-default}` for defaults; `$(cmd)` over backticks; `>file` truncates, `>>` appends, `2>&1` merges stderr, `>&2` writes diagnostics to stderr; `<<EOF` heredocs; functions return statuses, not values (print and capture instead).

`set -e` has gaps: it is ignored in `if`/`&&` conditions and for non-final pipe stages without `pipefail`. Lint with **shellcheck**. Once a script needs data structures, JSON parsing or tests, switch to Python.

## Worked example
A backup script `pg_dump db | gzip > backup.sql.gz; aws s3 cp backup.sql.gz s3://b/` runs nightly. `pg_dump` fails (bad password) but `gzip` succeeds on empty input, so the pipeline returns 0 and a 20-byte "backup" is uploaded. Simulated with stage statuses `[1, 0]`:

- default: pipeline status 0, script continues, 2 commands run, exit 0 (false success);
- with `set -eo pipefail`: pipeline status 1, script stops after command 1 with exit 1, nothing is uploaded and the scheduler alerts.

Strict mode converts a silent data-loss bug into a loud failure. Add `trap` cleanup so partial files never survive.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Under `set -e` only, what happens in `curl -f $URL | tee out.json` if curl fails with a 404?",
  "options": [
    "The script continues, because the pipeline status is that of `tee` (0)",
    "The script exits at once",
    "tee receives SIGPIPE and the script aborts",
    "Bash retries the command"
  ],
  "answer": 0,
  "explanation": "By default a pipeline returns the status of its last command. Add `set -o pipefail` so any failing stage fails the pipeline and `set -e` can trigger."
}
```

```quiz
{
  "id": "q2",
  "question": "Why write `cp $src $dst` as `cp \"$src\" \"$dst\"`?",
  "options": [
    "Quotes make the copy faster",
    "Unquoted expansions undergo word splitting and globbing, which breaks on spaces or `*`",
    "Quotes are required for variables",
    "It prevents the variable from being unset"
  ],
  "answer": 1,
  "explanation": "Unquoted `$var` is split on whitespace and glob-expanded. `\"$var\"` keeps it as one word; this is the most common Bash bug (use shellcheck to catch it)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate Bash exit-status semantics. `pipeline_status(stages, pipefail)` returns the last stage's status by default, or with `pipefail` the rightmost non-zero status (else 0). `run_script(pipelines, errexit, pipefail)` runs a list of pipelines, stopping at the first failing one when `errexit` is on, and returns `(executed_count, exit_code)` where the exit code is the last executed pipeline's status.",
  "starterCode": "def pipeline_status(stages, pipefail):\n    \"\"\"stages: exit codes of each stage of a pipeline, e.g. [1, 0] for `false | true`.\n    Default: status of the LAST stage. With pipefail: the rightmost non-zero status, else 0.\"\"\"\n    pass\n\ndef run_script(pipelines, errexit, pipefail):\n    \"\"\"Simulate a script. pipelines: list of stage-status lists.\n    With errexit (set -e) stop at the first pipeline whose status is non-zero.\n    Return (number_of_pipelines_executed, script_exit_code)\n    where the exit code is the status of the last executed pipeline.\"\"\"\n    pass\n\nprint(run_script([[0], [1, 0], [0]], False, False))",
  "tests": "assert pipeline_status([1, 0], False) == 0\nassert pipeline_status([1, 0], True) == 1\nassert pipeline_status([2, 3, 0], True) == 3\nassert pipeline_status([0, 0], True) == 0\nassert pipeline_status([0, 4], False) == 4\nassert pipeline_status([5], True) == 5\n# `curl bad | tee out.txt; echo done` : tee succeeds\nscript = [[22, 0], [0], [0]]\nassert run_script(script, False, False) == (3, 0)\nassert run_script(script, True, False) == (3, 0)      # set -e alone misses the failed pipe stage\nassert run_script(script, True, True) == (1, 22)      # set -eo pipefail catches it\nassert run_script([[0], [7], [0]], True, False) == (2, 7)\nassert run_script([[0], [7], [0]], False, False) == (3, 0)\nassert run_script([], True, True) == (0, 0)",
  "solution": "def pipeline_status(stages, pipefail):\n    if pipefail:\n        for s in reversed(stages):\n            if s != 0:\n                return s\n        return 0\n    return stages[-1]\n\ndef run_script(pipelines, errexit, pipefail):\n    executed, code = 0, 0\n    for stages in pipelines:\n        code = pipeline_status(stages, pipefail)\n        executed += 1\n        if errexit and code != 0:\n            break\n    return executed, code",
  "hints": [
    "With pipefail, scan the stages from the right and return the first non-zero value.",
    "Count the failing pipeline as executed before you break out of the loop."
  ]
}
```

> [!TIP] Interview tips
> - Open any script answer with `set -euo pipefail`, quoting, and `trap ... EXIT`; mention shellcheck.
> - Pitfall: `cmd || true` swallows errors on purpose; use it deliberately and only for expected failures such as `grep -q`.
> - Know when to leave Bash: if you need arrays of records, retries with jitter or API calls, use Python and keep Bash as the entry point.
