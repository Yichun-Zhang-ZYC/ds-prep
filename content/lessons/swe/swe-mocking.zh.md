---
id: swe-mocking
title: "Mock 与测试替身"
---

## 为什么重要
访问真实支付 API、S3 或 LLM 的测试又慢、又不稳定、又昂贵、结果还不确定。mock 用可控的替身取代这些依赖，让你能测试自己的逻辑和失败处理。面试官也会追问过度 mock：代码已经坏了测试却依然通过。

## 概念
**测试替身（test double）**（口语中都叫“mock”）：
- **Dummy**：从不被使用的占位参数。
- **Stub**：返回预设答案（`get_metric` 返回 0.62）。
- **Fake**：轻量的可工作实现（用内存字典代替 Redis，用 SQLite 代替 Postgres）。
- **Spy / Mock**：记录调用，以便对*交互*做断言（`send_alert` 被调用一次且带有某条消息）。

```python
from unittest.mock import Mock, patch

# churn/alerts.py
def notify_if_low(client, metric_name, threshold):
    value = client.get_metric(metric_name)          # HTTP call in production
    if value < threshold:
        client.send_alert(f"{metric_name} low: {value}")
        return True
    return False

def test_alert_sent_when_below_threshold():
    client = Mock()
    client.get_metric.return_value = 0.62            # stub: canned answer
    assert notify_if_low(client, "auc", 0.7) is True
    client.send_alert.assert_called_once_with("auc low: 0.62")   # verify interaction

def test_retry_on_timeout():
    client = Mock()
    client.get_metric.side_effect = [TimeoutError, 0.9]          # raise, then succeed

# patch where the name is LOOKED UP, not where it is defined
@patch("churn.alerts.requests.get")
def test_with_patch(mock_get):
    mock_get.return_value.json.return_value = {"auc": 0.8}
```

**经验法则。**
- 在**你无法掌控、或缓慢/不确定的边界**处 mock：网络、时钟、随机性、云 SDK、LLM 调用、文件系统。不要 mock 自己的纯函数，直接调用即可。
- 优先使用**依赖注入**（把 `client` 作为参数传入）而不是 patch：这样无需 monkeypatch 导入，代码更易测试。
- 在名字**被使用的地方** `patch`（`churn.alerts.requests.get`），而不是它被定义的地方。
- `Mock(spec=RealClient)` 或 `create_autospec` 会让 mock 拒绝真实类中没有的属性和签名，因此 API 变化时测试会失败。
- 用 `side_effect` 模拟错误（超时、500）和序列（失败两次后成功），这些情况很难真实复现。
- 优先对**结果**（返回值、状态）而不是**交互**（调用次数）做断言；过度指定的测试会在每次重构时失败。

**过度 mock 的风险**：如果所有协作者都被 mock，测试只是在检查你的代码是否按你的写法调用了 mock。要用少量集成测试以及针对真实服务的契约检查来平衡。

## 示例讲解
场景：`notify_if_low` 应该在 AUC 低于 0.7 时发出告警。

1. 让 `get_metric` 返回 `0.62`，并断言 `send_alert` 被调用一次，参数为 `"auc low: 0.62"`。
2. 让它返回 `0.81`，并断言 `send_alert.assert_not_called()`。
3. 增加重试封装，用 `side_effect=[TimeoutError, 0.9]` 证明它在一次超时后能恢复，既不用网络也不用真的 sleep（同样注入一个假的 `sleep`）。

三个测试都在毫秒内运行且结果确定，但没有一个能证明真实的指标 API 会返回浮点数，因此仍需保留一个集成测试。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`churn/alerts.py` 中写了 `import requests`，并调用 `requests.get(...)`。应该 patch 什么？",
  "options": [
    "只在 requests 包源码内部 patch `requests.get`",
    "`churn.alerts.requests.get`（名字被查找的位置）",
    "`churn.alerts`",
    "什么都不用；mock 不能 patch 导入"
  ],
  "explanation": "应在被测代码的命名空间中 patch 该名字；patch 定义处可能影响不到已经导入的引用。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪一项最能说明过度 mock？",
  "options": [
    "测试运行很快",
    "用 mock 模拟网络超时",
    "所有协作者都被 mock，以致真实集成已坏测试仍能通过",
    "使用了 `autospec`"
  ],
  "explanation": "这样的测试只验证了你对协作者的假设，而不是它们的真实行为。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现一个最小的 `Mock` 测试替身。调用它时把 `(args, kwargs)` 记录到 `calls` 并增加 `call_count`。如果 `side_effect` 是列表，每次调用消耗下一项：若该项是异常类或异常实例则抛出，否则返回；没有 side_effect 时返回 `return_value`。`assert_called_once_with(*args, **kwargs)` 只有在恰好调用一次且参数完全一致时才通过，否则抛出 `AssertionError`。",
  "hints": [
    "复制 side_effect 列表，这样 pop 不会修改调用者的列表。",
    "检查 `isinstance(item, BaseException)` 或 `isinstance(item, type) and issubclass(item, BaseException)`。"
  ]
}
```

> [!TIP] 面试技巧
> - 说出替身的类型（stub、fake、spy/mock），并说明你 mock 什么：缓慢、外部、不确定的边界。
> - 了解“在查找处 patch”和 `autospec`，防止 mock 与现实脱节。
> - 陷阱：对实现细节做断言；测试在无害的重构时失败，真正的 bug 却漏过去。
