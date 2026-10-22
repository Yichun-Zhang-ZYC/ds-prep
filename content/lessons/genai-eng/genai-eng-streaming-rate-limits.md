---
id: genai-eng-streaming-rate-limits
title: Streaming, rate limits
estimatedMinutes: 11
difficulty: medium
tags: [genai, llm-api, streaming, rate-limits]
---

## Why it matters
Chat UIs feel instant only because of streaming, and production traffic hits rate limits sooner than expected. Interviewers probe whether you can keep an LLM feature responsive and reliable under load: SSE streaming, 429 handling, and capacity planning against tokens-per-minute.

## Concept
**Streaming**: with `stream=true` the server sends tokens as they are generated over **Server-Sent Events** (`text/event-stream`, lines like `data: {...}`). OpenAI-style APIs send delta chunks and end with `data: [DONE]`; Anthropic sends typed events (`message_start`, `content_block_delta`, `message_delta`, `message_stop`). Streaming does not shorten total generation time; it cuts perceived latency to time-to-first-token.
- Accumulate deltas on the client; tool-call arguments arrive as **partial JSON**, so parse only after the block ends.
- Relay to browsers with SSE or WebSockets; disable proxy buffering (for example nginx `proxy_buffering off`) or chunks arrive in a lump.
- Handle disconnects: cancel the upstream request so you stop paying for tokens nobody reads. Errors can occur mid-stream after a 200 status, so surface them as events.
- Trade-off: you cannot validate or moderate the full output before the user sees it; for structured output, stream and validate at the end, or buffer.

**Rate limits**: providers cap **requests per minute (RPM)**, **tokens per minute (TPM)** (input and output, sometimes separately), daily quotas and concurrent requests, per organization and model tier. Exceeding returns **HTTP 429** (often with `retry-after`); overload or server errors (500, 502, 503, 529) are also retryable. 400, 401 and 403 are not.

**Handling**:
- **Exponential backoff with jitter**: wait $\text{rand}(0, \min(\text{cap}, \text{base} \cdot 2^{k}))$ on attempt $k$; jitter avoids synchronized retries (thundering herd). Honor `retry-after` when present. Cap the retry count and total time.
- **Client-side throttling**: a token bucket sized to your TPM/RPM, plus a queue with concurrency limits; estimate tokens before sending (input plus `max_tokens`, because some providers reserve it).
- Make retries safe: only retry idempotent calls, or use idempotency keys; set timeouts.
- **Fallbacks**: second region, second provider or a smaller model; request higher limits; use batch APIs for offline work; reduce tokens via caching.
- Prioritize interactive traffic over batch jobs, and alert on 429 rate.

## Worked example
Limit: 200,000 TPM. Average request: 3,000 input plus 1,000 `max_tokens` reserved = 4,000 tokens. Capacity: 200,000 / 4,000 = 50 requests per minute, about 0.83 per second. A burst of 100 users in one second will mostly get 429s unless you queue.

Backoff with base 1 s, cap 30 s: ceilings for attempts 0 to 5 are 1, 2, 4, 8, 16, 30 s (32 capped). With full jitter the actual waits are random in those ranges. If the server says `retry-after: 7`, wait 7 s instead. After 5 retries (about 30 s expected total), fail over to the fallback model or return an error. Streaming is shown next to this: the user sees the first token at roughly 0.4 s, while the 10 s full generation continues in the background.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why add jitter to exponential backoff?",
  "options": [
    "To make retries slower on average",
    "To prevent many clients from retrying at the same instant after a shared failure",
    "To avoid needing a retry cap",
    "Because HTTP requires it"
  ],
  "answer": 1,
  "explanation": "Without jitter, clients that failed together retry together and re-trigger the limit (thundering herd). Randomizing the wait spreads load."
}
```

```quiz
{
  "id": "q2",
  "question": "Which statement about streaming is correct?",
  "options": [
    "It reduces total generation time",
    "It reduces perceived latency by showing tokens as they arrive, but total time is the same",
    "It guarantees the response is valid JSON",
    "It removes the need for rate limiting"
  ],
  "answer": 1,
  "explanation": "Streaming improves time-to-first-token as the user perceives it; decode speed is unchanged, and validation has to wait for the end."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement the building blocks. `parse_sse(lines)` takes SSE lines; for lines starting with `data:` parse the JSON payload and concatenate its `delta` field; ignore other lines (events, comments, blanks); stop at `data: [DONE]`. `backoff_delay(attempt, base, cap, rng)` = `rng() * min(cap, base * 2**attempt)`. `call_with_retry(fn, max_retries, sleep, base, cap, rng)` calls `fn()`; on `RateLimitError` it calls `sleep(e.retry_after)` if provided, else `sleep(backoff_delay(...))`, and retries up to `max_retries` times, re-raising on the last failure.",
  "starterCode": "import json\nimport random\n\nclass RateLimitError(Exception):\n    def __init__(self, retry_after=None):\n        super().__init__(\"rate limited\")\n        self.retry_after = retry_after\n\ndef parse_sse(lines):\n    pass\n\ndef backoff_delay(attempt, base, cap, rng):\n    pass\n\ndef call_with_retry(fn, max_retries, sleep, base=1.0, cap=30.0, rng=random.random):\n    pass\n",
  "tests": "lines = [\"event: message\", 'data: {\"delta\": \"Hel\"}', \"\", 'data: {\"delta\": \"lo\"}', \": keep-alive\", 'data: {\"delta\": \" world\"}', \"data: [DONE]\", 'data: {\"delta\": \"ignored\"}']\nassert parse_sse(lines) == \"Hello world\"\nassert parse_sse([]) == \"\"\n\nassert backoff_delay(0, 1, 30, lambda: 1.0) == 1.0\nassert backoff_delay(3, 1, 30, lambda: 1.0) == 8.0\nassert backoff_delay(10, 1, 30, lambda: 0.5) == 15.0\n\nclass Flaky:\n    def __init__(self, fails, retry_after=None):\n        self.fails, self.retry_after, self.calls = fails, retry_after, 0\n    def __call__(self):\n        self.calls += 1\n        if self.calls <= self.fails:\n            raise RateLimitError(self.retry_after)\n        return \"ok\"\n\nsleeps = []\nf = Flaky(2)\nassert call_with_retry(f, 5, sleeps.append, base=1.0, cap=30.0, rng=lambda: 1.0) == \"ok\"\nassert sleeps == [1.0, 2.0] and f.calls == 3\n\nsleeps = []\nassert call_with_retry(Flaky(1, retry_after=7), 3, sleeps.append, rng=lambda: 1.0) == \"ok\"\nassert sleeps == [7]\n\nsleeps = []\nf = Flaky(99)\ntry:\n    call_with_retry(f, 2, sleeps.append, rng=lambda: 1.0)\n    assert False\nexcept RateLimitError:\n    pass\nassert f.calls == 3 and len(sleeps) == 2",
  "solution": "import json\nimport random\n\nclass RateLimitError(Exception):\n    def __init__(self, retry_after=None):\n        super().__init__(\"rate limited\")\n        self.retry_after = retry_after\n\ndef parse_sse(lines):\n    out = []\n    for line in lines:\n        if not line.startswith(\"data:\"):\n            continue\n        payload = line[5:].strip()\n        if payload == \"[DONE]\":\n            break\n        out.append(json.loads(payload).get(\"delta\", \"\"))\n    return \"\".join(out)\n\ndef backoff_delay(attempt, base, cap, rng):\n    return rng() * min(cap, base * 2 ** attempt)\n\ndef call_with_retry(fn, max_retries, sleep, base=1.0, cap=30.0, rng=random.random):\n    for attempt in range(max_retries + 1):\n        try:\n            return fn()\n        except RateLimitError as e:\n            if attempt == max_retries:\n                raise\n            if e.retry_after is not None:\n                sleep(e.retry_after)\n            else:\n                sleep(backoff_delay(attempt, base, cap, rng))",
  "hints": [
    "Use `line.startswith('data:')` and `json.loads` on the rest.",
    "Loop `range(max_retries + 1)`; on the final attempt re-raise instead of sleeping."
  ]
}
```

> [!TIP] Interview tips
> - Say what streaming does and does not do (perceived latency, not total time) and mention partial tool-call JSON, proxy buffering and cancel-on-disconnect.
> - For 429s: exponential backoff plus jitter, honor `retry-after`, cap retries, throttle client-side, and have a fallback model or provider.
> - Do capacity math in TPM, including reserved `max_tokens`.
