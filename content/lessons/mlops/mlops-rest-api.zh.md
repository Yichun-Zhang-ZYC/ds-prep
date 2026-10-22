---
id: mlops-rest-api
title: REST API（FastAPI）
---

## 为什么重要
部署模型最常见的方式是一个小型 HTTP 服务。面试官会考察请求校验、只加载一次模型、延迟、并发，以及如何部署和扩缩容。

## 概念
**FastAPI** 是 Python 中的常用选择：基于 ASGI、支持异步、自动生成 OpenAPI 文档，并用 **Pydantic** 模型校验请求和响应。

```python
app = FastAPI()
model = None

@app.on_event("startup")          # or a lifespan handler
def load(): global model; model = joblib.load("model.pkl")

class Req(BaseModel):
    features: list[float] = Field(min_length=3, max_length=3)

@app.post("/predict")
def predict(req: Req):
    return {"score": float(model.predict_proba([req.features])[0, 1]), "model_version": "v8"}
```

**关键实践**：
- **在启动时只加载一次模型**，绝不要每个请求都加载；为 Kubernetes 提供 `/health`（存活）和 `/ready`（模型已加载）端点。
- **校验输入**（类型、范围、长度），对不合法的负载返回 **422**；只有服务端故障才返回 5xx。为 API 加版本（`/v1/predict`），并在响应中包含 `model_version`。
- **CPU 密集型推理会阻塞事件循环**：使用普通 `def` 端点（在线程池中运行）、`run_in_executor`，或多个 worker 进程（`uvicorn --workers N` / gunicorn）。只有在 await I/O（如调用 feature store）时才使用 `async def`。
- **批量端点**（实例列表）可摊薄开销；**动态批处理**需要模型服务器（见后面的课程）。
- **延迟**：跟踪 p50/p95/p99，而不是平均值。延迟预算 = 网络 + 特征获取 + 推理 + 序列化。保持模型热状态，避免冷启动。
- **打包**：固定依赖的 Docker 镜像；部署在负载均衡器之后；按 CPU 或请求速率自动扩缩容；通过 canary 发布。
- **可观测性与安全**：结构化请求日志（id、版本、延迟）、用于监控的预测日志、超时、限流、认证。
- GPU 模型通常更适合放在专用模型服务器之后，而不是普通 FastAPI。

## 示例讲解
服务处理每个请求需要 20 ms 的 CPU 推理。一个 worker 进程每秒能处理 $1/0.020 = 50$ 个请求。目标是 400 req/s，最大利用率 70%。

所需 worker 数：$400 / (50 \times 0.7) = 11.4$，所以需要 12 个 worker 进程，例如 3 个 pod，每个 4 个 worker。如果 p99 必须低于 100 ms，保护尾延迟的是利用率上限（利用率接近 100% 时排队延迟急剧增长），而不是平均值。请求 `features=[1.0, 2.0]` 校验失败，在不到 1 ms 内返回 422，不会触及模型。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么要在启动处理器中加载模型，而不是在端点函数里加载？",
  "options": ["端点无法导入 joblib", "每次请求都加载会增加数秒延迟和内存抖动", "这能提高准确率", "FastAPI 路由要求如此"],
  "explanation": "加载一次并复用；每个请求都加载会毁掉延迟并浪费资源。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个 CPU 密集的 `async def` 端点直接运行推理。问题是什么？",
  "options": ["会返回错误结果", "会阻塞事件循环，导致其他请求停滞", "CPU 用得太少", "异步端点不能返回 JSON"],
  "explanation": "在异步代码中做阻塞工作会冻结事件循环；应使用同步端点（线程池）、executor 或更多进程。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "不使用 FastAPI，模拟端点逻辑。`validate(payload)` 返回错误字符串列表（合法则为空）：`payload` 必须是字典，其键 `'features'` 是恰好 3 个数字（int 或 float，不含 bool）的列表。`handle_predict(payload, weights, bias, version)` 返回 `(status, body)`：不合法时返回 `(422, {'errors': [...]})`，否则返回 `(200, {'score': sigmoid(w·x + b), 'model_version': version})`。`percentile(values, q)` 返回最近秩百分位数：升序排序后取第 `ceil(q/100 * n)` 个元素（从 1 开始）。",
  "hints": ["bool 是 int 的子类，所以要先显式排除 bool。", "最近秩：index = ceil(q / 100 * n) - 1（0 起始）。"]
}
```

> [!TIP] 面试技巧
> - 讲一遍：Pydantic 校验、启动时加载模型、health/ready 探针、带版本的路由、结构化日志、Docker、自动扩缩容。
> - 用百分位数描述延迟，并根据单请求服务时间和利用率目标估算容量。
> - 陷阱：用 CPU 工作阻塞事件循环，或在多个线程间修改同一个全局模型；要知道何时该换成模型服务器。
