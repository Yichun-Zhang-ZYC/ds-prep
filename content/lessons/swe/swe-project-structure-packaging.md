---
id: swe-project-structure-packaging
title: "Project structure, packaging"
estimatedMinutes: 10
difficulty: easy
tags: [python, packaging, pyproject, project-structure]
---

## Why it matters
A data scientist who ships a repo of loose notebooks is a flag; one who ships an installable package with tests is a hire. Interviewers ask "how would you structure this project so a teammate can run it?" because code that only works from one folder does not survive handoff to production.

## Concept
**Script vs module vs package.** A *module* is one `.py` file, a *package* is a directory of modules (with `__init__.py`), and a *distribution* is the built artifact (wheel or sdist) you install with `pip`.

**Recommended layout** (src layout):

```text
churn-model/
  pyproject.toml          # metadata, dependencies, tool config
  README.md
  src/churn/              # importable package ("src layout")
    __init__.py
    features.py
    train.py
  tests/
    test_features.py
  notebooks/              # exploration only, no logic that matters
```

- `src/` forces you to test the *installed* package, not whatever happens to be on `sys.path`, which catches missing files and wrong imports early.
- Keep notebooks thin: they import from `churn`, never the reverse. Logic that lives in a notebook cannot be tested or reused.
- Use absolute imports (`from churn.features import build`) rather than `sys.path` hacks or `import *`.

**Packaging** is declared in `pyproject.toml` (PEP 621), which replaced `setup.py` and `requirements.txt` for metadata:

```toml
[project]
name = "churn"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = ["pandas>=2.0", "scikit-learn>=1.4"]

[project.optional-dependencies]
dev = ["pytest", "ruff"]

[project.scripts]
churn-train = "churn.train:main"   # installs a CLI command

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

`pip install -e ".[dev]"` does an *editable install*: imports resolve to your working tree, so edits apply without reinstalling. `python -m build` produces a wheel for distribution to an internal index.

**Libraries vs applications.** A library declares loose ranges (`pandas>=2.0`) so it composes with other packages; an application pins exact versions in a lock file for reproducible deploys.

## Worked example
Scenario: `train.py` does `from features import build` and works only when you `cd` into the folder. In CI it fails with `ModuleNotFoundError`.

Fix: move code to `src/churn/`, change the import to `from churn.features import build`, add `pyproject.toml`, run `pip install -e .`. Now `python -c "import churn"` works from any directory, `pytest` imports the same package users get, and `churn-train` is available as a command.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why do many teams prefer the `src/` layout?",
  "options": [
    "It makes imports faster",
    "Tests import the installed package rather than the working directory, exposing packaging mistakes",
    "It is required by pip",
    "It removes the need for `__init__.py`"
  ],
  "answer": 1,
  "explanation": "With `src/`, the package is not importable from the repo root unless installed, so missing files or wrong imports show up in tests instead of in production."
}
```

```quiz
{
  "id": "q2",
  "question": "What does `pip install -e .` do?",
  "options": [
    "Installs only the dev dependencies",
    "Builds and uploads a wheel",
    "Installs the project so imports point at your working tree, and edits apply without reinstalling",
    "Exports the environment"
  ],
  "answer": 2,
  "explanation": "An editable install links the installed name to your source directory."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `module_names(files)`: given repo file paths, return the sorted dotted module names importable from the `src/` root. A file counts only if every directory between `src` and the file has an `__init__.py` (so `src/broken/sub/deep.py` is excluded when `src/broken/sub/__init__.py` is missing). `__init__.py` maps to the package name; ignore files outside `src/`.",
  "starterCode": "def module_names(files):\n    \"\"\"files: paths like 'src/churn/features.py'. Return sorted dotted module names\n    importable from the 'src/' root. A file counts only if EVERY directory between\n    'src' and the file contains an __init__.py. '__init__.py' maps to the package\n    name itself. Ignore files not under 'src/'.\"\"\"\n    pass\n",
  "tests": "files = [\n    \"src/churn/__init__.py\", \"src/churn/features.py\", \"src/churn/train.py\",\n    \"src/churn/utils/__init__.py\", \"src/churn/utils/io.py\",\n    \"src/loose/helpers.py\",\n    \"src/broken/__init__.py\", \"src/broken/sub/deep.py\",\n    \"tests/test_features.py\", \"setup.py\",\n]\nassert module_names(files) == [\"broken\", \"churn\", \"churn.features\", \"churn.train\", \"churn.utils\", \"churn.utils.io\"]\nassert module_names([]) == []\nassert module_names([\"src/a/__init__.py\", \"src/a/b/__init__.py\", \"src/a/b/c.py\"]) == [\"a\", \"a.b\", \"a.b.c\"]\n",
  "solution": "def module_names(files):\n    fs = set(files)\n    out = []\n    for f in fs:\n        parts = f.split(\"/\")\n        if parts[0] != \"src\" or not parts[-1].endswith(\".py\"):\n            continue\n        dirs = parts[1:-1]\n        if not dirs:\n            continue\n        ok = all(\"/\".join([\"src\"] + dirs[:i + 1] + [\"__init__.py\"]) in fs for i in range(len(dirs)))\n        if not ok:\n            continue\n        stem = parts[-1][:-3]\n        out.append(\".\".join(dirs if stem == \"__init__\" else dirs + [stem]))\n    return sorted(out)\n",
  "hints": [
    "Put all paths in a set so you can check whether a given `__init__.py` exists.",
    "For each prefix of the directory list under `src`, check that `src/<prefix>/__init__.py` exists."
  ]
}
```

> [!TIP] Interview tips
> - Say "src layout, `pyproject.toml`, editable install, thin notebooks" and explain *why* each (testing the installed code, reproducibility, handoff).
> - Pitfall: a missing `__init__.py` in a subfolder silently breaks imports for regular packages (namespace packages are the exception, rarely intended).
> - Pitfall: committing data, models or secrets to the repo; use `.gitignore`, DVC or object storage, and env vars.
