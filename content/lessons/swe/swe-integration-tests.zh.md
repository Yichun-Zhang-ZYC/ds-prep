---
id: swe-integration-tests
title: "集成测试"
---

## 为什么重要
单元测试证明每个部分单独可用；生产环境的 bug 藏在接缝处：与表结构不匹配的 SQL 查询、下游服务拒绝的序列化格式、从未执行的迁移。“你怎么知道管道端到端能正常工作？”是面试常客。

## 概念
**集成测试**：让多个真实组件（你的代码加数据库、文件系统、队列、HTTP API）一起运行，验证它们能协同工作。它比单元测试更慢、定位更不精确，但能发现 mock 所掩盖的连接和契约错误。

**测试金字塔。** 大量单元测试（毫秒级），较少的集成测试（100 毫秒到数秒），少量端到端测试（完整系统，数分钟）。倒置金字塔会让测试套件变慢且不稳定。

```python
# conftest.py: a real (throwaway) database per test
import pytest, sqlalchemy as sa

@pytest.fixture
def db(tmp_path):
    engine = sa.create_engine(f"sqlite:///{tmp_path}/test.db")   # or a Postgres container
    apply_migrations(engine)                                     # same schema as prod
    yield engine
    engine.dispose()

def test_pipeline_writes_daily_totals(db):
    load_raw_events(db, sample_events())          # real insert
    run_daily_job(db, day="2024-05-01")           # real SQL, real transaction
    rows = db.execute(sa.text("SELECT user_id, total FROM daily")).fetchall()
    assert sorted(rows) == [(1, 30.0), (2, 5.0)]
```

**如何让它们可靠。**
- 使用**真实但可丢弃的依赖**：SQLite 或 Postgres/Redis 容器（Testcontainers、docker compose），而不是 mock 数据库。应用与生产*相同的迁移*。
- **隔离**：每个测试从已知状态开始，可通过全新数据库、结束时回滚的事务或清空表实现。测试不能依赖执行顺序。
- 控制不确定性：固定随机种子、冻结时间、不访问真实互联网。对第三方 API 使用录制的响应或本地假服务器，并保留少量*契约测试*来发现上游变化。
- **数据管道**：用很小的 fixture 数据集运行整个作业，并对输出表和 schema（列、dtype、行数、无重复键）做断言，同时包含一个坏输入的用例。
- 给它们打标记（`@pytest.mark.integration`），开发者每次保存时只跑单元测试，集成测试放到 CI 中运行。

**断言什么**：事务性（部分失败不留下部分写入）、幂等性（作业运行两次结果相同），以及约束（唯一键、非空）确实生效。

## 示例讲解
场景：一个每日作业按用户 upsert 汇总值。用 mock 数据库的单元测试通过了，生产环境却失败：真实表有 `UNIQUE(user_id, day)`，而作业的 `INSERT` 忽略了它。

针对带生产 schema 的 SQLite 的集成测试把作业运行两次。第二次抛出 `IntegrityError`，暴露出缺少 upsert。改用 `INSERT ... ON CONFLICT DO UPDATE` 后，测试断言运行两次后表中仍恰好有 2 行，这同时证明了幂等性。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "用 mock 数据库的单元测试通过了，但生产环境因 UNIQUE 约束失败。哪种测试本可以发现它？",
  "options": [
    "更多带更多 mock 的单元测试",
    "针对使用生产 schema 的真实（可丢弃）数据库的集成测试",
    "linter",
    "负载测试"
  ],
  "explanation": "约束存在于真实 schema 中；mock 无法强制执行它。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪种做法最能提高集成测试的可靠性？",
  "options": [
    "所有测试共享一个长期存在的测试数据库",
    "依赖测试执行顺序",
    "调用真实的第三方 API",
    "每个测试都从已知的、隔离的状态开始（全新数据库或回滚的事务）"
  ],
  "explanation": "隔离使测试相互独立、可重复且可并行。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "针对内存 SQLite 数据库编写 `OrderRepo` 中偏集成测试风格的部分。`add_many(rows)` 在单个事务中插入 `(id, customer, amount)` 元组，因此重复 id 或负金额（违反表的 PRIMARY KEY / CHECK）会抛出 `sqlite3.IntegrityError`，且不会留下部分行。`totals()` 返回 `{customer: total_amount}`。",
  "hints": [
    "`with conn:` 在成功时提交，在异常时回滚。",
    "插入用 `executemany`，汇总用 `GROUP BY customer` 加 `SUM(amount)`。"
  ]
}
```

> [!TIP] 面试技巧
> - 从风险角度阐述：单元测试覆盖逻辑，集成测试覆盖边界（数据库、队列、API），少量端到端测试覆盖关键流程。
> - 说“可丢弃的真实依赖 + 生产 schema + 隔离的状态”，并提到管道的幂等性和回滚检查。
> - 陷阱：共享测试数据库和依赖顺序的测试；它们在本地通过而在 CI 中失败。
