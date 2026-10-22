---
id: cloud-devops-docker-compose
title: docker-compose
estimatedMinutes: 10
difficulty: easy
tags: [cloud-devops, docker, docker-compose, local-dev]
---

## Why it matters
Most real apps need more than one container: an API, a database, a cache, a worker. Compose describes the whole stack in one file, which makes it the standard for local development and integration tests.

## Concept
**Docker Compose** defines a multi-container application in a YAML file (`compose.yaml`) and runs it with one command: `docker compose up -d`, `docker compose logs -f`, `docker compose down` (add `-v` to delete volumes).

```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
volumes:
  pgdata:
```

**Key ideas**:
- **Services** map to containers; each has an `image` or a `build` context.
- Compose creates a default **network**: services reach each other by **service name** as hostname (`db:5432`), not `localhost`.
- **`ports`** (`host:container`) publishes to the host; **`expose`** only documents. Do not publish a database port you do not need.
- **Volumes** persist data across `down`/`up`; bind mounts (`./src:/app`) give live code reload in dev.
- **`depends_on`** controls start *order*, not readiness. Use `condition: service_healthy` with a **healthcheck**, or retry in the app.
- Configuration: `environment`, `env_file`, and overrides (`compose.override.yaml`, `-f`, profiles) per environment. Keep real secrets out of the file.

**Limits**: Compose targets a single host. It has no self-healing across machines, rolling updates or autoscaling; use Kubernetes or a managed service for production scale.

## Worked example
The stack above has `api` and `db`. On `docker compose up`, Compose starts `db` first, waits until `pg_isready` passes (say about 8 s), then starts `api`. Without the healthcheck condition, `api` starts after about 1 s, tries to connect while Postgres is still initialising, and crashes. Inside `api`, the host is `db`; using `localhost` would point at the api container itself. After `docker compose down` (without `-v`) the `pgdata` volume survives, so data is still there on the next `up`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Inside the `api` container, how should it reach the `db` service in the same Compose file?",
  "options": [
    "localhost:5432",
    "db:5432",
    "127.0.0.1:5432",
    "The host machine's IP only"
  ],
  "answer": 1,
  "explanation": "Compose puts services on a shared network where each service name resolves via DNS. `localhost` is the api container itself."
}
```

```quiz
{
  "id": "q2",
  "question": "What does a plain `depends_on: [db]` guarantee?",
  "options": [
    "db is ready to accept queries",
    "db's container is started before api's container",
    "db restarts if it crashes",
    "api is only started after the db migration finishes"
  ],
  "answer": 1,
  "explanation": "It only orders container start. For readiness, add a healthcheck and `condition: service_healthy`, or retry connections in the app."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Compose resolves start order from `depends_on`. Write `start_order(services)` where `services` maps a service name to a dict that may contain `depends_on` (a list of names). Return a list of names so every service appears after its dependencies; when several are ready, pick the alphabetically smallest first. Raise `ValueError` on a cycle or an unknown dependency.",
  "starterCode": "def start_order(services):\n    pass\n",
  "tests": "svc = {'web': {'depends_on': ['db', 'cache']}, 'db': {}, 'cache': {}, 'worker': {'depends_on': ['db']}}\nassert start_order(svc) == ['cache', 'db', 'web', 'worker']\nassert start_order({'a': {}}) == ['a']\nassert start_order({'b': {'depends_on': ['a']}, 'a': {}}) == ['a', 'b']\nfor bad in ({'a': {'depends_on': ['b']}, 'b': {'depends_on': ['a']}}, {'a': {'depends_on': ['zzz']}}):\n    try:\n        start_order(bad)\n        raise AssertionError('expected ValueError')\n    except ValueError:\n        pass",
  "solution": "def start_order(services):\n    deps = {n: set(c.get('depends_on', [])) for n, c in services.items()}\n    for n, d in deps.items():\n        if not d <= set(services):\n            raise ValueError('unknown dependency')\n    order = []\n    while deps:\n        ready = sorted(n for n, d in deps.items() if not d)\n        if not ready:\n            raise ValueError('cycle')\n        n = ready[0]\n        order.append(n)\n        del deps[n]\n        for d in deps.values():\n            d.discard(n)\n    return order",
  "hints": [
    "Kahn's algorithm: repeatedly take a service with no unmet dependencies.",
    "If nothing is ready but services remain, there is a cycle."
  ]
}
```

> [!TIP] Interview tips
> - Say services reach each other by service name on a shared network, and that `depends_on` alone does not wait for readiness.
> - Know the difference between volumes (persistent) and bind mounts (dev code sync).
> - Position Compose as local dev and test tooling; production needs orchestration (Kubernetes, ECS).
