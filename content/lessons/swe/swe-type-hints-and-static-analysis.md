---
id: swe-type-hints-and-static-analysis
title: Type hints and static analysis
estimatedMinutes: 11
difficulty: medium
tags: [typing, mypy, static-analysis, pydantic, ruff]
---

## Why it matters
Type hints are now standard in professional Python: they document intent, power IDE autocomplete and catch bugs before runtime. Data and ML code bases are notorious for untyped dataframes and dicts, so interviewers like to ask what hints do and do not guarantee, how you would adopt a type checker in a legacy repo, and when to use runtime validation (pydantic) instead.

## Concept
**What hints are**: annotations (`def f(x: int) -> str`) that the interpreter stores but does **not enforce**. A **static type checker** (mypy, pyright, pyrefly) reads them without running the code and reports inconsistencies. Typing is **gradual**: unannotated code is treated as `Any`, so you can adopt it incrementally.

**Modern syntax** (3.9+ built-in generics, 3.10+ unions): `list[int]`, `dict[str, float]`, `int | None` (instead of `Optional[int]`), `tuple[int, ...]`. 3.12 adds generic syntax `def first[T](xs: list[T]) -> T` and the `type` alias statement. Add `from __future__ import annotations` only if you need to support older versions or forward references.

**Useful constructs**:
- `Optional` / `X | None`: forces handling of `None`; checkers **narrow** types after `if x is None`, `isinstance` or truthiness checks.
- `TypeVar` / generics: relate input and output types.
- `Protocol`: **structural** typing (duck typing with checking): any class with the right methods qualifies.
- `TypedDict`, `dataclass`, `NamedTuple`: typed records instead of loose dicts.
- `Literal["train", "test"]`, `Final`, `Callable[[int], str]`, `Sequence`/`Mapping` for read-only parameters, `Iterator`/`Generator` for lazy results, `Self`, `override`.
- `Any` turns checking off (and spreads); `object` accepts anything but allows nothing; `# type: ignore[code]` should be rare and commented.

**Static vs runtime**: mypy cannot see data arriving from JSON, CSV or a request. For validation at the boundary use **pydantic** (or dataclass plus validators, `pandera` for DataFrames); it uses the same annotations at runtime. Use both: validate at the edges, trust types inside.

**Static analysis tools**: **ruff** (fast linter and formatter: unused imports, bugs, style, import order), black/ruff-format, mypy/pyright (types), bandit (security). Run in **pre-commit** and CI so style debates disappear and bugs are caught before review.

**Adoption strategy for a legacy repo**: start non-strict; type new code and public interfaces first; enable `--strict` per module (or per-package overrides); add a baseline of existing errors and fail CI only on new ones; install stubs (`types-requests`, `pandas-stubs`); fix the highest-traffic modules.

**Pitfalls**: thinking hints validate input; `Any` creep; `Optional` returns that callers ignore; mutable default arguments (`def f(x: list[int] = [])`); typing every local variable (let inference work); annotating with overly concrete types (`list`) when `Sequence` would do; heavy type gymnastics that make code unreadable.

## Worked example
A function `def find_user(uid: int) -> User | None` is called as `find_user(1).name`. Without types this fails in production the first time a user is missing (`AttributeError: 'NoneType' ...`). With mypy in CI the error appears at review time: `Item "None" of "User | None" has no attribute "name"`.

Adopting types in a 200-module legacy service (illustrative plan): week 1 add ruff and mypy non-strict, baseline 480 errors, fail CI only on new ones; weeks 2-4 annotate public functions and replace dict records by `TypedDict`/dataclasses, dropping the baseline to about 150; then turn on `disallow_untyped_defs` for packages one at a time. Each package's errors are cleaned before its flag is switched on.

Boundary example: a request JSON `{"age": "42"}` passes any static check since the type is `dict[str, Any]`. A pydantic model `class Req(BaseModel): age: int` validates and coerces at runtime, and from then on the typed object flows through the code.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What happens at runtime if you call `def f(x: int)` with the string `\"a\"`?",
  "options": [
    "TypeError raised automatically",
    "Nothing special: annotations are not enforced; only a static checker or explicit validation catches it",
    "The string is converted to int",
    "The program refuses to start"
  ],
  "answer": 1,
  "explanation": "CPython ignores annotations at call time. Static tools like mypy or runtime validators like pydantic enforce them."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the best way to type a parameter that only needs to be iterated over and indexed, accepting both lists and tuples?",
  "options": [
    "`list[int]`",
    "`Sequence[int]`",
    "`Any`",
    "`object`"
  ],
  "answer": 1,
  "explanation": "`Sequence` (from collections.abc) accepts any ordered read-only collection and keeps callers flexible."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Use `inspect.signature` to implement `unannotated(fn)`: return the names of parameters (in order, skipping `self` and `cls`) that lack an annotation, then `'return'` if the return annotation is missing. A step toward an annotation-coverage check in CI.",
  "starterCode": "import inspect\n\ndef unannotated(fn):\n    \"\"\"Return the names of parameters (in order, ignoring `self` and `cls`) that have\n    no annotation, followed by 'return' if the return annotation is missing.\"\"\"\n    pass\n\ndef f(a, b: int, *, c=1):\n    pass\n\nprint(unannotated(f))",
  "tests": "def f(a, b: int, *, c=1):\n    pass\nassert unannotated(f) == [\"a\", \"c\", \"return\"]\ndef g(x: int) -> int:\n    return x\nassert unannotated(g) == []\ndef h() -> None:\n    pass\nassert unannotated(h) == []\ndef k(*args, **kwargs):\n    pass\nassert unannotated(k) == [\"args\", \"kwargs\", \"return\"]\nclass A:\n    def m(self, x) -> int:\n        return 1\nassert unannotated(A.m) == [\"x\"]",
  "solution": "import inspect\n\ndef unannotated(fn):\n    sig = inspect.signature(fn)\n    out = []\n    for name, p in sig.parameters.items():\n        if name in (\"self\", \"cls\"):\n            continue\n        if p.annotation is inspect.Parameter.empty:\n            out.append(name)\n    if sig.return_annotation is inspect.Signature.empty:\n        out.append(\"return\")\n    return out",
  "hints": [
    "`inspect.Parameter.empty` and `inspect.Signature.empty` mark missing annotations.",
    "Iterate over `sig.parameters.items()`; varargs appear as parameters too."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Static checkers reason about the same annotations you can inspect at runtime. Implement `matches(value, tp)` using `typing.get_origin` / `get_args` to validate a value against `Any`, `None`, plain classes, `float` (accepts ints), `Optional`/`Union`/`X | Y`, `list[T]` and `dict[K, V]` (check elements recursively); other generics check the origin class only.",
  "starterCode": "from typing import Any, Optional, Union, get_args, get_origin\nimport types\n\ndef matches(value, tp):\n    \"\"\"Runtime check of `value` against a type annotation. Support: Any, None,\n    plain classes, float accepting ints (as in PEP 484), Optional/Union and `X | Y`,\n    list[T] and dict[K, V] (check every element). Other generics: check the origin class only.\"\"\"\n    pass\n\nprint(matches([1, 2], list[int]), matches([1, \"a\"], list[int]), matches(None, Optional[int]))",
  "tests": "from typing import Any, Optional, Union\nassert matches(3, int)\nassert not matches(\"3\", int)\nassert matches(3, float)\nassert matches(3.5, float)\nassert matches(1, Any)\nassert matches(None, None)\nassert matches(None, Optional[int])\nassert matches(None, int | None)\nassert not matches(\"x\", Optional[int])\nassert matches(\"x\", Union[int, str])\nassert matches([1, 2], list[int])\nassert not matches([1, \"a\"], list[int])\nassert matches([], list[int])\nassert matches({\"a\": 1}, dict[str, int])\nassert not matches({\"a\": \"b\"}, dict[str, int])\nassert not matches({1: 1}, dict[str, int])\nassert matches([[1], [2, 3]], list[list[int]])\nassert not matches([[1], [\"x\"]], list[list[int]])\nassert matches((1, 2), tuple)\nassert not matches([1], tuple)",
  "solution": "from typing import Any, Optional, Union, get_args, get_origin\nimport types\n\ndef matches(value, tp):\n    if tp is Any:\n        return True\n    if tp is None or tp is type(None):\n        return value is None\n    origin = get_origin(tp)\n    if origin is None:\n        if tp is float:\n            return isinstance(value, (int, float))\n        return isinstance(value, tp)\n    args = get_args(tp)\n    if origin is Union or origin is types.UnionType:\n        return any(matches(value, a) for a in args)\n    if origin is list:\n        return isinstance(value, list) and all(matches(x, args[0]) for x in value)\n    if origin is dict:\n        return isinstance(value, dict) and all(matches(k, args[0]) and matches(v, args[1]) for k, v in value.items())\n    return isinstance(value, origin)",
  "hints": [
    "`get_origin(list[int])` is `list`; for `Optional[int]` it is `typing.Union`, for `int | None` it is `types.UnionType`.",
    "Recurse on element types with `all(...)`."
  ]
}
```

```reveal
{
  "prompt": "What would mypy report for this code, and how do you fix it?\n\n```python\ndef find_user(uid: int) -> User | None: ...\n\nuser = find_user(1)\nprint(user.name)\n```",
  "answer": "mypy reports `Item \"None\" of \"User | None\" has no attribute \"name\"`. The function may return `None`, and the type checker forces you to handle it. Fix by narrowing before use: `if user is None: raise LookupError(uid)` (or return early), after which `user` is narrowed to `User`. Avoid `# type: ignore` or `assert` as a habit, and do not weaken the signature to `Any`."
}
```

> [!TIP] Interview tips
- Say clearly: hints are not enforced at runtime; mypy/pyright check statically, pydantic validates at runtime.
- Show modern syntax (`list[int]`, `X | None`) and narrowing of Optional values.
- Know Protocol (structural typing), TypedDict/dataclass and why `Any` is a leak.
- Describe incremental adoption: baseline, new code strict, CI gate, pre-commit with ruff.
