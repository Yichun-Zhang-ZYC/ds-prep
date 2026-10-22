---
id: cloud-devops-github-actions-jenkins-gitlab-ci
title: GitHub Actions / Jenkins / GitLab CI
---

## 为什么重要
CI/CD 工具在每次变更时自动构建、测试和部署。面试官会让你阅读或编写流水线，并比较主流工具，所以要掌握共同的模型以及各工具的特点。

## 概念
三种工具共享同一模型：**触发器**（push、pull request、定时、手动）启动一条由**作业**组成的**流水线**，作业由**步骤**构成，运行在 **runner/agent** 上，作业之间有**依赖**，并有**制品**和**缓存**，**密钥**在运行时注入。流水线定义放在仓库里（**流水线即代码**）。

**GitHub Actions**：YAML 文件位于 `.github/workflows/`。可用托管或自托管 runner；有庞大的可复用 **action** 市场；`needs:` 决定作业顺序；支持矩阵构建；通过 OIDC 与云联合认证可避免长期密钥。

```yaml
name: ci
on:
  pull_request:
  push: {branches: [main]}
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: {python: ["3.11", "3.12"]}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: "${{ matrix.python }}", cache: pip}
      - run: pip install -r requirements.txt && pytest
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
        env: {TOKEN: "${{ secrets.DEPLOY_TOKEN }}"}
```

**GitLab CI**：`.gitlab-ci.yml`；**stage** 按顺序运行，同一 stage 内的作业并行；`rules:`/`only:` 控制作业何时运行；内置容器镜像仓库、环境和 review app；runner 可以共享或自托管。

**Jenkins**：自托管的自动化服务器，使用 `Jenkinsfile`（声明式或脚本式 Groovy），由控制器加 agent 组成，插件生态庞大。最灵活，但需要自己运维和打补丁。

| | GitHub Actions | GitLab CI | Jenkins |
|---|---|---|---|
| 托管 | SaaS 或自托管 runner | SaaS 或自管 | 自托管 |
| 配置 | YAML 工作流 | YAML stage | Jenkinsfile（Groovy） |
| 优势 | 生态、与 GitHub 紧密结合 | 一体化 DevOps 平台 | 灵活，适合遗留系统和本地部署 |

**最佳实践**：快速反馈（缓存依赖、并行运行测试）、固定 action 版本（或使用 SHA）、最小权限令牌、绝不输出密钥、保护分支使 main 必须流水线通过。

## 示例讲解
上面的工作流在每个 pull request 和 push 到 main 时运行。`test` 作业展开为 2 个矩阵作业（Python 3.11 和 3.12），并行运行，各约 3 分钟，所以总耗时约 3 分钟而不是 6 分钟。`deploy` 有 `needs: test` 和针对分支的 `if`：在 pull request 上被跳过，在 push 到 main 时只有两个矩阵作业都通过才会运行。测试失败会阻止部署，密钥 `DEPLOY_TOKEN` 在日志中会被遮蔽。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 GitHub Actions 中，`deploy` 作业上的 `needs: test` 起什么作用？",
  "options": [
    "在 test 之前运行 deploy",
    "让 deploy 等待 test，并在 test 失败时跳过",
    "复制 test 作业的步骤",
    "在另一个分支上运行 deploy"
  ],
  "explanation": "`needs` 创建一条依赖边：deploy 只在 test 成功后才开始，test 失败时被跳过。"
}
```

```quiz
{
  "id": "q2",
  "question": "下面哪项最能区分 Jenkins 与 GitHub Actions 或 GitLab CI 的 SaaS 版本？",
  "options": [
    "Jenkins 不能运行测试",
    "Jenkins 通常是自托管的，需要自己运维控制器、agent 和插件",
    "Jenkins 没有流水线即代码",
    "Jenkins 只能构建 Java"
  ],
  "explanation": "Jenkins 通过插件和 Jenkinsfile 非常灵活，但控制器和 agent 的升级、安全和扩展都要自己管理。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "规划一条 CI 流水线。`jobs` 把作业名映射到字典，其中可选的 `needs`（作业名列表）和可选的 `branches`（该作业运行的分支列表；缺省表示所有分支）。`plan(jobs, branch)` 返回 stage 列表；每个 stage 是可以并行运行的作业的有序列表（字母序）。如果作业被 `branches` 过滤掉，或其 `needs` 中任一作业被跳过，则该作业被跳过。作业在其所有依赖之后最早的 stage 中运行。出现依赖环或所有作业中存在未知的 `needs` 项时抛出 `ValueError`。",
  "hints": [
    "没有 needs 的作业 stage 为 0，否则是其依赖中最大 stage 加 1；用带记忆的递归计算。",
    "记录正在访问的节点以检测环，并把“被跳过”（None）沿依赖向上传播。"
  ]
}
```

> [!TIP] 面试技巧
> - 先讲共同的模型（触发器、作业、步骤、runner、制品、密钥），再比较工具。
> - 要能读懂 YAML 流水线，并解释 `needs`、矩阵和条件部署。
> - 陷阱：未固定版本的第三方 action、长期有效的云密钥，以及把密钥暴露给来自 fork 的 pull request。
