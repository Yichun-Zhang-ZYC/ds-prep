---
id: swe-error-handling-and-retries
title: Error handling, retries and idempotency
estimatedMinutes: 14
difficulty: hard
tags: [retries, idempotency, reliability, circuit-breaker, errors]
---

## Why it matters
Distributed systems fail partially and unpredictably: timeouts, 503s, duplicate messages, half-finished writes. Interviewers use this topic to see whether you design for failure, and whether you know why retries without idempotency double-charge customers. It applies to API clients, pipelines, queue consumers and model-serving calls alike.

## Concept
**Error taxonomy**: **transient** (timeouts, connection resets, 429/503, deadlocks) may succeed on retry; **permanent** (400, 404, validation, auth errors, bugs) never will. Retry only the first kind. HTTP 5xx and 429 are retryable (honour `Retry-After`); most 4xx are not. A timeout is ambiguous: the request may have succeeded.

**Handling in code**: catch specific exceptions, not bare `except`; add context and re-raise (`raise ... from err`) so tracebacks keep the cause; never swallow errors silently; fail fast on invalid input; use `finally`/context managers to release resources; map internal errors to clean API responses and log with a correlation id. Keep a clear boundary: libraries raise, the top level decides to log, retry or return an error.

**Retries**: use **exponential backoff** $d_i = \min(\text{cap}, b \cdot 2^i)$ with **jitter** (for example "full jitter": sleep a uniform random value in $[0, d_i]$) so thousands of clients do not retry in lockstep (thundering herd). Bound attempts and total time; set per-call **timeouts** always. Retries multiply load: if 3 layers each retry 3 times, a failing backend can see up to 27x traffic (**retry amplification**). Mitigate by retrying at one layer, using a **retry budget** (for example at most 10% extra requests) and fast failure.

**Circuit breaker**: after enough consecutive failures, stop calling the dependency for a cool-down period (open), then allow a trial call (half-open). It protects the dependency and keeps latency low. Pair with **fallbacks** (cached value, default, degraded feature) and **bulkheads** (separate pools per dependency). Libraries: `tenacity`, `backoff`, urllib3 `Retry`, cloud SDK built-ins.

**Idempotency**: an operation is idempotent if repeating it has the same effect as doing it once. Reads, `PUT`, `DELETE` are naturally so; `POST` charge is not. Make writes idempotent with a client-supplied **idempotency key** stored with the result (unique constraint or `INSERT ... ON CONFLICT DO NOTHING`), natural keys and upserts, or deterministic outputs (overwrite a partition instead of appending). Delivery guarantees: queues are usually **at-least-once**, so consumers must be idempotent; "exactly-once effect" = at-least-once delivery + idempotent processing.

**Pipelines**: make tasks re-runnable (overwrite by partition/date), write to a temp location then atomically rename or swap, checkpoint progress, send poison messages to a **dead-letter queue** after N failures, and alert on DLQ depth.

**Pitfalls**: retrying non-idempotent calls blindly; no timeouts; retrying permanent errors; no jitter; logging and re-raising at every layer (duplicate noise); catching `Exception` and returning `None`.

## Worked example
Illustrative payment flow. A client calls `POST /charges` with an `Idempotency-Key: abc123`; the server charges the card but the response is lost (timeout). The client retries with the same key. The server finds `abc123` in its table, skips the charge and returns the stored response. Without the key, the customer is charged twice.

Backoff: base 0.5 s, factor 2, cap 8 s gives delays 0.5, 1, 2, 4, 8, 8, ... With full jitter each client sleeps a random time up to that bound, spreading 1,000 clients across the window instead of 1,000 requests at exactly t = 0.5 s. If each of those calls fails 3 times across 3 attempts, the dependency sees up to 3x its normal load from that layer alone, which is why a retry budget and a circuit breaker matter.

Queue consumer: a message is processed, then the worker crashes before acking. The broker redelivers. Storing `message_id` in the same transaction as the side effect (unique constraint) turns the duplicate into a no-op.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A POST /orders call times out. What is the safest way to retry?",
  "options": [
    "Retry immediately with a new request id",
    "Retry with the same idempotency key so the server can deduplicate",
    "Never retry POST",
    "Retry in a tight loop until it works"
  ],
  "answer": 1,
  "explanation": "A timeout is ambiguous; the order may have been created. A stable idempotency key makes the retry safe."
}
```

```quiz
{
  "id": "q2",
  "question": "Why add jitter to exponential backoff?",
  "options": [
    "To make delays longer",
    "To desynchronise clients so retries do not arrive in waves",
    "To avoid timeouts",
    "To change the HTTP status code"
  ],
  "answer": 1,
  "explanation": "Without jitter, many clients retry at the same moments and re-overload a recovering service."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `backoff_delays(retries, base, factor, cap)` returning `min(cap, base * factor**i)` for each retry i, and `retry(fn, attempts, sleep, retry_on, ...)`: call `fn` up to `attempts` times, sleeping with `sleep(delay)` between attempts when the exception is in `retry_on`; re-raise after the last attempt; exceptions not in `retry_on` propagate immediately.",
  "starterCode": "def backoff_delays(retries, base=1.0, factor=2.0, cap=30.0):\n    \"\"\"Delays to sleep before each retry: min(cap, base * factor**i) for i in range(retries).\"\"\"\n    pass\n\ndef retry(fn, attempts, sleep, retry_on=(Exception,), base=1.0, factor=2.0, cap=30.0):\n    \"\"\"Call fn() up to `attempts` times. If it raises an exception in `retry_on`,\n    call sleep(delay) using exponential backoff and try again; after the last\n    attempt re-raise the error. Exceptions not in retry_on propagate immediately.\"\"\"\n    pass\n\nslept = []\nstate = {\"n\": 0}\ndef flaky():\n    state[\"n\"] += 1\n    if state[\"n\"] < 3:\n        raise ConnectionError(\"boom\")\n    return \"ok\"\n\nprint(retry(flaky, 5, slept.append), slept)",
  "tests": "assert backoff_delays(5, base=0.5, cap=8) == [0.5, 1.0, 2.0, 4.0, 8.0]\nassert backoff_delays(6, base=0.5, cap=8)[-1] == 8\nassert backoff_delays(0) == []\n\nslept = []\nstate = {\"n\": 0}\ndef flaky():\n    state[\"n\"] += 1\n    if state[\"n\"] < 3:\n        raise ConnectionError(\"boom\")\n    return \"ok\"\nassert retry(flaky, 5, slept.append) == \"ok\"\nassert slept == [1.0, 2.0] and state[\"n\"] == 3\n\nslept = []\ndef always():\n    raise ConnectionError(\"down\")\ntry:\n    retry(always, 3, slept.append)\n    assert False\nexcept ConnectionError:\n    pass\nassert slept == [1.0, 2.0]\n\nslept = []\ncalls = {\"n\": 0}\ndef bad():\n    calls[\"n\"] += 1\n    raise ValueError(\"bug\")\ntry:\n    retry(bad, 5, slept.append, retry_on=(ConnectionError,))\n    assert False\nexcept ValueError:\n    pass\nassert calls[\"n\"] == 1 and slept == []",
  "solution": "def backoff_delays(retries, base=1.0, factor=2.0, cap=30.0):\n    return [min(cap, base * factor ** i) for i in range(retries)]\n\ndef retry(fn, attempts, sleep, retry_on=(Exception,), base=1.0, factor=2.0, cap=30.0):\n    delays = backoff_delays(attempts - 1, base, factor, cap)\n    for i in range(attempts):\n        try:\n            return fn()\n        except retry_on:\n            if i == attempts - 1:\n                raise\n            sleep(delays[i])",
  "hints": [
    "There are attempts - 1 sleeps at most, because you do not sleep after the final failure.",
    "`except retry_on:` accepts a tuple of exception types."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `process_once(store, key, fn)` for idempotent processing. Return the stored result when `key` exists (even if that result is `None`) without calling `fn`; otherwise call `fn`, store and return the result. If `fn` raises, store nothing.",
  "starterCode": "def process_once(store, key, fn):\n    \"\"\"Idempotent processing. If `key` is already in `store`, return the stored\n    result without calling fn. Otherwise call fn(), store the result under key and\n    return it. If fn raises, store nothing and let the error propagate.\"\"\"\n    pass\n\nstore = {}\nprint(process_once(store, \"pay-1\", lambda: \"charged\"), process_once(store, \"pay-1\", lambda: \"charged again\"))",
  "tests": "store = {}\ncalls = []\ndef charge():\n    calls.append(1)\n    return {\"status\": \"charged\"}\na = process_once(store, \"k1\", charge)\nb = process_once(store, \"k1\", charge)\nassert a == b == {\"status\": \"charged\"} and len(calls) == 1\nprocess_once(store, \"k2\", charge)\nassert len(calls) == 2\n\ndef failing():\n    raise RuntimeError(\"x\")\ntry:\n    process_once(store, \"k3\", failing)\n    assert False\nexcept RuntimeError:\n    pass\nassert \"k3\" not in store\nassert process_once(store, \"k3\", lambda: 7) == 7\nassert process_once(store, \"none\", lambda: None) is None\nn = []\nprocess_once(store, \"none\", lambda: n.append(1))\nassert n == []",
  "solution": "def process_once(store, key, fn):\n    if key in store:\n        return store[key]\n    result = fn()\n    store[key] = result\n    return result",
  "hints": [
    "Test membership with `key in store`, not `store.get(key)`.",
    "Only write to the store after fn returns successfully."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `CircuitBreaker(threshold, timeout, clock)` with `call(fn)`. After `threshold` consecutive failures it opens; while open and less than `timeout` seconds have passed, `call` raises `CircuitOpen` without calling `fn`. After the timeout, one trial call is allowed: success closes the breaker and resets the failure count, failure reopens it immediately. Failures re-raise the original exception.",
  "starterCode": "class CircuitOpen(Exception):\n    pass\n\nclass CircuitBreaker:\n    \"\"\"Opens after `threshold` consecutive failures. While open, calls raise\n    CircuitOpen without invoking fn. After `timeout` seconds one trial call is\n    allowed (half-open): success closes the breaker, failure reopens it.\n    `clock()` returns the current time in seconds.\"\"\"\n    def __init__(self, threshold, timeout, clock):\n        pass\n\n    def call(self, fn):\n        pass\n\nt = [0]\ncb = CircuitBreaker(2, 10, lambda: t[0])\ndef bad():\n    raise ValueError(\"down\")\nfor _ in range(2):\n    try:\n        cb.call(bad)\n    except ValueError:\n        pass\ntry:\n    cb.call(bad)\nexcept CircuitOpen:\n    print(\"open\")",
  "tests": "t = [0]\ncb = CircuitBreaker(2, 10, lambda: t[0])\ncalls = []\ndef bad():\n    calls.append(1)\n    raise ValueError(\"down\")\ndef good():\n    calls.append(1)\n    return \"ok\"\nfor _ in range(2):\n    try:\n        cb.call(bad)\n        assert False\n    except ValueError:\n        pass\nassert len(calls) == 2\ntry:\n    cb.call(good)\n    assert False\nexcept CircuitOpen:\n    pass\nassert len(calls) == 2\nt[0] = 9\ntry:\n    cb.call(good)\n    assert False\nexcept CircuitOpen:\n    pass\nt[0] = 10\nassert cb.call(good) == \"ok\"\nassert len(calls) == 3\ntry:\n    cb.call(bad)\n    assert False\nexcept ValueError:\n    pass\nassert cb.call(good) == \"ok\"\ncb2 = CircuitBreaker(2, 10, lambda: t[0])\nt[0] = 20\ntry:\n    cb2.call(bad)\nexcept ValueError:\n    pass\nassert cb2.call(good) == \"ok\"\ntry:\n    cb2.call(bad)\nexcept ValueError:\n    pass\nassert cb2.call(good) == \"ok\"\ncb3 = CircuitBreaker(1, 5, lambda: t[0])\ntry:\n    cb3.call(bad)\nexcept ValueError:\n    pass\nt[0] = 25\ntry:\n    cb3.call(bad)\nexcept ValueError:\n    pass\ntry:\n    cb3.call(good)\n    assert False\nexcept CircuitOpen:\n    pass",
  "solution": "class CircuitOpen(Exception):\n    pass\n\nclass CircuitBreaker:\n    def __init__(self, threshold, timeout, clock):\n        self.threshold = threshold\n        self.timeout = timeout\n        self.clock = clock\n        self.failures = 0\n        self.opened_at = None\n\n    def call(self, fn):\n        half_open = False\n        if self.opened_at is not None:\n            if self.clock() - self.opened_at < self.timeout:\n                raise CircuitOpen(\"circuit open\")\n            half_open = True\n        try:\n            result = fn()\n        except Exception:\n            self.failures += 1\n            if half_open or self.failures >= self.threshold:\n                self.opened_at = self.clock()\n            raise\n        self.failures = 0\n        self.opened_at = None\n        return result",
  "hints": [
    "Store `opened_at` (None when closed) and a consecutive failure counter.",
    "In the half-open trial, a single failure should reopen the circuit regardless of the threshold."
  ]
}
```

> [!TIP] Interview tips
- Classify errors first: transient vs permanent, and say a timeout is ambiguous.
- Give the retry recipe: timeouts, exponential backoff with jitter, bounded attempts, retry budget.
- Pair retries with idempotency keys, and say "at-least-once delivery plus idempotent consumers".
- Mention circuit breakers, fallbacks and dead-letter queues for pipelines.
