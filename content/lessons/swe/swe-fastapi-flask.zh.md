---
id: swe-fastapi-flask
title: "FastAPI / Flask"
---

## 为什么重要
数据科学家越来越多地负责服务层：把模型包装成 HTTP 接口是经典的“最后一公里”任务。面试官会问你选哪个框架、如何校验输入、如何避免每个请求都重新加载 2 GB 的模型。

## 概念
**Flask** 是极简的同步（WSGI）微框架：提供路由、请求/响应，其余靠扩展。**FastAPI** 基于 Starlette + Pydantic（ASGI）：类型注解驱动**自动请求校验**、序列化，并在 `/docs` 提供 OpenAPI 页面，还支持 `async def` 处理函数。

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field

app = FastAPI()

class PredictRequest(BaseModel):                  # validated automatically -> 422 on bad input
    age: int = Field(ge=0, le=120)
    plan: str = "basic"

class PredictResponse(BaseModel):
    churn_prob: float
    model_version: str

model = None
@app.on_event("startup")                          # (or lifespan) load the model ONCE, not per request
def load():
    global model
    model = load_model("models/churn-v3.pkl")

@app.post("/v1/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="model not loaded")
    return PredictResponse(churn_prob=model.predict_proba(req), model_version="v3")

@app.get("/health")
def health():
    return {"status": "ok"}
```

作为对比，同样的接口用 Flask 写法如下：

```python
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.post("/v1/predict")
def predict():
    data = request.get_json()                     # no built-in validation: you write it
    return jsonify(churn_prob=model.predict_proba(data))
```

**FastAPI 与 Flask**
- FastAPI：带类型的校验（422 并给出字段级错误）、自动文档、原生 async、依赖注入（`Depends`），是新 ML 服务的常见选择。
- Flask：更简单、生态庞大，适合小型应用和内部工具；需要校验时再加 `marshmallow`/`pydantic`。
- 两者共同点：在生产服务器（`uvicorn`/`gunicorn`）下运行，绝不用开发服务器；通过负载均衡器后的多个 worker 进程来扩展。

**ML 服务模式**
- **启动时只加载一次模型**，而不是每个请求加载；保持处理函数无状态。
- 把请求/响应的 **schema** 与模型内部分离；返回模型版本。
- CPU 密集型推理会在 `async def` 中阻塞事件循环：用普通 `def` 处理函数（FastAPI 会在线程池中运行），或使用进程池/专用模型服务器。
- 添加 `/health`（存活）和就绪检查、超时、结构化日志和指标（延迟分位数、错误率）。
- 单次推理开销大时，使用批处理请求或队列。

**底层原理**：装饰器把函数注册到 `(method, path 模式)` 上；框架匹配传入的请求，提取路径参数，校验并转换它们，调用你的函数，再序列化结果。

## 示例讲解
场景：`POST /v1/predict`，请求体为 `{"age": -5}`。

在 FastAPI 中，`Field(ge=0)` 让校验在你的代码运行之前就失败：客户端收到 `422`，并指出是 `age` 的问题。在裸 Flask 中，除非你自己写了检查，否则 `data["age"]` 会愉快地把 `-5` 交给模型。

性能：在 `predict` 内部加载 pickle 每次调用约耗时 800 ms；移到启动阶段后请求耗时约 5 ms，提升 160 倍，且每个 worker 的内存保持不变。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "FastAPI 自动完成而裸 Flask 不会做的事是什么？",
  "options": [
    "训练模型",
    "基于类型注解（Pydantic）校验并解析请求数据，并生成 OpenAPI 文档",
    "扩展到更多服务器",
    "加密流量"
  ],
  "explanation": "带类型注解的模型驱动校验（422 错误）、序列化和 /docs 页面。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 Web 服务中，大型 ML 模型应该在哪里加载？",
  "options": [
    "应用启动时加载一次，由该 worker 内的请求共享",
    "每个请求处理函数内部",
    "在客户端",
    "每个请求新开一个线程加载"
  ],
  "explanation": "每个请求都加载会增加数百毫秒的延迟和内存抖动。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "构建一个微型框架，理解 `@app.get` 风格的装饰器是如何工作的。`App.route(method, pattern)` 是装饰器工厂，用来注册处理函数（并返回原函数）。`handle(method, path)` 把 `{name}` 占位符与单个路径段匹配，以关键字参数传给处理函数（全为数字时转成 `int`），并返回 `(200, result)`。如果路径匹配某个路由但方法不匹配则返回 `(405, None)`，否则返回 `(404, None)`。",
  "hints": [
    "用 `re.sub(r'\\{(\\w+)\\}', r'(?P<\\1>[^/]+)', pattern)` 把模式转成正则，并用 ^ 和 $ 锚定。",
    "继续扫描所有路由：记住是否有路由匹配过该路径，只在最后才返回 405。"
  ]
}
```

> [!TIP] 面试技巧
> - 用校验、文档和 async 来论证选 FastAPI，但要指出简单的内部应用用 Flask 也可以。
> - 说“启动时加载模型、用 schema 校验、健康检查、负载均衡器后多个 worker”。
> - 陷阱：在 `async def` 中做阻塞的 CPU 工作会卡住所有并发请求；开发服务器不是生产服务器。
