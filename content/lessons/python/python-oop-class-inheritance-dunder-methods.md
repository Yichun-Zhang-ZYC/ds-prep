---
id: python-oop-class-inheritance-dunder-methods
title: "OOP: class, inheritance, dunder methods"
estimatedMinutes: 14
difficulty: medium
tags: [python, core, oop, classes]
---

## Why it matters
ML code is full of classes: scikit-learn estimators, PyTorch modules, data loaders. Interviewers ask you to design a small class, explain inheritance and `super()`, and implement dunder methods so objects behave like built-ins.

## Concept
```python
class Account:
    bank = "DS Bank"                     # class attribute (shared)

    def __init__(self, owner, balance=0):
        self.owner = owner               # instance attributes
        self._balance = balance          # leading _ = "internal" by convention

    @property
    def balance(self):                   # read-only attribute access
        return self._balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    def __repr__(self):
        return f"Account({self.owner!r}, {self._balance})"
```

- **Inheritance**: `class Savings(Account)` reuses and overrides methods. Call the parent with `super().__init__(...)`. Python supports multiple inheritance; lookup follows the **MRO** (`Cls.__mro__`).
- Prefer **composition** ("has a") over deep inheritance trees.
- `@classmethod` gets the class (`cls`), common for alternative constructors (`from_dict`); `@staticmethod` gets neither.
- **Dunder methods** hook into syntax: `__repr__`/`__str__` (printing), `__eq__`/`__hash__` (comparison, dict keys), `__lt__` (sorting), `__len__`, `__getitem__`, `__iter__`, `__contains__`, `__add__`, `__call__`, `__enter__`/`__exit__`.
- If you define `__eq__`, define `__hash__` too (or the class becomes unhashable).
- `@dataclass` generates `__init__`, `__repr__`, `__eq__` for data-holding classes; `frozen=True` makes them immutable and hashable.

## Worked example
A minimal scikit-learn-style estimator:

```python
class MeanRegressor:
    def fit(self, X, y):
        self.mean_ = sum(y) / len(y)     # learned attributes end with _
        return self                      # enables chaining
    def predict(self, X):
        return [self.mean_] * len(X)

MeanRegressor().fit([[1], [2]], [3, 5]).predict([[0]])   # [4.0]
```

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You define __eq__ on a class but not __hash__. What happens when you put instances in a set?",
  "options": ["Works normally", "TypeError: unhashable type", "All instances collapse into one", "Python uses id() silently"],
  "answer": 1,
  "explanation": "Defining __eq__ sets __hash__ to None unless you also define it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a `Vector` class: `Vector(1, 2)` stores components; support `+` (elementwise), `*` with a number (scalar multiply), `==`, `len()`, iteration, `abs()` (Euclidean norm) and `repr` like `Vector(1, 2)`. Make it hashable consistent with `==`.",
  "starterCode": "import math\n\nclass Vector:\n    def __init__(self, *components):\n        self.components = tuple(components)\n\nv = Vector(3, 4)\nprint(v)",
  "tests": "import math\nv, w = Vector(1, 2), Vector(3, 4)\nassert v + w == Vector(4, 6)\nassert v * 3 == Vector(3, 6)\nassert len(Vector(1, 2, 3)) == 3\nassert list(w) == [3, 4]\nassert abs(w) == 5.0\nassert repr(v) == 'Vector(1, 2)'\nassert len({Vector(1, 2), Vector(1, 2)}) == 1\nassert Vector(1, 2) != Vector(2, 1)",
  "solution": "import math\n\nclass Vector:\n    def __init__(self, *components):\n        self.components = tuple(components)\n\n    def __add__(self, other):\n        return Vector(*(a + b for a, b in zip(self.components, other.components)))\n\n    def __mul__(self, k):\n        return Vector(*(a * k for a in self.components))\n\n    def __eq__(self, other):\n        return isinstance(other, Vector) and self.components == other.components\n\n    def __hash__(self):\n        return hash(self.components)\n\n    def __len__(self):\n        return len(self.components)\n\n    def __iter__(self):\n        return iter(self.components)\n\n    def __abs__(self):\n        return math.sqrt(sum(a * a for a in self.components))\n\n    def __repr__(self):\n        return f\"Vector({', '.join(map(repr, self.components))})\"",
  "hints": ["Store components as a tuple so hashing is easy.", "__iter__ can just return iter(self.components)."]
}
```

> [!TIP] Interview tips
> - Explain class vs instance attributes, `super()`, and the MRO briefly.
> - Mention `__repr__` for debugging and the `__eq__`/`__hash__` contract.
> - Reach for `@dataclass` for plain data containers, and favor composition over deep inheritance.
