---
id: swe-rest-principles
title: "REST principles"
estimatedMinutes: 10
difficulty: easy
tags: [rest, http, api-design, idempotency]
---

## Why it matters
Nearly every model is served, and every data platform integrated, through an HTTP API. Interviews ask you to design endpoints for a prediction service or explain why a PUT retry is safe but a POST retry may double-charge. Clean REST vocabulary is a quick signal of backend maturity.

## Concept
**REST** (Representational State Transfer) models an API as **resources** (nouns, identified by URLs) manipulated with a uniform set of **HTTP methods**. Key constraints: client-server, **stateless** requests (each carries all needed context, e.g. an auth token, so any server instance can handle it), cacheable responses, uniform interface.

```http
GET    /v1/models               200  list models (safe, idempotent)
POST   /v1/models               201  create; Location: /v1/models/42 (not idempotent)
GET    /v1/models/42            200  fetch one; 404 if missing
PUT    /v1/models/42            200  replace whole resource (idempotent)
PATCH  /v1/models/42            200  partial update
DELETE /v1/models/42            204  remove, no body (idempotent)
POST   /v1/models/42/predict    200  action that is not CRUD: verb allowed as a sub-resource
GET    /v1/predictions?model=42&limit=50&cursor=abc    filtering + pagination via query params
```

**Method semantics**
- **Safe** (no side effects): `GET`, `HEAD`. **Idempotent** (repeating gives the same server state): `GET`, `PUT`, `DELETE`. `POST` is neither, so clients retrying a timed-out POST need an **idempotency key** header to avoid duplicates.
- `PUT` replaces the whole resource; `PATCH` changes part of it.

**Status codes**: `200` OK, `201` Created, `204` No Content, `400` malformed or invalid input, `401` unauthenticated, `403` authenticated but not allowed, `404` not found, `409` conflict, `422` validation failed, `429` rate limited, `500` server bug, `503` unavailable. Pick the code that tells the client whether *retrying helps* (5xx and 429 maybe, 4xx no).

**Design guidance**
- Plural nouns, nesting only one level (`/users/7/orders`), no verbs in paths except explicit actions (`/models/42/predict`).
- **Pagination** (cursor-based scales better than offset), filtering and sorting via query params.
- **Versioning** (`/v1/`) so breaking changes do not break clients; consistent JSON error bodies (`code`, `message`).
- For ML serving: batch endpoints, request ids, input schema validation, and returning model version in the response.

## Worked example
Scenario: a client calls `POST /v1/orders`, the connection times out, and it retries. Did the server create one order or two?

Without protection: possibly two. With an `Idempotency-Key: 9f3a...` header, the server stores the key with the first response and replays it on the retry, so one order exists. Contrast `PUT /v1/orders/42` with the same body: sending it ten times leaves one identical resource, so it is naturally idempotent, and `DELETE /v1/orders/42` repeated returns `404` after the first success without changing state further.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which set contains only idempotent HTTP methods?",
  "options": [
    "GET, POST, PUT",
    "POST, PATCH, DELETE",
    "GET, PUT, DELETE",
    "PUT, POST, HEAD"
  ],
  "answer": 2,
  "explanation": "Repeating GET, PUT or DELETE leaves the same server state. POST (create) is not idempotent, and PATCH is not guaranteed to be."
}
```

```quiz
{
  "id": "q2",
  "question": "A request has a valid token but the user lacks permission for the resource. Which status fits?",
  "options": [
    "403 Forbidden",
    "401 Unauthorized",
    "404 Not Found only",
    "500 Internal Server Error"
  ],
  "answer": 0,
  "explanation": "401 means not authenticated (missing or invalid credentials); 403 means authenticated but not authorized."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `handle(store, method, path, body=None)` as an in-memory REST API for `/items` (store is a `{id: item}` dict). Support `GET /items`, `POST /items` (201, id = max id + 1, 400 without a `name`), `GET`/`PUT`/`DELETE /items/<id>` (200/200/204, 404 if absent, PUT needs `name` else 400). Return `(status, body)`; unsupported methods on known paths give 405 and unknown paths 404.",
  "starterCode": "def handle(store, method, path, body=None):\n    \"\"\"In-memory REST API for the resource /items. store is a dict {int id: dict}.\n    Return (status_code, response_body).\n      GET    /items        -> 200, list of items sorted by id\n      POST   /items        -> 201, the created item; id = max existing id + 1 (1 if empty);\n                              body must be a dict with a 'name' key else 400\n      GET    /items/<id>   -> 200 item, or 404 if absent\n      PUT    /items/<id>   -> 200 replaced item (body must have 'name' else 400); 404 if absent\n      DELETE /items/<id>   -> 204 with body None, or 404 if absent\n    Stored/returned items look like {'id': id, 'name': ...}. Unsupported method on a\n    known path -> 405; unknown path -> 404.\"\"\"\n    pass\n",
  "tests": "s = {}\nassert handle(s, \"GET\", \"/items\") == (200, [])\nst, b = handle(s, \"POST\", \"/items\", {\"name\": \"a\"})\nassert st == 201 and b == {\"id\": 1, \"name\": \"a\"}\nassert handle(s, \"POST\", \"/items\", {\"name\": \"b\"})[1][\"id\"] == 2\nassert handle(s, \"POST\", \"/items\", {\"nope\": 1})[0] == 400\nassert handle(s, \"GET\", \"/items/2\") == (200, {\"id\": 2, \"name\": \"b\"})\nassert handle(s, \"GET\", \"/items/9\")[0] == 404\nassert handle(s, \"PUT\", \"/items/1\", {\"name\": \"z\"}) == (200, {\"id\": 1, \"name\": \"z\"})\nassert handle(s, \"PUT\", \"/items/1\", {\"name\": \"z\"}) == (200, {\"id\": 1, \"name\": \"z\"})\nassert handle(s, \"PUT\", \"/items/9\", {\"name\": \"z\"})[0] == 404\nassert handle(s, \"DELETE\", \"/items/1\") == (204, None)\nassert handle(s, \"DELETE\", \"/items/1\")[0] == 404\nassert handle(s, \"PATCH\", \"/items/2\")[0] == 405\nassert handle(s, \"DELETE\", \"/items\")[0] == 405\nassert handle(s, \"GET\", \"/users\")[0] == 404\nassert handle(s, \"GET\", \"/items\")[1] == [{\"id\": 2, \"name\": \"b\"}]\n",
  "solution": "def handle(store, method, path, body=None):\n    parts = [p for p in path.split(\"/\") if p]\n    if not parts or parts[0] != \"items\" or len(parts) > 2:\n        return 404, {\"error\": \"not found\"}\n    if len(parts) == 1:\n        if method == \"GET\":\n            return 200, [store[k] for k in sorted(store)]\n        if method == \"POST\":\n            if not isinstance(body, dict) or \"name\" not in body:\n                return 400, {\"error\": \"name required\"}\n            new_id = max(store, default=0) + 1\n            store[new_id] = {\"id\": new_id, \"name\": body[\"name\"]}\n            return 201, store[new_id]\n        return 405, {\"error\": \"method not allowed\"}\n    try:\n        item_id = int(parts[1])\n    except ValueError:\n        return 404, {\"error\": \"not found\"}\n    if method not in (\"GET\", \"PUT\", \"DELETE\"):\n        return 405, {\"error\": \"method not allowed\"}\n    if item_id not in store:\n        return 404, {\"error\": \"not found\"}\n    if method == \"GET\":\n        return 200, store[item_id]\n    if method == \"PUT\":\n        if not isinstance(body, dict) or \"name\" not in body:\n            return 400, {\"error\": \"name required\"}\n        store[item_id] = {\"id\": item_id, \"name\": body[\"name\"]}\n        return 200, store[item_id]\n    del store[item_id]\n    return 204, None\n",
  "hints": [
    "Split the path on '/' and dispatch on the number of segments (collection vs single item).",
    "Check the 405 and 404 cases before touching the store for item routes."
  ]
}
```

> [!TIP] Interview tips
> - Recite safe vs idempotent per method and give the POST-retry/idempotency-key example.
> - Know 401 vs 403 and 400/422 vs 500; wrong codes are a common design critique.
> - Pitfall: stateful servers (session in memory) break horizontal scaling; keep state in tokens or shared stores.
