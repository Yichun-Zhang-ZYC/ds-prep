---
id: swe-virtual-environments-and-dependency-management
title: "Virtual environments & dependency management (venv, conda, uv, poetry)"
estimatedMinutes: 10
difficulty: easy
tags: [python, venv, conda, uv, poetry, reproducibility]
---

## Why it matters
"It works on my machine" is the classic data-science failure: a model trained with pandas 1.5 breaks under 2.x, or CI picks up a newer NumPy. Interviewers ask how you make an environment reproducible and which tool you would choose, to see that you treat dependencies as part of the deliverable.

## Concept
**Why isolate.** Each project gets its own interpreter and packages, so project A can pin `numpy==1.26` while B uses 2.0, and nothing touches the system Python. A *virtual environment* is just a directory with a Python copy/symlink and its own `site-packages`.

```bash
# venv + pip: built in, simplest
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip freeze > requirements.lock.txt      # record exact versions

# uv: fast (Rust) drop-in, with a lock file
uv init && uv add pandas scikit-learn
uv lock && uv sync                       # reproducible install from uv.lock

# conda: also manages non-Python binaries (CUDA, MKL, GDAL)
conda create -n churn python=3.11 && conda activate churn
```

**Tool choice.**
- **venv + pip**: zero extra installs; fine for most services. Slow resolver on big stacks.
- **conda / mamba**: resolves compiled, non-Python dependencies (CUDA toolkit, GDAL) and the Python version itself; heavier, and mixing `pip` into conda envs can break solves.
- **uv**: very fast resolver/installer, manages Python versions, produces a cross-platform `uv.lock`. A common modern default.
- **poetry**: dependency groups, lock file (`poetry.lock`), build and publish in one tool.

**Declared vs locked.** `pyproject.toml` states *intent* (`pandas>=2.0`); the lock file records the *exact resolved tree* with hashes (pandas 2.2.2, numpy 1.26.4, ...). Commit both for applications; CI installs from the lock. Resolution is a graph problem: install each package after its dependencies (a topological order), and a cycle or version conflict makes the solve fail.

**Habits.** One env per project, never `sudo pip install`, pin Python version (`requires-python`), separate dev dependencies (`pytest`, `ruff`) from runtime, and rebuild from the lock in CI to prove it is reproducible.

## Worked example
Scenario: a teammate's run produces different AUC. `pip freeze` shows she has `scikit-learn 1.5` while the lock says `1.4.2`, and a default changed between versions.

Fix: she runs `uv sync` (or `pip install -r requirements.lock.txt` in a fresh venv), which reinstalls exactly the locked set. CI does the same, so training, tests and production share one dependency tree. Upgrades become deliberate: `uv lock --upgrade-package scikit-learn`, run tests, commit the new lock.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does a lock file give you that `pandas>=2.0` in `pyproject.toml` does not?",
  "options": [
    "Faster imports",
    "The exact resolved versions (and hashes) of the whole dependency tree, so installs are reproducible",
    "Automatic security patches",
    "Smaller wheels"
  ],
  "answer": 1,
  "explanation": "A range allows many valid installs over time; the lock pins one, including transitive dependencies."
}
```

```quiz
{
  "id": "q2",
  "question": "When is conda a better choice than venv + pip?",
  "options": [
    "Always, it is faster",
    "When you only need pure-Python packages",
    "When you need non-Python binary dependencies such as the CUDA toolkit or GDAL, or to manage the Python version",
    "When deploying to a minimal Docker image"
  ],
  "answer": 2,
  "explanation": "conda packages native libraries and interpreters; pip only installs Python distributions."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `install_order(deps)`: given `{package: [direct dependencies]}`, return an install order where every package comes after its dependencies (include packages that appear only as dependencies). Break ties alphabetically among packages that are ready. Raise `ValueError` on a dependency cycle.",
  "starterCode": "def install_order(deps):\n    \"\"\"deps: {package: [direct dependencies]}. Return a list with every package\n    (including ones that only appear as dependencies) so each package comes\n    AFTER its dependencies. Break ties alphabetically. Raise ValueError if the\n    graph has a cycle.\"\"\"\n    pass\n",
  "tests": "d = {\"app\": [\"pandas\", \"requests\"], \"pandas\": [\"numpy\", \"dateutil\"], \"requests\": [\"urllib3\"]}\norder = install_order(d)\nassert order == [\"dateutil\", \"numpy\", \"pandas\", \"urllib3\", \"requests\", \"app\"]\nassert install_order({}) == []\nassert install_order({\"a\": []}) == [\"a\"]\ntry:\n    install_order({\"a\": [\"b\"], \"b\": [\"c\"], \"c\": [\"a\"]})\n    assert False\nexcept ValueError:\n    pass\n",
  "solution": "def install_order(deps):\n    names = set(deps)\n    for ds in deps.values():\n        names.update(ds)\n    remaining = {n: set(deps.get(n, [])) for n in names}\n    order = []\n    while remaining:\n        ready = sorted(n for n, ds in remaining.items() if not ds)\n        if not ready:\n            raise ValueError(\"cycle detected\")\n        pick = ready[0]\n        order.append(pick)\n        del remaining[pick]\n        for ds in remaining.values():\n            ds.discard(pick)\n    return order\n",
  "hints": [
    "Repeatedly pick the alphabetically smallest package whose remaining dependency set is empty (Kahn's algorithm).",
    "If nothing is ready but packages remain, there is a cycle."
  ]
}
```

> [!TIP] Interview tips
> - Distinguish "declared" (ranges in `pyproject.toml`) from "locked" (exact versions + hashes) and say you commit the lock for apps.
> - When asked venv vs conda: conda when you need non-Python binaries or GPU toolchains; otherwise venv/uv for speed and simplicity.
> - Pitfall: `pip freeze > requirements.txt` from a messy global env pins hundreds of unrelated packages; freeze from a clean per-project env.
