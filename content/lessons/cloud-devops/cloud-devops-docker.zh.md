---
id: cloud-devops-docker
title: Docker（镜像、容器、Dockerfile、分层）
---

## 为什么重要
Docker 是把模型、API 和数据管道打包成在任何地方运行结果一致的方式。面试官会问镜像与容器的区别、层缓存如何工作，以及如何让镜像更小更安全。

## 概念
**镜像**是不可变的分层文件系统加元数据（入口、环境变量）。**容器**是镜像的运行（或已停止）实例：利用 Linux **namespace**（独立的 PID、网络、挂载）和 **cgroup**（CPU 与内存限制）隔离出来的进程。容器共享宿主机内核，所以毫秒级启动，比虚拟机更轻量。

**Dockerfile** 用来构建镜像。每个 `RUN`、`COPY` 和 `ADD` 会产生一个**层**；层按内容寻址并被缓存。

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER 1000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**层缓存规则**：只有当某一步的指令和输入都未变，*且之前每一步都命中缓存*时，这一步才会复用。因此把很少变化的步骤（基础镜像、依赖）放前面，把经常变化的（源代码）放最后。先复制 `requirements.txt` 再 `COPY . .`，改代码时就能跳过耗时的 `pip install`。

**最佳实践**：
- 使用小而固定版本的基础镜像（`python:3.12-slim`）；用 `.dockerignore` 排除 `.git`、数据和虚拟环境。
- **多阶段构建**：在较重的构建阶段编译，只把产物复制到精简的最终阶段。
- 以**非 root** 用户运行；不要把密钥写进层里（它们会留在历史中）。
- 每个容器一个主进程；日志输出到 stdout/stderr。
- `ENTRYPOINT` 是固定的程序，`CMD` 是默认参数（可覆盖）。优先使用 exec 形式 `["a","b"]`，信号才能送达进程。

**数据**：容器文件系统是临时的。持久化数据用**卷**或绑定挂载。常用命令：`docker build -t app:1.0 .`、`docker run -p 8080:8000 app:1.0`、`docker ps`、`docker logs`、`docker exec -it <id> sh`。用版本号或 git SHA 打标签，不要只用 `latest`。

## 示例讲解
上面的 Dockerfile 有 7 条指令。开发者修改了 `app.py`。前 4 步命中缓存，其中耗时（假设 90 秒）的 `RUN pip install` 因为 `requirements.txt` 没变而被复用；只有 `COPY . .` 及之后的步骤重新构建，约 2 秒。如果 Dockerfile 把 `COPY . .` 放在 `pip install` 之前，任何源码改动都会使复制层及其后所有步骤失效，每次构建都要重复 90 秒的安装。镜像大小也很重要：`python:3.12` 约 1 GB，而 `-slim` 只有几百 MB，拉取和冷启动都更快。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某个 Dockerfile 先 `COPY . .`，再 `RUN pip install -r requirements.txt`。主要问题是什么？",
  "options": [
    "pip 会失败",
    "任何源码改动都会使安装层失效，每次构建都要重新安装依赖",
    "镜像会变成虚拟机",
    "层无法被缓存"
  ],
  "explanation": "缓存复用要求之前所有步骤都不变。应先复制 `requirements.txt` 并安装，再复制源码。"
}
```

```quiz
{
  "id": "q2",
  "question": "镜像与容器的区别是什么？",
  "options": [
    "两者是一回事",
    "镜像是不可变模板；容器是带可写层的运行实例",
    "容器是模板；镜像是运行的进程",
    "镜像需要虚拟机管理程序"
  ],
  "explanation": "一个镜像可以启动许多容器，每个容器有自己很薄的可写层，除非使用卷，否则会被丢弃。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 Docker 层缓存。一次构建是步骤列表 `(instruction, input_hash)`，其中 `input_hash` 标识 `COPY` 步骤读取的文件（`RUN` 等步骤用 `''`）。`rebuilt_steps(old, new)` 返回 `new` 中必须重新构建的下标列表：只有当某步与 `old` 中同一位置的步骤相同，且之前所有步骤都命中缓存时，才算命中。再编写 `build_time(old, new, costs)`，返回需重建步骤的 `costs[i]` 之和（`costs` 是 `new` 中每步的耗时列表）。",
  "hints": [
    "一旦某一步未命中，后面所有步骤都必须重建，所以用一个 `cached` 标志并在未命中时置为 False。",
    "超出 `old` 长度的步骤视为未命中。"
  ]
}
```

> [!TIP] 面试技巧
> - 表述要简洁：镜像是蓝图，容器是运行实例；容器共享宿主机内核，虚拟机则不共享。
> - 解释层缓存与步骤顺序、多阶段构建和非 root 用户。
> - 陷阱：放在 `ENV` 或 `COPY` 里的密钥会留在镜像历史中；使用构建密钥或运行时注入。
