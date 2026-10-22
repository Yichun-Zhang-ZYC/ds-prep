---
id: python-practice-generators-and-iterators
title: "练习：生成器与迭代器"
---

## 为什么重要

生成器题考察你能否处理超过内存的数据、构建惰性流水线，并准确解释代码何时运行。典型题目：分批、滑动窗口、合并数据流、逐条记录读取超大文件。

## 概念

**心智模型**（协议见迭代器与生成器一课）：

- 生成器函数返回一个生成器对象，**不会运行任何函数体代码**；每次 `next()` 时代码运行到下一个 `yield`。函数体中的异常出现在第一次 `next` 时，而不是调用时。
- 生成器是一次性迭代器：耗尽后不再产出任何值。遍历两次（例如第二次 `sum`）会悄悄得到 0 或空。应使用返回新生成器的函数，或在需要有限重放时使用 `itertools.tee`。
- 流水线可惰性组合：`(f(x) for x in src if p(x))` 每次只持有一个元素，因此内存相对于流长度为 $O(1)$。
- 用 `yield from sub()` 委托；它还会转发 `send` 并返回子生成器的 `return` 值。
- `itertools.islice(it, n)` 取前 n 个而不多消耗；`next(it, default)` 可避免 `StopIteration`。

**必须烂熟的模式**：

1. **分批**：用 `islice` 取 `n` 个元素，直到结果为空。
2. **滑动窗口**：`collections.deque(maxlen=k)`；队列填满后产出一个元组。
3. **流分组**：维护缓冲区，遇到分隔符时产出，并在末尾冲刷剩余内容（经典的差一错误）。
4. **合并有序流**：`heapq.merge(*iters)` 每个流只保留一个头部元素。

**常见陷阱**：为了“保险”而构建列表会违背初衷；修改已产出的缓冲区（应产出副本或重置为新列表）；持有打开文件的生成器必须关闭（在其内部使用 `with`，`gen.close()` 会触发清理）。

## 示例讲解

对一个**无限**数据流，求前四个 3 的倍数的平方和：

```python
from itertools import count, islice

def squares_of_multiples(k):
    for x in count():
        if x % k == 0:
            yield x * x

print(sum(islice(squares_of_multiples(3), 4)))   # 0 + 9 + 36 + 81 = 126
```

`count()` 永不结束，程序却能终止：`islice` 在取够四个元素后停止，生成器停在第四个 `yield` 处，只检查了 $x = 0, \dots, 9$。没有任何东西被实体化。基于列表的写法（`[x*x for x in range(10**9) if ...]`）会先分配数 GB 内存。同样的结构也适用于 50 GB 的日志文件：`lines = open(path)` 本身就是惰性迭代器，`errors = (l for l in lines if "ERROR" in l)` 惰性过滤，`next(errors, None)` 只读到第一个命中为止。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "下面的代码输出什么？\n\n```python\ng = (x * 2 for x in range(3))\nprint(sum(g), sum(g))\n```",
  "options": [
    "6 6",
    "6 0",
    "0 6",
    "报错"
  ],
  "explanation": "生成器表达式在第一次遍历后即耗尽，所以第二个 `sum` 什么也看不到，返回 0。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个生成器函数体的第一行会抛出 `ValueError`。这个错误何时出现？",
  "options": [
    "调用函数时",
    "第一次 `next()` / 第一步迭代时",
    "仅在生成器耗尽时",
    "永不出现"
  ],
  "explanation": "调用生成器函数只会创建生成器对象；在第一次 `next()` 之前不会运行任何函数体代码。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写生成器 `chunked(iterable, n)`，从任意可迭代对象（包括生成器）中产出至多 `n` 个元素的列表，最后一块可以更短。当 `n < 1` 时抛出 `ValueError`（在迭代开始时抛出即可）。不得读取超过需要的源数据。",
  "hints": [
    "只调用一次 `iter(iterable)`，然后反复 `list(islice(it, n))`。",
    "当某块为空时停止。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "编写生成器 `sliding_window(iterable, k)`，产出由 `k` 个连续元素组成的元组（因此 `list(sliding_window(\"abcd\", 2))` 为 `[(\"a\",\"b\"), (\"b\",\"c\"), (\"c\",\"d\")]`）。若元素不足 `k` 个则不产出任何内容。再编写生成器 `running_max(iterable)`，在每个元素之后产出当前的最大值。",
  "hints": [
    "`deque(maxlen=k)` 会自动丢弃最旧的元素。",
    "产出 `tuple(window)`（副本），而不是 deque 本身。对于 running_max，使用“第一个元素”标志，而不是 `-inf` 之类的哨兵值。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "一个文本源中的记录由一个或多个空行分隔。编写生成器 `records(lines)`，惰性地把每条记录作为其非空行的列表产出（去掉行尾换行符）。要处理开头/结尾/多个空行，并冲刷最后一条记录。它必须能用于无限行流：`next(records(stream))` 只需读取第一条记录及其分隔符后就应返回。",
  "hints": [
    "维护一个缓冲区；遇到空行时，只有缓冲区非空才产出，然后开启新列表。",
    "循环结束后，如果缓冲区还有内容就冲刷它。"
  ]
}
```

> [!TIP] 面试技巧
> - 说出“惰性、O(1) 内存”，并用对无限源的 `islice` 或 `next` 来证明。
> - 要知道生成器是一次性的，并且在第一次 `next()` 之前不会运行任何函数体代码。
> - 处理最后一个不完整的批次或记录（经典的差一错误），并产出可变缓冲区的副本。
