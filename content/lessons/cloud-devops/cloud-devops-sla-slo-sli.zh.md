---
id: cloud-devops-sla-slo-sli
title: "SLA / SLO / SLI"
---

## 为什么重要
“你如何决定一个服务需要多可靠？”是 SRE 和 MLOps 面试中的经典问题。SLI、SLO 与错误预算把可靠性变成了一个可以告警、也可以与功能迭代速度权衡的数字。

## 概念
- **SLI（指标）**：好事件与有效事件之比的测量值，例如延迟低于 300 ms 的请求数 / 全部请求数。应选择以用户为中心的信号：可用性、延迟、正确性、新鲜度、吞吐。
- **SLO（目标）**：某个 SLI 在一个时间窗口内的内部目标，例如 30 天内 99.9% 的请求成功。
- **SLA（协议）**：带有后果（赔偿、罚款）的合同。它比 SLO 更宽松，这样你会先违反自己的目标，而不是客户的合同。
- **错误预算**：$1 - \text{SLO}$。30 天内 99.9% 的预算是 $0.001 \cdot 43{,}200 = 43.2$ 分钟的完全宕机，或 0.1% 的请求。预算用完后，应冻结高风险发布，优先做可靠性工作。

```yaml
# Illustrative SLO definition
service: model-api
slis:
  availability: "good = non-5xx responses, valid = all responses except 4xx client errors"
  latency: "good = responses < 300 ms"
slos:
  - sli: availability
    target: 99.9
    window: 30d
  - sli: latency
    target: 95.0
    window: 30d
```

**几个 9**：99% 在 30 天内允许 7.2 小时；99.9% 允许 43.2 分钟；99.99% 允许 4.32 分钟。每多一个 9，冗余与工程成本大约增加 10 倍，因此不要承诺超出用户需求的可靠性。

**组合**：串联依赖相乘，$A = \prod_i A_i$，所以链路上的两个 99.9% 服务只有 99.8%。并行冗余副本的可用性为 $1 - \prod_i (1 - A_i)$。

**燃烧率（burn rate）**表示预算的消耗速度：$\text{burn} = \dfrac{\text{错误率}}{1 - \text{SLO}}$。燃烧率为 1 时，恰好在窗口结束时用完整个预算；燃烧率 14.4 一小时就消耗 2%。**多窗口多燃烧率告警**（Google SRE workbook）对快速燃烧（如 1 小时与 5 分钟窗口均超过 14.4 倍）发出呼叫，对慢速燃烧（3 天内 1 倍）创建工单。短窗口能让告警在恢复后迅速解除。

```promql
# Page when the 1h and 5m burn rates both exceed 14.4x (budget 0.1%)
(sum(rate(http_requests_total{code=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))) > (14.4 * 0.001)
and
(sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) > (14.4 * 0.001)
```

**为 ML 系统选择 SLI**：预测延迟、可用性、特征**新鲜度**，以及质量代理指标（拥有有效分数的预测占比，或延迟标签到达后的准确率）。每个服务只设少量 SLO，基于用户的真实感受，而不是 CPU 或内存。

## 示例讲解
某预测 API 在 30 天内的可用性 SLO 为 99.9%，每月处理 1000 万个请求，因此预算为 10,000 个失败请求。一次错误的发布使最近一小时的 5xx 比例升至 1.44%：燃烧率 $= 0.0144 / 0.001 = 14.4$。按此速度整个预算会在 $720 / 14.4 = 50$ 小时内耗尽，而一小时就已消耗 2%。快速燃烧告警呼叫值班人员；回滚后燃烧停止。如果到第 20 天已用掉 80% 的预算，团队就暂停功能发布。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "SLO 与 SLA 通常是什么关系？",
  "options": [
    "它们是同一个数字",
    "SLA 比 SLO 更严格",
    "SLO 是内部目标，比合同中的 SLA 更严格",
    "SLA 是按请求测量的 SLI"
  ],
  "explanation": "团队把 SLO 设得比 SLA 更严，以便在违反客户合同之前就发现并修复问题。"
}
```

```quiz
{
  "id": "q2",
  "question": "99.9% 的 SLO 持续出现 6 倍燃烧率。30 天的预算大约多久耗尽？",
  "options": [
    "5 小时",
    "5 天",
    "30 天",
    "6 天"
  ],
  "explanation": "$720\\text{ h} / 6 = 120$ 小时 = 5 天。燃烧率是对窗口长度做除法：燃烧率 1 恰好持续一个窗口。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现错误预算的计算。`allowed_downtime_minutes(slo, days=30)` 返回以分钟计的宕机预算。`burn_rate(bad, total, slo)` 返回观测错误率除以预算比例。`hours_to_exhaustion(rate, days=30)` 返回以恒定燃烧率消耗完窗口预算所需的小时数（燃烧率不为正则返回无穷大）。`should_page(long_burn, short_burn, threshold=14.4)` 仅当两个窗口都不低于阈值时才返回 True。`serial_availability(parts)` 把串联依赖的可用性相乘。",
  "hints": [
    "预算比例 = 1 - slo；30 天窗口有 30 * 24 * 60 分钟。",
    "burn = (bad / total) / (1 - slo)；耗尽时间 = 窗口小时数 / burn。",
    "要求两个窗口同时满足，可以避免对已经恢复的旧尖峰发出呼叫。"
  ]
}
```

> [!TIP] 面试技巧
> - 用一句话分别定义这三个术语，然后引出错误预算，把它作为在可靠性与迭代速度之间做决策的工具。
> - 从用户的角度选择 SLI，并说明哪些算“有效”事件（排除客户端 4xx）。
> - 解释燃烧率，以及为什么多窗口告警优于静态的错误率阈值。
> - 指出串联依赖会相乘，因此在 99.9% 的依赖之上，不加冗余或降级方案就无法达到 99.99%。
