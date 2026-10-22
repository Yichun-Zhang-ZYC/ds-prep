---
id: cloud-devops-prometheus-grafana
title: "Prometheus 与 Grafana"
---

## 为什么重要
Prometheus 和 Grafana 是 Kubernetes 与 ML 服务场景下默认的开源指标栈。面试官希望你了解拉取（pull）模型、四种指标类型、`rate()` 与 `histogram_quantile()` 的原理，以及为什么标签基数会拖垮服务器。

## 概念
**Prometheus** 是时序数据库加抓取器。它按固定间隔从目标**拉取**（`GET /metrics`）数据，把样本存为 `metric_name{label="value"} -> (timestamp, float)`，并用 **PromQL** 计算规则。短生命周期任务通过 **Pushgateway** 推送；**Alertmanager** 负责告警的去重、分组与路由。目标通过静态配置或服务发现（Kubernetes、EC2、Consul）获得。

```yaml
# prometheus.yml
scrape_configs:
  - job_name: model-api
    scrape_interval: 15s
    static_configs:
      - targets: ["api-1:8000", "api-2:8000"]
```

**指标类型**：
- **Counter（计数器）**：只增不减（重启时归零），如 `http_requests_total`。必须配合 `rate()` 或 `increase()` 查询。
- **Gauge（仪表）**：可升可降，如内存、队列深度、在途请求数。
- **Histogram（直方图）**：累积的 `_bucket{le="..."}` 计数器加 `_sum` 与 `_count`。分位数在查询时用 `histogram_quantile()` 估算（桶内线性插值），并且桶可以**跨实例求和**。
- **Summary（摘要）**：分位数在客户端计算，无法跨实例聚合。

**常用 PromQL**：`rate(x[5m])` 是窗口内每秒的平均增量，并能处理计数器重置；`sum by (label)` 做聚合；`avg_over_time`、`topk`，以及 `up == 0` 可以发现挂掉的目标。不要对各实例的分位数求平均；应先聚合桶，再取分位数。

**基数**：每个不同的标签组合都是一条独立的时间序列。`user_id`、`request_id` 或原始 URL 之类的标签会产生数百万条序列，撑爆内存。请使用有界标签（`route` 模板、`status_class`）。

**Grafana** 是可视化层：在 Prometheus（以及 Loki、Tempo、SQL 数据源）之上提供仪表盘、面板和变量，也自带告警。好的仪表盘对服务采用 **RED** 方法（Rate、Errors、Duration），对资源采用 **USE** 方法（Utilization、Saturation、Errors）。仪表盘与告警规则应放进 Git（JSON、Jsonnet、Terraform）。

**扩展**：单个 Prometheus 既不高可用也不适合长期存储；可以用两个副本抓取同一批目标，并用 **Thanos / Mimir / Cortex**（或托管服务）实现长期保留与全局查询。本地保留期通常为 15 天。

## 示例讲解
某模型 API 跑在 3 个 pod 上，要求服务 p95 低于 300 ms，5xx 低于 2%。

```promql
# p95 latency over 5 minutes, aggregated across all pods
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket{job="model-api"}[5m])))

# error ratio
sum(rate(http_requests_total{job="model-api", code=~"5.."}[5m]))
  / sum(rate(http_requests_total{job="model-api"}[5m]))
```

假设 5 分钟内聚合后的桶为 `le=0.1: 50`、`le=0.5: 90`、`le=1.0: 100`、`le=+Inf: 100`。第 95 百分位的秩是 $0.95 \cdot 100 = 95$，落在 `(0.5, 1.0]` 桶内：$0.5 + (1.0 - 0.5)\cdot\frac{95 - 90}{100 - 90} = 0.75$ 秒。这超出了 300 ms 的目标，因此下面的告警会在错误持续 10 分钟后触发。

```yaml
groups:
  - name: model-api
    rules:
      - alert: HighErrorRatio
        expr: |
          sum(rate(http_requests_total{code=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.02
        for: 10m
        labels: {severity: page}
        annotations: {runbook: "https://wiki/runbooks/model-api-5xx"}
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "三个 pod 各自上报了自己的 p95 延迟。在 Prometheus 中得到全局 p95 的正确方法是什么？",
  "options": [
    "对三个 p95 取平均",
    "取三个 p95 的最大值并当作全局 p95",
    "先跨 pod 对直方图 `_bucket` 序列求和，再应用 `histogram_quantile`",
    "用 Gauge 记录延迟"
  ],
  "explanation": "分位数不能求平均。直方图的桶是计数器，可以先跨实例求和再计算分位数（精度受桶边界限制）。"
}
```

```quiz
{
  "id": "q2",
  "question": "在请求计数指标上，哪个标签最可能造成基数爆炸？",
  "options": [
    "method（GET/POST）",
    "status_class（2xx/4xx/5xx）",
    "user_id",
    "route 模板，如 /predict"
  ],
  "explanation": "每个不同的 `user_id` 都会产生一条新的时间序列。指标中应使用有界标签；按用户的细节放到日志或链路追踪里。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟两个 PromQL 的基本构件。`counter_increase(samples)` 接收计数器的 `(timestamp, value)` 对，返回总增量，值下降视为计数器重置（重置后新值视为从 0 开始的增量）。`rate(samples)` 是增量除以首尾样本之间的时间差。`histogram_quantile(q, buckets)` 接收以 `float('inf')` 结尾的累积 `(le, count)` 桶，找到包含秩 $q \\cdot$ 总数 的桶，并在其下界与上界之间线性插值（最低桶从 0 开始；若秩落在 +Inf 桶，返回前一个上界）。",
  "hints": [
    "发生重置（`v < prev`）时，该步的增量就是 `v`。",
    "秩 = q * 总数（最后一个桶的计数）。找到第一个计数 >= 秩的桶。",
    "插值：lower + (upper - lower) * (rank - 下方计数) / (桶内计数)。"
  ]
}
```

> [!TIP] 面试技巧
> - 先说“拉取模型、`/metrics` 端点、服务发现”，再说出四种指标类型及其适用场景。
> - 计数器一定要套 `rate()`；不要对分位数求平均；知道直方图精度取决于桶的选择。
> - 提到基数问题与长期存储（Thanos/Mimir），这是生产中最经典的两个问题。
> - 对症状（错误率、延迟 SLO）告警，带上 `for:` 持续时间和 runbook，而不是对原始 CPU 告警。
