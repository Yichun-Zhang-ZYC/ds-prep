---
id: python-iterators-and-generators
title: 迭代器与生成器
---

## 为什么重要
生成器让你能处理内存装不下的数据（日志文件、数据流、模型训练的批次）。面试官会问 `yield` 如何工作、迭代器协议，以及惰性求值与立即求值的区别。

## 概念
- **可迭代对象**拥有返回迭代器的 `__iter__()`（列表、字典、文件、range）。
- **迭代器**拥有 `__next__()`，返回下一个元素，结束时抛出 `StopIteration`。`for` 循环会替你调用这些方法。迭代器是**一次性的**：耗尽之后就空了。
- **生成器函数**包含 `yield`。调用它会返回一个生成器对象；每次 `next()` 都运行到下一个 `yield`，暂停时局部状态保持不变。

```python
def read_batches(rows, size):
    batch = []
    for r in rows:
        batch.append(r)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch
```

- **惰性**：按需生成值；内存保持在 O(批次大小)，而不是 O(n)。
- `yield from sub()` 委托给另一个可迭代对象。
- 生成器表达式：`(x * x for x in nums)`。
- **itertools**：`islice`、`chain`、`groupby`（需要已排序的输入）、`accumulate`、`product`、`combinations`、`count`、`tee`。

陷阱：第二次迭代同一个生成器什么也得不到；`len()` 不能用于生成器；只有在真正需要所有元素时才用 `list()` 物化。

## 示例讲解
```python
from itertools import islice
def fib():
    a, b = 0, 1
    while True:          # infinite, but lazy
        yield a
        a, b = b, a + b

list(islice(fib(), 8))   # [0, 1, 1, 2, 3, 5, 8, 13]
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`g = (x for x in [1, 2, 3]); sum(g); sum(g)`，第二次 sum 返回什么？",
  "options": ["6", "0", "报错", "12"],
  "explanation": "生成器是一次性的；第一次 sum 已经把它耗尽了。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写生成器 `chunked(iterable, size)`，每次产出最多 `size` 个元素的列表（最后一个可能更短）。编写生成器 `running_mean(iterable)`，产出到目前为止所有元素的均值。两者都必须能处理无限迭代器（不要对输入调用 `list()`）。",
  "hints": ["累积到一个批次中，装满时 yield；最后把剩余部分也产出。", "维护累计和与计数；每一步 yield 总和 / 计数。"]
}
```

> [!TIP] 面试技巧
> - 解释可迭代对象、迭代器、生成器的区别，以及生成器在 `yield` 之间保持状态。
> - 推荐用生成器以恒定内存流式处理大文件和对数据分批。
> - 了解几个 itertools 工具；`groupby` 需要已排序的输入是常见陷阱。
