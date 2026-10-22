---
id: swe-mocking
title: "Mocking"
estimatedMinutes: 12
difficulty: medium
tags: [testing, mocking, unittest.mock, test-doubles]
---

## Why it matters
Tests that hit the real payment API, S3 or an LLM are slow, flaky, costly and nondeterministic. Mocking replaces those dependencies with controlled stand-ins so you can test your logic and failure handling. Interviewers also probe over-mocking: tests that pass while the code is broken.

## Concept
**Test doubles** (all "mocks" in casual talk):
- **Dummy**: placeholder argument that is never used.
- **Stub**: returns canned answers (`get_metric` returns 0.62).
- **Fake**: a lightweight working implementation (in-memory dict instead of Redis, SQLite instead of Postgres).
- **Spy / Mock**: records calls so you can assert on *interactions* (`send_alert` called once with a message).

```python
from unittest.mock import Mock, patch

# churn/alerts.py
def notify_if_low(client, metric_name, threshold):
    value = client.get_metric(metric_name)          # HTTP call in production
    if value < threshold:
        client.send_alert(f"{metric_name} low: {value}")
        return True
    return False

def test_alert_sent_when_below_threshold():
    client = Mock()
    client.get_metric.return_value = 0.62            # stub: canned answer
    assert notify_if_low(client, "auc", 0.7) is True
    client.send_alert.assert_called_once_with("auc low: 0.62")   # verify interaction

def test_retry_on_timeout():
    client = Mock()
    client.get_metric.side_effect = [TimeoutError, 0.9]          # raise, then succeed

# patch where the name is LOOKED UP, not where it is defined
@patch("churn.alerts.requests.get")
def test_with_patch(mock_get):
    mock_get.return_value.json.return_value = {"auc": 0.8}
```

**Rules of thumb.**
- Mock at the **boundary you do not own or that is slow/non-deterministic**: network, clock, randomness, cloud SDKs, LLM calls, file system. Do not mock your own pure functions; just call them.
- Prefer **dependency injection** (pass `client` as an argument) over patching: the code is easier to test without monkeypatching imports.
- `patch` the name **where it is used** (`churn.alerts.requests.get`), not where it is defined.
- `Mock(spec=RealClient)` or `create_autospec` makes the mock reject attributes and signatures the real class lacks, so tests break when the API changes.
- Use `side_effect` to simulate errors (timeouts, 500s) and sequences (fail twice then succeed), the cases hard to produce for real.
- Prefer asserting on **outcomes** (return value, state) over **interactions** (call counts); over-specified tests break on every refactor.

**Over-mocking risk**: if every collaborator is mocked, the test only checks that your code calls the mocks as you wrote it. Balance with a few integration tests and contract checks against the real service.

## Worked example
Scenario: `notify_if_low` should alert when AUC drops below 0.7.

1. Stub `get_metric` to return `0.62` and assert `send_alert` was called once with `"auc low: 0.62"`.
2. Stub it to return `0.81` and assert `send_alert.assert_not_called()`.
3. Add a retry wrapper and use `side_effect=[TimeoutError, 0.9]` to prove it recovers after one timeout, with no network and no sleeping (inject a fake `sleep` too).

All three run in milliseconds and are deterministic, but none proves the real metrics API returns a float, which is why one integration test remains.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "`churn/alerts.py` does `import requests`, and the code calls `requests.get(...)`. What should you patch?",
  "options": [
    "`requests.get` only inside the requests package source",
    "`churn.alerts.requests.get` (where the name is looked up)",
    "`churn.alerts`",
    "Nothing; mocks cannot patch imports"
  ],
  "answer": 1,
  "explanation": "Patch the name in the namespace of the code under test; patching the definition site may not affect already-imported references."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the clearest sign of over-mocking?",
  "options": [
    "Tests run quickly",
    "A mock simulates a network timeout",
    "Every collaborator is mocked, so tests pass even when the real integration is broken",
    "`autospec` is used"
  ],
  "answer": 2,
  "explanation": "Tests then verify only your assumptions about the collaborators, not their real behavior."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a minimal `Mock` test double. Calling it records `(args, kwargs)` in `calls` and increments `call_count`. If `side_effect` is a list, each call consumes the next item: raise it if it is an exception class or instance, otherwise return it; with no side_effect return `return_value`. `assert_called_once_with(*args, **kwargs)` raises `AssertionError` unless there was exactly one call with exactly those arguments.",
  "starterCode": "class Mock:\n    \"\"\"Minimal test double.\n    - return_value: what calling the mock returns (default None)\n    - side_effect: if a list/tuple, each call consumes the next item; if the item\n      is an exception class or instance, raise it, otherwise return it.\n      (side_effect takes priority over return_value)\n    - call_count and calls (list of (args, kwargs)) record every call\n    - assert_called_once_with(*args, **kwargs): raise AssertionError unless called\n      exactly once with exactly those arguments.\"\"\"\n\n    def __init__(self, return_value=None, side_effect=None):\n        pass\n\n    def __call__(self, *args, **kwargs):\n        pass\n\n    def assert_called_once_with(self, *args, **kwargs):\n        pass\n",
  "tests": "m = Mock(return_value=42)\nassert m(1, x=2) == 42 and m.call_count == 1 and m.calls == [((1,), {\"x\": 2})]\nm.assert_called_once_with(1, x=2)\nm(3)\ntry:\n    m.assert_called_once_with(1, x=2)\n    assert False\nexcept AssertionError:\n    pass\n\nflaky = Mock(side_effect=[TimeoutError, 7, ValueError(\"bad\")])\ntry:\n    flaky()\n    assert False\nexcept TimeoutError:\n    pass\nassert flaky() == 7\ntry:\n    flaky()\n    assert False\nexcept ValueError as e:\n    assert str(e) == \"bad\"\nassert flaky.call_count == 3\n\ndef fetch_with_retry(fetch, retries):\n    for i in range(retries):\n        try:\n            return fetch()\n        except TimeoutError:\n            if i == retries - 1:\n                raise\nfake = Mock(side_effect=[TimeoutError, TimeoutError, \"data\"])\nassert fetch_with_retry(fake, 3) == \"data\" and fake.call_count == 3\n",
  "solution": "class Mock:\n    def __init__(self, return_value=None, side_effect=None):\n        self.return_value = return_value\n        self.side_effect = list(side_effect) if side_effect is not None else None\n        self.call_count = 0\n        self.calls = []\n\n    def __call__(self, *args, **kwargs):\n        self.call_count += 1\n        self.calls.append((args, kwargs))\n        if self.side_effect is not None:\n            item = self.side_effect.pop(0)\n            if isinstance(item, BaseException) or (isinstance(item, type) and issubclass(item, BaseException)):\n                raise item\n            return item\n        return self.return_value\n\n    def assert_called_once_with(self, *args, **kwargs):\n        if self.call_count != 1:\n            raise AssertionError(f\"expected 1 call, got {self.call_count}\")\n        if self.calls[0] != (args, kwargs):\n            raise AssertionError(f\"called with {self.calls[0]}\")\n",
  "hints": [
    "Copy the side_effect list so popping does not mutate the caller's list.",
    "Check `isinstance(item, BaseException)` or `isinstance(item, type) and issubclass(item, BaseException)`."
  ]
}
```

> [!TIP] Interview tips
> - Name the double types (stub, fake, spy/mock) and say what you mock: slow, external, nondeterministic boundaries.
> - Know "patch where it is looked up" and `autospec` to stop mocks from drifting from reality.
> - Pitfall: asserting on implementation details; the test fails on harmless refactors while real bugs slip through.
