---
id: python-data-cleaning-tasks
title: 数据清洗任务
---

## 为什么重要
DS/DA 岗位的现场编码环节常常会递给你一张杂乱的表：字符串不一致、日期格式混杂、重复记录、数值错误。评判标准是你能否系统地清洗、验证数据，并且不会悄悄丢失行。

## 概念
一份可以边讲边用的检查清单：

1. **检查**：`shape`、`dtypes`、`head()`、`isna().mean()`、`nunique()`、`describe()`、类别变量的取值计数。
2. **规范列名**：`df.columns = df.columns.str.strip().str.lower().str.replace(r"\W+", "_", regex=True)`。
3. **修正字符串**：`.str.strip().str.lower()`，用映射统一拼写（`{"usa": "US", "u.s.": "US"}`），正则提取（`.str.extract(r"(\d+)")`）。
4. **解析类型**：`pd.to_numeric(s.str.replace(r"[$,]", "", regex=True), errors="coerce")`、`pd.to_datetime(s, errors="coerce", format=...)`。`errors="coerce"` 会把无法解析的值变成 NaN，所以要**统计有多少**变成了 NaN。
5. **处理缺失值和哨兵值**（见缺失值那一课）。
6. **去重**：完全重复（`drop_duplicates()`）以及按键去重并保留最新的（`sort_values("updated_at").drop_duplicates("id", keep="last")`）。
7. **验证范围和规则**：年龄在 0–120 之间、结束时间 ≥ 开始时间、合计能对上、键唯一。把坏数据行隔离出来，而不是悄悄删掉。
8. **报告**：输入行数 → 输出行数，每条规则修正/删除了多少行。

## 示例讲解
原始 `price` 值：`["$1,200", "950", " 30.5 ", "N/A", "free"]`。去掉首尾空格，删除 `$` 和 `,`，然后 `to_numeric(errors="coerce")` → `[1200, 950, 30.5, NaN, NaN]`。有两个值解析失败：报告它们并做出决定（“free” 是不是其实应该是 0？）。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么在 `pd.to_numeric(..., errors='coerce')` 之后要立即统计 NaN？",
  "options": ["pandas 要求这样做", "coerce 会悄悄把坏值变成 NaN；统计一下能看出解析损失了多少数据", "能加快解析", "能去除重复项"],
  "explanation": "悄无声息的强制转换可能掩盖一个影响很多行的格式问题。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "为包含 `' Customer ID'`、`'Country'`、`'Price'`、`'Updated'` 列的数据编写 `clean_customers(df)`。返回 `(clean, report)`：`clean` 的列为蛇形命名的 `customer_id`、`country`、`price`、`updated`；country 去掉首尾空格、转小写，并用 {'usa': 'US', 'u.s.': 'US', 'us': 'US', 'canada': 'CA', 'ca': 'CA'} 映射（其他 → 'OTHER'）；price 从 '$1,200' 这样的字符串解析（坏值 → NaN）；updated 解析为日期时间；按 customer_id 去重时保留 `updated` 最新的一条；行按 customer_id 排序并生成新的索引。`report` 是包含 `rows_in`、`rows_out`、`bad_price` 的字典。",
  "hints": ["在 df.columns 上用 .str 方法规范列名。", "去重之前统计坏价格；先按 updated 排序，再 drop_duplicates(keep='last')。"]
}
```

> [!TIP] 面试技巧
> - 边讲边按清单进行：检查 → 列名 → 字符串 → 类型 → 缺失值 → 重复 → 验证 → 报告。
> - 使用 errors="coerce"，但一定要统计被强制转换的数量。
> - 绝不悄悄删除行；报告输入/输出行数及原因。
