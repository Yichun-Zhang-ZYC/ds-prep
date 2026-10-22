---
id: analytics-bi-vlookup-xlookup-index-match
title: VLOOKUP / XLOOKUP / INDEX-MATCH
---

## 为什么重要
查找函数是分析师在电子表格里“连接表”的方式。分析岗位的面试官会问 `VLOOKUP` 什么时候会出错、为什么 `INDEX-MATCH` 和 `XLOOKUP` 更安全，以及 `#N/A` 是什么意思。

## 概念
查找就是在一个区域里找到**键**，再从另一个区域的同一行返回值。

**`VLOOKUP(key, table, col_index, [range_lookup])`**
- 只在 `table` 的**第一列**中搜索，因此永远不能向键的左边查找。
- `col_index` 是写死的列位置。插入一列会悄悄让结果错位。
- `range_lookup = TRUE`（默认值！）执行**近似匹配**：要求第一列升序排列，并返回 $\le$ 键的最大值。精确匹配要用 `FALSE`（或 `0`）。
- 只返回**第一个**匹配项；重复项会被忽略。

**`INDEX(return_range, MATCH(key, lookup_range, 0))`**
- `MATCH` 返回键所在的位置，`INDEX` 返回该位置的值。返回列和查找列是分开的，所以可以向左查找，插入列也是安全的。
- 对行和列各用一次 `MATCH`，就能做二维查找。

**`XLOOKUP(key, lookup_range, return_range, [if_not_found], [match_mode], [search_mode])`**
- 默认精确匹配，可以朝任何方向查找，可以返回多列，用 `if_not_found` 参数代替 `IFERROR` 包装，还可以从底部开始搜索（取最后一个匹配）。Excel 365/2021 和 Google Sheets 中可用。

**常见错误**：`#N/A` = 没找到键（常因为尾部空格或文本与数字不一致；用 `TRIM` / `VALUE`）。查找前先处理重复键，否则会悄悄取到第一行。对于上百万行的数据，应使用数据库连接；查找函数又慢又脆弱。

## 示例讲解
薪资数据在 `A2:C100`（id、姓名、薪资），你想查 `F1` 中输入的 id `E7` 的薪资。

- `=VLOOKUP(F1, A2:C100, 3, FALSE)` 可以用，但如果有人在姓名和薪资之间插入一列，它就会出错。
- `=INDEX(C2:C100, MATCH(F1, A2:A100, 0))` 不怕插入列，同样的写法还能根据薪资找姓名（向左查找）。
- `=XLOOKUP(F1, A2:A100, C2:C100, "not found")` 最短，并且能处理缺失的键。

税率档位：门槛 `0, 10000, 40000, 85000`，税率 `10%, 12%, 22%, 24%`。收入为 50,000 时，`=VLOOKUP(50000, brackets, 2, TRUE)` 返回 $\le$ 50,000 的最大门槛（即 40,000）对应的税率，所以税率是 22%。这是近似匹配唯一合理的用法，并且门槛必须排好序。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某个 `VLOOKUP` 写成 `=VLOOKUP(A2, Data!A:D, 3)`，没有第四个参数，且数据未排序。会发生什么？",
  "options": [
    "执行精确匹配，键缺失时返回 #N/A",
    "执行近似匹配，可能悄悄返回错误的行而不报错",
    "因为第四个参数是必填而报错",
    "在所有列中搜索该键"
  ],
  "explanation": "默认值是 `TRUE`（近似匹配），它假设第一列已排序并使用二分查找。在未排序的数据上可能悄悄返回错误的行。精确匹配一定要传 `FALSE`。"
}
```

```quiz
{
  "id": "q2",
  "question": "你需要根据薪资等级代码查员工姓名，但代码列在姓名列的右边。哪些方法可行？",
  "options": [
    "只有 VLOOKUP",
    "INDEX-MATCH 或 XLOOKUP",
    "都不行，必须重排列",
    "只有 XLOOKUP"
  ],
  "explanation": "VLOOKUP 只能返回查找列右侧的列。INDEX-MATCH 和 XLOOKUP 使用分开的查找区域和返回区域，所以方向无关紧要。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用纯 Python 重新实现这三种查找。`vlookup(key, rows, col, approx=False)`：`rows` 是列表的列表，键位于第 1 列，`col` 从 1 开始计数。精确模式返回第一个匹配行的对应值，找不到则返回 `None`（即 `#N/A`）。近似模式假设各行已按升序排列，返回最后一个键 $\\le$ 查找键的行的值；如果查找键小于第一行，则返回 `None`。`index_match(return_col, lookup_col, key)` 返回 `lookup_col` 中第一个等于键的位置对应的值，否则返回 `None`。`xlookup(key, lookup, result, if_not_found=None)` 功能相同，但键缺失时返回 `if_not_found`。",
  "hints": [
    "VLOOKUP 的 col 从 1 开始，所以用 row[col - 1]。",
    "近似模式下，遍历已排序的行，记住最后一个键 <= 查找键的行；遇到第一个更大的行就停止。"
  ]
}
```

> [!TIP] 面试技巧
> - 除非是在做已排序的档位查找，否则要明确说你用的是精确匹配（`FALSE` / `0`）。默认的近似匹配是经典陷阱。
> - 优先使用 `XLOOKUP`，需要兼容旧版 Excel 时用 `INDEX-MATCH`。解释它们不怕插入列，并且能向左查找。
> - 信任查找结果之前，先检查重复键、尾部空格以及文本与数字不一致（`"007"` 与 `7`）。使用 `IFERROR` 或 `if_not_found` 要有意为之，而不是用来掩盖 bug。
