---
id: python-practice-data-cleaning-pipeline
title: "练习：构建数据清洗流水线"
---

## 为什么重要

限时现场或带回家的“清洗这份杂乱文件”任务奖励结构化：小而纯的函数、清晰可见的行数进出审计记录，以及带原因隔离的被拒行。一团原地修改的代码是考生失分的常见原因。

## 概念

**设计规则**（数据清洗任务一课有检查清单；本课讲结构）：

1. **一条规则一个函数**，每个函数接收 DataFrame 并返回新的 DataFrame（`df.copy()` 或基于 assign）。不要原地修改调用方的数据。
2. 用 `df.pipe(f).pipe(g)` 或 `(name, fn)` 步骤列表把它们串起来，使顺序明确且可测试。
3. **记录每一步**：名称、输入行数、输出行数。删除行数超出预期的步骤应最先排查。
4. **隔离而非删除**：拆分为 `valid` 和 `rejected`，并记录 `reason` 列。规则按固定优先级应用，每行得到它第一个未通过的原因。
5. 让解析显式化：`pd.to_numeric(errors="coerce")`、`pd.to_datetime(errors="coerce")`，然后统计新增的 NaN/NaT。
6. **幂等**：流水线运行两次的结果必须与运行一次相同。这能发现依赖先前修改的步骤。
7. 不要依赖字符串 dtype：使用 `.str` 访问器和 `isna()`，而不是 `dtype == object`。显式处理 NaN（`.str` 方法会传播它）。
8. 结尾用断言校验：主键唯一、必填列无空值、数值在范围内。

## 示例讲解

一份有 1,000 行的注册导出数据（数字仅为示意）。流水线及其审计日志：

```
step                 rows_in  rows_out
trim_and_lower_text     1000      1000
drop_invalid_email      1000       963     # 37 rows without a valid address
dedupe_latest_by_email   963       900     # 63 older duplicates
quarantine_bad_age       900       888     # 12 rows with age outside 0-120 -> rejected
```

读日志就能看清全貌：文本步骤绝不应改变行数；3.7% 的无效邮箱是合理的；63 个重复意味着约 7% 的地址注册了两次。若 `quarantine_bad_age` 删除了 300 行，你会先怀疑单位或解析错误（比如年龄以月为单位存储），而不是责怪数据。这 12 条被拒行进入带有 `reason="bad_age"` 的 `rejected` 表，供他人修复数据源。最终断言：`df["email"].is_unique`、`df["age"].between(0, 120).all()`，且 888 + 12 + 37 + 63 = 1,000 行全部有去向。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么清洗步骤应返回新的 DataFrame 而不是修改传入的参数？",
  "options": [
    "更快",
    "调用方的原始数据保持不变，步骤可重复运行、可测试，审计日志也可信",
    "pandas 禁止原地修改",
    "减少内存使用"
  ],
  "explanation": "纯函数式的步骤让流水线可复现且幂等，并方便你比较前后行数。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个本应只做文本规范化的步骤删除了 40% 的行。最好的第一反应是什么？",
  "options": [
    "接受，脏数据很常见",
    "借助行数日志检查该步骤是否有 bug，例如 NaN 比较或过于激进的过滤",
    "反复运行流水线直到行数改变",
    "用零填充缺失的行"
  ],
  "explanation": "规范化步骤应当保持行数不变。出乎意料的大幅下降指向 bug（例如对 NaN 列做过滤），而不是脏数据。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `clean_text_cols(df, cols)`，返回一个副本，其中 `cols` 里的每一列都去除首尾空白、把内部连续空白压缩为一个空格并转为小写；空字符串变为缺失值（NaN）。已缺失的值保持缺失。不在 `cols` 中的列保持不变，且不修改输入。",
  "hints": [
    "链式调用 `.str.strip().str.replace(r\"\\s+\", \" \", regex=True).str.lower()`。",
    "`s.where(s != \"\", np.nan)` 把空字符串变成缺失值。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "`df` 含有 `id`、`age`（字符串或数字）、`start`、`end`（ISO 日期字符串）。编写 `split_valid(df)`，返回 `(valid, rejected)`。若 age 不是数字或不在 0-120 内，该行以 `reason=\"bad_age\"` 被拒；否则若 `end` 早于 `start`，以 `reason=\"bad_dates\"` 被拒。`valid` 保留原有列，`rejected` 多一列 `reason`；两者都保持行顺序并重置为 0..n-1 的索引。",
  "hints": [
    "`pd.to_numeric(errors=\"coerce\")` 把 \"abc\" 变成 NaN，而 `between(0, 120)` 对 NaN 为 False。",
    "`np.select` 按优先级顺序接收条件，因此第一个未通过的规则生效。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "编写 `run_pipeline(df, steps)`，其中 `steps` 是 `(name, fn)` 的列表，每个 `fn` 把 DataFrame 映射为 DataFrame。按顺序应用它们，返回 `(result, log)`，`log` 是字典列表 `{\"step\": name, \"rows_in\": int, \"rows_out\": int}`。不要修改输入。若某步返回的不是 DataFrame，抛出提到该步骤名的 `ValueError`。",
  "hints": [
    "在每一步前记录 `len(cur)`，之后记录 `len(nxt)`。",
    "在循环内检查返回类型，这样错误信息会指出失败的步骤。"
  ]
}
```

> [!TIP] 面试技巧
> - 讲清结构：纯函数式步骤、行数进出的审计日志、带原因的隔离、最终断言。
> - 绝不悄悄删行；带原因的被拒表是资深做法。
> - 提到幂等性，以及在小表上单独测试每一步；说明在生产中会监控什么。
