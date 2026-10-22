---
id: swe-concurrency-threads-and-processes
title: 并发：线程、进程与 asyncio
---

## 为什么重要
并发是后端和数据工程的常见话题：如何快速调用 1,000 个 API、为什么加了线程特征计算也没变快、如何避免竞态条件，以及何时该用进程。asyncio 基础见“异步处理”课程；本课把三种模型放在一起比较并讲解常见陷阱。

## 概念
**并发与并行**：并发是组织工作让多个任务都取得进展（可能在单核上交替执行）；并行是在多个核上同一时刻真正同时执行。

**GIL**：在标准 CPython 中，同一时刻只有一个线程执行 Python 字节码（3.13 起有可选的自由线程构建，但尚非默认）。结果是：线程**不能**加速纯 Python 的 CPU 密集工作，但能帮助 I/O 密集工作，因为等待套接字、文件和许多 C 扩展（NumPy、pandas 内部、哈希、压缩）时会释放 GIL。

**选择模型**：
- **线程**（`threading`、`ThreadPoolExecutor`）：I/O 密集、简单、阻塞式库（requests、数据库驱动）。共享内存，因此需要锁。线程池通常几十到几百个。
- **asyncio**：数千并发连接的 I/O 密集场景；单线程，在 `await` 处协作式调度。需要支持异步的库（httpx、asyncpg、aiohttp）。一次阻塞调用（`requests.get`、`time.sleep`、重 CPU 计算）会卡住整个事件循环；用 `await loop.run_in_executor(...)` 或 `asyncio.to_thread` 转移出去。
- **进程**（`multiprocessing`、`ProcessPoolExecutor`）：CPU 密集工作，真正并行，内存相互独立。代价：启动时间、参数和结果的 pickle 序列化、没有共享内存或队列就无法共享状态。使用 `if __name__ == "__main__":` 保护（macOS/Windows 使用 spawn 启动方式）。

**同步与竞态**：**竞态条件**指结果依赖于交错顺序，例如 `counter += 1` 是读-改-写，不是原子操作。工具：`Lock`、`Queue`（线程安全的生产者/消费者）、`Semaphore`（限制并发，例如对限速 API 最多同时 20 个调用）、`Event`。优先使用**消息传递和不可变数据**，而不是共享可变状态。**死锁**需要在锁上循环等待；通过统一的加锁顺序和超时来避免。

**实用 asyncio**：`asyncio.gather(*coros)` 并发运行多个协程；`asyncio.TaskGroup`（3.11+）提供结构化并发，并在失败时取消同级任务；用 `Semaphore` 限制并发；始终设置超时；别忘了 `await`。

**扩展上限**：阿姆达尔定律，并行比例为 $p$、$n$ 个 worker 时加速比 $= 1 / \big((1-p) + p/n\big)$，上限为 $1/(1-p)$。

**常见陷阱**：对 CPU 密集的 Python 代码使用线程；在异步代码中使用阻塞调用；无界地创建任务；在线程或 fork 出的进程之间共享数据库连接；线程之后 fork 导致的 bug；吞掉工作线程中的异常。

## 示例讲解
示意场景：抓取 1,000 个 URL，每个约 200 ms。

- 顺序执行：$1000 \times 0.2 = 200$ 秒。
- 50 个线程的线程池：约 $1000 / 50 \times 0.2 = 4$ 秒（外加开销）。
- 信号量为 200 的 asyncio：约 $1000/200 \times 0.2 = 1$ 秒，只用一个线程。

再看解析 1,000 个大 JSON 文件，每个需要 100 ms 的纯 Python CPU 时间，机器有 4 核。线程：仍约 100 秒（GIL）。`ProcessPoolExecutor(4)`：约 25 秒加 pickle 开销。如果流水线只有 90% 可并行，阿姆达尔定律给出 $1/(0.1 + 0.9/4) = 3.08\times$，而不是 $4\times$。

竞态示例：两个线程各执行 100,000 次 `counter += 1`；不加 `Lock` 时最终值可能小于 200,000，因为两者可能读到同一个旧值。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你在 8 核机器上用 ThreadPoolExecutor(8) 并行化纯 Python、CPU 密集的特征计算。你预期会怎样？",
  "options": [
    "约 8 倍加速",
    "由于 GIL，几乎没有加速；应使用进程或向量化/原生代码",
    "死锁",
    "只有改用 asyncio 才会更快"
  ],
  "explanation": "在标准 CPython 中，纯 Python 字节码被 GIL 串行化。应使用 multiprocessing 或原生/向量化库。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 `async def` 处理函数里调用 `requests.get(url)`，会发生什么？",
  "options": [
    "它与其他协程并发运行",
    "它会阻塞事件循环，直到返回前所有其他协程都被卡住",
    "抛出 SyntaxError",
    "它被自动移到线程中"
  ],
  "explanation": "阻塞调用会占住唯一的事件循环线程。应使用异步客户端或 `asyncio.to_thread`。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "扩展性计算。实现 `makespan(durations, workers)`：任务按给定顺序分配，每个任务交给最先空闲的 worker；返回最后一个任务的完成时间（没有任务时为 0）。再实现 `amdahl(p, n)` 返回加速比。",
  "hints": [
    "用最小堆保存 worker 的空闲时间，很容易找到“最先空闲的 worker”。",
    "如果 worker 多于任务，多余的 worker 永远不会被用到。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "构建一个玩具事件循环。实现 `run_all(tasks)`，每个任务是 `(name, generator)`。每一轮按列表顺序对每个存活任务恢复一次，并在每次恢复时把其名称追加到日志；任务用 `yield` 让出控制权，生成器 return 时结束（`StopIteration.value` 是其结果）。返回 `(log, results)`。",
  "hints": [
    "`next(gen)` 会让生成器运行到下一个 yield。",
    "捕获 StopIteration 并读取 `.value` 得到返回值。"
  ]
}
```

> [!TIP] 面试技巧
- 从工作负载入手：是 I/O 密集还是 CPU 密集？这决定选 asyncio/线程还是进程。
- 准确解释 GIL：它串行化 Python 字节码，但在 I/O 以及许多 C 扩展中会被释放。
- 提到有界并发（信号量、线程池）、超时，以及不要阻塞事件循环。
- 举一个竞态条件的例子和修复方式（锁、队列或避免共享状态）。
