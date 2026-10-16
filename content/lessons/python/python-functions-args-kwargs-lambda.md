---
id: python-functions-args-kwargs-lambda
title: Functions, *args / **kwargs, lambda
estimatedMinutes: 10
difficulty: easy
tags: [python, core, functions]
---

## Why it matters
Function signatures show up everywhere: writing utilities, wrapping APIs, decorators, `sorted(key=...)`, `df.apply(...)`. Interviewers check that you understand argument kinds, closures and when a lambda is appropriate.

## Concept
Parameter kinds, in order:

```python
def f(pos_only, /, normal, *args, kw_only, **kwargs):
    ...
```
- Before `/`: positional-only. After `*args` (or a bare `*`): keyword-only.
- `*args` collects extra positional arguments into a **tuple**; `**kwargs` collects extra keyword arguments into a **dict**.
- At the call site, `*` and `**` **unpack**: `f(*my_list, **my_dict)`.

**Lambda**: an anonymous single-expression function, best as a short `key=` or callback:

```python
sorted(users, key=lambda u: (-u["score"], u["name"]))
```
For anything longer, use `def` (better names, tracebacks and docstrings).

**Closures and scope (LEGB)**: names resolve Local → Enclosing → Global → Built-in. An inner function can read enclosing variables; to rebind them use `nonlocal`. Closures capture **variables, not values** (late binding):

```python
fs = [lambda: i for i in range(3)]
[f() for f in fs]          # [2, 2, 2]
fs = [lambda i=i: i for i in range(3)]   # [0, 1, 2]: default binds the value now
```

Functions are first-class: pass them around, return them, store them in dicts.

## Worked example
```python
def log_call(name, *args, sep=", ", **kwargs):
    parts = [repr(a) for a in args] + [f"{k}={v!r}" for k, v in kwargs.items()]
    return f"{name}({sep.join(parts)})"

log_call("fit", 3, lr=0.1)        # "fit(3, lr=0.1)"
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Inside `def f(*args, **kwargs)`, what is the type of `args`?",
  "options": ["list", "tuple", "dict", "set"],
  "answer": 1,
  "explanation": "Extra positional arguments are packed into a tuple; keyword arguments into a dict."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `merge_configs(*configs, **overrides)` that merges any number of dicts left to right, then applies keyword overrides last. Write `make_counter()` returning a function that returns 1, 2, 3… on successive calls (use a closure with `nonlocal`). Finally `sort_people(people)` sorts `(name, age)` tuples by age descending, then name ascending, using a lambda key.",
  "starterCode": "def merge_configs(*configs, **overrides):\n    pass\n\ndef make_counter():\n    pass\n\ndef sort_people(people):\n    pass\n\nprint(merge_configs({'a': 1}, {'a': 2, 'b': 3}, b=9))",
  "tests": "assert merge_configs({'a': 1}, {'a': 2, 'b': 3}, b=9) == {'a': 2, 'b': 9}\nassert merge_configs() == {}\nc = make_counter(); d = make_counter()\nassert [c(), c(), c()] == [1, 2, 3] and d() == 1\nassert sort_people([('Bo', 30), ('Al', 30), ('Cy', 40)]) == [('Cy', 40), ('Al', 30), ('Bo', 30)]",
  "solution": "def merge_configs(*configs, **overrides):\n    out = {}\n    for c in configs:\n        out.update(c)\n    out.update(overrides)\n    return out\n\ndef make_counter():\n    n = 0\n    def counter():\n        nonlocal n\n        n += 1\n        return n\n    return counter\n\ndef sort_people(people):\n    return sorted(people, key=lambda p: (-p[1], p[0]))",
  "hints": ["dict.update applies later keys over earlier ones.", "Negate the age in the key tuple to sort it descending."]
}
```

> [!TIP] Interview tips
> - Know that *args is a tuple and **kwargs a dict, and that * / ** also unpack at call sites.
> - Use lambdas only for short keys/callbacks.
> - Late-binding closures in loops are a favorite trick question; know the default-argument fix.
