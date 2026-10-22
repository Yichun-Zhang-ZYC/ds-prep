---
id: swe-unit-tests
title: "单元测试（pytest）"
---

## 为什么重要
未经测试的数据代码会悄悄出错：一次重构改了 join 键，模型就在垃圾数据上默默训练。“你如何测试特征工程？”是 DS 和 ML 工程师岗位的标准问题，在白板上写出干净的 pytest 测试也是常见的筛选环节。

## 概念
**单元测试**：用已知输入和预期输出，对一小段逻辑（一个函数或类）做快速、隔离的检查。不涉及网络、磁盘或数据库；毫秒级运行，因此每次提交都能跑成千上万个。

**pytest** 会发现名为 `test_*.py` 的文件和名为 `test_*` 的函数，使用普通的 `assert` 并给出丰富的失败信息。

```python
# tests/test_features.py
import pytest
from churn.features import normalize

def test_normalize_sums_to_one():
    assert sum(normalize([1, 1, 2])) == pytest.approx(1.0)   # floats: never ==

@pytest.mark.parametrize("bad", [[], [0, 0]])
def test_normalize_rejects_degenerate_input(bad):
    with pytest.raises(ValueError, match="empty or zero"):
        normalize(bad)

@pytest.fixture
def sample_df():
    import pandas as pd
    return pd.DataFrame({"user": [1, 2], "spend": [10.0, 30.0]})

def test_spend_share(sample_df):
    assert spend_share(sample_df).tolist() == [0.25, 0.75]
```

- **Arrange / Act / Assert**：构造输入、调用被测单元、对结果断言。每个测试只验证一种行为，并以它命名（`test_normalize_rejects_zero_sum`）。
- 用 **parametrize** 覆盖多种情况而不用复制粘贴；用 **fixture** 共享准备工作（小型 DataFrame、通过 `tmp_path` 得到的临时目录）。
- 浮点数：`pytest.approx`；DataFrame：`pandas.testing.assert_frame_equal`；数组：`numpy.testing.assert_allclose`。
- 测试**边界情况**：空输入、NaN、单行、重复值、错误 dtype、边界值。
- **ML 特有**：测试确定性的部分（特征变换、指标、固定随机种子的划分）、形状与 dtype、不变量（概率之和为 1、划分之间无泄漏），以及“过拟合单个 batch”的冒烟测试。你无法对“模型很好”做单元测试，只能验证管道是正确的。
- 覆盖率（`pytest --cov`）显示哪些部分没被测试；它不能证明测试是有意义的。

## 示例讲解
场景：`spend_share` 把每个用户的花费除以总花费。值得写的测试：

- 正常路径：花费 `[10, 30]` 得到 `[0.25, 0.75]`。
- 边界：单个用户得到 `[1.0]`。
- 边界：总花费为 0 时必须抛出清晰的 `ValueError`，而不是悄悄返回 NaN。
- 性质：占比之和始终为 1（用 `approx`）。

先写总额为零的测试（它会失败），再加上保护分支。这就是微缩版的测试驱动开发，而且该测试现在能防止下一次重构出问题。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "比较计算得到的浮点数时，哪个断言是正确的？",
  "options": [
    "`assert 0.1 + 0.2 == 0.3`",
    "`assert str(x) == '0.3'`",
    "`assert x == pytest.approx(0.3)`",
    "`assert x is 0.3`"
  ],
  "explanation": "二进制浮点不精确；`approx` 在容差范围内比较。"
}
```

```quiz
{
  "id": "q2",
  "question": "`@pytest.mark.parametrize` 的主要作用是什么？",
  "options": [
    "并行运行测试",
    "让同一个测试体跑多组输入/预期，并作为独立测试分别报告",
    "跳过慢测试",
    "mock 外部服务"
  ],
  "explanation": "它消除了复制粘贴，并能准确显示哪个用例失败。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "构建一个迷你测试框架的两个部分。(1) `raises(exc_type)`：类似 `pytest.raises` 的上下文管理器；代码块抛出 `exc_type`（或其子类）则通过，没抛出则抛 `AssertionError('DID NOT RAISE')`，其他异常原样向外传播。(2) `run_tests(tests)`：运行每个无参可调用对象并返回 `{name: 'pass' | 'fail' | 'error'}`，其中 `fail` 表示 `AssertionError`，`error` 表示其他任何异常。",
  "hints": [
    "在 `@contextmanager` 生成器中，围绕 `yield` 捕获 `exc_type` 并 return；如果代码体正常结束，则在 try 块之后抛出 AssertionError。",
    "先捕获 `AssertionError`，再捕获更宽泛的 `Exception`。"
  ]
}
```

> [!TIP] 面试技巧
> - 描述测试金字塔：大量快速的单元测试，较少的集成测试，极少的端到端测试。
> - 回答“如何测试 ML 代码”：测试变换、指标、形状、不变量和随机种子，而不是模型精度。
> - 陷阱：依赖执行顺序、时钟、未设种子的随机数或共享可变状态的测试；它们不稳定，最终会被忽视。
