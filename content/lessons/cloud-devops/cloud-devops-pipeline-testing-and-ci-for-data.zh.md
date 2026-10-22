---
id: cloud-devops-pipeline-testing-and-ci-for-data
title: "数据流水线测试与 CI"
---

## 为什么重要
数据流水线会悄无声息地出错：一个 join 扇出让收入翻倍，一次列重命名产生 NULL，一周内都没人察觉。面试官想听到你如何测试转换逻辑、用 CI 把关合并，以及如何安全部署。

## 概念
**数据测试的层次**（金字塔）：
- **单元测试**：在手工构造的小夹具上测试纯转换函数和 SQL 宏（pytest、dbt 单元测试）。快速、确定，每次提交都运行。
- 在真实数据上的**数据测试 / 断言**：`not_null`、`unique`、`accepted_values`、`relationships`（引用完整性）、行数与取值范围检查。工具：dbt 测试、Great Expectations、Soda。每项标为 `error`（阻止发布）或 `warn`。
- **Schema / 契约测试**：与上下游约定的列、类型和语义；遇到破坏性变更就失败。
- **集成 / 端到端测试**：在隔离环境中用样本数据运行流水线并检查输出。
- **回归 / 差异测试**：把 PR 的输出与生产对比（行数、聚合值、`data-diff`），发现非预期的变化。

```yaml
# models/staging/schema.yml (dbt data tests)
models:
  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: status
        data_tests:
          - accepted_values: {values: [placed, shipped, returned]}
      - name: user_id
        data_tests:
          - relationships: {to: ref('stg_users'), field: user_id}
```

**数据的 CI**（每个 pull request）：
1. **静态检查**：对 SQL（sqlfluff）和 Python（ruff）做 lint，编译/解析模型，校验 YAML 和 DAG。
2. 用 pytest 运行**单元测试**。
3. 为每个 PR 在**隔离的 schema/数据库**中构建（克隆或采样生产数据以降低成本），使 PR 无法触碰生产表。
4. **精简 CI（slim CI）**：只构建被修改的模型及其后代（`state:modified+`），并把未修改的上游引用**延迟（defer）**到生产。这比重建整个仓库更快、更便宜。
5. **运行数据测试**，然后删除该 schema。

```yaml
# CI on pull request: build only what changed, in an isolated schema
- run: sqlfluff lint models/ && ruff check .
- run: pytest tests/unit
- run: dbt build --select state:modified+ --defer --state prod-artifacts/ --target ci
  env: {DBT_SCHEMA: ci_pr_${{ github.event.number }}}
- run: dbt run-operation drop_schema --args '{schema: ci_pr_${{ github.event.number }}}'
  if: always()
```

**CD**：合并到 `main` 后，代码经过同样的阶段部署；编排器（Airflow、Dagster）运行新版本。使用 **write-audit-publish**：先写入暂存表，运行测试，只有通过后才原子地切换/发布。同时测试**幂等性**（重跑某个分区得到完全相同的输出）和回填。

**常见陷阱**：测试只在 CI 中运行而不在生产中运行（数据每天都在变）；测试失败没有负责人；由非确定性夹具导致的不稳定测试；缓慢的全仓库构建；用过小的数据测试，掩盖了倾斜和扇出。

## 示例讲解
一个 PR 修改了 `stg_orders` 中的 join。CI 在 `ci_pr_123` schema 中对 1% 的样本构建 `stg_orders` 及其后代 `fct_orders` 和 `dash`。`unique(order_id)` 测试有 3 行失败：新的 join 产生了扇出。该 PR 无法合并。开发者加入去重，CI 变绿，与生产的差异对比显示收入变化在 0.01% 以内。合并之后，夜间任务使用 write-audit-publish，因此某天的坏数据永远不会进入看板表。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 CI 中，`dbt build --select state:modified+ --defer` 实现了什么？",
  "options": [
    "构建项目中的每一个模型",
    "只构建被修改的模型及其后代，未修改的上游模型从生产读取",
    "部署到生产",
    "跳过所有测试"
  ],
  "explanation": "精简 CI 选择被修改的节点及其下游，并把未修改的上游引用延迟到生产制品，节省时间和算力。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪种测试能发现意外使订单行重复的 join？",
  "options": [
    "对 order_id 的 not_null",
    "对 order_id 的 unique",
    "对 status 的 accepted_values",
    "linter"
  ],
  "explanation": "扇出会产生重复键，唯一性测试能检测到。not_null 和 accepted_values 仍然会通过。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "在字典行列表上实现小型的数据测试与精简 CI 工具。`not_null(rows, col)` 返回该列为 None 或缺失的行的下标。`unique(rows, col)` 返回其值出现超过一次的所有行的下标。`accepted_values(rows, col, allowed)` 返回非空值不在 `allowed` 中的行的下标（空值归 `not_null` 管）。`downstream(changed, deps)` 接收 `deps`（模型 -> 上游模型列表），返回被修改模型及其所有后代的有序列表。",
  "hints": [
    "使用 `r.get(col)`，使缺失的列也算作空值。",
    "先统计各值的出现次数，再返回计数大于 1 的行的下标。",
    "反复执行：只要某个模型的上游已在结果中，就把它加入，直到不再变化。"
  ]
}
```

> [!TIP] 面试技巧
> - 描述金字塔：对逻辑做单元测试，对真实数据做数据测试，在边界做契约测试，与生产做差异测试。
> - 解释精简 CI（state:modified+、defer、每个 PR 一个 schema），它让 CI 既快又安全。
> - 提到 write-audit-publish 和幂等加载，使失败永远不会暴露坏数据。
> - 测试需要负责人和严重级别；没人处理的红灯比没有测试更糟。
