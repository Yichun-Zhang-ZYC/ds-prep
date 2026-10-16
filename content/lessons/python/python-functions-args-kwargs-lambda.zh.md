---
id: python-functions-args-kwargs-lambda
title: 函数、*args / **kwargs、lambda
---

## 为什么重要
函数签名无处不在：编写工具函数、封装 API、装饰器、`sorted(key=...)`、`df.apply(...)`。面试官会检查你是否理解各类参数、闭包，以及什么时候适合用 lambda。

## 概念
参数种类，按顺序：

```python
def f(pos_only, /, normal, *args, kw_only, **kwargs):
    ...
```
- `/` 之前：仅限位置参数。`*args`（或单独的 `*`）之后：仅限关键字参数。
- `*args` 把多余的位置参数收集成**元组**；`**kwargs` 把多余的关键字参数收集成**字典**。
- 在调用处，`*` 和 `**` 用于**解包**：`f(*my_list, **my_dict)`。

**Lambda**：匿名的单表达式函数，最适合作为简短的 `key=` 或回调：

```python
sorted(users, key=lambda u: (-u["score"], u["name"]))
```
更长的逻辑用 `def`（名字、回溯信息和文档字符串都更好）。

**闭包与作用域（LEGB）**：名字按 局部 → 外层函数 → 全局 → 内置 的顺序解析。内层函数可以读取外层变量；要重新绑定它们，用 `nonlocal`。闭包捕获的是**变量而不是值**（延迟绑定）：

```python
fs = [lambda: i for i in range(3)]
[f() for f in fs]          # [2, 2, 2]
fs = [lambda i=i: i for i in range(3)]   # [0, 1, 2]: default binds the value now
```

函数是一等公民：可以传递、返回、存进字典。

## 示例讲解
```python
def log_call(name, *args, sep=", ", **kwargs):
    parts = [repr(a) for a in args] + [f"{k}={v!r}" for k, v in kwargs.items()]
    return f"{name}({sep.join(parts)})"

log_call("fit", 3, lr=0.1)        # "fit(3, lr=0.1)"
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 `def f(*args, **kwargs)` 内部，`args` 的类型是什么？",
  "options": ["list", "tuple", "dict", "set"],
  "explanation": "多余的位置参数被打包成元组；关键字参数被打包成字典。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `merge_configs(*configs, **overrides)`，从左到右合并任意数量的字典，最后应用关键字覆盖。编写 `make_counter()`，返回一个每次调用依次返回 1、2、3……的函数（使用带 `nonlocal` 的闭包）。最后编写 `sort_people(people)`，用 lambda 作为 key，把 `(name, age)` 元组按年龄降序、再按姓名升序排序。",
  "hints": ["dict.update 会用后面的键覆盖前面的键。", "在 key 元组中对年龄取负，实现降序排序。"]
}
```

> [!TIP] 面试技巧
> - 知道 *args 是元组、**kwargs 是字典，以及 * / ** 在调用处也可以用于解包。
> - lambda 只用于简短的 key/回调。
> - 循环中闭包的延迟绑定是常见的陷阱题；要知道用默认参数修复的方法。
