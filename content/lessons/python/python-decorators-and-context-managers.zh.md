---
id: python-decorators-and-context-managers
title: 装饰器与上下文管理器
---

## 为什么重要
装饰器（`@lru_cache`、`@app.route`、`@pytest.fixture`、计时和重试封装）和上下文管理器（`with open(...)`、数据库事务、`torch.no_grad()`）在生产代码中无处不在。“写一个给函数计时的装饰器”是常见的面试题。

## 概念
**装饰器**：接收一个函数并返回一个新函数的函数。在 `def f` 上方写 `@deco` 等价于 `f = deco(f)`。

```python
import functools, time

def timed(func):
    @functools.wraps(func)            # keep __name__, __doc__
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            print(f"{func.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper
```

- 使用 `*args, **kwargs`，让包装函数接受任意签名。
- **带参数的装饰器**需要再多一层：`def retry(times): def deco(func): ... return deco`。
- 内置装饰器：`@functools.lru_cache` / `@cache`（记忆化）、`@property`、`@staticmethod`、`@classmethod`、`@dataclass`。

**上下文管理器**：保证在代码块前后执行准备和清理，即使抛出了异常。协议：`__enter__` / `__exit__(exc_type, exc, tb)`；`__exit__` 返回 True 会吞掉异常。用生成器实现最简单：

```python
from contextlib import contextmanager

@contextmanager
def opened(path):
    f = open(path)
    try:
        yield f           # value bound by "as"
    finally:
        f.close()         # always runs
```

## 示例讲解
```python
@functools.lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(80)      # instant: each n computed once instead of exponentially many times
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么要在装饰器内部使用 functools.wraps？",
  "options": ["它让函数更快", "它把被包装函数的名字、文档字符串和元数据复制到包装函数上", "装饰器运行必须用它", "它增加缓存"],
  "explanation": "没有它，被装饰的函数会报告包装函数的名字，这对调试和内省不利。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 `with` 代码块内抛出了异常。__exit__ 中的清理代码会怎样？",
  "options": ["被跳过", "仍然会执行；除非 __exit__ 返回 True，否则异常继续向外传播", "程序立即崩溃", "只有当异常在代码块内被捕获时才执行"],
  "explanation": "保证清理正是上下文管理器的意义所在。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写装饰器工厂 `retry(times)`：最多总共尝试调用函数 `times` 次，若全部失败则重新抛出最后一个异常。使用 `functools.wraps`。再用 `@contextmanager` 编写上下文管理器 `collect()`，它 yield 一个列表，退出时向列表追加 `'done'`，即使代码块抛出异常也要追加。",
  "hints": ["retry(times) 返回一个装饰器，装饰器再返回包装函数：三层嵌套函数。", "把清理代码放在包裹 yield 的 finally 块中。"]
}
```

> [!TIP] 面试技巧
> - 毫不犹豫地写出带 `*args, **kwargs` 和 `functools.wraps` 的装饰器。
> - 把 `@deco` 解释为 `f = deco(f)`，把装饰器工厂解释为多一层嵌套。
> - 任何资源（文件、锁、连接）都用 `with`，并提到 `@contextmanager`。
