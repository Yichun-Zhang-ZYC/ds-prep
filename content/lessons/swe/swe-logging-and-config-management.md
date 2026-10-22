---
id: swe-logging-and-config-management
title: "Logging & config management"
estimatedMinutes: 10
difficulty: easy
tags: [logging, config, 12-factor, environment-variables]
---

## Why it matters
When a nightly pipeline fails at 3 a.m., logs are all you have, and when the same code must run on a laptop, in CI and in production, configuration cannot live in the code. Interviewers use these topics to check you can operate what you build.

## Concept
**Logging, not `print`.** The `logging` module adds levels, timestamps, module names, routing and structured output, and it can be turned up or down without editing code.

```python
import logging

logger = logging.getLogger(__name__)          # one logger per module

def setup_logging(level="INFO"):
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

def train(n_rows):
    logger.info("training started rows=%d", n_rows)     # lazy %-formatting
    try:
        ...
    except Exception:
        logger.exception("training failed")            # message + traceback
        raise
```

- Levels: `DEBUG` (diagnostics) < `INFO` (milestones) < `WARNING` (unexpected but handled) < `ERROR` (operation failed) < `CRITICAL`. Production usually runs at `INFO`.
- Libraries create loggers and never configure handlers; only the application entry point calls `basicConfig`.
- Pass arguments (`logger.info("rows=%d", n)`) instead of f-strings so formatting is skipped when the level is disabled.
- Log *events with context* (ids, row counts, durations), prefer JSON lines for log aggregators, and never log secrets or raw PII.

**Configuration.** Separate code from settings that change per environment (paths, URLs, hyperparameters, credentials). Precedence, lowest to highest: code defaults, config file (YAML/TOML), environment variables, CLI flags.

```python
# 12-factor style: code reads settings from the environment
import os
DB_URL = os.environ["DB_URL"]                       # required: KeyError if missing
BATCH = int(os.environ.get("BATCH_SIZE", "256"))    # optional with default (env values are strings!)
```

- Secrets come from environment or a secret manager, never from git.
- Validate at startup and fail fast (missing key, wrong type) instead of failing an hour into a job. Typed settings classes (`pydantic-settings`, dataclasses) do this and document the schema.
- Log the effective config (minus secrets) at start so a run is reproducible from its logs.

## Worked example
Scenario: a training job reads `BATCH_SIZE=512` from the environment, but the code compares `batch > 100` and every value is a string, so the comparison raises `TypeError` only when the branch is reached, 40 minutes in.

With a loader that casts to the default's type and validates at startup, the job fails in the first second with `missing required config: db_url`, or runs with `batch_size == 512` as an `int`. The first log line prints the effective config, so the run can be reproduced.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why write `logger.info(\"rows=%d\", n)` instead of `logger.info(f\"rows={n}\")`?",
  "options": [
    "The f-string version is a syntax error",
    "%-style output is more readable",
    "Formatting is skipped when the level is disabled, and log aggregators can group by the constant message",
    "It adds a timestamp"
  ],
  "answer": 2,
  "explanation": "Lazy formatting avoids the work when INFO is off and keeps a constant message template."
}
```

```quiz
{
  "id": "q2",
  "question": "Where should database passwords and API keys live?",
  "options": [
    "In `config.yaml` committed to git",
    "In environment variables or a secret manager, injected at runtime",
    "As module constants",
    "In log messages for debugging"
  ],
  "answer": 1,
  "explanation": "Secrets stay out of version control and logs; the 12-factor approach reads them from the environment."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `load_config(defaults, env, prefix='APP_')`. For each key in `defaults`, an env var named `prefix + key.upper()` overrides it, cast to the default's type (`bool` accepts 'true', '1', 'yes' case-insensitively; anything else is False). A default of `None` marks the key as required: keep the raw string, or raise `ValueError` if it is missing. Ignore unrelated env vars and do not mutate the inputs.",
  "starterCode": "def load_config(defaults, env, prefix=\"APP_\"):\n    \"\"\"defaults: {key: default_value}. env: dict of environment variables.\n    For each key in defaults, if env has prefix + key.upper(), override it, casting\n    the string to type(default): bool accepts 'true','1','yes' (case-insensitive) as\n    True and anything else as False; int/float/str use the constructor.\n    A default of None means the key is REQUIRED: raise ValueError if no env value\n    (value stays a str). Ignore env vars not in defaults. Do not mutate inputs.\"\"\"\n    pass\n",
  "tests": "defaults = {\"db_url\": None, \"batch_size\": 256, \"lr\": 0.1, \"debug\": False, \"name\": \"churn\"}\nenv = {\"APP_DB_URL\": \"postgres://x\", \"APP_BATCH_SIZE\": \"512\", \"APP_DEBUG\": \"True\", \"OTHER\": \"1\"}\ncfg = load_config(defaults, env)\nassert cfg == {\"db_url\": \"postgres://x\", \"batch_size\": 512, \"lr\": 0.1, \"debug\": True, \"name\": \"churn\"}\nassert isinstance(cfg[\"batch_size\"], int)\nassert defaults[\"batch_size\"] == 256\ncfg2 = load_config(defaults, {\"APP_DB_URL\": \"u\", \"APP_DEBUG\": \"no\", \"APP_LR\": \"0.5\"})\nassert cfg2[\"debug\"] is False and abs(cfg2[\"lr\"] - 0.5) < 1e-12 and cfg2[\"batch_size\"] == 256\ntry:\n    load_config(defaults, {})\n    assert False\nexcept ValueError:\n    pass\n",
  "solution": "def load_config(defaults, env, prefix=\"APP_\"):\n    cfg = {}\n    for key, default in defaults.items():\n        name = prefix + key.upper()\n        if name in env:\n            raw = env[name]\n            if default is None or isinstance(default, str):\n                cfg[key] = raw\n            elif isinstance(default, bool):\n                cfg[key] = raw.strip().lower() in (\"true\", \"1\", \"yes\")\n            else:\n                cfg[key] = type(default)(raw)\n        elif default is None:\n            raise ValueError(f\"missing required config: {key}\")\n        else:\n            cfg[key] = default\n    return cfg\n",
  "hints": [
    "Check `isinstance(default, bool)` before the generic `type(default)(raw)` cast, since `bool('False')` is True.",
    "Build a new dict; for missing env values fall back to the default unless it is None."
  ]
}
```

> [!TIP] Interview tips
> - Mention levels, per-module loggers, `logger.exception` for tracebacks, and "no secrets or PII in logs".
> - Config answer: defaults < file < env < CLI, env for secrets (12-factor), validate and fail fast.
> - Pitfall: environment variables are always strings, so `"False"` is truthy unless you parse it.
