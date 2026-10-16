---
id: python-exceptions
title: 异常
---

## 为什么重要
数据管道会遇到坏数据行、缺失文件和不稳定的 API。面试官希望看到这样的代码：遇到 bug 时大声失败，遇到预期内的问题时优雅处理，并且绝不悄悄吞掉错误。

## 概念
```python
try:
    value = float(raw)
except ValueError as e:          # catch the specific exception you expect
    log.warning("bad value %r: %s", raw, e)
    value = None
else:                            # runs only if no exception
    count += 1
finally:                         # always runs (cleanup)
    processed += 1
```

- 捕获**具体的**异常。裸 `except:` 或带 `pass` 的 `except Exception:` 会掩盖 bug（拼写错误变成悄无声息的错误结果）。
- 用清晰的信息**抛出**异常：`raise ValueError(f"age must be >= 0, got {age}")`。
- 用 `raise` **重新抛出**（保留回溯），或用 `raise NewError(...) from e` 形成异常链。
- **自定义异常**：继承 `Exception`，让调用方可以捕获你的错误类别：`class DataValidationError(Exception): ...`。
- 常见内置异常：`ValueError`（类型对但值不对）、`TypeError`、`KeyError`、`IndexError`、`FileNotFoundError`、`ZeroDivisionError`、`StopIteration`。
- **EAFP vs LBYL**：Python 风格常常是“请求原谅”（`try: d[k] except KeyError`），而不是“三思而后行”（`if k in d`）。两种都可以；处理文件时 EAFP 能避免竞态条件。
- `assert` 用于开发阶段的内部不变量，不要用来校验用户输入（`-O` 选项会禁用断言）。

## 示例讲解
解析一列字符串，收集失败的行，而不是在 1000 万行中的第 9,812 行崩溃：

```python
good, bad = [], []
for i, raw in enumerate(rows):
    try:
        good.append(float(raw))
    except ValueError:
        bad.append(i)
print(f"{len(bad)} unparseable rows, e.g. {bad[:5]}")
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`try: process(row) except: pass` 有什么问题？",
  "options": ["没问题，很稳健", "它悄悄吞掉了所有错误，包括 bug 和 KeyboardInterrupt", "它比不捕获更慢", "它只捕获 ValueError"],
  "explanation": "裸 except 会捕获一切（甚至 SystemExit/KeyboardInterrupt），掩盖了真正的问题。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "定义 `class ValidationError(Exception)`。编写 `parse_age(raw)`，返回整数；如果 `raw` 不是整数字符串，抛出 `ValidationError`（用 `from` 链接原始的 `ValueError`）；如果年龄不在 0–130 之间，也抛出 `ValidationError`。再编写 `parse_all(raws)`，返回 `(ages, errors)`，其中 `errors` 是失败项的 `(index, message)` 列表。",
  "hints": ["`raise ValidationError(...) from e` 会设置 __cause__。", "在 parse_all 中只捕获 ValidationError，这样真正的 bug 仍然会暴露出来。"]
}
```

> [!TIP] 面试技巧
> - 捕获具体异常、记录上下文，绝不写 `except: pass`。
> - 展示自定义异常类，以及用 `raise ... from e` 构建清晰的异常链。
> - 在数据任务中，收集并报告坏数据行，而不是崩溃或悄悄丢弃它们。
