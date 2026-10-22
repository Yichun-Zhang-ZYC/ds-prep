---
id: python-practice-string-parsing-and-regex
title: "Practice: String parsing and regex"
estimatedMinutes: 15
difficulty: medium
tags: [python, coding-interview, regex, strings, practice]
---

## Why it matters

String parsing shows up in almost every live-coding screen: log lines, phone numbers, key=value configs, messy CSV fields. Interviewers want a correct, readable pattern, sensible handling of malformed input, and a sentence on when regex is the wrong tool.

## Concept

**Playbook**

1. Look at 5-10 real samples first; list the variants (missing fields, extra spaces, quotes, empty strings).
2. Try plain string tools before regex: `split(sep, 1)`, `partition`, `strip`, `startswith`, `str.translate`. They are faster and obvious.
3. Use regex when the structure is positional or optional. Compile once with `re.compile`, use **named groups** (`(?P<ts>...)`) and `m.groupdict()`.
4. Anchor with `^...$` or use `re.fullmatch`; otherwise `re.match` accepts trailing garbage.
5. Return `None` (or raise) on non-matching input and say which you chose. Never let an `AttributeError` from `m.group` on `None` escape.

**Pitfalls**: greedy `.*` swallows too much (use `.*?` or a negated class like `[^"]*`); `re.match` only anchors at the start, `re.search` scans; `\d` also matches non-ASCII digits unless you pass `re.ASCII` (or use `[0-9]`); a nested quantifier like `(a+)+` can cause catastrophic backtracking on adversarial input; don't parse HTML, JSON or CSV with regex when `json`, `csv` or a parser exists.

**Handy API**: `re.findall` (list of strings or tuples when there are groups), `re.finditer` (match objects with `.start()`), `re.sub(pattern, repl_or_func, s)`, `re.split`, flags `re.I`, `re.X` (verbose, with comments).

## Worked example

Parse `2024-03-05 12:01:33 ERROR [auth] login failed latency=230ms` into fields, where the latency suffix is optional.

```python
import re
LOG = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<level>[A-Z]+) "
    r"\[(?P<svc>[\w-]+)\] (?P<msg>.*?)(?: latency=(?P<lat>\d+)ms)?$"
)
m = LOG.match("2024-03-05 12:01:33 ERROR [auth] login failed latency=230ms")
print(m.group("level"), m.group("svc"), repr(m.group("msg")), m.group("lat"))
# ERROR auth 'login failed' 230
```

The lazy `.*?` lets the optional suffix claim `latency=230ms`; a greedy `.*` would put it all in `msg` and leave `lat` as `None`. On a line without the suffix, `lat` is `None`, and the message keeps the full text. Interviewers often ask next: what if the log has 10 million lines? Answer: compile once, stream line by line, and count the lines that fail to match instead of crashing.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `re.match(r\"\\d+\", \"abc123\")` return?",
  "options": [
    "A match object for \"123\"",
    "None",
    "A match object for \"abc\"",
    "A list [\"123\"]"
  ],
  "answer": 1,
  "explanation": "`re.match` only tries at the start of the string, where \"a\" is not a digit, so it returns None. `re.search` would find \"123\"."
}
```

```quiz
{
  "id": "q2",
  "question": "You must pull the text between double quotes from `say \"hi\" and \"bye\"` and get `hi` and `bye` separately. Which pattern works?",
  "options": [
    "`\"(.*)\"` with findall",
    "`\"(.*?)\"` with findall",
    "`\"[a-z]\"` with findall",
    "`\".+\"` with findall"
  ],
  "answer": 1,
  "explanation": "Greedy `.*` returns `hi\" and \"bye` as a single match. The lazy `.*?` (or `[^\"]*`) stops at the next quote and findall returns both."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `parse_log(line)` for lines like `2024-03-05 12:01:33 ERROR [auth] login failed latency=230ms`. Return a dict with keys `ts`, `level`, `service`, `message`, `latency_ms` (int, or `None` if the suffix is absent). Return `None` if the line does not match the format. Surrounding whitespace is allowed.",
  "starterCode": "import re\n\ndef parse_log(line):\n    pass",
  "tests": "r = parse_log(\"2024-03-05 12:01:33 ERROR [auth] login failed latency=230ms\")\nassert r == {\"ts\": \"2024-03-05 12:01:33\", \"level\": \"ERROR\", \"service\": \"auth\", \"message\": \"login failed\", \"latency_ms\": 230}\nr = parse_log(\"  2024-03-05 12:02:00 INFO [api-gw] started  \")\nassert r[\"service\"] == \"api-gw\" and r[\"message\"] == \"started\" and r[\"latency_ms\"] is None\nassert parse_log(\"garbage line\") is None\nassert parse_log(\"2024-03-05 12:02:00 info [x] lower-case level\") is None",
  "solution": "import re\n\nLOG = re.compile(\n    r\"^(?P<ts>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}) (?P<level>[A-Z]+) \"\n    r\"\\[(?P<service>[\\w-]+)\\] (?P<message>.*?)(?: latency=(?P<lat>\\d+)ms)?$\"\n)\n\ndef parse_log(line):\n    m = LOG.match(line.strip())\n    if not m:\n        return None\n    d = m.groupdict()\n    lat = d.pop(\"lat\")\n    d[\"latency_ms\"] = int(lat) if lat is not None else None\n    return d",
  "hints": [
    "Use named groups and `groupdict()`; convert the latency with `int` only when it is not None.",
    "Make the message lazy (`.*?`) so the optional latency suffix can match before `$`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `normalize_phone(s)` for US numbers. Strip all non-digits; allow one leading country code `1` (11 digits). The remaining 10 digits must have an area code and exchange that do not start with 0 or 1. Return `+1-AAA-EEE-NNNN`, or `None` if invalid.",
  "starterCode": "import re\n\ndef normalize_phone(s):\n    pass",
  "tests": "assert normalize_phone(\"(415) 555-0132\") == \"+1-415-555-0132\"\nassert normalize_phone(\"1.415.555.0132\") == \"+1-415-555-0132\"\nassert normalize_phone(\"+1 415 555 0132\") == \"+1-415-555-0132\"\nassert normalize_phone(\"415-555-013\") is None\nassert normalize_phone(\"015-555-0132\") is None\nassert normalize_phone(\"415-155-0132\") is None\nassert normalize_phone(\"2-415-555-0132\") is None",
  "solution": "import re\n\ndef normalize_phone(s):\n    digits = re.sub(r\"\\D\", \"\", s)\n    if len(digits) == 11 and digits[0] == \"1\":\n        digits = digits[1:]\n    if not re.fullmatch(r\"[2-9]\\d{2}[2-9]\\d{6}\", digits):\n        return None\n    return f\"+1-{digits[:3]}-{digits[3:6]}-{digits[6:]}\"",
  "hints": [
    "`re.sub(r\"\\D\", \"\", s)` keeps only digits.",
    "Validate the cleaned digits with one `re.fullmatch(r\"[2-9]\\d{2}[2-9]\\d{6}\", ...)` after dropping a leading 1 from 11-digit input."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `parse_kv(s)` for strings like `a=1; b=two;c=\"x;y\";d=`. Pairs are separated by `;`, keys are word characters, values are either unquoted (strip surrounding spaces) or double-quoted (may contain `;`, quotes removed). Return a dict of strings; an empty value gives `\"\"`.",
  "starterCode": "import re\n\ndef parse_kv(s):\n    pass",
  "tests": "assert parse_kv('a=1; b=two;c=\"x;y\";d=') == {\"a\": \"1\", \"b\": \"two\", \"c\": \"x;y\", \"d\": \"\"}\nassert parse_kv('name=\"Ann Lee\"; age=31') == {\"name\": \"Ann Lee\", \"age\": \"31\"}\nassert parse_kv(\"\") == {}\nassert parse_kv(\"k=v\") == {\"k\": \"v\"}",
  "solution": "import re\n\nPAIR = re.compile(r'(\\w+)=(?:\"([^\"]*)\"|([^;]*))')\n\ndef parse_kv(s):\n    out = {}\n    for m in PAIR.finditer(s):\n        quoted, bare = m.group(2), m.group(3)\n        out[m.group(1)] = quoted if quoted is not None else bare.strip()\n    return out",
  "hints": [
    "Use `re.finditer` with an alternation: a quoted branch `\"([^\"]*)\"` first, then a bare branch `([^;]*)`.",
    "Exactly one of the two value groups is not None for each match."
  ]
}
```

> [!TIP] Interview tips
> - Say your plan first: samples, edge cases, then pattern. Compile once and use named groups.
> - Anchor patterns (`fullmatch` or `^...$`) and decide what to do on non-matching input.
> - Know the lazy vs greedy trap, and mention that `split`/`partition` beat regex when the format is simple.
