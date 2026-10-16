---
id: python-data-types-mutability
title: Data types, mutability
estimatedMinutes: 10
difficulty: easy
tags: [python, core, mutability, data-types]
---

## Why it matters
Mutability bugs (a list changing "by itself", a default argument remembering old calls) are classic Python interview traps. Knowing which types are mutable also explains why only some objects can be dict keys.

## Concept
Built-in types:

| Immutable | Mutable |
|---|---|
| `int`, `float`, `bool`, `str`, `tuple`, `frozenset`, `bytes`, `None` | `list`, `dict`, `set`, `bytearray`, most user-defined objects |

- Variables are **names bound to objects**. `b = a` makes both names point to the same object; it doesn't copy.
- Mutating a mutable object (`a.append(1)`) is visible through every name bound to it. "Changing" an immutable one (`s += "x"`) creates a new object and rebinds the name.
- `is` checks identity (same object); `==` checks equality (same value). Use `is` only for `None` (and other singletons).
- **Hashable** objects can be dict keys / set members. Immutable built-ins are hashable; a tuple is hashable only if all its elements are.
- Function arguments are passed by **object reference**: a function can mutate a list you pass in, but rebinding the parameter doesn't affect the caller.

The **mutable default argument** trap: defaults are evaluated once, when the function is defined.

```python
def add(item, bucket=[]):      # same list reused on every call!
    bucket.append(item)
    return bucket

add(1); add(2)                 # → [1, 2]

def add(item, bucket=None):    # correct pattern
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

## Worked example
```python
grid = [[0] * 3] * 3       # three references to ONE inner list
grid[0][0] = 1
print(grid)                # [[1, 0, 0], [1, 0, 0], [1, 0, 0]]

grid = [[0] * 3 for _ in range(3)]   # three separate lists
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which of these can be used as a dictionary key?",
  "options": ["[1, 2]", "{'a': 1}", "(1, 'a')", "(1, [2])"],
  "answer": 2,
  "explanation": "Keys must be hashable. A tuple of immutables is hashable; a tuple containing a list is not."
}
```

```quiz
{
  "id": "q2",
  "question": "After `a = [1, 2]; b = a; b += [3]`, what is `a`?",
  "options": ["[1, 2]", "[1, 2, 3]", "Error", "[3]"],
  "answer": 1,
  "explanation": "For lists, += mutates in place, and a and b name the same list."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Fix the classic bug: write `append_to(item, target=None)` that appends `item` to `target` (creating a new list when `target` is not given) and returns it. Then write `make_grid(rows, cols, fill)` returning a list of independent row lists.",
  "starterCode": "def append_to(item, target=[]):\n    target.append(item)\n    return target\n\ndef make_grid(rows, cols, fill):\n    return [[fill] * cols] * rows\n\nprint(append_to(1), append_to(2))",
  "tests": "assert append_to(1) == [1]\nassert append_to(2) == [2]\nmine = [0]\nassert append_to(5, mine) is mine and mine == [0, 5]\ng = make_grid(3, 2, 0)\ng[0][0] = 9\nassert g == [[9, 0], [0, 0], [0, 0]]",
  "solution": "def append_to(item, target=None):\n    if target is None:\n        target = []\n    target.append(item)\n    return target\n\ndef make_grid(rows, cols, fill):\n    return [[fill] * cols for _ in range(rows)]",
  "hints": ["Use None as the default and create the list inside the function.", "Build each row in a comprehension so rows are separate objects."]
}
```

> [!TIP] Interview tips
> - Say "names are bound to objects" and use it to explain aliasing bugs.
> - Know the mutable-default trap and the `None` sentinel fix by heart.
> - Mention hashability when asked why lists can't be dict keys.
