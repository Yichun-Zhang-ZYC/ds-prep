---
id: cloud-devops-logging-metrics-tracing
title: "日志、指标与链路追踪"
---

## 为什么重要

当生产服务在凌晨 3 点变慢时，你需要找出问题是什么、在哪里。面试官会考察你是否了解可观测性的三大支柱、各自擅长什么，以及如何结合使用。

## 概念

**可观测性**是指通过系统的输出来理解其内部状态的能力。三大支柱回答不同的问题：
- **指标**：*有问题吗？*数值型时间序列，成本低且经过聚合。
- **日志**：*发生了什么？*带时间戳、含细节的离散事件。
- **链路追踪**：*时间花在哪里？*单个请求跨服务的路径。

**指标**：类型有*计数器（counter）*（只增不减：请求数、错误数）、*仪表（gauge）*（可增可减：队列深度、内存）和*直方图（histogram）*（分布桶，用于跨实例计算 p50/p95/p99）。服务用 **RED** 方法（Rate、Errors、Duration），资源用 **USE** 方法（Utilisation、Saturation、Errors），再加四个黄金信号（延迟、流量、错误、饱和度）。注意**高基数标签**（用户 id、请求 id）：每个唯一的标签组合都是一条独立的序列，可能撑爆存储。优先使用百分位数而不是平均值，因为平均值会掩盖尾部延迟。

```text
# metric type: counter, with labels
http_requests_total{service="scorer",status="500"} 1027
# p95 latency per service from a histogram
histogram_quantile(0.95, sum by (le, service) (rate(http_request_duration_seconds_bucket[5m])))
```

**日志**：输出带统一字段（时间戳、级别、服务、`trace_id`、消息）的**结构化**日志（JSON），便于搜索和聚合。合理使用级别（DEBUG/INFO/WARN/ERROR），绝不记录密钥或个人敏感信息，并将日志发送到集中存储（ELK/OpenSearch、Loki、CloudWatch Logs、Cloud Logging），而不是去主机上看文件。冗长日志要采样或设上限，因为数据量是主要成本。

```json
{"ts": "2026-03-01T12:00:03Z", "level": "ERROR", "service": "scorer", "trace_id": "9f2c", "msg": "model timeout", "latency_ms": 2010, "user_id": 42}
```

**链路追踪**：一条 **trace** 是由共享同一 `trace_id` 的 **span**（名称、起始时间、时长、父 span id、属性）组成的树，通过请求头（W3C `traceparent`）在服务之间传播。**OpenTelemetry（OTel）**是厂商中立的埋点标准；后端包括 Jaeger、Tempo 和 Datadog。由于追踪成本高，需要**采样**（按固定比例的头部采样，或保留慢请求和失败请求的尾部采样）。span 的**自身耗时**等于其时长减去子 span 的时长，能显示时间真正花在哪里。

**结合使用**：指标上的告警（p95 延迟超过 SLO）告诉你出了问题；一条慢请求的 trace 显示是哪个下游调用慢；通过 `trace_id` 关联的日志则解释原因。对用户感知到的症状（错误率、延迟）告警，而不是对每个可能的原因（CPU）告警。

## 示例讲解

推荐 API 的 p95 延迟告警触发：1.8 秒，而 SLO 为 500 毫秒。指标仪表盘显示错误率持平，但部署后只有 `/recs` 路由变慢。一条慢请求的 trace 包含 span：`api`（1,800 ms）→ `ranker`（1,500 ms）→ `feature-store`（1,300 ms）。自身耗时：`api` 为 $1800-1500 = 300$ ms，`ranker` 为 $1500-1300 = 200$ ms，`feature-store` 为 1,300 ms。该 `trace_id` 的日志显示特征存储反复出现 `cache miss` 警告，指向部署后缓存失效。指标发现问题，trace 定位位置，日志解释原因。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么不应该给 Prometheus 计数器添加 `user_id` 标签？",
  "options": [
    "这是调试的最佳实践",
    "高基数标签会让每个用户产生一条序列，撑爆存储；按用户的细节应放到日志或追踪中",
    "这会让查询更快",
    "直方图要求必须有它"
  ],
  "explanation": "每个唯一的标签组合都是一条新的时间序列。指标标签要保持低基数，按请求的细节用日志或追踪。"
}
```

```quiz
{
  "id": "q2",
  "question": "某个 API 很慢，但你不知道是哪个下游服务造成的。哪种信号最能定位问题？",
  "options": [
    "API 主机上的 CPU 仪表",
    "ERROR 日志的数量",
    "一条慢请求的分布式追踪",
    "平均延迟"
  ],
  "explanation": "trace 显示整条请求路径上每个 span 的耗时，因此慢的那一跳一目了然。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "练习日志和追踪两方面。（1）编写 `summarize(lines)`：每行是含 `service`、`level` 和 `latency_ms` 的 JSON 字符串。跳过不是有效 JSON 或缺少这些键的行。返回 `{service: {'count', 'errors', 'error_rate', 'p95'}}`，其中 `errors` 统计 `level == 'ERROR'` 的数量，`error_rate = errors / count`，`p95` 是延迟的最近秩（nearest-rank）第 95 百分位（排序后下标 `ceil(0.95 * n) - 1`）。（2）编写 `self_times(spans)`：每个 span 为 `{'id', 'parent', 'start', 'end'}`（根节点的 parent 为 `None`）；返回 `{id: 自身时长减去其直接子 span 时长之和}`。",
  "hints": [
    "用 try/except 包住 json.loads 和取键操作，失败就 `continue`；按服务对 (level, latency) 分组。",
    "对于 trace，先计算每个 span 的时长，再把每个 span 的时长累加到其父 span 的子节点总和中。"
  ]
}
```

> [!TIP] 面试技巧
> - 说出三大支柱及各自回答的问题：指标发现、追踪定位、日志解释；用 trace id 将它们串起来。
> - 提到 RED/USE 或黄金信号、用百分位数而非平均值，以及低基数的指标标签。
> - 要了解结构化日志、OpenTelemetry、采样（头部 vs 尾部），以及依据 SLO 对用户可感知的症状告警。
