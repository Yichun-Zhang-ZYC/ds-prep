---
id: python-decorators-and-context-managers
title: Decorators & context managers
estimatedMinutes: 12
difficulty: medium
tags: [python, core, decorators, context-managers]
---

## Why it matters
Decorators (`@lru_cache`, `@app.route`, `@pytest.fixture`, timing and retry wrappers) and context managers (`with open(...)`, DB transactions, `torch.no_grad()`) are everywhere in production code. "Write a decorator that times a function" is a common interview task.

## Concept
**Decorator**: a function that takes a function and returns a new one. `@deco` above `def f` means `f = deco(f)`.

```python
import functools, time

def timed(func):
    @functools.wraps(func)            # keep __name__, __doc__
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"{func.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper
```

- Use `*args, **kwargs` so the wrapper accepts any signature.
- **Decorators with arguments** need one more level: `def retry(times): def deco(func): ... return deco`.
- Built-ins: `@functools.lru_cache` / `@cache` (memoization), `@property`, `@staticmethod`, `@classmethod`, `@dataclass`.

**Context manager**: guarantees setup and cleanup around a block, even if an exception is raised. Protocol: `__enter__` / `__exit__(exc_type, exc, tb)`; returning True from `__exit__` suppresses the exception. Easiest with a generator:

```python
from contextlib import contextmanager

@contextmanager
def opened(path):
    f = open(path)
    try:
        yield f           # value bound by "as"
    finally:
        f.close()         # always runs
```

## Worked example
```python
@functools.lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(80)      # instant: each n computed once instead of exponentially many times
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why use functools.wraps inside a decorator?",
  "options": ["It makes the function faster", "It copies the wrapped function's name, docstring and metadata to the wrapper", "It's required for the decorator to run", "It adds caching"],
  "answer": 1,
  "explanation": "Without it, the decorated function reports the wrapper's name, which hurts debugging and introspection."
}
```

```quiz
{
  "id": "q2",
  "question": "An exception is raised inside a `with` block. What happens to the cleanup code in __exit__?",
  "options": ["It's skipped", "It still runs; the exception propagates unless __exit__ returns True", "The program crashes immediately", "It runs only if the exception is caught inside the block"],
  "answer": 1,
  "explanation": "Guaranteed cleanup is the whole point of context managers."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write a decorator factory `retry(times)` that calls the function up to `times` attempts total, re-raising the last exception if all fail. Use `functools.wraps`. Then write a context manager `collect()` with `@contextmanager` that yields a list and, on exit, appends `'done'` to it even if the block raised.",
  "starterCode": "import functools\nfrom contextlib import contextmanager\n\ndef retry(times):\n    pass\n\n@contextmanager\ndef collect():\n    pass\n",
  "tests": "calls = []\n@retry(3)\ndef flaky():\n    calls.append(1)\n    if len(calls) < 3:\n        raise ValueError('boom')\n    return 'ok'\nassert flaky() == 'ok' and len(calls) == 3 and flaky.__name__ == 'flaky'\n@retry(2)\ndef always():\n    raise KeyError('x')\ntry:\n    always()\n    assert False\nexcept KeyError:\n    pass\nwith collect() as log:\n    log.append('work')\nassert log == ['work', 'done']\ntry:\n    with collect() as log2:\n        raise RuntimeError\nexcept RuntimeError:\n    pass\nassert log2 == ['done']",
  "solution": "import functools\nfrom contextlib import contextmanager\n\ndef retry(times):\n    def deco(func):\n        @functools.wraps(func)\n        def wrapper(*args, **kwargs):\n            for attempt in range(times):\n                try:\n                    return func(*args, **kwargs)\n                except Exception:\n                    if attempt == times - 1:\n                        raise\n        return wrapper\n    return deco\n\n@contextmanager\ndef collect():\n    log = []\n    try:\n        yield log\n    finally:\n        log.append('done')",
  "hints": ["retry(times) returns a decorator, which returns a wrapper: three nested functions.", "Put cleanup in a finally block around the yield."]
}
```

> [!TIP] Interview tips
> - Write a decorator with `*args, **kwargs` and `functools.wraps` without hesitation.
> - Explain `@deco` as `f = deco(f)` and decorator factories as one extra nesting level.
> - Use `with` for any resource (files, locks, connections) and mention `@contextmanager`.
