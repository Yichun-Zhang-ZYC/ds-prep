---
id: python-exceptions
title: Exceptions
estimatedMinutes: 10
difficulty: easy
tags: [python, core, exceptions, error-handling]
---

## Why it matters
Data pipelines meet bad rows, missing files and flaky APIs. Interviewers look for code that fails loudly on bugs but handles expected problems gracefully, and that never swallows errors silently.

## Concept
```python
try:
    value = float(raw)
except ValueError as e:          # catch the specific exception you expect
    log.warning("bad value %r: %s", raw, e)
    value = None
else:                            # runs only if no exception
    count += 1
finally:                         # always runs (cleanup)
    processed += 1
```

- Catch **specific** exceptions. A bare `except:` or `except Exception:` with `pass` hides bugs (typos become silent wrong results).
- **Raise** with a clear message: `raise ValueError(f"age must be >= 0, got {age}")`.
- **Re-raise** with `raise` (keeps the traceback) or chain with `raise NewError(...) from e`.
- **Custom exceptions**: subclass `Exception` to let callers catch your error category: `class DataValidationError(Exception): ...`.
- Common built-ins: `ValueError` (right type, bad value), `TypeError`, `KeyError`, `IndexError`, `FileNotFoundError`, `ZeroDivisionError`, `StopIteration`.
- **EAFP vs LBYL**: Python style often "asks forgiveness" (`try: d[k] except KeyError`) instead of "look before you leap" (`if k in d`). Both are fine; EAFP avoids race conditions with files.
- Use `assert` for internal invariants during development, not for validating user input (asserts can be disabled with `-O`).

## Worked example
Parse a column of strings, collecting failures instead of crashing on row 9,812 of 10 million:

```python
good, bad = [], []
for i, raw in enumerate(rows):
    try:
        good.append(float(raw))
    except ValueError:
        bad.append(i)
print(f"{len(bad)} unparseable rows, e.g. {bad[:5]}")
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What's wrong with `try: process(row) except: pass`?",
  "options": ["Nothing, it's robust", "It silently swallows every error, including bugs and KeyboardInterrupt", "It's slower than not catching", "It only catches ValueError"],
  "answer": 1,
  "explanation": "Bare except catches everything (even SystemExit/KeyboardInterrupt) and hides real problems."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Define `class ValidationError(Exception)`. Write `parse_age(raw)` that returns an int; raise `ValidationError` (chained `from` the original `ValueError`) if `raw` isn't an integer string, and `ValidationError` if the age is outside 0–130. Then write `parse_all(raws)` returning `(ages, errors)` where `errors` is a list of `(index, message)` for failures.",
  "starterCode": "class ValidationError(Exception):\n    pass\n\ndef parse_age(raw):\n    pass\n\ndef parse_all(raws):\n    pass\n\nprint(parse_all(['30', 'abc', '200', '7']))",
  "tests": "assert parse_age('42') == 42\ntry:\n    parse_age('x')\n    assert False\nexcept ValidationError as e:\n    assert isinstance(e.__cause__, ValueError)\ntry:\n    parse_age('-1')\n    assert False\nexcept ValidationError:\n    pass\nages, errors = parse_all(['30', 'abc', '200', '7'])\nassert ages == [30, 7]\nassert [i for i, _ in errors] == [1, 2]\nassert all(isinstance(m, str) and m for _, m in errors)",
  "solution": "class ValidationError(Exception):\n    pass\n\ndef parse_age(raw):\n    try:\n        age = int(raw)\n    except ValueError as e:\n        raise ValidationError(f'not an integer: {raw!r}') from e\n    if not 0 <= age <= 130:\n        raise ValidationError(f'age out of range: {age}')\n    return age\n\ndef parse_all(raws):\n    ages, errors = [], []\n    for i, raw in enumerate(raws):\n        try:\n            ages.append(parse_age(raw))\n        except ValidationError as e:\n            errors.append((i, str(e)))\n    return ages, errors",
  "hints": ["`raise ValidationError(...) from e` sets __cause__.", "Catch only ValidationError in parse_all, so real bugs still surface."]
}
```

> [!TIP] Interview tips
> - Catch specific exceptions, log context, and never `except: pass`.
> - Show custom exception classes and `raise ... from e` for clean error chains.
> - In data jobs, collect and report bad rows instead of crashing or silently dropping them.
