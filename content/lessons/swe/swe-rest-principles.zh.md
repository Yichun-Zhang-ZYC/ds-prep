---
id: swe-rest-principles
title: "REST 原则"
---

## 为什么重要
几乎每个模型都通过 HTTP API 提供服务，每个数据平台也通过它集成。面试会让你为预测服务设计接口，或解释为什么 PUT 重试是安全的而 POST 重试可能重复扣款。清晰的 REST 术语能快速体现后端成熟度。

## 概念
**REST**（Representational State Transfer）把 API 建模为**资源**（名词，由 URL 标识），并用一组统一的 **HTTP 方法**来操作。关键约束：客户端-服务器、**无状态**请求（每个请求携带所需的全部上下文，例如认证令牌，因此任何服务器实例都能处理）、可缓存的响应、统一接口。

```http
GET    /v1/models               200  list models (safe, idempotent)
POST   /v1/models               201  create; Location: /v1/models/42 (not idempotent)
GET    /v1/models/42            200  fetch one; 404 if missing
PUT    /v1/models/42            200  replace whole resource (idempotent)
PATCH  /v1/models/42            200  partial update
DELETE /v1/models/42            204  remove, no body (idempotent)
POST   /v1/models/42/predict    200  action that is not CRUD: verb allowed as a sub-resource
GET    /v1/predictions?model=42&limit=50&cursor=abc    filtering + pagination via query params
```

**方法语义**
- **安全**（无副作用）：`GET`、`HEAD`。**幂等**（重复执行得到相同的服务器状态）：`GET`、`PUT`、`DELETE`。`POST` 两者都不是，因此客户端重试超时的 POST 需要**幂等键（idempotency key）**请求头来避免重复。
- `PUT` 替换整个资源；`PATCH` 修改其一部分。

**状态码**：`200` OK、`201` Created、`204` No Content、`400` 格式错误或输入无效、`401` 未认证、`403` 已认证但无权限、`404` 未找到、`409` 冲突、`422` 校验失败、`429` 限流、`500` 服务器 bug、`503` 不可用。选择能告诉客户端*重试是否有帮助*的状态码（5xx 和 429 也许可以，4xx 不行）。

**设计指南**
- 用复数名词，嵌套只一层（`/users/7/orders`），路径中不放动词，除非是明确的动作（`/models/42/predict`）。
- **分页**（基于游标的比 offset 更易扩展）、过滤和排序通过查询参数实现。
- **版本化**（`/v1/`），让破坏性变更不会弄坏客户端；统一的 JSON 错误体（`code`、`message`）。
- 对于 ML 服务：批量接口、请求 id、输入 schema 校验，并在响应中返回模型版本。

## 示例讲解
场景：客户端调用 `POST /v1/orders`，连接超时后重试。服务器创建了一个订单还是两个？

没有保护的话：可能是两个。带上 `Idempotency-Key: 9f3a...` 请求头后，服务器把该键与第一次的响应一起存储，并在重试时重放它，因此只有一个订单。对比用相同请求体的 `PUT /v1/orders/42`：发送十次仍只有一个相同的资源，天然幂等；重复的 `DELETE /v1/orders/42` 在第一次成功后返回 `404`，不会进一步改变状态。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪一组只包含幂等的 HTTP 方法？",
  "options": [
    "GET、POST、PUT",
    "POST、PATCH、DELETE",
    "GET、PUT、DELETE",
    "PUT、POST、HEAD"
  ],
  "explanation": "重复 GET、PUT 或 DELETE 得到相同的服务器状态。POST（创建）不是幂等的，PATCH 也不保证幂等。"
}
```

```quiz
{
  "id": "q2",
  "question": "请求带有有效令牌，但用户无权访问该资源。哪个状态码合适？",
  "options": [
    "403 Forbidden",
    "401 Unauthorized",
    "仅 404 Not Found",
    "500 Internal Server Error"
  ],
  "explanation": "401 表示未认证（凭证缺失或无效）；403 表示已认证但未授权。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `handle(store, method, path, body=None)`，作为 `/items` 的内存 REST API（store 是 `{id: item}` 字典）。支持 `GET /items`、`POST /items`（201，id = 最大 id + 1，缺少 `name` 则 400）、`GET`/`PUT`/`DELETE /items/<id>`（分别返回 200/200/204，不存在则 404，PUT 需要 `name`，否则 400）。返回 `(status, body)`；已知路径上不支持的方法返回 405，未知路径返回 404。",
  "hints": [
    "按 '/' 拆分路径，根据段数（集合还是单个条目）分派。",
    "对条目路由，先判断 405 和 404，再操作 store。"
  ]
}
```

> [!TIP] 面试技巧
> - 能背出每个方法的安全性与幂等性，并给出 POST 重试/幂等键的例子。
> - 分清 401 与 403、400/422 与 500；状态码用错是常见的设计批评点。
> - 陷阱：有状态服务器（内存中的 session）会破坏水平扩展；应把状态放在令牌或共享存储中。
