---
id: cloud-devops-pod-deployment-service
title: Pod、Deployment、Service
---

## 为什么重要
这三个对象是 Kubernetes 的核心。面试官会问请求如何到达 Pod、滚动更新如何避免停机，以及为什么不直接创建裸 Pod。

## 概念
**Pod**：最小的部署单元；一个或多个容器共享网络命名空间（同一个 IP）和卷。Pod 是**临时的**：会获得新 IP 并被替换，而不会原地修复。

**Deployment**：声明期望状态（“3 个镜像为 v2 的副本”）。它管理 **ReplicaSet**，由后者维持副本数并重建失败的 Pod。修改 Pod 模板会创建新的 ReplicaSet 并执行**滚动更新**；`kubectl rollout undo` 可以回滚。控制器运行调谐循环：观察、与期望比较、执行动作。

**Service**：在不断变化的一组 Pod 前面提供稳定的虚拟 IP 和 DNS 名称，Pod 由**标签选择器**选出。只有 **Ready**（通过就绪探针）的 Pod 才会收到流量。类型：`ClusterIP`（内部，默认）、`NodePort`、`LoadBalancer`（云负载均衡器），另有 **Ingress** 负责 L7 的 HTTP 路由。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: {name: api}
spec:
  replicas: 4
  strategy:
    rollingUpdate: {maxSurge: 25%, maxUnavailable: 25%}
  selector:
    matchLabels: {app: api}
  template:
    metadata:
      labels: {app: api}
    spec:
      containers:
      - name: api
        image: myrepo/api:2.1
        resources:
          requests: {cpu: 250m, memory: 256Mi}
          limits: {memory: 512Mi}
        readinessProbe:
          httpGet: {path: /healthz, port: 8000}
---
apiVersion: v1
kind: Service
metadata: {name: api}
spec:
  selector: {app: api}
  ports: [{port: 80, targetPort: 8000}]
```

**滚动更新的计算**：`maxSurge` 是允许超出 `replicas` 的额外 Pod 数（百分比**向上**取整）；`maxUnavailable` 是允许缺少的 Pod 数（百分比**向下**取整）。

**探针**：*存活*失败会重启容器；*就绪*失败会把 Pod 从 Service 端点中移除；*启动*探针保护启动慢的应用。要设置资源 **requests**（用于调度）和 **limits**。

## 示例讲解
某 Deployment 设置 `replicas: 4`，25% / 25%。surge 为 $\lceil 4 \times 0.25 \rceil = 1$，unavailable 为 $\lfloor 4 \times 0.25 \rfloor = 1$，所以更新期间最多 5 个 Pod，至少 3 个在提供服务。Kubernetes 先启动 1 个新 Pod，等它 Ready 后终止 1 个旧 Pod，如此重复直到 4 个都是 v2.1。Service 选择器 `app: api` 同时匹配新旧 Pod，但只有 Ready 的 Pod 才在端点中，所以客户端持续得到响应。如果新镜像崩溃，其 Pod 永远不会 Ready，滚动更新停滞，至少 3 个旧 Pod 仍在服务，此时执行 `kubectl rollout undo`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某 Service 的选择器为 `app: api`。哪些 Pod 会收到它的流量？",
  "options": [
    "命名空间中的所有 Pod",
    "带有 app=api 标签且处于 Ready 状态的 Pod",
    "只有最老的 Pod",
    "跨集群随机选择的 Pod"
  ],
  "explanation": "选择器按标签挑选 Pod，端点列表只包含通过就绪探针的 Pod。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么使用 Deployment 而不是直接创建裸 Pod？",
  "options": [
    "Pod 不能运行容器",
    "Deployment 会重建失败的 Pod、扩缩副本并支持滚动更新和回滚",
    "Deployment 更便宜",
    "裸 Pod 不能有 Service"
  ],
  "explanation": "节点宕机后裸 Pod 不会被重新调度。Deployment 的 ReplicaSet 维持期望数量并负责更新。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 Kubernetes 的两种行为。`service_endpoints(selector, pods)`：`pods` 是字典列表 `{'name', 'labels': {...}, 'ready': bool}`；返回已 Ready 且标签包含 `selector` 所有键值对的 Pod 名称，按字母序排序。`rolling_bounds(replicas, max_surge, max_unavailable)`：后两个参数是整数或形如 `'25%'` 的百分比字符串；对 `replicas` 取百分比时，surge 向上取整，unavailable 向下取整。返回 `(最大总 Pod 数, 最小可用 Pod 数)`。",
  "hints": [
    "当选择器中的每个键都出现在 Pod 标签中且值相同时，才算匹配。",
    "最大总数 = replicas + surge；最小可用 = replicas - unavailable。"
  ]
}
```

> [!TIP] 面试技巧
> - 讲清这条链路：Service（选择器）指向 Ready 的 Pod，Pod 由 ReplicaSet 创建，ReplicaSet 归 Deployment 管理。
> - 解释就绪探针与存活探针，以及它们如何保护滚动更新。
> - 陷阱：没有资源 requests 或就绪探针；调度器无法合理放置 Pod，流量会打到尚未就绪的 Pod。
