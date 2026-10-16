---
id: python-data-types-mutability
title: 数据类型与可变性
---

## 为什么重要
可变性 bug（列表“自己”变了、默认参数记住了之前的调用）是 Python 面试的经典陷阱。知道哪些类型是可变的，也能解释为什么只有某些对象可以作为字典的键。

## 概念
内置类型：

| 不可变 | 可变 |
|---|---|
| `int`、`float`、`bool`、`str`、`tuple`、`frozenset`、`bytes`、`None` | `list`、`dict`、`set`、`bytearray`、大多数用户自定义对象 |

- 变量是**绑定到对象的名字**。`b = a` 让两个名字指向同一个对象；并不会复制。
- 修改可变对象（`a.append(1)`）对所有绑定到它的名字都可见。“修改”不可变对象（`s += "x"`）会创建一个新对象并重新绑定名字。
- `is` 检查身份（是否同一个对象）；`==` 检查相等（值是否相同）。只对 `None`（及其他单例）使用 `is`。
- **可哈希**的对象才能作为字典的键 / 集合的成员。不可变的内置类型是可哈希的；元组只有在所有元素都可哈希时才可哈希。
- 函数参数按**对象引用**传递：函数可以修改你传入的列表，但给参数重新赋值不会影响调用方。

**可变默认参数**陷阱：默认值只在函数定义时求值一次。

```python
def add(item, bucket=[]):      # same list reused on every call!
    bucket.append(item)
    return bucket

add(1); add(2)                 # → [1, 2]

def add(item, bucket=None):    # correct pattern
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket
```

## 示例讲解
```python
grid = [[0] * 3] * 3       # three references to ONE inner list
grid[0][0] = 1
print(grid)                # [[1, 0, 0], [1, 0, 0], [1, 0, 0]]

grid = [[0] * 3 for _ in range(3)]   # three separate lists
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "下面哪个可以用作字典的键？",
  "options": ["[1, 2]", "{'a': 1}", "(1, 'a')", "(1, [2])"],
  "explanation": "键必须可哈希。由不可变对象组成的元组可哈希；包含列表的元组不可哈希。"
}
```

```quiz
{
  "id": "q2",
  "question": "执行 `a = [1, 2]; b = a; b += [3]` 之后，`a` 是什么？",
  "options": ["[1, 2]", "[1, 2, 3]", "报错", "[3]"],
  "explanation": "对列表来说，+= 是就地修改，而 a 和 b 指向同一个列表。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "修复这个经典 bug：编写 `append_to(item, target=None)`，把 `item` 追加到 `target`（未传入 `target` 时创建新列表）并返回它。再编写 `make_grid(rows, cols, fill)`，返回由相互独立的行列表组成的列表。",
  "hints": ["用 None 作为默认值，在函数内部创建列表。", "用推导式构造每一行，让各行是不同的对象。"]
}
```

> [!TIP] 面试技巧
> - 说出“名字绑定到对象”，并用它来解释别名 bug。
> - 熟记可变默认参数陷阱以及用 `None` 哨兵值修复的方法。
> - 被问到为什么列表不能当字典键时，提到可哈希性。
