---
id: cloud-devops-scaling
title: 扩缩容
---

## 为什么重要
流量有尖峰，GPU 又很贵，所以自动扩缩容是常见问题：什么在扩缩、依据什么信号、如何避免抖动。要能解释 HPA 公式及其局限。

## 概念
**纵向与横向**：纵向扩展给单个实例更多 CPU/内存（简单、有上限、常需重启）；横向扩展增加实例数量（需要无状态或分区的设计，扩展性更强）。

**Kubernetes 自动扩缩器**：
- **HPA（Horizontal Pod Autoscaler）**：依据指标（CPU、内存，或自定义/外部指标，如每秒请求数、队列长度）改变 Deployment 的副本数。
- **VPA**：调整 Pod 的 CPU/内存 requests（不要在同一指标上与 HPA 同时使用）。
- **Cluster Autoscaler / Karpenter**：在 Pod 无法调度或节点空闲时增减**节点**。
- **KEDA**：事件驱动的扩缩容，包括针对队列和流的**缩容到零**。

**HPA 公式**：
$$\text{desired} = \left\lceil \text{current} \times \frac{\text{currentMetric}}{\text{targetMetric}} \right\rceil$$
然后限制在 `[minReplicas, maxReplicas]` 范围内。指标在目标值的**容忍度**（默认 10%）之内时不做任何改变。CPU 利用率是相对于 Pod 的 **request** 计算的，所以 request 必须合理。

**避免抖动**：快速扩容，缓慢缩容。**稳定窗口**（缩容默认 300 秒）意味着控制器在缩容前使用窗口内出现过的**最高**推荐值。`behavior` 策略限制每步幅度（例如每分钟最多 4 个 Pod 或 100%）。

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: {name: api}
spec:
  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: api}
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource: {name: cpu, target: {type: Utilization, averageUtilization: 60}}
```

**注意事项**：新 Pod 需要时间（拉取镜像、加载模型、节点供应），所以要预留**余量**或预热；对 I/O 或 GPU 受限的推理，CPU 不是好信号，应使用请求并发数、队列深度或 GPU 利用率；扩缩容需要指标来源（metrics-server、Prometheus adapter）。

## 示例讲解
某 API 运行 4 个 Pod，CPU 目标为 60%。负载上升，平均利用率达到 90%：$\lceil 4 \times 90/60 \rceil = 6$ 个 Pod。之后在 6 个 Pod 时利用率降到 30%：$\lceil 6 \times 30/60 \rceil = 3$。但缩容窗口会保留最近 5 分钟内的最高推荐值：如果一分钟前的尖峰推荐了 6，Deployment 就保持 6，直到该尖峰移出窗口才会缩小。5 个 Pod、利用率 63% 时比值为 1.05，在 10% 容忍度之内，所以不做任何改变。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某 HPA 有 4 个副本，CPU 目标为 50%，当前平均 CPU 为 100%。期望副本数是多少（最大值为 10）？",
  "options": [
    "4",
    "6",
    "8",
    "10"
  ],
  "explanation": "$\\lceil 4 \\times 100/50 \\rceil = 8$，低于最大值 10。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么 HPA 的缩容稳定窗口比扩容更长？",
  "options": [
    "为了节省 API 调用",
    "为了避免抖动：因短暂下降而过快缩容会导致反复的扩容延迟和冷启动",
    "因为扩容更便宜",
    "因为 Pod 不能快速删除"
  ],
  "explanation": "容量增加得晚会伤害用户，而过早移除只能省一点钱。缓慢缩容能让容量度过短暂的低谷。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 HPA 的决策。`desired_replicas(current, metric, target, min_r, max_r, tolerance=0.1)`：令 `ratio = metric / target`；如果 `abs(ratio - 1) <= tolerance` 返回 `current`；否则返回 `ceil(current * ratio)`，并限制在 `[min_r, max_r]` 内。再实现 `stabilized_down(history, window)`：`history` 是过去的推荐值列表（最旧的在前，最后一个最新）；返回最近 `window` 个元素中的最大值，即缩容时应使用的副本数。",
  "hints": [
    "像 4 * 1.5 这样的浮点乘积可能有微小误差；`ceil` 之前先取 9 位小数可避免差一的结果。",
    "`history[-window:]` 取最后 `window` 个元素（不足时取全部）。"
  ]
}
```

> [!TIP] 面试技巧
> - 给出 HPA 公式、min/max 限制和容忍度；提到缩容稳定窗口以防止抖动。
> - 区分 Pod 扩缩（HPA）与节点扩缩（Cluster Autoscaler 或 Karpenter），并提到 KEDA 用于队列驱动和缩容到零的场景。
> - 陷阱：对 GPU 或 I/O 受限的模型用 CPU 做扩缩依据；选择能反映饱和度的信号，并考虑 Pod 启动慢的问题。
