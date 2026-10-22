---
id: mlops-rest-api
title: "REST API (FastAPI)"
estimatedMinutes: 12
difficulty: medium
tags: [mlops, serving, fastapi, rest, latency]
---

## Why it matters
The most common way to serve a model is a small HTTP service. Interviewers probe request validation, loading the model once, latency, concurrency and how to deploy and scale it.

## Concept
**FastAPI** is the usual Python choice: ASGI, async-capable, automatic OpenAPI docs, and **Pydantic** models for request and response validation.

```python
app = FastAPI()
model = None

@app.on_event("startup")          # or a lifespan handler
def load(): global model; model = joblib.load("model.pkl")

class Req(BaseModel):
    features: list[float] = Field(min_length=3, max_length=3)

@app.post("/predict")
def predict(req: Req):
    return {"score": float(model.predict_proba([req.features])[0, 1]), "model_version": "v8"}
```

**Key practices**:
- **Load the model once at startup**, never per request; add `/health` (liveness) and `/ready` (model loaded) endpoints for Kubernetes.
- **Validate inputs** (types, ranges, lengths) and return **422** for bad payloads; return 5xx only for server faults. Version the API (`/v1/predict`) and include `model_version` in responses.
- **CPU-bound inference blocks the event loop**: use a plain `def` endpoint (run in a thread pool), `run_in_executor`, or multiple worker processes (`uvicorn --workers N` / gunicorn). Use `async def` only when you await I/O (feature store calls).
- **Batch endpoints** (list of instances) amortise overhead; **dynamic batching** needs a model server (see later lesson).
- **Latency**: track p50/p95/p99, not the mean. Budget = network + feature fetch + inference + serialization. Keep the model warm; avoid cold starts.
- **Packaging**: Docker image with pinned deps; deploy behind a load balancer; autoscale on CPU or request rate; roll out by canary.
- **Observability and safety**: structured request logs (id, version, latency), prediction logging for monitoring, timeouts, rate limits, auth.
- GPU models are usually better behind a dedicated model server than in plain FastAPI.

## Worked example
Service handles requests with 20 ms of CPU inference each. One worker process can do $1/0.020 = 50$ requests/s. Target is 400 req/s at 70% max utilization.

Needed workers: $400 / (50 \times 0.7) = 11.4$, so 12 worker processes, e.g. 3 pods with 4 workers each. If p99 must stay under 100 ms, the utilization cap (queueing delay grows sharply near 100%) is what protects the tail, not the average. A request with `features=[1.0, 2.0]` fails validation and returns 422 in under 1 ms without touching the model.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why load the model in a startup handler instead of inside the endpoint function?",
  "options": ["Endpoints cannot import joblib", "Loading per request adds seconds of latency and memory churn", "It improves accuracy", "FastAPI requires it for routing"],
  "answer": 1,
  "explanation": "Load once and reuse; per-request loading destroys latency and wastes resources."
}
```

```quiz
{
  "id": "q2",
  "question": "A CPU-heavy `async def` endpoint runs inference directly. What is the problem?",
  "options": ["It will return wrong results", "It blocks the event loop so other requests stall", "It uses too little CPU", "Async endpoints cannot return JSON"],
  "answer": 1,
  "explanation": "Blocking work inside async code freezes the event loop; use a sync endpoint (thread pool), an executor, or more processes."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate the endpoint logic without FastAPI. `validate(payload)` returns a list of error strings (empty if valid): `payload` must be a dict with key `'features'` that is a list of exactly 3 numbers (ints or floats, not bool). `handle_predict(payload, weights, bias, version)` returns `(status, body)`: `(422, {'errors': [...]})` if invalid, else `(200, {'score': sigmoid(w·x + b), 'model_version': version})`. `percentile(values, q)` returns the nearest-rank percentile: sort ascending and take element `ceil(q/100 * n)` (1-indexed).",
  "starterCode": "import math\n\ndef validate(payload):\n    pass\n\ndef handle_predict(payload, weights, bias, version):\n    pass\n\ndef percentile(values, q):\n    pass\n",
  "tests": "import math\nassert validate({'features': [1.0, 2, 3]}) == []\nassert len(validate({'features': [1.0, 2.0]})) >= 1\nassert len(validate({'features': [1, 2, True]})) >= 1\nassert len(validate({'features': 'abc'})) >= 1\nassert len(validate({})) >= 1\nassert len(validate([1, 2, 3])) >= 1\ns, body = handle_predict({'features': [1.0, 2.0, 3.0]}, [0.5, -0.25, 0.1], 0.0, 'v8')\nassert s == 200 and body['model_version'] == 'v8'\nassert abs(body['score'] - 1 / (1 + math.exp(-0.3))) < 1e-9\ns, body = handle_predict({'features': [1.0, 2.0]}, [0.5, -0.25, 0.1], 0.0, 'v8')\nassert s == 422 and len(body['errors']) >= 1\nassert percentile([5, 1, 3, 2, 4], 50) == 3\nassert percentile(list(range(1, 101)), 99) == 99\nassert percentile([7], 99) == 7",
  "solution": "import math\n\ndef validate(payload):\n    if not isinstance(payload, dict):\n        return ['payload must be an object']\n    if 'features' not in payload:\n        return ['features is required']\n    f = payload['features']\n    if not isinstance(f, list) or len(f) != 3:\n        return ['features must be a list of 3 numbers']\n    if any(isinstance(x, bool) or not isinstance(x, (int, float)) for x in f):\n        return ['features must contain only numbers']\n    return []\n\ndef handle_predict(payload, weights, bias, version):\n    errors = validate(payload)\n    if errors:\n        return 422, {'errors': errors}\n    z = sum(w * x for w, x in zip(weights, payload['features'])) + bias\n    return 200, {'score': 1 / (1 + math.exp(-z)), 'model_version': version}\n\ndef percentile(values, q):\n    s = sorted(values)\n    return s[math.ceil(q / 100 * len(s)) - 1]",
  "hints": ["bool is a subclass of int, so exclude it explicitly.", "Nearest rank: index = ceil(q / 100 * n) - 1 (0-indexed)."]
}
```

> [!TIP] Interview tips
> - Walk through: Pydantic validation, model loaded at startup, health/ready probes, versioned route, structured logging, Docker, autoscaling.
> - Quote latency as percentiles and size capacity from per-request service time and a utilization target.
> - Pitfall: blocking the event loop with CPU work, or one global model mutated across threads; know when to move to a model server.
