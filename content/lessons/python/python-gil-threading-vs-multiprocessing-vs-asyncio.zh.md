---
id: python-gil-threading-vs-multiprocessing-vs-asyncio
title: GIL，多线程 vs 多进程 vs asyncio
---

## 为什么重要
“你会怎样加速这个 Python 任务？”这个问题会直接引到 GIL。正确选择线程、进程或 asyncio（或者干脆向量化）是 MLE/DE 面试的常见问题。

## 概念
CPython 中的**全局解释器锁（GIL）**同一时刻只允许一个线程执行 Python 字节码。后果：

| 工作负载 | 最佳工具 | 原因 |
|---|---|---|
| **I/O 密集型**（HTTP 调用、数据库查询、读文件） | `threading` / `ThreadPoolExecutor`，或 `asyncio` | 线程在等待 I/O 时会释放 GIL |
| **CPU 密集型纯 Python**（循环、解析） | `multiprocessing` / `ProcessPoolExecutor` | 各自拥有 GIL 的独立进程能利用多核 |
| **CPU 密集型数值计算** | NumPy / pandas / Polars 向量化、Numba | C 代码会释放 GIL，并且比 Python 循环快得多 |

- **threading**：共享内存，启动开销小；竞态条件需要加锁。对 CPU 密集型 Python 代码没有加速。
- **multiprocessing**：真正的并行；进程之间的数据必须**序列化（pickle）**（大对象有开销）；启动成本更高。
- **asyncio**：单线程，用 `async`/`await` 实现协作式多任务。能以很低的开销扩展到成千上万个并发 I/O 操作（网页抓取、并发调用 API），但链路上的每个库都必须是异步的，一次阻塞调用会卡住一切。
- `concurrent.futures` 为两种池提供统一的 API：`executor.map(fn, items)`。
- 自由线程（free-threaded）的 CPython 构建（3.13+，PEP 703）可以禁用 GIL，但大多数生产代码仍然假设它存在。

**阿姆达尔定律**限制了加速比：如果有比例 $p$ 的工作可以在 $n$ 个工作单元上并行，

$$
\text{speedup} = \frac{1}{(1 - p) + p/n}
$$

## 示例讲解
抓取 1,000 个 URL，每个约 200 ms，顺序执行约需 200 秒。用 50 个线程（或并发 50 个请求的 asyncio）约需 4 秒。同样的 50 个线程跑纯 Python 循环则**没有**加速；8 个进程最多能带来约 8 倍加速，再减去序列化开销。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你需要调用一个 REST API 10,000 次。在 Python 中最好的第一种方案是？",
  "options": ["用 10,000 个进程的 multiprocessing", "线程或 asyncio，因为这是 I/O 密集型工作", "纯 Python 的 for 循环", "NumPy 向量化"],
  "explanation": "等待网络时会释放 GIL，所以线程/asyncio 能以很低的代价带来大幅加速。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个任务有 90% 可以完美并行。在核数无限多时，最大加速比是多少？",
  "options": ["9 倍", "10 倍", "90 倍", "无上限"],
  "explanation": "1 / (1 − 0.9) = 10。串行的 10% 限制了加速比。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `choose_tool(kind)`：对 `'io'` 返回 `'threads_or_asyncio'`，对 `'cpu_python'` 返回 `'processes'`，对 `'cpu_numeric'` 返回 `'vectorize'`（其他情况抛出 `ValueError`）。再编写 `amdahl(p, n)` 返回加速比，以及 `workers_for_speedup(p, target)`，返回达到目标的最小整数 n；如果不可能达到（target ≥ 1/(1 − p)），返回 `None`。",
  "hints": ["n → ∞ 时的极限是 1/(1 − p)。", "p = 0.9、目标为 5 时：n = 9 恰好得到 5。"]
}
```

> [!TIP] 面试技巧
> - 先把工作负载归类为 I/O 密集型还是 CPU 密集型；这决定了用什么工具。
> - 对于数值计算，先说“先向量化”，再考虑并行。
> - 提到进程的序列化开销、线程的加锁，以及 asyncio 需要原生异步的库。
