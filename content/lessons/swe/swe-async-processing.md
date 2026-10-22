---
id: swe-async-processing
title: Async processing
estimatedMinutes: 12
difficulty: medium
tags: [async, asyncio, concurrency, threads, background-jobs]
---

## Why it matters
Model calls, DB queries and HTTP requests spend most of their time waiting. Knowing when to use asyncio, threads, processes or a background job queue is a standard backend and ML-serving interview topic, as is the pitfall of blocking an event loop.

## Concept
**Synchronous** code waits for each call to finish. **Asynchronous** code starts an operation and does other work while it waits. The key split:
- **I/O-bound** work (network, disk, DB, calling an LLM API): waiting dominates. Use **asyncio** (one thread, cooperative) or **threads**.
- **CPU-bound** work (feature computation, model inference on CPU): needs real parallelism. Use **processes** (`multiprocessing`, `ProcessPoolExecutor`) or native code that releases the GIL, since the Python **GIL** lets only one thread run Python bytecode at a time.

**asyncio** runs an event loop. `async def` defines a coroutine; `await` yields control until the awaited operation finishes. Concurrency comes from scheduling many coroutines at once.

```python
import asyncio

async def fetch(i):
    await asyncio.sleep(1)        # stand-in for a network call
    return i * 2

async def main():
    sem = asyncio.Semaphore(10)   # cap concurrency
    async def bounded(i):
        async with sem:
            return await fetch(i)
    return await asyncio.gather(*(bounded(i) for i in range(100)))

results = asyncio.run(main())     # ~10 s, not 100 s
```

**Pitfalls**:
- A blocking call (`time.sleep`, `requests.get`, heavy NumPy) inside a coroutine freezes the whole loop. Use `await asyncio.to_thread(fn)` or `run_in_executor` to offload it.
- Unbounded concurrency overwhelms downstream services; use a **semaphore** and timeouts (`asyncio.wait_for`).
- `gather` fails fast on the first exception unless `return_exceptions=True`.

**Background jobs** (Celery, RQ, Cloud Tasks, a message queue): when work takes seconds to minutes, return **202 Accepted** with a job id immediately, process in a worker, and let the client poll `GET /jobs/{id}` or receive a webhook. In FastAPI, `async def` endpoints run on the event loop (never block them), plain `def` endpoints run in a thread pool, and `BackgroundTasks` suits small fire-and-forget work, not durable jobs.

**Concurrency is not parallelism**: concurrency is interleaving many tasks; parallelism is running them simultaneously on multiple cores.

Makespan with $w$ workers and $n$ equal tasks of duration $d$: $\lceil n/w \rceil \cdot d$.

## Worked example
An endpoint enriches a request by calling 5 services, each taking 200 ms. Sequentially: 1,000 ms. With `asyncio.gather`, all five overlap: about 200 ms (the slowest). If one is slow at 800 ms, total is 800 ms, so set a timeout (say 300 ms) and degrade gracefully. For 100 items with a semaphore of 10 and 1 s per call: $\lceil 100/10 \rceil \cdot 1 = 10$ s instead of 100 s. A 30 s PDF-to-embedding job goes to a queue instead: the API returns 202 with a job id in a few milliseconds.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which workload benefits most from asyncio (single thread) alone?",
  "options": ["Training a model on CPU", "Making 500 concurrent HTTP requests to an API", "Matrix multiplication in NumPy", "Image resizing of 10,000 files"],
  "answer": 1,
  "explanation": "Many concurrent network waits is classic I/O-bound work. The other options are CPU-bound and need processes or native parallelism."
}
```

```quiz
{
  "id": "q2",
  "question": "Inside an async def endpoint you call time.sleep(2). What is the effect?",
  "options": ["Only that request waits", "The whole event loop is blocked, stalling every other request on that worker", "Python automatically makes it non-blocking", "It raises a RuntimeError"],
  "answer": 1,
  "explanation": "time.sleep is a blocking call. Use await asyncio.sleep, or offload blocking code with asyncio.to_thread."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate a bounded worker pool. Write `makespan(durations, workers)`: tasks are taken in the given order and each is started on whichever worker becomes free first (all workers are free at time 0). Return the time when the last task finishes (0 for no tasks). Then write `speedup(durations, workers)` = sequential time divided by makespan (1.0 for no tasks).",
  "setup": "import heapq",
  "starterCode": "def makespan(durations, workers):\n    pass\n\ndef speedup(durations, workers):\n    pass\n\nprint(makespan([4, 3, 2, 1], 2))",
  "tests": "assert makespan([4, 3, 2, 1], 2) == 5\nassert makespan([1] * 100, 10) == 10\nassert makespan([], 3) == 0\nassert makespan([5], 4) == 5\nassert makespan([2, 2, 2], 1) == 6\nassert abs(speedup([4, 3, 2, 1], 2) - 2.0) < 1e-9\nassert speedup([], 2) == 1.0",
  "solution": "def makespan(durations, workers):\n    if not durations:\n        return 0\n    free = [0] * min(workers, len(durations))\n    heapq.heapify(free)\n    for d in durations:\n        t = heapq.heappop(free)\n        heapq.heappush(free, t + d)\n    return max(free)\n\ndef speedup(durations, workers):\n    if not durations:\n        return 1.0\n    return sum(durations) / makespan(durations, workers)",
  "hints": ["Keep a min-heap of the times at which each worker becomes free.", "Pop the earliest-free worker, push back its free time plus the task duration; the answer is the max."]
}
```

> [!TIP] Interview tips
> - First classify the workload: I/O-bound means asyncio or threads; CPU-bound means processes or a different service; long-running means a queue plus workers.
> - Mention bounding concurrency (semaphore, connection pools), timeouts and retries with backoff.
> - For "long inference request", answer with the 202 plus job id plus polling or webhook pattern, and note jobs should be idempotent.
