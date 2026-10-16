---
id: python-type-hints
title: Type hints
estimatedMinutes: 8
difficulty: easy
tags: [python, core, typing, code-quality]
---

## Why it matters
Typed Python is the norm in production ML and data codebases (FastAPI, Pydantic, dataclasses). Type hints document intent, power IDE autocomplete, and let tools like mypy/pyright catch bugs before runtime. Interviewers like seeing them in take-home code.

## Concept
```python
from typing import Optional, Iterable, Callable, TypeVar

def mean(values: list[float]) -> float: ...
def find_user(uid: int) -> dict[str, str] | None: ...       # 3.10+ union syntax
def apply(f: Callable[[float], float], xs: Iterable[float]) -> list[float]: ...

T = TypeVar("T")
def first(items: list[T]) -> T: ...                          # generic
```

- Hints are **not enforced at runtime**; they're checked by static tools (mypy, pyright) and used by libraries like Pydantic/FastAPI for validation.
- Use built-in generics (`list[int]`, `dict[str, float]`, `tuple[int, ...]`) in Python 3.9+.
- `X | None` (or `Optional[X]`) for values that may be missing.
- Prefer abstract input types (`Iterable`, `Sequence`, `Mapping`) and concrete return types.
- `TypedDict`, `Protocol` (structural "duck" typing), `Literal["train", "test"]`, `Final`.
- `@dataclass` uses annotations to generate fields:

```python
from dataclasses import dataclass, field

@dataclass
class TrainConfig:
    lr: float = 1e-3
    epochs: int = 10
    tags: list[str] = field(default_factory=list)   # safe mutable default
```

## Worked example
```python
def split(rows: list[dict], frac: float) -> tuple[list[dict], list[dict]]:
    cut = int(len(rows) * frac)
    return rows[:cut], rows[cut:]
```
A checker flags `split(rows, "0.8")` before you run a 3-hour job.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You call `def f(x: int) -> int` with `f(\"3\")`. What happens at runtime by default?",
  "options": ["TypeError from the annotation", "The call runs; annotations aren't enforced at runtime", "Python converts \"3\" to 3", "SyntaxError"],
  "answer": 1,
  "explanation": "Annotations are metadata. Static checkers catch this; plain Python doesn't."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Create a dataclass `Example` with fields `text: str`, `label: int`, and `tags: list[str]` defaulting to an empty list (use `field(default_factory=list)`). Write a typed function `filter_by_label(examples: list[Example], label: int) -> list[Example]`, and `label_counts(examples: list[Example]) -> dict[int, int]`.",
  "starterCode": "from dataclasses import dataclass, field\n\n# define Example here\n\ndef filter_by_label(examples, label):\n    pass\n\ndef label_counts(examples):\n    pass\n",
  "tests": "a, b, c = Example('hi', 1), Example('yo', 0), Example('hey', 1, ['greeting'])\nassert a.tags == [] and a.tags is not b.tags\nassert filter_by_label([a, b, c], 1) == [a, c]\nassert label_counts([a, b, c]) == {1: 2, 0: 1}\nassert filter_by_label.__annotations__['return'] is not None",
  "solution": "from dataclasses import dataclass, field\n\n@dataclass\nclass Example:\n    text: str\n    label: int\n    tags: list[str] = field(default_factory=list)\n\ndef filter_by_label(examples: list[Example], label: int) -> list[Example]:\n    return [e for e in examples if e.label == label]\n\ndef label_counts(examples: list[Example]) -> dict[int, int]:\n    counts: dict[int, int] = {}\n    for e in examples:\n        counts[e.label] = counts.get(e.label, 0) + 1\n    return counts",
  "hints": ["Mutable dataclass defaults need field(default_factory=list).", "Dataclasses generate __eq__, so list comparison works."]
}
```

> [!TIP] Interview tips
> - Add hints to function signatures in coding rounds; it reads as production-quality code.
> - Say clearly that hints aren't enforced at runtime, but mypy/pyright and Pydantic use them.
> - Use dataclasses (with `default_factory`) for configs and records.
