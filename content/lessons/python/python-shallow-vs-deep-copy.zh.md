---
id: python-shallow-vs-deep-copy
title: 浅拷贝 vs 深拷贝
---

## 为什么重要
“我复制了配置再改，结果原来的也变了！”浅拷贝 bug 在嵌套字典/列表中很常见，pandas 也有自己的版本（`SettingWithCopyWarning`）。面试官会考你能否预测哪些东西是共享的。

## 概念
- **赋值**（`b = a`）：不复制；是同一个对象。
- **浅拷贝**（`a.copy()`、`list(a)`、`a[:]`、`dict(a)`、`copy.copy(a)`）：新的外层容器，但其中的元素是**同一批对象**。嵌套的可变对象是共享的。
- **深拷贝**（`copy.deepcopy(a)`）：递归地复制一切；完全独立。更慢，能处理循环引用。

```python
import copy
cfg = {"model": "gbm", "params": {"depth": 6}}
shallow = cfg.copy()
deep = copy.deepcopy(cfg)
shallow["params"]["depth"] = 10    # also changes cfg["params"]!
deep["params"]["depth"] = 3        # cfg untouched
```

在 **pandas/NumPy** 中：
- NumPy 切片返回**视图**（共享内存）；花式索引/布尔索引返回**副本**。需要独立时使用 `.copy()`。
- pandas：`df2 = df[df.x > 0]` 可能是视图也可能是副本；修改它可能触发 `SettingWithCopyWarning`。在原始数据上用 `df.loc[mask, "col"] = value`，或者用 `df2 = df[mask].copy()`。（pandas 的写时复制（Copy-on-Write）在 3.0 中成为默认行为，会让它表现得像副本。）

## 示例讲解
```python
import numpy as np
a = np.arange(5)
v = a[1:3]          # view
v[0] = 99
a                   # array([ 0, 99,  2,  3,  4])
c = a[[1, 2]]       # copy (fancy indexing)
c[0] = -1           # a unchanged
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`a = [[1], [2]]; b = a.copy(); b[0].append(9)`。`a` 是什么？",
  "options": ["[[1], [2]]", "[[1, 9], [2]]", "[[9], [2]]", "报错"],
  "explanation": "浅拷贝共享内层列表，所以修改 b[0] 也会修改 a[0]。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `with_override(config, path, value)`：返回一个新的配置字典，把嵌套键路径（键的列表）设为 `value`，并且**不**修改原始配置（使用 `copy.deepcopy`）。再编写 `is_view(arr)`：如果 NumPy 数组与某个基础数组共享内存，返回 True（提示：`arr.base is not None`）。",
  "hints": ["先深拷贝，然后在副本上沿路径往下走。", "基本切片得到视图；花式索引和布尔索引得到副本。"]
}
```

> [!TIP] 面试技巧
> - 用一个嵌套的例子区分赋值、浅拷贝和深拷贝。
> - 了解 NumPy 的视图与副本，以及它在 pandas 中如何表现为 SettingWithCopyWarning。
> - 对打算修改的 DataFrame 子集，默认使用 `.copy()`。
