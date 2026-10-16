---
id: python-type-hints
title: 类型提示
---

## 为什么重要
带类型的 Python 在生产 ML 和数据代码库中已是常态（FastAPI、Pydantic、dataclasses）。类型提示能表达意图、支撑 IDE 自动补全，并让 mypy/pyright 等工具在运行前发现 bug。面试官喜欢在带回家的作业代码中看到它们。

## 概念
```python
from typing import Optional, Iterable, Callable, TypeVar

def mean(values: list[float]) -> float: ...
def find_user(uid: int) -> dict[str, str] | None: ...       # 3.10+ union syntax
def apply(f: Callable[[float], float], xs: Iterable[float]) -> list[float]: ...

T = TypeVar("T")
def first(items: list[T]) -> T: ...                          # generic
```

- 类型提示**不会在运行时强制执行**；它们由静态工具（mypy、pyright）检查，并被 Pydantic/FastAPI 等库用于校验。
- 在 Python 3.9+ 中使用内置泛型（`list[int]`、`dict[str, float]`、`tuple[int, ...]`）。
- 可能缺失的值用 `X | None`（或 `Optional[X]`）。
- 输入优先使用抽象类型（`Iterable`、`Sequence`、`Mapping`），返回值使用具体类型。
- `TypedDict`、`Protocol`（结构化的“鸭子”类型）、`Literal["train", "test"]`、`Final`。
- `@dataclass` 利用注解生成字段：

```python
from dataclasses import dataclass, field

@dataclass
class TrainConfig:
    lr: float = 1e-3
    epochs: int = 10
    tags: list[str] = field(default_factory=list)   # safe mutable default
```

## 示例讲解
```python
def split(rows: list[dict], frac: float) -> tuple[list[dict], list[dict]]:
    cut = int(len(rows) * frac)
    return rows[:cut], rows[cut:]
```
在你运行一个 3 小时的任务之前，类型检查器就会标记出 `split(rows, "0.8")`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你用 `f(\"3\")` 调用 `def f(x: int) -> int`。默认情况下运行时会发生什么？",
  "options": ["注解引发 TypeError", "调用照常运行；注解在运行时不强制执行", "Python 把 \"3\" 转换成 3", "SyntaxError"],
  "explanation": "注解只是元数据。静态检查器能发现这个问题；普通的 Python 不会。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "创建一个 dataclass `Example`，包含字段 `text: str`、`label: int`，以及默认为空列表的 `tags: list[str]`（使用 `field(default_factory=list)`）。编写带类型的函数 `filter_by_label(examples: list[Example], label: int) -> list[Example]`，以及 `label_counts(examples: list[Example]) -> dict[int, int]`。",
  "hints": ["dataclass 的可变默认值需要 field(default_factory=list)。", "dataclass 会生成 __eq__，所以列表比较可以正常工作。"]
}
```

> [!TIP] 面试技巧
> - 在编码环节给函数签名加上类型提示；这样的代码读起来像生产级代码。
> - 清楚地说明类型提示不在运行时强制执行，但 mypy/pyright 和 Pydantic 会使用它们。
> - 配置和记录用 dataclass（配合 `default_factory`）。
