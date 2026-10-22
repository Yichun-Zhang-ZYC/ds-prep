---
id: swe-fastapi-flask
title: "FastAPI / Flask"
estimatedMinutes: 12
difficulty: medium
tags: [fastapi, flask, model-serving, pydantic, apis]
---

## Why it matters
Data scientists increasingly own the serving layer: wrapping a model in an HTTP endpoint is the classic "last mile" task. Interviewers ask which framework you would pick, how you validate input, and how to avoid reloading a 2 GB model on every request.

## Concept
**Flask** is a minimal, synchronous (WSGI) micro-framework: routes, request/response, extensions for everything else. **FastAPI** is built on Starlette + Pydantic (ASGI): type hints drive **automatic request validation**, serialization and an OpenAPI page at `/docs`, and it supports `async def` handlers.

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field

app = FastAPI()

class PredictRequest(BaseModel):                  # validated automatically -> 422 on bad input
    age: int = Field(ge=0, le=120)
    plan: str = "basic"

class PredictResponse(BaseModel):
    churn_prob: float
    model_version: str

model = None
@app.on_event("startup")                          # (or lifespan) load the model ONCE, not per request
def load():
    global model
    model = load_model("models/churn-v3.pkl")

@app.post("/v1/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="model not loaded")
    return PredictResponse(churn_prob=model.predict_proba(req), model_version="v3")

@app.get("/health")
def health():
    return {"status": "ok"}
```

For comparison, the same endpoint in Flask:

```python
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.post("/v1/predict")
def predict():
    data = request.get_json()                     # no built-in validation: you write it
    return jsonify(churn_prob=model.predict_proba(data))
```

**FastAPI vs Flask**
- FastAPI: typed validation (422 with field-level errors), auto docs, native async, dependency injection (`Depends`), the common choice for new ML services.
- Flask: simpler, huge ecosystem, fine for small apps and internal tools; add `marshmallow`/`pydantic` for validation.
- Both: run under a production server (`uvicorn`/`gunicorn`), never the dev server; scale with several worker processes behind a load balancer.

**Serving patterns for ML**
- **Load the model once** at startup, not per request; keep handlers stateless.
- Separate request/response **schemas** from model internals; return a model version.
- CPU-bound inference blocks the event loop in `async def`: use a plain `def` handler (FastAPI runs it in a thread pool) or a process pool/dedicated model server.
- Add `/health` (liveness) and readiness checks, timeouts, structured logging and metrics (latency percentiles, error rate).
- Batch requests or use a queue when per-request inference is expensive.

**Under the hood**: a decorator registers a function against `(method, path pattern)`; the framework matches the incoming request, extracts path parameters, validates and converts them, calls your function and serializes the result.

## Worked example
Scenario: `POST /v1/predict` with `{"age": -5}`.

In FastAPI, `Field(ge=0)` makes validation fail before your code runs: the client gets `422` with a message pointing to `age`. In bare Flask, `data["age"]` happily passes `-5` to the model unless you wrote the check.

Performance: loading the pickle inside `predict` costs about 800 ms per call; moving it to startup brings request time to about 5 ms, a 160x improvement, and memory stays constant per worker.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does FastAPI do automatically that bare Flask does not?",
  "options": [
    "Trains the model",
    "Validates and parses request data from type hints (Pydantic) and generates OpenAPI docs",
    "Scales to more servers",
    "Encrypts traffic"
  ],
  "answer": 1,
  "explanation": "Type-hinted models drive validation (422 errors), serialization and the /docs page."
}
```

```quiz
{
  "id": "q2",
  "question": "Where should a large ML model be loaded in a web service?",
  "options": [
    "Once at application startup, shared by requests in that worker",
    "Inside every request handler",
    "On the client",
    "In a new thread per request"
  ],
  "answer": 0,
  "explanation": "Loading per request adds hundreds of milliseconds of latency and memory churn."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build a tiny framework to see how `@app.get`-style decorators work. `App.route(method, pattern)` is a decorator factory that registers a handler (and returns the original function). `handle(method, path)` matches `{name}` placeholders against single path segments, passes them to the handler as keyword arguments (converted to `int` if all digits) and returns `(200, result)`. Return `(405, None)` if the path matches a route but not for that method, else `(404, None)`.",
  "starterCode": "import re\n\nclass App:\n    \"\"\"Tiny web framework in the style of FastAPI/Flask decorators.\n    @app.route('GET', '/users/{user_id}') registers a handler. In handle(), path\n    parameters like {user_id} are matched against one path segment and passed as\n    keyword arguments, converted to int when the segment is all digits.\n    handle(method, path) returns (status, result):\n      200 and the handler's return value on a match;\n      405 if the path matches some route but not for this method;\n      404 if no route matches the path (result is None for 404 and 405).\"\"\"\n\n    def __init__(self):\n        self.routes = []   # list of (method, compiled regex, handler)\n\n    def route(self, method, pattern):\n        pass\n\n    def handle(self, method, path):\n        pass\n",
  "tests": "app = App()\n\n@app.route(\"GET\", \"/health\")\ndef health():\n    return {\"status\": \"ok\"}\n\n@app.route(\"GET\", \"/users/{user_id}\")\ndef get_user(user_id):\n    return {\"id\": user_id}\n\n@app.route(\"POST\", \"/users/{user_id}/predict/{model}\")\ndef predict(user_id, model):\n    return f\"{model}:{user_id}\"\n\nassert app.handle(\"GET\", \"/health\") == (200, {\"status\": \"ok\"})\nassert app.handle(\"GET\", \"/users/42\") == (200, {\"id\": 42})\nassert app.handle(\"GET\", \"/users/abc\") == (200, {\"id\": \"abc\"})\nassert app.handle(\"POST\", \"/users/7/predict/xgb\") == (200, \"xgb:7\")\nassert app.handle(\"POST\", \"/health\") == (405, None)\nassert app.handle(\"GET\", \"/nope\") == (404, None)\nassert app.handle(\"GET\", \"/users/1/extra\") == (404, None)\nassert get_user(5) == {\"id\": 5}\n",
  "solution": "import re\n\nclass App:\n    def __init__(self):\n        self.routes = []\n\n    def route(self, method, pattern):\n        regex = re.compile(\"^\" + re.sub(r\"\\{(\\w+)\\}\", r\"(?P<\\1>[^/]+)\", pattern) + \"$\")\n        def deco(func):\n            self.routes.append((method.upper(), regex, func))\n            return func\n        return deco\n\n    def handle(self, method, path):\n        path_matched = False\n        for m, regex, func in self.routes:\n            match = regex.match(path)\n            if not match:\n                continue\n            path_matched = True\n            if m == method.upper():\n                kwargs = {k: int(v) if v.isdigit() else v for k, v in match.groupdict().items()}\n                return 200, func(**kwargs)\n        return (405, None) if path_matched else (404, None)\n",
  "hints": [
    "Turn the pattern into a regex with `re.sub(r'\\{(\\w+)\\}', r'(?P<\\1>[^/]+)', pattern)`, anchored with ^ and $.",
    "Keep scanning all routes: remember if any matched the path, and only return 405 at the end."
  ]
}
```

> [!TIP] Interview tips
> - Justify FastAPI by validation, docs and async, but note Flask is fine for simple internal apps.
> - Say "load the model at startup, validate with schemas, health checks, multiple workers behind a load balancer."
> - Pitfall: blocking CPU work inside `async def` stalls all concurrent requests; and the dev server is not a production server.
