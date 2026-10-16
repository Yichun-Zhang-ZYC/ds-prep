---
id: python-list-dict-set-comprehensions
title: 列表 / 字典 / 集合推导式
---

## 为什么重要
推导式是 Python 中转换和过滤集合的惯用方式。面试官期望你在编码环节熟练地写出它们，并且知道什么时候普通循环更清晰。

## 概念
```python
squares = [x * x for x in nums]                     # list
evens   = [x for x in nums if x % 2 == 0]           # with filter
labels  = ["pos" if x > 0 else "neg" for x in nums] # conditional expression
lookup  = {u["id"]: u for u in users}               # dict
uniq    = {w.lower() for w in words}                # set
total   = sum(x * x for x in nums)                  # generator expression (lazy)
pairs   = [(i, j) for i in range(3) for j in range(i)]  # nested: outer loop first
```

- 过滤用的 `if` 放在 `for` **之后**；条件*表达式*（`a if c else b`）放在它**之前**。
- 嵌套推导式像嵌套循环一样从左到右阅读。
- **生成器表达式** `( ... )` 不会构建列表；只需迭代一次时使用（在 `sum`、`max`、`any` 中）。
- 推导式中的变量不会泄漏到外层作用域（Python 3）。
- 如果需要超过约 2 个子句或有副作用，就写普通循环。

## 示例讲解
反转一个字典并对值分组：

```python
color = {"apple": "red", "cherry": "red", "lime": "green"}
by_color = {c: sorted(k for k, v in color.items() if v == c) for c in set(color.values())}
# {'red': ['apple', 'cherry'], 'green': ['lime']}
```
（这是 O(n·k) 的；数据量大时，用 `defaultdict(list)` 的循环是 O(n)。）

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`[x for x in range(4) for y in range(x)]` 的结果是什么？",
  "options": ["[0, 1, 2, 3]", "[1, 2, 2, 3, 3, 3]", "[0, 1, 1, 2, 2, 2]", "[[0], [1], [2]]"],
  "explanation": "对每个 x，内层循环执行 x 次：x=1 一次，x=2 两次，x=3 三次。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "使用推导式编写：`word_lengths(words)`，对至少 3 个字母的单词返回字典 单词 → 长度；`flatten(matrix)`，返回扁平化的列表；`unique_domains(emails)`，返回小写域名的集合。",
  "hints": ["嵌套推导式：`for row in matrix for x in row`。", "按 '@' 分割，取第二部分。"]
}
```

> [!TIP] 面试技巧
> - 简单的映射/过滤用推导式；逻辑复杂时改用循环。
> - 提到在大输入上用生成器表达式节省内存。
> - 注意嵌套推导式的顺序；把它当作嵌套循环大声说出来。
