---
id: data-engineering-etl-vs-elt
title: ETL vs ELT
---

## 为什么重要
“ETL 还是 ELT？”是数据工程面试中常见的开场问题。向 ELT 的转变塑造了现代数据技术栈（Fivetran/Airbyte + Snowflake/BigQuery + dbt），你应该能解释其中的原因。

## 概念
- **ETL（抽取 → 转换 → 加载）**：数据在**加载到**数据仓库**之前**，先在单独的处理服务器上完成转换（Informatica、自定义的 Spark/Python 任务）。只有清洗、建模好的数据才会落地。
- **ELT（抽取 → 加载 → 转换）**：原始数据先加载到数据仓库/湖仓；转换在其**内部**用 SQL 执行（通常用 dbt）。

为什么 ELT 成为默认选择：
- 云数据仓库提供便宜的存储和弹性计算，所以在仓库内转换既快又简单。
- 原始数据被保留下来，当业务逻辑变化或发现 bug 时，可以**重新转换**（重放历史）。
- 分析师和分析工程师可以用 SQL 负责转换，并配合版本控制和测试。
- 托管的连接器（Fivetran、Airbyte、Stitch）让 “EL” 部分成了标准化的商品。

ETL 仍然适用的场景：
- **隐私/合规**：PII 必须在到达数据仓库之前就被脱敏或删除。
- 重型的非 SQL 处理（解析图片/音频、复杂的 ML 特征提取）。
- 在加载之前削减巨量的原始数据（例如对 IoT 遥测数据抽样或聚合）。
- 计算成本昂贵的传统本地数据仓库。

许多真实的流水线是混合的：传输途中做轻量转换（解析、PII 脱敏、统一类型），在数据仓库中做重型建模。

## 示例讲解
一家公司用 Fivetran 把 Salesforce、Stripe 和应用的 PostgreSQL 同步到 Snowflake（EL）。dbt 模型构建 `stg_` → `int_` → `fct_revenue`、`dim_customer`（T）。当财务部门修改收入确认规则时，他们只需修改一个 dbt 模型，就能基于原始表重建 3 年的历史，无需从源系统重新抽取。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "下面哪一项是选择 ETL 而不是 ELT 的有力理由？",
  "options": ["你想轻松地重放历史", "敏感的 PII 绝不能以原始形式落到数据仓库中", "你的团队更喜欢 SQL", "数据仓库中的存储很便宜"],
  "explanation": "如果原始数据不能存储在下游，就必须在加载之前完成转换（脱敏/删除）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `choose_pattern(pii_must_be_masked, heavy_non_sql, warehouse_compute_cheap)`：如果 PII 必须在落地前脱敏，或者处理是重型的非 SQL 工作，返回 `'ETL'`；否则如果数据仓库计算便宜，返回 `'ELT'`，不然返回 `'ETL'`。再编写 `mask_email(email)`，保留本地部分的第一个字符和域名：`'alice@x.com'` → `'a****@x.com'`（星号个数等于本地部分剩余的长度）。",
  "hints": ["先检查合规和重型处理这两个条件。", "按 '@' 只分割一次。"]
}
```

> [!TIP] 面试技巧
> - 各用一句话定义两者，然后解释为什么 ELT 在云上胜出（计算便宜、原始数据可重放、由 SQL 负责转换）。
> - 说出适合 ETL 的场景：PII 脱敏、重型非 SQL 处理、削减数据量。
> - 提到现代技术栈：Fivetran/Airbyte → 数据仓库 → dbt。
