---
id: cloud-devops-configmap-and-secret
title: ConfigMap 与 Secret
---

## 为什么重要
十二要素应用把配置放在镜像之外。在 Kubernetes 中就是 ConfigMap 和 Secret，面试官喜欢追问它们如何注入，以及为什么 Secret 默认并不真正“保密”。

## 概念
**ConfigMap**：非敏感的键值配置（功能开关、URL、整个配置文件）。**Secret**：结构相同，但用于敏感数据（密码、令牌、TLS 密钥），以 base64 编码存储。

**Base64 是编码，不是加密。**任何能读取 Secret 对象的人都能解码。真正的保护来自 **RBAC**（限制谁能 `get` secrets）、etcd 中的**静态加密**（KMS 提供者），以及外部管理器（Vault，或通过 External Secrets 或 CSI 驱动接入的 AWS Secrets Manager）。不要把含真实值的 Secret 清单提交到 git；使用 sealed secrets 或外部存储。

**三种使用方式**：
```yaml
spec:
  containers:
  - name: api
    image: myrepo/api:2.1
    envFrom:
    - configMapRef: {name: api-config}
    - secretRef: {name: api-secret}
    env:
    - name: LOG_LEVEL
      value: debug
    volumeMounts:
    - {name: cfg, mountPath: /etc/api}
  volumes:
  - name: cfg
    configMap: {name: api-files}
```
1. **环境变量**（带 `valueFrom` 的 `env`，或用 `envFrom` 导入所有键）。仅在容器启动时读取一次，所以**修改后需要重启 Pod**。
2. **挂载卷**：每个键变成一个文件；Kubernetes 会在一段延迟后原地刷新文件（`subPath` 挂载除外）。应用需要重新读取。
3. 由环境变量构造的**命令行参数**。

**优先级**：显式的 `env` 条目覆盖 `envFrom`；多个 `envFrom` 来源之间，后面的优先。

**实践**：每个环境一份配置（通过 Helm values 或 Kustomize 区分 dev/staging/prod）；配置变更时滚动 Pod（在 Pod 模板中放哈希注解，或用 `kubectl rollout restart`）；不应变化的配置设置 `immutable: true`；密钥优先以文件方式挂载而不是环境变量（环境变量会泄漏到日志、崩溃转储和子进程）。

## 示例讲解
某 ConfigMap 设置了 `LOG_LEVEL=info` 和 `DB_HOST=db.prod`。某 Secret 中的 `DB_PASSWORD` 为 `czNjcjN0`，解码后是 `s3cr3t`。容器对两者都使用 `envFrom`，并显式设置 `env: LOG_LEVEL=debug`。最终环境为 `LOG_LEVEL=debug`（显式优先）、`DB_HOST=db.prod`、`DB_PASSWORD=s3cr3t`。之后有人把 ConfigMap 改成 `LOG_LEVEL=warn`；运行中的 Pod 在重启前仍然看到 `debug`，因为环境变量在启动时就固定了。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 Kubernetes Secret 并不因为叫 Secret 就安全？",
  "options": [
    "Secret 是磁盘上的明文文件",
    "值只是 base64 编码，任何有读权限的人都能解码；需要 RBAC 和静态加密",
    "Secret 每天过期",
    "Secret 不能在 Pod 中使用"
  ],
  "explanation": "Base64 是可逆编码。应使用 RBAC、etcd 加密，最好再配合外部密钥管理器来保护。"
}
```

```quiz
{
  "id": "q2",
  "question": "你修改了某个运行中 Pod 通过环境变量使用的 ConfigMap。会发生什么？",
  "options": [
    "Pod 立即看到新值",
    "Pod 在重启前一直保留旧值",
    "API 服务器会删除该 Pod",
    "该修改被拒绝"
  ],
  "explanation": "环境变量在容器启动时设置。挂载的卷最终会刷新，但环境变量需要重启（例如 `kubectl rollout restart`）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "按 Kubernetes 的方式构建容器的环境变量。`resolve_env(env_from, env)`：`env_from` 是 `(kind, data)` 列表，kind 为 `'configmap'`（data 是明文字符串字典）或 `'secret'`（data 是 base64 编码字符串的字典，需解码成文本）。后面的来源覆盖前面的。`env` 是显式变量字典，覆盖一切。返回最终字典。再编写 `mask(env, secret_keys)`，返回一份副本，其中 `secret_keys` 对应的值被替换为 `'***'`（可以安全地写入日志）。",
  "hints": [
    "按顺序用字典赋值应用各来源，让后面的覆盖前面的，最后再应用 `env`。",
    "`base64.b64decode(v).decode()` 可以把 Secret 的值转成文本。"
  ]
}
```

> [!TIP] 面试技巧
> - 直接说明 Secret 只是 base64 而非加密；并提到 RBAC、静态加密和外部密钥存储。
> - 了解环境变量与卷的取舍：环境变量需要重启，卷最终会更新但应用要重新加载。
> - 陷阱：把配置写进镜像，或把 Secret YAML 提交到 git；配置应按环境区分并放在仓库之外。
