---
id: swe-design-patterns
title: Design patterns
estimatedMinutes: 12
difficulty: medium
tags: [design-patterns, strategy, factory, observer, python, oop]
---

## Why it matters
Design patterns are shared vocabulary for structuring code. In ML and data engineering interviews they appear as "how would you make this pipeline extensible?" and you are expected to name a pattern and show a small Pythonic version, not recite a textbook.

## Concept
A **design pattern** is a reusable solution to a recurring design problem. Aim for simple code first; use a pattern when it removes real duplication or coupling. In Python, first-class functions, duck typing and decorators often replace heavy class hierarchies.

**Creational**
- **Factory / registry**: create objects by name without hard-coding classes, ideal for models, loaders and configs (`create("xgboost", depth=6)`).
- **Singleton**: one shared instance (config, connection pool). Usually a module-level object is simpler and easier to test than a singleton class.
- **Builder**: construct complex objects step by step (query builders, pipeline builders).

**Structural**
- **Adapter**: wrap an incompatible interface to match the one you need (a scikit-learn-style wrapper around a third-party model).
- **Decorator**: add behavior around a callable without changing it (`@retry`, `@cache`, timing, logging).
- **Facade**: a simple interface over a complex subsystem.

**Behavioral**
- **Strategy**: swap interchangeable algorithms behind one interface (different scorers, imputation methods, retry policies). In Python, pass a function.
- **Observer / pub-sub**: objects subscribe to events (training callbacks, metrics hooks).
- **Template method**: a base class fixes the algorithm skeleton (`fit`, `predict`) and subclasses fill in steps.
- **Pipeline / chain of responsibility**: compose steps that each transform data (like sklearn `Pipeline`).

**Principles behind them (SOLID)**: single responsibility, open/closed (extend without editing), Liskov substitution, interface segregation, dependency inversion (depend on abstractions, inject dependencies, which also helps testing). Prefer **composition over inheritance**.

```python
REGISTRY = {}

def register(name):
    def deco(cls):
        REGISTRY[name] = cls
        return cls
    return deco

@register("mean")
class MeanImputer:
    def fit_transform(self, xs):
        m = sum(xs) / len(xs)
        return [m if x is None else x for x in xs]

imputer = REGISTRY["mean"]()      # new strategy = new class, no edits elsewhere
```

## Worked example
A training script has `if model == "rf": ... elif model == "xgb": ... elif model == "lr": ...` repeated in 4 places (build, train, save, load). Adding a model means editing 4 branches and risks missing one. Refactor: a `Model` interface with `fit/predict/save`, a registry (factory) keyed by name, and the config string picks the class. Adding "lightgbm" becomes one new class with `@register("lgbm")`: the open/closed principle, and tests can pass a fake model. Cost: 3 new files for a script that had 1, worth it once there are 3+ variants, not for 1.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You want to swap between different retry policies (fixed, exponential, none) without changing the calling code. Which pattern fits?",
  "options": ["Singleton", "Strategy", "Facade", "Builder"],
  "answer": 1,
  "explanation": "Strategy encapsulates interchangeable algorithms behind one interface; in Python you can simply pass a function or object."
}
```

```quiz
{
  "id": "q2",
  "question": "Which statement about patterns in Python is most accurate?",
  "options": ["Every program should use at least three patterns", "First-class functions and decorators often replace class-heavy patterns, so keep it simple until there is real duplication or coupling", "Singletons are the best way to share config", "Inheritance should always be preferred to composition"],
  "answer": 1,
  "explanation": "Patterns are tools, not goals. Python's language features make many of them lightweight, and composition is usually preferred."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a registry factory and a pipeline. `register(name)` is a class decorator that stores the class in the global `REGISTRY` dict and returns it. `create(name, **kwargs)` instantiates the registered class with kwargs, raising `KeyError` for unknown names. `compose(*fns)` returns a function applying `fns` left to right (with no functions it returns its input unchanged).",
  "starterCode": "REGISTRY = {}\n\ndef register(name):\n    pass\n\ndef create(name, **kwargs):\n    pass\n\ndef compose(*fns):\n    pass\n\n@register('double')\nclass Double:\n    def __call__(self, x):\n        return x * 2\n\nprint(create('double')(4))",
  "tests": "@register('scale')\nclass Scale:\n    def __init__(self, k=1):\n        self.k = k\n    def __call__(self, x):\n        return x * self.k\n\nassert create('scale', k=3)(5) == 15\nassert isinstance(create('scale'), Scale)\ntry:\n    create('nope')\n    assert False\nexcept KeyError:\n    pass\nf = compose(create('scale', k=2), lambda x: x + 1, str)\nassert f(4) == '9'\nassert compose()(7) == 7",
  "solution": "REGISTRY = {}\n\ndef register(name):\n    def deco(cls):\n        REGISTRY[name] = cls\n        return cls\n    return deco\n\ndef create(name, **kwargs):\n    if name not in REGISTRY:\n        raise KeyError(name)\n    return REGISTRY[name](**kwargs)\n\ndef compose(*fns):\n    def run(x):\n        for fn in fns:\n            x = fn(x)\n        return x\n    return run\n\n@register('double')\nclass Double:\n    def __call__(self, x):\n        return x * 2",
  "hints": ["A decorator with an argument is a function returning the actual decorator.", "compose can loop over fns and feed each output into the next."]
}
```

> [!TIP] Interview tips
> - Tie a pattern to a concrete problem (swappable models = strategy/registry, hooks = observer, retry/cache = decorator) instead of listing definitions.
> - Show restraint: say when not to use a pattern (over-engineering, a single implementation).
> - Mention dependency injection and composition over inheritance, as they make code testable (swap in a fake or mock).
