---
id: cloud-devops-common-commands
title: "Common commands (grep, awk, sed, find)"
estimatedMinutes: 12
difficulty: easy
tags: [linux, grep, awk, sed, find]
---

## Why it matters
Log triage on a box with no Kibana is a daily DevOps and data-engineering skill. Interviewers hand you a log file and ask for "top 5 error URLs" using only pipes.

## Concept
The Unix philosophy: small tools that read stdin, write stdout, and compose with `|`.

- **`grep`** filters lines by regex: `-E` extended regex, `-i` ignore case, `-v` invert, `-r` recurse, `-n` line numbers, `-c` count, `-o` print only the match, `-A/-B/-C N` context lines.
- **`awk`** is a per-line program on split fields (`$1`, `$NF`, `NR`): `awk 'pattern {action}'`. With associative arrays it does group-by sums. `-F,` sets the separator.
- **`sed`** is a stream editor; the workhorse is substitution `s/regex/repl/flags` (`g` = all matches); `-i` edits in place, `-n '5,10p'` prints a range.
- **`find`** walks directories by metadata: `-name`, `-type f`, `-mtime +7`, `-size +100M`, then `-exec cmd {} +` or `-print0 | xargs -0`.
- **Glue**: `sort | uniq -c | sort -rn | head` (frequency table), `cut -d, -f1,3`, `wc -l`, `tr`, `tee`, `xargs`.

```bash
# top 5 URLs returning 5xx (nginx log: $7 = path, $9 = status)
awk '$9 ~ /^5/ {print $7}' access.log | sort | uniq -c | sort -rn | head -5

grep -rn --include='*.py' 'TODO' src/        # find TODOs
sed -i 's/DEBUG=true/DEBUG=false/' .env      # in-place edit
find /var/log -name '*.gz' -mtime +30 -delete
```

Remember: `sort` before `uniq` (it only collapses adjacent duplicates); quote patterns so the shell does not expand `*`; prefer `rg` (ripgrep) on big trees.

## Worked example
Given `access.log` lines `10.0.0.1 - - [..] "GET /api/users HTTP/1.1" 500 123`, find the busiest client IPs among failing requests.

```bash
awk '$9 >= 500 {print $1}' access.log | sort | uniq -c | sort -rn | head -3
```

If the log has 1,000 lines, 60 with status 500 or above, and the IP `10.0.0.7` appears in 25 of those, the output starts with `25 10.0.0.7`. Each stage is cheap: `awk` filters (streaming, constant memory), `sort` groups, `uniq -c` counts, the final `sort -rn` ranks by count.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which command finds `.log` files older than 7 days under `/var/app` and deletes them safely with filenames containing spaces?",
  "options": [
    "`ls /var/app | grep log | rm`",
    "`find /var/app -name '*.log' -mtime +7 -print0 | xargs -0 rm`",
    "`grep -r '*.log' /var/app | rm`",
    "`rm /var/app/*.log -mtime +7`"
  ],
  "answer": 1,
  "explanation": "`find` filters by name/age, and `-print0 | xargs -0` uses NUL separators so spaces and newlines in names are safe. `rm` has no `-mtime`, and `grep` searches contents, not names."
}
```

```quiz
{
  "id": "q2",
  "question": "What does `awk -F, '{c[$3]++} END{for (k in c) print k, c[k]}' data.csv` compute?",
  "options": [
    "The sum of column 3",
    "The number of columns per row",
    "A count of rows per distinct value of column 3",
    "The first row of each group"
  ],
  "answer": 2,
  "explanation": "`-F,` splits on commas; `c[$3]++` is an associative-array counter keyed by field 3; the END block prints it. This is `GROUP BY col3, COUNT(*)` in the shell."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Re-implement three classics in Python: `grep(lines, pattern, invert, ignore_case)` (regex search, `-v`, `-i`), `awk_sum(lines, key_col, val_col)` (whitespace-split, 1-based columns, skip short lines, return `{key: float_sum}`), and `sed_sub(line, pattern, repl, global_)` (replace first match, or all with `g`).",
  "starterCode": "import re\n\ndef grep(lines, pattern, invert=False, ignore_case=False):\n    \"\"\"Like grep -E [-v] [-i]: return matching lines in order.\"\"\"\n    pass\n\ndef awk_sum(lines, key_col, val_col):\n    \"\"\"Like awk '{s[$K]+=$V} END{...}' (1-based cols, whitespace split).\n    Skip lines with too few fields. Return {key: sum}.\"\"\"\n    pass\n\ndef sed_sub(line, pattern, repl, global_=False):\n    \"\"\"Like sed 's/pattern/repl/' (or .../g if global_).\"\"\"\n    pass\n\nlog = [\"GET /a 200 120\", \"GET /b 500 30\", \"POST /a 200 80\", \"bad\"]\nprint(grep(log, \"500\"), awk_sum(log, 2, 4))",
  "tests": "log = [\"GET /a 200 120\", \"GET /b 500 30\", \"POST /a 200 80\", \"bad\", \"get /c 404 5\"]\nassert grep(log, \"500\") == [\"GET /b 500 30\"]\nassert grep(log, \"^GET\") == [\"GET /a 200 120\", \"GET /b 500 30\"]\nassert grep(log, \"^GET\", ignore_case=True)[-1] == \"get /c 404 5\"\nassert grep(log, \" 200 \", invert=True) == [\"GET /b 500 30\", \"bad\", \"get /c 404 5\"]\nassert grep(log, \"/(a|b) \") == [\"GET /a 200 120\", \"GET /b 500 30\", \"POST /a 200 80\"]\ns = awk_sum(log, 2, 4)\nassert s == {\"/a\": 200.0, \"/b\": 30.0, \"/c\": 5.0}\nassert awk_sum([\"x 1\", \"y 2\", \"x 3\"], 1, 2) == {\"x\": 4.0, \"y\": 2.0}\nassert awk_sum([], 1, 2) == {}\nassert sed_sub(\"a-b-c\", \"-\", \"_\") == \"a_b-c\"\nassert sed_sub(\"a-b-c\", \"-\", \"_\", True) == \"a_b_c\"\nassert sed_sub(\"foo123\", r\"[0-9]+\", \"#\") == \"foo#\"",
  "solution": "import re\n\ndef grep(lines, pattern, invert=False, ignore_case=False):\n    flags = re.I if ignore_case else 0\n    rx = re.compile(pattern, flags)\n    return [l for l in lines if bool(rx.search(l)) != invert]\n\ndef awk_sum(lines, key_col, val_col):\n    out = {}\n    for l in lines:\n        f = l.split()\n        if len(f) < max(key_col, val_col):\n            continue\n        out[f[key_col - 1]] = out.get(f[key_col - 1], 0) + float(f[val_col - 1])\n    return out\n\ndef sed_sub(line, pattern, repl, global_=False):\n    return re.sub(pattern, repl, line, count=0 if global_ else 1)",
  "hints": [
    "`re.search` per line; for `-v` keep lines where the match result differs from `invert`.",
    "`re.sub(..., count=1)` replaces the first match; `count=0` means all."
  ]
}
```

> [!TIP] Interview tips
> - Be ready to narrate a pipeline stage by stage; interviewers care that you know why `sort` precedes `uniq`.
> - Pitfall: `grep pattern file | wc -l` counts matching lines, not occurrences; use `grep -o ... | wc -l` for occurrences.
> - Pitfall: `sed -i` differs between GNU and BSD/macOS (`-i ''`); and `xargs` without `-0` breaks on spaces in filenames.
