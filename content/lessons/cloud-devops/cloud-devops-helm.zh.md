---
id: cloud-devops-helm
title: Helm
---

## 为什么重要
真实集群里有几十份近乎相同的清单，分布在 dev、staging 和 prod。Helm 是模板化、版本化和发布它们的标准方式，几乎每场 Kubernetes 面试都会出现。

## 概念
**Helm** 是 Kubernetes 的包管理器。**chart** 是一个包含模板和默认值的目录；**release** 是 chart 在集群中安装的一个实例，并带有修订历史。

```text
mychart/
  Chart.yaml        # name, version, appVersion, dependencies
  values.yaml       # default configuration
  templates/
    deployment.yaml
    service.yaml
    _helpers.tpl
```

模板在 `.Values` 对象上使用 Go 模板语法：

```yaml
# templates/deployment.yaml
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: api
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

**Values** 来自按此顺序合并的多层（后者优先）：chart 的 `values.yaml` < `-f prod.yaml` 文件（按给定顺序）< `--set key=value`。映射会**深度合并**；列表是**整体替换**，不会合并。

**常用命令**：
```bash
helm install api ./mychart -f values-prod.yaml --set image.tag=2.1
helm upgrade --install api ./mychart -f values-prod.yaml   # idempotent deploy
helm template ./mychart -f values-prod.yaml               # render locally
helm lint ./mychart && helm diff upgrade api ./mychart    # diff is a plugin
helm history api && helm rollback api 3
```

**团队为什么用它**：一个 chart、多个环境（只有 values 不同）；带版本的发布，支持**原子升级**（`--atomic` 失败时自动回滚）和 `helm rollback`；chart **依赖**（例如 Redis 子 chart）；通过 OCI 仓库使用公共 chart。

**注意事项**：Go 模板很容易写得难以阅读，逻辑要尽量少。不要把密钥放在 git 中的 values 文件里（使用 sops、External Secrets）。卸载时 Helm 不会删除 CRD。**Kustomize** 是基于叠加层、不使用模板的替代方案；许多团队对第三方应用用 Helm，自己的应用用 Kustomize 或 Helm，并搭配 GitOps（Argo CD、Flux）。

## 示例讲解
chart 默认值：`replicaCount: 1`，`image: {repository: myrepo/api, tag: latest}`。prod 文件设置 `replicaCount: 5` 和 `image: {tag: 2.1}`。深度合并得到 `replicaCount: 5`、`image.repository: myrepo/api`（保留默认值）、`image.tag: 2.1`。临时加上 `--set replicaCount=8` 会优先于文件，渲染出的 Deployment 为 `replicas: 8`，镜像为 `myrepo/api:2.1`。如果第 4 个修订出问题，`helm rollback api 3` 会把第 3 个修订的清单恢复为新的第 5 个修订。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "chart 默认值为 `resources: {cpu: 1, memory: 1Gi}`，你的覆盖文件设置了 `resources: {cpu: 2}`。最终的 `resources` 是什么？",
  "options": [
    "{cpu: 2}",
    "{cpu: 2, memory: 1Gi}",
    "{cpu: 1, memory: 1Gi}",
    "报错"
  ],
  "explanation": "Helm 对映射做深度合并，所以未指定的 `memory` 保留默认值。相反，列表会被整体替换。"
}
```

```quiz
{
  "id": "q2",
  "question": "Helm chart 与 release 有什么区别？",
  "options": [
    "没有区别",
    "chart 是模板包；release 是它的一个已安装实例，带有修订历史",
    "release 是模板；chart 是运行中的 Pod",
    "每个集群只能安装一次 chart"
  ],
  "explanation": "同一个 chart 可以用不同的 release 名称安装多次，每个 release 有自己的 values 和修订。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 Helm 对 values 的处理。`deep_merge(base, override)` 返回新字典：嵌套字典递归合并，`override` 中的其他值（包括列表）直接替换 base 的值；不得修改输入。`render(template, values)` 把每个 `{{ .Values.a.b }}`（花括号内空格可有可无，点号路径进入嵌套字典）替换为 `str(value)`；路径不存在时抛出 `KeyError`。",
  "hints": [
    "仅当 base 的值和 override 的值都是字典时才递归；否则以 override 为准。",
    "`re.sub` 可以接受函数；在函数内用连续的字典查找来遍历点号路径。"
  ]
}
```

> [!TIP] 面试技巧
> - 解释 chart 与 release 的区别、values 的优先级顺序，以及映射深度合并而列表整体替换。
> - 提到 `helm upgrade --install --atomic`、`helm template` 和 `helm diff`，实现安全、可审查的部署。
> - 陷阱：把密钥放在 values 文件里，以及过于花哨的模板；保持 chart 简单，被问到时与 Kustomize 对比。
