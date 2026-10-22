---
id: cloud-devops-docker-compose
title: docker-compose
---

## 为什么重要
大多数真实应用需要不止一个容器：API、数据库、缓存、worker。Compose 用一个文件描述整套服务，是本地开发和集成测试的标准做法。

## 概念
**Docker Compose** 用 YAML 文件（`compose.yaml`）定义多容器应用，并用一条命令运行：`docker compose up -d`、`docker compose logs -f`、`docker compose down`（加 `-v` 会删除卷）。

```yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
volumes:
  pgdata:
```

**关键点**：
- **服务**对应容器；每个服务有 `image` 或 `build` 上下文。
- Compose 会创建默认**网络**：服务之间用**服务名**作为主机名互相访问（`db:5432`），而不是 `localhost`。
- **`ports`**（`主机:容器`）把端口发布到宿主机；**`expose`** 只是声明。不需要的数据库端口不要发布。
- **卷**在 `down`/`up` 之间持久化数据；绑定挂载（`./src:/app`）可在开发时实时同步代码。
- **`depends_on`** 控制启动*顺序*，而不是就绪状态。要配合 **healthcheck** 使用 `condition: service_healthy`，或在应用内重试。
- 配置：`environment`、`env_file`，以及按环境覆盖（`compose.override.yaml`、`-f`、profiles）。真正的密钥不要放在文件里。

**局限**：Compose 面向单台主机，没有跨机器的自愈、滚动更新或自动扩缩；生产规模请使用 Kubernetes 或托管服务。

## 示例讲解
上面的栈包含 `api` 和 `db`。执行 `docker compose up` 时，Compose 先启动 `db`，等待 `pg_isready` 通过（假设约 8 秒），再启动 `api`。如果没有 healthcheck 条件，`api` 约 1 秒后就启动，在 Postgres 还在初始化时尝试连接并崩溃。在 `api` 内部，主机名是 `db`；使用 `localhost` 会指向 api 容器自身。执行 `docker compose down`（不加 `-v`）后，`pgdata` 卷仍然保留，下次 `up` 时数据还在。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 `api` 容器内部，应该如何访问同一 Compose 文件中的 `db` 服务？",
  "options": [
    "localhost:5432",
    "db:5432",
    "127.0.0.1:5432",
    "只能用宿主机 IP"
  ],
  "explanation": "Compose 把服务放在共享网络中，服务名通过 DNS 解析。`localhost` 指的是 api 容器自己。"
}
```

```quiz
{
  "id": "q2",
  "question": "单纯的 `depends_on: [db]` 能保证什么？",
  "options": [
    "db 已准备好接受查询",
    "db 容器先于 api 容器启动",
    "db 崩溃后会重启",
    "api 只在 db 迁移完成后才启动"
  ],
  "explanation": "它只决定容器的启动顺序。要保证就绪，请添加 healthcheck 和 `condition: service_healthy`，或在应用内重试连接。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "Compose 根据 `depends_on` 决定启动顺序。编写 `start_order(services)`，其中 `services` 把服务名映射到可能包含 `depends_on`（名称列表）的字典。返回名称列表，使每个服务都排在其依赖之后；多个服务同时就绪时先取字母序最小的。出现环或未知依赖时抛出 `ValueError`。",
  "hints": [
    "使用 Kahn 算法：反复取出没有未满足依赖的服务。",
    "如果还有服务剩余却没有任何就绪的，说明存在环。"
  ]
}
```

> [!TIP] 面试技巧
> - 说明服务通过共享网络上的服务名互相访问，并且仅靠 `depends_on` 不会等待就绪。
> - 区分卷（持久化）和绑定挂载（开发时同步代码）。
> - 把 Compose 定位为本地开发和测试工具；生产需要编排系统（Kubernetes、ECS）。
