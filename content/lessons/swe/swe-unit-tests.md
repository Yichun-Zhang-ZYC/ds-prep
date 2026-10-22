---
id: swe-unit-tests
title: "Unit tests (pytest)"
estimatedMinutes: 12
difficulty: medium
tags: [testing, pytest, unit-tests, fixtures]
---

## Why it matters
Untested data code breaks silently: a refactor changes a join key and the model quietly trains on garbage. "How do you test your feature engineering?" is a standard question for DS and ML-engineer roles, and writing a clean pytest test on a whiteboard is a common screen.

## Concept
**Unit test**: a fast, isolated check of one small piece of logic (a function or class) with known inputs and an expected output. No network, disk or database; it runs in milliseconds, so you run thousands on every commit.

**pytest** discovers files named `test_*.py` and functions named `test_*`, and uses plain `assert` with rich failure output.

```python
# tests/test_features.py
import pytest
from churn.features import normalize

def test_normalize_sums_to_one():
    assert sum(normalize([1, 1, 2])) == pytest.approx(1.0)   # floats: never ==

@pytest.mark.parametrize("bad", [[], [0, 0]])
def test_normalize_rejects_degenerate_input(bad):
    with pytest.raises(ValueError, match="empty or zero"):
        normalize(bad)

@pytest.fixture
def sample_df():
    import pandas as pd
    return pd.DataFrame({"user": [1, 2], "spend": [10.0, 30.0]})

def test_spend_share(sample_df):
    assert spend_share(sample_df).tolist() == [0.25, 0.75]
```

- **Arrange / Act / Assert**: build input, call the unit, assert on the result. One behavior per test, named after it (`test_normalize_rejects_zero_sum`).
- **Parametrize** to cover many cases without copy-paste; **fixtures** to share setup (a small DataFrame, a temp dir via `tmp_path`).
- Floats: `pytest.approx`; DataFrames: `pandas.testing.assert_frame_equal`; arrays: `numpy.testing.assert_allclose`.
- Test **edge cases**: empty input, NaN, single row, duplicates, wrong dtype, boundary values.
- **ML-specific**: test deterministic pieces (feature transforms, metrics, splits with a fixed seed), shapes and dtypes, invariants (probabilities sum to 1, no leakage across the split), and a tiny overfit-one-batch smoke test. You cannot unit-test "the model is good", only that the plumbing is right.
- Coverage (`pytest --cov`) shows what is untested; it does not prove tests are meaningful.

## Worked example
Scenario: `spend_share` divides each user's spend by the total. Tests worth writing:

- Happy path: spends `[10, 30]` give `[0.25, 0.75]`.
- Edge: a single user gives `[1.0]`.
- Edge: total spend 0 must raise a clear `ValueError`, not return NaN silently.
- Property: shares always sum to 1 (`approx`).

Write the zero-total test first (it fails), then add the guard clause. This is test-driven development in miniature, and the test now protects against the next refactor.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which assertion is correct for comparing computed floats?",
  "options": [
    "`assert 0.1 + 0.2 == 0.3`",
    "`assert str(x) == '0.3'`",
    "`assert x == pytest.approx(0.3)`",
    "`assert x is 0.3`"
  ],
  "answer": 2,
  "explanation": "Binary floating point is inexact; `approx` compares within a tolerance."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main purpose of `@pytest.mark.parametrize`?",
  "options": [
    "Run tests in parallel",
    "Run one test body over many input/expected cases, reported as separate tests",
    "Skip slow tests",
    "Mock external services"
  ],
  "answer": 1,
  "explanation": "It removes copy-paste and shows exactly which case failed."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build two pieces of a mini test framework. (1) `raises(exc_type)`: a context manager like `pytest.raises` that passes if the block raises `exc_type` (or a subclass), raises `AssertionError('DID NOT RAISE')` if nothing is raised, and lets other exceptions propagate. (2) `run_tests(tests)`: run each zero-arg callable and return `{name: 'pass' | 'fail' | 'error'}`, where `fail` means `AssertionError` and `error` means any other exception.",
  "starterCode": "from contextlib import contextmanager\n\n@contextmanager\ndef raises(exc_type):\n    \"\"\"Like pytest.raises: the block must raise exc_type (or a subclass).\n    If nothing is raised, raise AssertionError('DID NOT RAISE'). Other exception\n    types propagate unchanged.\"\"\"\n    pass\n\ndef run_tests(tests):\n    \"\"\"tests: {name: zero-arg callable}. Run each; return {name: status} where\n    status is 'pass', 'fail' (AssertionError) or 'error' (any other exception).\"\"\"\n    pass\n",
  "tests": "def t_ok():\n    assert 1 + 1 == 2\ndef t_fail():\n    assert 1 + 1 == 3\ndef t_err():\n    {}[\"missing\"]\ndef t_raises_ok():\n    with raises(KeyError):\n        {}[\"x\"]\ndef t_raises_subclass():\n    with raises(LookupError):\n        [][1]\ndef t_raises_none():\n    with raises(ValueError):\n        pass\ndef t_raises_wrong():\n    with raises(ValueError):\n        {}[\"x\"]\n\nres = run_tests({\"ok\": t_ok, \"fail\": t_fail, \"err\": t_err, \"r1\": t_raises_ok,\n                 \"r2\": t_raises_subclass, \"r3\": t_raises_none, \"r4\": t_raises_wrong})\nassert res == {\"ok\": \"pass\", \"fail\": \"fail\", \"err\": \"error\", \"r1\": \"pass\",\n               \"r2\": \"pass\", \"r3\": \"fail\", \"r4\": \"error\"}\nassert run_tests({}) == {}\n",
  "solution": "from contextlib import contextmanager\n\n@contextmanager\ndef raises(exc_type):\n    try:\n        yield\n    except exc_type:\n        return\n    raise AssertionError(\"DID NOT RAISE\")\n\ndef run_tests(tests):\n    results = {}\n    for name, fn in tests.items():\n        try:\n            fn()\n            results[name] = \"pass\"\n        except AssertionError:\n            results[name] = \"fail\"\n        except Exception:\n            results[name] = \"error\"\n    return results\n",
  "hints": [
    "In a `@contextmanager` generator, catch `exc_type` around the `yield` and return; raise AssertionError after the try block if the body finished normally.",
    "Catch `AssertionError` before the broader `Exception`."
  ]
}
```

> [!TIP] Interview tips
> - Describe the pyramid: many fast unit tests, fewer integration tests, very few end-to-end tests.
> - For "how do you test ML code": test transforms, metrics, shapes, invariants and seeds, not model accuracy.
> - Pitfall: tests that depend on order, the clock, randomness without a seed, or shared mutable state; they are flaky and get ignored.
