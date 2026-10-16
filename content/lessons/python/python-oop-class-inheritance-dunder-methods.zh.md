---
id: python-oop-class-inheritance-dunder-methods
title: 面向对象：类、继承、魔术方法
---

## 为什么重要
ML 代码中充满了类：scikit-learn 的估计器、PyTorch 的模块、数据加载器。面试官会让你设计一个小类、解释继承和 `super()`，并实现魔术方法（dunder methods），让对象表现得像内置类型一样。

## 概念
```python
class Account:
    bank = "DS Bank"                     # class attribute (shared)

    def __init__(self, owner, balance=0):
        self.owner = owner               # instance attributes
        self._balance = balance          # leading _ = "internal" by convention

    @property
    def balance(self):                   # read-only attribute access
        return self._balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    def __repr__(self):
        return f"Account({self.owner!r}, {self._balance})"
```

- **继承**：`class Savings(Account)` 复用并重写方法。用 `super().__init__(...)` 调用父类。Python 支持多重继承；方法查找遵循 **MRO**（`Cls.__mro__`）。
- 优先使用**组合**（“有一个”），而不是很深的继承树。
- `@classmethod` 接收类本身（`cls`），常用于替代构造函数（`from_dict`）；`@staticmethod` 两者都不接收。
- **魔术方法**挂接到语法上：`__repr__`/`__str__`（打印）、`__eq__`/`__hash__`（比较、作为字典键）、`__lt__`（排序）、`__len__`、`__getitem__`、`__iter__`、`__contains__`、`__add__`、`__call__`、`__enter__`/`__exit__`。
- 如果定义了 `__eq__`，也要定义 `__hash__`（否则类会变得不可哈希）。
- `@dataclass` 为存放数据的类自动生成 `__init__`、`__repr__`、`__eq__`；`frozen=True` 让它们不可变且可哈希。

## 示例讲解
一个极简的 scikit-learn 风格估计器：

```python
class MeanRegressor:
    def fit(self, X, y):
        self.mean_ = sum(y) / len(y)     # learned attributes end with _
        return self                      # enables chaining
    def predict(self, X):
        return [self.mean_] * len(X)

MeanRegressor().fit([[1], [2]], [3, 5]).predict([[0]])   # [4.0]
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你在一个类上定义了 __eq__ 但没有定义 __hash__。把实例放进集合时会怎样？",
  "options": ["正常工作", "TypeError: unhashable type", "所有实例合并成一个", "Python 悄悄使用 id()"],
  "explanation": "定义 __eq__ 会把 __hash__ 设为 None，除非你也定义了它。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现一个 `Vector` 类：`Vector(1, 2)` 存储各分量；支持 `+`（逐元素相加）、与数字的 `*`（标量乘法）、`==`、`len()`、迭代、`abs()`（欧氏范数），以及形如 `Vector(1, 2)` 的 `repr`。让它的哈希与 `==` 保持一致。",
  "hints": ["把分量存成元组，哈希就很容易实现。", "__iter__ 可以直接返回 iter(self.components)。"]
}
```

> [!TIP] 面试技巧
> - 简要解释类属性与实例属性、`super()` 以及 MRO。
> - 提到用于调试的 `__repr__`，以及 `__eq__`/`__hash__` 的约定。
> - 纯数据容器用 `@dataclass`，并且优先组合而不是深层继承。
