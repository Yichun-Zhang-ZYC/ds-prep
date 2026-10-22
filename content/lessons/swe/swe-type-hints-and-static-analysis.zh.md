---
id: swe-type-hints-and-static-analysis
title: 类型提示与静态分析
---

## 为什么重要
类型提示现在已是专业 Python 的标配：它们记录意图，驱动 IDE 自动补全，并在运行前发现 bug。数据和机器学习代码库以无类型的 DataFrame 和字典著称，因此面试官喜欢问：提示能保证什么、不能保证什么，如何在遗留仓库中引入类型检查器，以及何时改用运行时校验（pydantic）。

## 概念
**提示是什么**：注解（`def f(x: int) -> str`）会被解释器保存，但**不会强制执行**。**静态类型检查器**（mypy、pyright、pyrefly）不运行代码，只读取注解并报告不一致之处。类型是**渐进式**的：未注解的代码被视为 `Any`，所以可以逐步引入。

**现代语法**（3.9+ 内置泛型，3.10+ 联合类型）：`list[int]`、`dict[str, float]`、`int | None`（代替 `Optional[int]`）、`tuple[int, ...]`。3.12 增加了泛型语法 `def first[T](xs: list[T]) -> T` 和 `type` 别名语句。只有在需要支持旧版本或前向引用时才加 `from __future__ import annotations`。

**常用构造**：
- `Optional` / `X | None`：强制处理 `None`；检查器在 `if x is None`、`isinstance` 或真值判断之后会**收窄**类型。
- `TypeVar` / 泛型：关联输入与输出类型。
- `Protocol`：**结构化**类型（带检查的鸭子类型）：只要有正确方法的类都符合。
- `TypedDict`、`dataclass`、`NamedTuple`：用带类型的记录代替松散的字典。
- `Literal["train", "test"]`、`Final`、`Callable[[int], str]`、用于只读参数的 `Sequence`/`Mapping`、用于惰性结果的 `Iterator`/`Generator`、`Self`、`override`。
- `Any` 会关闭检查（并且会扩散）；`object` 接受任何值但不允许任何操作；`# type: ignore[code]` 应当很少使用并附带注释。

**静态与运行时**：mypy 看不到从 JSON、CSV 或请求中到来的数据。在边界处做校验用 **pydantic**（或 dataclass 加校验器，DataFrame 用 `pandera`）；它在运行时使用同样的注解。两者结合：在边缘校验，内部信任类型。

**静态分析工具**：**ruff**（快速的 linter 和格式化器：未使用的导入、bug、风格、导入顺序）、black/ruff-format、mypy/pyright（类型）、bandit（安全）。在 **pre-commit** 和 CI 中运行，风格争论随之消失，bug 在评审前就被发现。

**遗留仓库的引入策略**：先不开严格模式；先给新代码和公共接口加类型；按模块（或按包覆盖配置）启用 `--strict`；建立现有错误的基线，CI 只对新增错误失败；安装类型存根（`types-requests`、`pandas-stubs`）；先处理访问量最大的模块。

**常见陷阱**：以为提示会校验输入；`Any` 蔓延；调用方忽略 `Optional` 返回值；可变默认参数（`def f(x: list[int] = [])`）；给每个局部变量加类型（让类型推断去工作）；明明 `Sequence` 就够却用过于具体的类型（`list`）；为了类型而写出难以阅读的复杂代码。

## 示例讲解
函数 `def find_user(uid: int) -> User | None` 被写成 `find_user(1).name` 调用。没有类型时，这在生产环境中第一次遇到缺失用户时才会失败（`AttributeError: 'NoneType' ...`）。有了 CI 中的 mypy，错误会在评审时出现：`Item "None" of "User | None" has no attribute "name"`。

在一个有 200 个模块的遗留服务中引入类型（示意计划）：第 1 周加入 ruff 和非严格的 mypy，建立 480 个错误的基线，CI 只对新增错误失败；第 2-4 周给公共函数加注解，用 `TypedDict`/dataclass 取代字典记录，把基线降到约 150；然后逐个包启用 `disallow_untyped_defs`。每个包在打开开关前先清理其错误。

边界示例：请求 JSON `{"age": "42"}` 能通过任何静态检查，因为其类型是 `dict[str, Any]`。pydantic 模型 `class Req(BaseModel): age: int` 在运行时校验并转换，此后带类型的对象在代码中流转。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "如果用字符串 `\"a\"` 调用 `def f(x: int)`，运行时会发生什么？",
  "options": [
    "自动抛出 TypeError",
    "没什么特别的：注解不会被强制执行；只有静态检查器或显式校验才能发现",
    "字符串被转换为 int",
    "程序拒绝启动"
  ],
  "explanation": "CPython 在调用时忽略注解。mypy 这类静态工具或 pydantic 这类运行时校验器才会强制执行。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于只需要遍历和索引、且同时接受列表和元组的参数，哪种标注最好？",
  "options": [
    "`list[int]`",
    "`Sequence[int]`",
    "`Any`",
    "`object`"
  ],
  "explanation": "`Sequence`（来自 collections.abc）接受任何有序的只读集合，使调用方更灵活。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "使用 `inspect.signature` 实现 `unannotated(fn)`：按顺序返回缺少注解的参数名（跳过 `self` 和 `cls`），如果缺少返回值注解，则最后再加上 `'return'`。这是在 CI 中检查注解覆盖率的第一步。",
  "hints": [
    "`inspect.Parameter.empty` 和 `inspect.Signature.empty` 标记缺失的注解。",
    "遍历 `sig.parameters.items()`；可变参数也会作为参数出现。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "静态检查器推理的注解，你也能在运行时检查。使用 `typing.get_origin` / `get_args` 实现 `matches(value, tp)`，根据 `Any`、`None`、普通类、`float`（接受整数）、`Optional`/`Union`/`X | Y`、`list[T]` 和 `dict[K, V]`（递归检查元素）来校验值；其他泛型只检查其原始类。",
  "hints": [
    "`get_origin(list[int])` 是 `list`；`Optional[int]` 的是 `typing.Union`，`int | None` 的是 `types.UnionType`。",
    "用 `all(...)` 对元素类型递归。"
  ]
}
```

```reveal
{
  "prompt": "mypy 会对下面的代码报告什么？如何修复？\n\n```python\ndef find_user(uid: int) -> User | None: ...\n\nuser = find_user(1)\nprint(user.name)\n```",
  "answer": "mypy 会报告 `Item \"None\" of \"User | None\" has no attribute \"name\"`。该函数可能返回 `None`，类型检查器会强制你处理这种情况。修复方式是在使用前收窄类型：`if user is None: raise LookupError(uid)`（或提前返回），之后 `user` 就被收窄为 `User`。不要习惯性地使用 `# type: ignore` 或 `assert`，也不要把签名弱化为 `Any`。"
}
```

> [!TIP] 面试技巧
- 讲清楚：提示不会在运行时强制执行；mypy/pyright 静态检查，pydantic 在运行时校验。
- 展示现代语法（`list[int]`、`X | None`）以及对 Optional 值的类型收窄。
- 了解 Protocol（结构化类型）、TypedDict/dataclass，以及为什么 `Any` 会造成泄漏。
- 描述渐进式引入：建立基线、新代码严格、CI 门禁、带 ruff 的 pre-commit。
