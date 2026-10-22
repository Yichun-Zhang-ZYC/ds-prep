---
id: cloud-devops-pull-requests-and-code-review
title: Pull request 与代码评审
---

## 为什么重要
Pull request 是代码、CI、安全和团队规范的交汇点。面试官会问你如何写出易于评审的 PR、评审时看什么，以及分支保护如何让 main 始终可发布。

## 概念
**Pull request**（PR/MR）提议合并某个分支，并附带讨论、CI 结果和批准。它是评审、审计以及（通常）部署的单位。

**写好 PR**
- 小而单一目的（经验法则：改动不超过约 400 行）；把重构与行为变更分开。
- 描述：做了什么、为什么、如何测试、风险、上线/回滚方案、工单链接。附上截图或示例输出。
- 先自查 diff；保持有意义的提交；本地跑测试；未就绪时标记为 **draft**。

**如何评审**：检查正确性和边界情况、测试、命名和可读性、安全（密钥、注入、权限）、性能、可观测性和向后兼容。具体而友善；区分阻塞问题与小问题（`nit:`）；多提问而不是命令；够好就批准，不必完美。争取在一个工作日内回复。

**自动化与保护**（`main` 上的分支规则）：

```yaml
# .github/CODEOWNERS
*            @org/platform
infra/       @org/sre
*.sql        @org/data-eng

# branch protection (conceptually)
required_approvals: 2
required_status_checks: [ci, lint, security-scan]
dismiss_stale_reviews: true
require_linear_history: false
```

典型门禁：必需的批准数、CI 通过、分支已更新、签名提交、禁止向 `main` 强制推送、code owner 评审。合并方式：**merge commit**、**squash**（每个 PR 一个提交，main 整洁）或 **rebase and merge**（线性）。大型组织还会使用堆叠 PR、合并队列（串行合并、基于最新 main 重新测试）和功能开关，以安全地发布未完成的工作。

## 示例讲解
策略：2 个批准，检查项 `ci` 和 `lint`，`infra/*` 归 `dana` 所有。`ann` 的 PR 修改了 `infra/main.tf`，收到：bob APPROVED、cy APPROVED、ann APPROVED（她自己）、CI 绿、lint 绿。

- 有效批准：bob 和 cy 共 2 个，因为作者自己的批准被忽略，所以批准数达标。
- 检查通过。
- CODEOWNERS：`infra/main.tf` 需要 `dana`，她尚未批准，因此 PR 因 `codeowner` 原因被阻塞。

Dana 批准后，bob 随后提交了 `CHANGES_REQUESTED`：他最新的状态取代了之前的批准，剩下 2 个批准（cy、dana），但出现了阻塞原因 `changes_requested`。只有 bob 重新批准后 PR 才能合并。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪种 PR 实践最能提升评审质量和周转速度？",
  "options": [
    "每个版本只提一个大 PR，让评审者看到全部内容",
    "小而聚焦的 PR，有清晰描述，并在请求评审前 CI 已通过",
    "对受信任的作者跳过评审",
    "把互不相关的修复压成一个提交"
  ],
  "explanation": "评审效果会随着 diff 变大而急剧下降。小而单一目的、附带上下文且自动化检查通过的 PR，评审更快更深入，也更容易回滚。"
}
```

```quiz
{
  "id": "q2",
  "question": "CODEOWNERS 文件加上分支保护中的“require review from code owners”强制了什么？",
  "options": [
    "只有 owner 能向任何分支推送",
    "owner 必须编写所有代码",
    "修改受管路径的变更必须获得对应 owner 的批准才能合并",
    "受管路径跳过 CI"
  ],
  "explanation": "CODEOWNERS 把路径模式映射到个人或团队；配合分支保护，涉及这些路径的 PR 必须得到 owner 的批准才能合并。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "把分支保护策略的合并门禁实现为 `can_merge(pr, rules)`。只有每位评审者最近一次非 COMMENTED 的状态有效；作者自己的批准不计；任何当前的 CHANGES_REQUESTED 都会阻塞；所有必需检查必须是 `success`；每个匹配 CODEOWNERS 通配符的改动文件都需要该 owner 的批准。返回 `(ok, 排序后的原因)`，原因名称见 docstring。",
  "hints": [
    "按顺序重放 `reviews` 得到 `{user: state}` 字典，跳过 COMMENTED。",
    "用集合收集原因，使每个原因只出现一次；`fnmatchcase(path, pattern)` 处理通配符。"
  ]
}
```

> [!TIP] 面试技巧
> - 把评审定位为质量门禁和知识共享工具；提到小 PR、快速响应，以及用 linter 自动化风格检查，让人专注设计。
> - 陷阱：不读就批准的“橡皮图章”文化；反过来，对本应由格式化工具负责的风格吹毛求疵。
> - 了解各种合并方式及适用场景（squash 让历史整洁，merge commit 保留分支上下文），以及合并队列解决什么问题。
