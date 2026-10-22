---
id: swe-async-processing
title: 异步处理
---

## 为什么重要
模型调用、数据库查询和 HTTP 请求大部分时间都在等待。知道何时使用 asyncio、线程、进程或后台任务队列，是后端和 ML 服务面试的标准话题，阻塞事件循环的陷阱也是如此。

## 概念
**同步**代码会等待每个调用完成。**异步**代码启动一个操作后，在等待期间做其他工作。关键区分：
- **I/O 密集型**工作（网络、磁盘、数据库、调用 LLM API）：以等待为主。使用 **asyncio**（单线程、协作式）或**线程**。
- **CPU 密集型**工作（特征计算、CPU 上的模型推理）：需要真正的并行。使用**进程**（`multiprocessing`、`ProcessPoolExecutor`）或释放 GIL 的原生代码，因为 Python 的 **GIL** 同一时刻只允许一个线程执行 Python 字节码。

**asyncio** 运行一个事件循环。`async def` 定义协程；`await` 让出控制权，直到被等待的操作完成。并发来自同时调度许多协程。

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

**陷阱**：
- 协程内的阻塞调用（`time.sleep`、`requests.get`、繁重的 NumPy）会冻结整个事件循环。使用 `await asyncio.to_thread(fn)` 或 `run_in_executor` 把它卸载出去。
- 无限制的并发会压垮下游服务；使用**信号量（semaphore）**和超时（`asyncio.wait_for`）。
- `gather` 在第一个异常时立即失败，除非设置 `return_exceptions=True`。

**后台任务**（Celery、RQ、Cloud Tasks、消息队列）：当工作需要几秒到几分钟时，立即返回带任务 id 的 **202 Accepted**，在 worker 中处理，让客户端轮询 `GET /jobs/{id}` 或接收 webhook。在 FastAPI 中，`async def` 端点运行在事件循环上（绝不要阻塞它），普通 `def` 端点在线程池中运行，`BackgroundTasks` 适合小型的发后即忘工作，而不是持久的任务。

**并发不等于并行**：并发是交错执行许多任务；并行是在多个核心上同时运行它们。

$w$ 个 worker、$n$ 个相同时长 $d$ 的任务的完成时间：$\lceil n/w \rceil \cdot d$。

## 示例讲解
一个端点通过调用 5 个服务来丰富请求，每个耗时 200 ms。顺序执行：1,000 ms。使用 `asyncio.gather`，五个调用重叠：约 200 ms（最慢的那个）。如果其中一个慢到 800 ms，总时间就是 800 ms，所以设置超时（比如 300 ms）并优雅降级。对于 100 个条目，信号量为 10、每次调用 1 s：$\lceil 100/10 \rceil \cdot 1 = 10$ s，而不是 100 s。一个 30 s 的 PDF 转 embedding 任务则放入队列：API 在几毫秒内返回带任务 id 的 202。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪种工作负载仅靠 asyncio（单线程）就能获益最多？",
  "options": ["在 CPU 上训练模型", "向某个 API 发起 500 个并发 HTTP 请求", "NumPy 中的矩阵乘法", "缩放 10,000 个图片文件"],
  "explanation": "大量并发的网络等待是典型的 I/O 密集型工作。其他选项是 CPU 密集型，需要进程或原生并行。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 async def 端点内调用 time.sleep(2)，会有什么影响？",
  "options": ["只有该请求在等待", "整个事件循环被阻塞，该 worker 上的其他所有请求都停滞", "Python 会自动把它变成非阻塞的", "它会抛出 RuntimeError"],
  "explanation": "time.sleep 是阻塞调用。使用 await asyncio.sleep，或用 asyncio.to_thread 卸载阻塞代码。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟一个有界 worker 池。编写 `makespan(durations, workers)`：按给定顺序取任务，每个任务在最先空闲的 worker 上启动（所有 worker 在时间 0 时都是空闲的）。返回最后一个任务完成的时间（没有任务时为 0）。再编写 `speedup(durations, workers)` = 顺序执行时间除以 makespan（没有任务时为 1.0）。",
  "hints": ["维护一个最小堆，保存每个 worker 变为空闲的时间。", "弹出最早空闲的 worker，把它的空闲时间加上任务时长再推回去；答案是最大值。"]
}
```

> [!TIP] 面试技巧
> - 先对工作负载分类：I/O 密集用 asyncio 或线程；CPU 密集用进程或独立服务；长时间运行用队列加 worker。
> - 提到限制并发（信号量、连接池）、超时以及带退避的重试。
> - 对于“长时间推理请求”，回答 202 加任务 id 再加轮询或 webhook 的模式，并说明任务应当是幂等的。
