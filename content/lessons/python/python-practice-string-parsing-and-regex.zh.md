---
id: python-practice-string-parsing-and-regex
title: "练习：字符串解析与正则"
---

## 为什么重要

字符串解析几乎出现在每一场现场编程面试中：日志行、电话号码、key=value 配置、杂乱的 CSV 字段。面试官想看到正确且易读的模式、对畸形输入的合理处理，以及你能说出何时不该用正则。

## 概念

**解题套路**

1. 先看 5-10 条真实样本，列出各种变体（缺失字段、多余空格、引号、空字符串）。
2. 先用普通字符串工具再考虑正则：`split(sep, 1)`、`partition`、`strip`、`startswith`、`str.translate`。它们更快也更直观。
3. 当结构依赖位置或带可选部分时用正则。用 `re.compile` 只编译一次，使用**命名分组**（`(?P<ts>...)`）和 `m.groupdict()`。
4. 用 `^...$` 锚定或使用 `re.fullmatch`；否则 `re.match` 会接受尾部多余内容。
5. 不匹配时返回 `None`（或抛异常），并说明你选了哪种。不要让对 `None` 调用 `m.group` 引发的 `AttributeError` 漏出去。

**常见陷阱**：贪婪的 `.*` 吞得太多（用 `.*?` 或取反字符类如 `[^"]*`）；`re.match` 只在开头锚定，`re.search` 会扫描全串；`\d` 也会匹配非 ASCII 数字，除非传入 `re.ASCII`（或用 `[0-9]`）；嵌套量词如 `(a+)+` 在恶意输入下会引起灾难性回溯；已有 `json`、`csv` 或解析器时，不要用正则解析 HTML、JSON 或 CSV。

**常用 API**：`re.findall`（字符串列表，有分组时为元组列表）、`re.finditer`（带 `.start()` 的匹配对象）、`re.sub(pattern, repl_or_func, s)`、`re.split`，标志位 `re.I`、`re.X`（详细模式，可加注释）。

## 示例讲解

把 `2024-03-05 12:01:33 ERROR [auth] login failed latency=230ms` 解析成字段，其中延迟后缀是可选的。

```python
import re
LOG = re.compile(
    r"^(?P<ts>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?P<level>[A-Z]+) "
    r"\[(?P<svc>[\w-]+)\] (?P<msg>.*?)(?: latency=(?P<lat>\d+)ms)?$"
)
m = LOG.match("2024-03-05 12:01:33 ERROR [auth] login failed latency=230ms")
print(m.group("level"), m.group("svc"), repr(m.group("msg")), m.group("lat"))
# ERROR auth 'login failed' 230
```

惰性的 `.*?` 让可选后缀得以捕获 `latency=230ms`；贪婪的 `.*` 会把全部内容放进 `msg`，`lat` 变成 `None`。对于没有后缀的行，`lat` 为 `None`，消息保留完整文本。面试官常接着问：如果日志有 1000 万行怎么办？答：只编译一次，逐行流式处理，并统计未匹配的行数而不是直接崩溃。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`re.match(r\"\\d+\", \"abc123\")` 返回什么？",
  "options": [
    "\"123\" 的匹配对象",
    "None",
    "\"abc\" 的匹配对象",
    "列表 [\"123\"]"
  ],
  "explanation": "`re.match` 只在字符串开头尝试，而 \"a\" 不是数字，所以返回 None。`re.search` 才会找到 \"123\"。"
}
```

```quiz
{
  "id": "q2",
  "question": "你需要从 `say \"hi\" and \"bye\"` 中提取双引号之间的文本，并分别得到 `hi` 和 `bye`。哪个模式可行？",
  "options": [
    "`\"(.*)\"` 配合 findall",
    "`\"(.*?)\"` 配合 findall",
    "`\"[a-z]\"` 配合 findall",
    "`\".+\"` 配合 findall"
  ],
  "explanation": "贪婪的 `.*` 会把 `hi\" and \"bye` 作为一个整体返回。惰性的 `.*?`（或 `[^\"]*`）在下一个引号处停止，findall 返回两个结果。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `parse_log(line)`，解析形如 `2024-03-05 12:01:33 ERROR [auth] login failed latency=230ms` 的日志行。返回包含 `ts`、`level`、`service`、`message`、`latency_ms` 的字典（latency_ms 为 int；没有后缀时为 `None`）。若该行不符合格式则返回 `None`。允许首尾有空白。",
  "hints": [
    "使用命名分组和 `groupdict()`；仅当延迟不为 None 时才用 `int` 转换。",
    "让消息部分惰性匹配（`.*?`），这样可选的延迟后缀才能在 `$` 之前匹配。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "为美国电话号码编写 `normalize_phone(s)`。去掉所有非数字字符；允许一个前导国家码 `1`（共 11 位）。剩余 10 位中区号和交换码不能以 0 或 1 开头。返回 `+1-AAA-EEE-NNNN`，无效则返回 `None`。",
  "hints": [
    "`re.sub(r\"\\D\", \"\", s)` 只保留数字。",
    "对 11 位输入去掉前导 1 后，用一次 `re.fullmatch(r\"[2-9]\\d{2}[2-9]\\d{6}\", ...)` 校验清洗后的数字。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "为形如 `a=1; b=two;c=\"x;y\";d=` 的字符串编写 `parse_kv(s)`。键值对以 `;` 分隔，键由单词字符组成，值要么不带引号（去掉两端空格），要么用双引号括起（可含 `;`，去掉引号）。返回字符串字典；空值得到 `\"\"`。",
  "hints": [
    "使用带分支的 `re.finditer`：先匹配带引号的分支 `\"([^\"]*)\"`，再匹配不带引号的分支 `([^;]*)`。",
    "每次匹配中两个值分组恰有一个不为 None。"
  ]
}
```

> [!TIP] 面试技巧
> - 先说你的计划：样本、边界情况，然后才是模式。只编译一次并使用命名分组。
> - 为模式加锚点（`fullmatch` 或 `^...$`），并决定对不匹配输入的处理方式。
> - 了解惰性与贪婪的陷阱，并说明格式简单时 `split`/`partition` 比正则更合适。
