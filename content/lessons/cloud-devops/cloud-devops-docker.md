---
id: cloud-devops-docker
title: Docker (image, container, Dockerfile, layers)
estimatedMinutes: 12
difficulty: easy
tags: [cloud-devops, docker, containers, dockerfile]
---

## Why it matters
Docker is how models, APIs and pipelines get packaged to run the same everywhere. Interviewers ask the image vs container difference, how layer caching works and how to keep images small and safe.

## Concept
An **image** is an immutable, layered filesystem plus metadata (entrypoint, env). A **container** is a running (or stopped) instance of an image: an isolated process using Linux **namespaces** (own PID, network, mounts) and **cgroups** (CPU and memory limits). Containers share the host kernel, so they start in milliseconds and are lighter than VMs.

A **Dockerfile** builds an image. Each `RUN`, `COPY` and `ADD` creates a **layer**; layers are content-addressed and cached.

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER 1000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Layer cache rule**: a step is reused only if its instruction and inputs are unchanged *and every earlier step was reused*. So put rarely changing steps first (base image, dependencies) and fast-changing ones (your source) last. Copying `requirements.txt` before `COPY . .` means code edits skip the slow `pip install`.

**Good practice**:
- Small, pinned base images (`python:3.12-slim`); a `.dockerignore` for `.git`, data and venvs.
- **Multi-stage builds**: compile in a fat builder stage, copy only artifacts into a slim final stage.
- Run as a **non-root** user; never bake secrets into layers (they persist in history).
- One main process per container; log to stdout/stderr.
- `ENTRYPOINT` = the fixed program, `CMD` = default arguments (overridable). Prefer exec form `["a","b"]` so signals reach the process.

**Data**: container filesystems are ephemeral. Use **volumes** or bind mounts for persistent data. Everyday commands: `docker build -t app:1.0 .`, `docker run -p 8080:8000 app:1.0`, `docker ps`, `docker logs`, `docker exec -it <id> sh`. Tag with a version or git SHA, not just `latest`.

## Worked example
The Dockerfile above has 7 instructions. A developer edits `app.py`. The first 4 steps are cached, including the `RUN pip install` step (say 90 s), which is reused because `requirements.txt` did not change; only `COPY . .` and later steps rebuild, about 2 s. If the Dockerfile instead did `COPY . .` before `pip install`, any source edit invalidates the copy layer and every later step, so each build repeats the 90 s install. Image size also matters: `python:3.12` is roughly 1 GB while `-slim` is a few hundred MB, so pulls and cold starts are faster.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A Dockerfile has `COPY . .` followed by `RUN pip install -r requirements.txt`. What is the main problem?",
  "options": [
    "pip will fail",
    "Any source change invalidates the install layer, so dependencies reinstall every build",
    "The image becomes a VM",
    "Layers cannot be cached"
  ],
  "answer": 1,
  "explanation": "Cache reuse needs all earlier steps to be unchanged. Copy `requirements.txt` and install first, then copy the source."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the difference between an image and a container?",
  "options": [
    "They are the same thing",
    "An image is an immutable template; a container is a running instance with a writable layer",
    "A container is the template; an image is the running process",
    "Images need a hypervisor"
  ],
  "answer": 1,
  "explanation": "Many containers can start from one image. Each gets its own thin writable layer, which is discarded unless you use a volume."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate the Docker layer cache. A build is a list of steps `(instruction, input_hash)`, where `input_hash` identifies the files a `COPY` step reads (use `''` for steps like `RUN`). `rebuilt_steps(old, new)` returns the list of indices in `new` that must be rebuilt: a step is cached only if it equals the step at the same index in `old` and all earlier steps were cached. Also write `build_time(old, new, costs)` returning the sum of `costs[i]` over rebuilt steps (`costs` is a list per step in `new`).",
  "starterCode": "def rebuilt_steps(old, new):\n    pass\n\ndef build_time(old, new, costs):\n    pass\n",
  "tests": "good_old = [('FROM python:3.12', ''), ('COPY requirements.txt', 'r1'), ('RUN pip install', ''), ('COPY . .', 's1')]\ngood_new = [('FROM python:3.12', ''), ('COPY requirements.txt', 'r1'), ('RUN pip install', ''), ('COPY . .', 's2')]\nassert rebuilt_steps(good_old, good_new) == [3]\nbad_old = [('FROM python:3.12', ''), ('COPY . .', 's1'), ('RUN pip install', '')]\nbad_new = [('FROM python:3.12', ''), ('COPY . .', 's2'), ('RUN pip install', '')]\nassert rebuilt_steps(bad_old, bad_new) == [1, 2]\nassert rebuilt_steps(good_old, good_old) == []\nassert rebuilt_steps([], good_new) == [0, 1, 2, 3]\nassert rebuilt_steps(good_old, good_new[:2] + [('RUN pip install --upgrade', '')]) == [2]\nassert build_time(good_old, good_new, [5, 1, 90, 2]) == 2\nassert build_time(bad_old, bad_new, [5, 1, 90]) == 91",
  "solution": "def rebuilt_steps(old, new):\n    out = []\n    cached = True\n    for i, step in enumerate(new):\n        if cached and i < len(old) and old[i] == step:\n            continue\n        cached = False\n        out.append(i)\n    return out\n\ndef build_time(old, new, costs):\n    return sum(costs[i] for i in rebuilt_steps(old, new))",
  "hints": [
    "Once one step misses, every later step must rebuild, so keep a `cached` flag that flips to False.",
    "A step beyond the end of `old` is a miss."
  ]
}
```

> [!TIP] Interview tips
> - Be crisp: image = blueprint, container = running instance; containers share the host kernel, VMs do not.
> - Explain layer caching and ordering, multi-stage builds and non-root users.
> - Pitfall: secrets in `ENV` or `COPY` live in image history; use build secrets or runtime injection.
