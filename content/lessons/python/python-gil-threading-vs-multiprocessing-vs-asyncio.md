---
id: python-gil-threading-vs-multiprocessing-vs-asyncio
title: GIL, threading vs multiprocessing vs asyncio
estimatedMinutes: 12
difficulty: hard
tags: [python, core, concurrency, performance]
---

## Why it matters
"How would you speed up this Python job?" leads straight to the GIL. Choosing threads, processes or asyncio correctly (or vectorizing instead) is a frequent MLE/DE interview question.

## Concept
The **Global Interpreter Lock (GIL)** in CPython lets only one thread execute Python bytecode at a time. Consequences:

| Workload | Best tool | Why |
|---|---|---|
| **I/O-bound** (HTTP calls, DB queries, file reads) | `threading` / `ThreadPoolExecutor`, or `asyncio` | Threads release the GIL while waiting on I/O |
| **CPU-bound pure Python** (loops, parsing) | `multiprocessing` / `ProcessPoolExecutor` | Separate processes, each with its own GIL, use multiple cores |
| **CPU-bound numeric** | NumPy / pandas / Polars vectorization, Numba | C code releases the GIL and runs much faster than Python loops |

- **threading**: shared memory, cheap to start; race conditions need locks. No speedup for CPU-bound Python.
- **multiprocessing**: true parallelism; data must be **pickled** between processes (overhead for large objects); higher startup cost.
- **asyncio**: single thread, cooperative multitasking with `async`/`await`. Scales to thousands of concurrent I/O operations (web scraping, API fan-out) with low overhead, but every library in the path must be async, and one blocking call stalls everything.
- `concurrent.futures` gives one API for both pools: `executor.map(fn, items)`.
- Free-threaded CPython builds (3.13+, PEP 703) can disable the GIL, but most production code still assumes it.

**Amdahl's law** limits speedup: if a fraction $p$ of work parallelizes over $n$ workers,

$$
\text{speedup} = \frac{1}{(1 - p) + p/n}
$$

## Worked example
Fetching 1,000 URLs at ~200 ms each takes ~200 s sequentially. With 50 threads (or asyncio with 50 concurrent requests), it takes ~4 s. The same 50 threads computing a pure-Python loop would show **no** speedup; 8 processes would give up to ~8×, minus pickling overhead.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You need to call a REST API 10,000 times. What's the best first approach in Python?",
  "options": ["multiprocessing with 10,000 processes", "Threads or asyncio, since the work is I/O-bound", "A pure Python for-loop", "NumPy vectorization"],
  "answer": 1,
  "explanation": "Waiting on the network releases the GIL, so threads/asyncio give large speedups cheaply."
}
```

```quiz
{
  "id": "q2",
  "question": "90% of a job parallelizes perfectly. What's the maximum speedup with infinitely many cores?",
  "options": ["9×", "10×", "90×", "Unlimited"],
  "answer": 1,
  "explanation": "1 / (1 − 0.9) = 10. The serial 10% caps the speedup."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `choose_tool(kind)` returning `'threads_or_asyncio'` for `'io'`, `'processes'` for `'cpu_python'`, and `'vectorize'` for `'cpu_numeric'` (raise `ValueError` otherwise). Then write `amdahl(p, n)` returning the speedup, and `workers_for_speedup(p, target)` returning the smallest integer n reaching the target, or `None` if it's impossible (target ≥ 1/(1 − p); compare with a small tolerance like 1e-9, since 1/(1 − 0.9) is 10.000000000000002 in floating point).",
  "starterCode": "def choose_tool(kind):\n    pass\n\ndef amdahl(p, n):\n    pass\n\ndef workers_for_speedup(p, target):\n    pass\n\nprint(amdahl(0.9, 8), workers_for_speedup(0.9, 5))",
  "tests": "assert choose_tool('io') == 'threads_or_asyncio'\nassert choose_tool('cpu_python') == 'processes'\nassert choose_tool('cpu_numeric') == 'vectorize'\ntry:\n    choose_tool('gpu')\n    assert False\nexcept ValueError:\n    pass\nassert abs(amdahl(0.9, 8) - 1 / (0.1 + 0.9 / 8)) < 1e-12\nassert amdahl(1.0, 4) == 4\nassert workers_for_speedup(0.9, 5) == 9\nassert workers_for_speedup(0.9, 10) is None\nassert workers_for_speedup(0.5, 1) == 1",
  "solution": "def choose_tool(kind):\n    table = {'io': 'threads_or_asyncio', 'cpu_python': 'processes', 'cpu_numeric': 'vectorize'}\n    if kind not in table:\n        raise ValueError(f'unknown workload: {kind}')\n    return table[kind]\n\ndef amdahl(p, n):\n    return 1 / ((1 - p) + p / n)\n\ndef workers_for_speedup(p, target):\n    if p < 1 and target >= 1 / (1 - p) - 1e-9:\n        return None\n    n = 1\n    while amdahl(p, n) < target:\n        n += 1\n    return n",
  "hints": ["The limit as n → ∞ is 1/(1 − p).", "For p = 0.9 and target 5: n = 9 gives exactly 5."]
}
```

> [!TIP] Interview tips
> - Start by classifying the workload as I/O-bound or CPU-bound; that determines the tool.
> - For numeric work, say "vectorize first" before reaching for parallelism.
> - Mention pickling overhead for processes, locks for threads, and that asyncio needs async-native libraries.
