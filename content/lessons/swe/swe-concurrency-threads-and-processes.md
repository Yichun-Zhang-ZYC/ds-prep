---
id: swe-concurrency-threads-and-processes
title: "Concurrency: threads, processes, asyncio"
estimatedMinutes: 13
difficulty: medium
tags: [concurrency, threads, multiprocessing, asyncio, gil]
---

## Why it matters
Concurrency is a staple backend and data-engineering topic: how to call 1,000 APIs quickly, why adding threads did not speed up your feature code, how to avoid race conditions, and when to reach for processes. See the Async processing lesson for the asyncio basics; this lesson compares the three models head to head and covers the pitfalls.

## Concept
**Concurrency vs parallelism**: concurrency is structuring work so many tasks make progress (possibly interleaved on one core); parallelism is executing at the same instant on multiple cores.

**The GIL**: in standard CPython only one thread executes Python bytecode at a time (a free-threaded build exists since 3.13 but is optional and not yet the default). Consequences: threads do **not** speed up pure-Python CPU work, but they do help I/O-bound work because the GIL is released while waiting on sockets, files and many C extensions (NumPy, pandas internals, hashing, compression).

**Choosing a model**:
- **Threads** (`threading`, `ThreadPoolExecutor`): I/O-bound, simple, blocking libraries (requests, DB drivers). Shared memory, so you need locks. Pool of tens to hundreds.
- **asyncio**: I/O-bound with thousands of concurrent connections; one thread, cooperative scheduling at `await`. Needs async-aware libraries (httpx, asyncpg, aiohttp). One blocking call (a `requests.get`, `time.sleep`, heavy CPU) stalls the whole loop; offload with `await loop.run_in_executor(...)` or `asyncio.to_thread`.
- **Processes** (`multiprocessing`, `ProcessPoolExecutor`): CPU-bound work, true parallelism, separate memory. Costs: start-up time, pickling arguments and results, no shared state without shared memory or queues. Use `if __name__ == "__main__":` guards (spawn start method on macOS/Windows).

**Synchronisation and races**: a **race condition** occurs when the result depends on interleaving, for example `counter += 1` is read-modify-write and not atomic. Tools: `Lock`, `Queue` (thread-safe producer/consumer), `Semaphore` (limit concurrency, e.g. at most 20 calls to a rate-limited API), `Event`. Prefer **message passing and immutable data** over shared mutable state. **Deadlock** needs circular waiting on locks; avoid by consistent lock ordering and timeouts.

**Practical asyncio**: `asyncio.gather(*coros)` runs many; `asyncio.TaskGroup` (3.11+) gives structured concurrency and cancels siblings on failure; bound concurrency with a `Semaphore`; always set timeouts; never forget to `await`.

**Scaling limit**: Amdahl's law, speedup $= 1 / \big((1-p) + p/n\big)$ for parallel fraction $p$ and $n$ workers, caps gains at $1/(1-p)$.

**Pitfalls**: threads for CPU-bound Python; blocking calls in async code; unbounded task creation; sharing database connections across threads or forked processes; fork-after-threads bugs; swallowing exceptions in worker threads.

## Worked example
Illustrative scenario: fetch 1,000 URLs, each taking about 200 ms.

- Sequential: $1000 \times 0.2 = 200$ s.
- Thread pool of 50: about $1000 / 50 \times 0.2 = 4$ s (plus overhead).
- asyncio with a semaphore of 200: about $1000/200 \times 0.2 = 1$ s, using one thread.

Now parse 1,000 large JSON files, 100 ms of pure-Python CPU each on 4 cores. Threads: still about 100 s (GIL). `ProcessPoolExecutor(4)`: about 25 s plus pickling overhead. If only 90% of the pipeline is parallel, Amdahl gives $1/(0.1 + 0.9/4) = 3.08\times$, not $4\times$.

Race example: two threads each run `counter += 1` 100,000 times; the final value can be less than 200,000 without a `Lock` because both can read the same old value.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You parallelise a pure-Python, CPU-heavy feature computation with ThreadPoolExecutor(8) on an 8-core machine. What do you expect?",
  "options": [
    "About 8x speedup",
    "Little or no speedup because of the GIL; use processes or vectorised/native code",
    "A deadlock",
    "Faster only if you use asyncio instead"
  ],
  "answer": 1,
  "explanation": "Pure-Python bytecode is serialised by the GIL in standard CPython. Use multiprocessing or native/vectorised libraries."
}
```

```quiz
{
  "id": "q2",
  "question": "Inside an `async def` handler you call `requests.get(url)`. What happens?",
  "options": [
    "It runs concurrently with other coroutines",
    "It blocks the event loop, stalling every other coroutine until it returns",
    "It raises a SyntaxError",
    "It is automatically moved to a thread"
  ],
  "answer": 1,
  "explanation": "Blocking calls hold the single event-loop thread. Use an async client or `asyncio.to_thread`."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Scaling maths. Implement `makespan(durations, workers)`: tasks are assigned in the given order, each to the worker that becomes free first; return the finish time of the last task (0 for no tasks). Then implement `amdahl(p, n)` returning the speedup.",
  "starterCode": "import heapq\n\ndef makespan(durations, workers):\n    \"\"\"Total time to finish all tasks when each task, in the given order, goes to\n    the worker that frees up first. Return 0 for no tasks.\"\"\"\n    pass\n\ndef amdahl(p, n):\n    \"\"\"Speedup with n workers when a fraction p of the work is parallelisable.\"\"\"\n    pass\n\nprint(makespan([3, 3, 2, 2, 2], 2), amdahl(0.9, 10))",
  "tests": "assert makespan([3, 3, 2, 2, 2], 2) == 7\nassert makespan([3, 3, 2, 2, 2], 1) == 12\nassert makespan([3, 3, 2, 2, 2], 10) == 3\nassert makespan([], 4) == 0\nassert abs(amdahl(0.9, 10) - 1 / 0.19) < 1e-9\nassert abs(amdahl(1.0, 8) - 8) < 1e-9\nassert abs(amdahl(0.0, 8) - 1) < 1e-9",
  "solution": "import heapq\n\ndef makespan(durations, workers):\n    if not durations:\n        return 0\n    free = [0] * min(workers, len(durations))\n    heapq.heapify(free)\n    for d in durations:\n        t = heapq.heappop(free)\n        heapq.heappush(free, t + d)\n    return max(free)\n\ndef amdahl(p, n):\n    return 1 / ((1 - p) + p / n)",
  "hints": [
    "A min-heap of worker free-times makes 'earliest free worker' easy.",
    "If workers exceed tasks, extra workers are never used."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Build a toy event loop. Implement `run_all(tasks)` where each task is `(name, generator)`. Resume each live task once per round in list order, appending its name to a log each time; a task gives up control with `yield` and finishes when the generator returns (`StopIteration.value` is its result). Return `(log, results)`.",
  "starterCode": "def run_all(tasks):\n    \"\"\"Cooperative round-robin scheduler (a toy event loop).\n    tasks: list of (name, generator). Each time a task is resumed, append its name\n    to `log`; a task yields to give up control and returns a value when finished.\n    Resume tasks in list order, repeatedly, skipping finished ones.\n    Return (log, results) where results maps name -> returned value.\"\"\"\n    pass\n\ndef job(n, label):\n    for _ in range(n):\n        yield\n    return label.upper()\n\nlog, res = run_all([(\"a\", job(2, \"x\")), (\"b\", job(1, \"y\"))])\nprint(log, res)",
  "tests": "def job(n, label):\n    for _ in range(n):\n        yield\n    return label.upper()\n\nlog, res = run_all([(\"a\", job(2, \"x\")), (\"b\", job(1, \"y\"))])\nassert log == [\"a\", \"b\", \"a\", \"b\", \"a\"]\nassert res == {\"a\": \"X\", \"b\": \"Y\"}\nlog, res = run_all([(\"only\", job(0, \"z\"))])\nassert log == [\"only\"] and res == {\"only\": \"Z\"}\nlog, res = run_all([])\nassert log == [] and res == {}",
  "solution": "def run_all(tasks):\n    log, results = [], {}\n    pending = list(tasks)\n    while pending:\n        still = []\n        for name, gen in pending:\n            log.append(name)\n            try:\n                next(gen)\n                still.append((name, gen))\n            except StopIteration as stop:\n                results[name] = stop.value\n        pending = still\n    return log, results",
  "hints": [
    "`next(gen)` resumes a generator until its next yield.",
    "Catch StopIteration and read `.value` for the return value."
  ]
}
```

> [!TIP] Interview tips
- Start from the workload: I/O-bound or CPU-bound? That picks asyncio/threads vs processes.
- Explain the GIL precisely: it serialises Python bytecode but is released during I/O and in many C extensions.
- Mention bounded concurrency (semaphores, pools), timeouts and not blocking the event loop.
- Give a race condition example and the fix (lock, queue or avoid shared state).
