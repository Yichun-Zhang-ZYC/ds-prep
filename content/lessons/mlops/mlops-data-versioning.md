---
id: mlops-data-versioning
title: "Data versioning (DVC)"
estimatedMinutes: 11
difficulty: medium
tags: [mlops, data-versioning, dvc, reproducibility, lineage]
---

## Why it matters
Git cannot hold a 50 GB dataset, yet a model is only reproducible if you know exactly which data trained it. Interviewers ask how you version data and tie it to code and models.

## Concept
**Why version data**: reproduce a past model, audit what it was trained on, roll back a bad data change, and compare experiments on the same snapshot.

**DVC (Data Version Control)** works alongside Git:
- `dvc add data/train.parquet` moves the file into a content-addressed **cache** (named by its MD5 hash) and writes a tiny pointer file `data/train.parquet.dvc` (hash, size, path). **Git tracks the pointer; remote storage (S3, GCS, Azure, SSH) holds the bytes** (`dvc push` / `dvc pull`).
- `git checkout <commit> && dvc checkout` restores the exact data of that commit. Cache links (reflink, hardlink, symlink, copy) avoid duplicating files.
- **Pipelines** in `dvc.yaml` declare stages with `cmd`, `deps`, `params`, `outs` and `metrics`. `dvc.lock` records the hashes of every dep and out. `dvc repro` reruns only stages whose deps or params changed. `dvc exp run` and `dvc metrics diff` compare experiments.

**Content addressing**: identical content has the same hash, so unchanged files are stored once. A directory is hashed from its listing of file hashes.

**Alternatives**: **lakeFS** (Git-like branches and commits over an object store), **Delta Lake / Iceberg time travel** (`VERSION AS OF`, snapshots; best for tables), **Git LFS** (simple, no pipelines), Pachyderm, and plain immutable, dated partitions with a manifest. Versioning *tables* with time travel is the usual choice in a warehouse or lakehouse; DVC suits file-based ML datasets.

**Best practice**: never mutate raw data in place; treat dataset versions as immutable; log the data hash or snapshot id in the experiment tracker and the model registry; store dataset metadata (schema, row count, source query, label policy); keep sensitive data out of Git and respect retention and deletion rules.

**Pitfall**: versioning files but not the *query or code* that produced them, so a "new snapshot" cannot be rebuilt.

## Worked example
Monday's `train.csv` hashes to `a1f3...` (2.0 GB). On Tuesday 40 MB of rows are appended, giving `9c02...`. With DVC the Git diff is a three-line change to `train.csv.dvc` (the `md5:` line, `size:`), and the remote gains one new 2.04 GB object. Commit `m_v1` points to `a1f3...`, `m_v2` to `9c02...`.

Weeks later, "why did AUC drop?" becomes `git checkout m_v1 && dvc checkout && dvc repro`, which reproduces the old result. `dvc repro` skips preprocessing if only a training param changed, because the preprocess stage's deps and params hashes match `dvc.lock`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does Git store when you `dvc add` a large dataset?",
  "options": ["The full dataset", "A small .dvc pointer file with the content hash; the data lives in the DVC cache and remote", "Nothing", "A zip of the dataset"],
  "answer": 1,
  "explanation": "Git tracks metadata (hash, size, path); remote storage holds the bytes."
}
```

```quiz
{
  "id": "q2",
  "question": "For a table in a lakehouse queried by many teams, which versioning mechanism fits best?",
  "options": ["Copying the table daily into new folders by hand", "Table-format time travel (Delta/Iceberg snapshots)", "Committing parquet files to Git", "Email attachments"],
  "answer": 1,
  "explanation": "Table formats give atomic, queryable snapshots without managing files yourself."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate DVC's idea in pure Python. `file_hash(content)` returns the SHA-256 hex digest of a string (UTF-8). `make_manifest(files)` maps each filename in the dict `{name: content}` to its hash. `diff_manifests(old, new)` returns `(added, modified, removed)` as three sorted lists of names. `stale_stages(stages, old, new)` where `stages` maps stage name to the list of file names it depends on returns a sorted list of stages that must rerun (any dep added, modified or removed).",
  "starterCode": "import hashlib\n\ndef file_hash(content):\n    pass\n\ndef make_manifest(files):\n    pass\n\ndef diff_manifests(old, new):\n    pass\n\ndef stale_stages(stages, old, new):\n    pass\n",
  "tests": "import hashlib\nassert file_hash('abc') == hashlib.sha256(b'abc').hexdigest()\nassert file_hash('a') != file_hash('b')\nold = make_manifest({'train.csv': 'v1', 'labels.csv': 'L', 'old.csv': 'x'})\nnew = make_manifest({'train.csv': 'v2', 'labels.csv': 'L', 'extra.csv': 'e'})\nassert set(old) == {'train.csv', 'labels.csv', 'old.csv'}\nassert diff_manifests(old, new) == (['extra.csv'], ['train.csv'], ['old.csv'])\nassert diff_manifests(old, old) == ([], [], [])\nstages = {'preprocess': ['train.csv'], 'features': ['labels.csv'], 'report': ['extra.csv', 'labels.csv'], 'cleanup': ['old.csv']}\nassert stale_stages(stages, old, new) == ['cleanup', 'preprocess', 'report']\nassert stale_stages(stages, old, old) == []",
  "solution": "import hashlib\n\ndef file_hash(content):\n    return hashlib.sha256(content.encode('utf-8')).hexdigest()\n\ndef make_manifest(files):\n    return {name: file_hash(c) for name, c in files.items()}\n\ndef diff_manifests(old, new):\n    added = sorted(set(new) - set(old))\n    removed = sorted(set(old) - set(new))\n    modified = sorted(n for n in set(old) & set(new) if old[n] != new[n])\n    return added, modified, removed\n\ndef stale_stages(stages, old, new):\n    added, modified, removed = diff_manifests(old, new)\n    changed = set(added) | set(modified) | set(removed)\n    return sorted(s for s, deps in stages.items() if changed & set(deps))",
  "hints": ["hashlib.sha256(content.encode()).hexdigest().", "Use set differences and intersections on the manifests' keys; modified means present in both with different hashes."]
}
```

> [!TIP] Interview tips
> - Explain the pointer-in-Git, bytes-in-remote design and content addressing, and that `dvc.lock` makes pipelines reproducible.
> - Name alternatives by use case: DVC for files and pipelines, lakeFS for branching object stores, Delta/Iceberg time travel for tables.
> - Pitfall: recording a dataset version without the code/query that built it, or mutating raw data in place.
