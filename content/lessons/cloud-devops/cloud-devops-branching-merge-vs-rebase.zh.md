---
id: cloud-devops-branching-merge-vs-rebase
title: 分支、merge 与 rebase
---

## 为什么重要
每个团队都有自己的分支约定和对 merge 与 rebase 的看法。面试官想确认你理解 git 的提交图而不只是命令，并能选择让历史既有用又安全的策略。

## 概念
Git 历史是**提交的有向无环图（DAG）**；**分支**只是指向某个提交的可移动指针，`HEAD` 指向当前分支。创建分支几乎没有成本。

```bash
git switch -c feature/login        # new branch from HEAD
git switch main && git merge feature/login
git rebase main                    # replay my commits on top of main
git log --oneline --graph --all    # see the DAG
git reflog                         # recover "lost" commits
```

**Merge** 合并两条工作线。如果目标是祖先，就会**快进**（只移动指针）。否则会创建带两个父提交的**合并提交**，保留真实历史，且不改写任何提交。用 `--no-ff` 可始终保留合并节点。

**Rebase** 在另一个基点上重新创建你的提交（新的 SHA），得到线性历史。`git rebase -i` 可重排、压缩（squash）和修改提交信息。**Squash merge** 把一个 PR 压成 main 上的一个提交。

| | Merge | Rebase |
|---|---|---|
| 历史 | 非线性，真实 | 线性，被改写 |
| 在共享分支上是否安全 | 是 | 否（需要强制推送） |
| Bisect / revert | 回滚合并需要 `-m 1` | 简单，每个提交独立 |

**黄金法则**：不要 rebase 别人已在其上开展工作的提交。工作流：**主干开发**（短命分支、功能开关、频繁合并）与 **GitFlow**（长期存在的 `develop`/`release`）。强制推送自己的分支时使用 `--force-with-lease`。其他工具：`cherry-pick`（复制单个提交）、`revert`（用新提交撤销某提交）、`reset --hard`（移动分支，具有破坏性）。

## 示例讲解
历史：`main` 为 A-B-C，`feature` 从 B 分出，包含 D、E。

```
A - B - C        (main)
     \
      D - E      (feature)
```

C 和 E 的 merge base 是 B。在 main 上执行 `git merge feature` 会创建合并提交 M，其父提交为 C 和 E（图中 5 个提交加 M）。而在 feature 上执行 `git rebase main` 则会把从 E 可达但从 C 不可达的 2 个提交，即 D 和 E，重放到 C 之上，成为 D' 和 E'（新的 SHA）：结果是线性的 A-B-C-D'-E'，之后 main 可以快进到 E'。代码相同，历史不同：merge 保留 6 个提交和分叉；rebase 保留 5 个并改写了 2 个。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么对队友已经拉取过的分支执行 `git rebase main` 有风险？",
  "options": [
    "rebase 会删除远程分支",
    "rebase 无法处理冲突",
    "它把提交改写成新的 SHA，别人的历史会分叉，必须再协调",
    "它会把 main 合并两次"
  ],
  "explanation": "rebase 把提交重放为新对象。持有旧提交的人会看到分叉的历史，强制推送还可能丢弃他们的工作。对本地/私有分支用 rebase，对共享分支用 merge。"
}
```

```quiz
{
  "id": "q2",
  "question": "关于 `git merge --ff-only feature`，哪项说法正确？",
  "options": [
    "它总会创建合并提交",
    "仅当当前分支是 `feature` 的祖先时才成功，并且只是移动指针",
    "它会压缩（squash）提交",
    "它会先对 `feature` 做 rebase"
  ],
  "explanation": "只有当历史是线性的（当前提示点是目标的祖先）时才能快进。否则 `--ff-only` 会拒绝，可用于强制保持线性历史。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "把提交图建模为 `{commit: [parents]}`。实现 `ancestors(graph, c)`（包含 `c` 自身）、`merge_base(graph, a, b)`（不是其他公共祖先的祖先的那个公共祖先）、`is_fast_forward(graph, current, target)`，以及 `commits_to_replay(graph, branch, onto)`（rebase 会重新创建的提交：从 `branch` 可达但从 `onto` 不可达，返回排序后的列表）。",
  "hints": [
    "用带 `seen` 集合的迭代 DFS 求所有祖先；合并提交有两个父提交。",
    "`commits_to_replay` 就是集合差，对应 `git log onto..branch`。"
  ]
}
```

> [!TIP] 面试技巧
> - 给出策略而非教条：私有分支用 rebase 保持最新，合入共享 main 用 merge（或 squash），绝不改写已发布的历史。
> - 陷阱：rebase 之后必须用 `--force-with-lease` 推送，而不是直接 `--force`，以免覆盖队友的推送。
> - 了解恢复手段：`git reflog` + `git reset --hard <sha>` 可挽救糟糕的 rebase 之后大多数“丢失”的工作。
