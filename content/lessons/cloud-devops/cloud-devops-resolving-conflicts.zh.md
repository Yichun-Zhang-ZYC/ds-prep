---
id: cloud-devops-resolving-conflicts
title: 解决冲突
---

## 为什么重要
团队协作中冲突不可避免，处理不当会悄悄丢掉同事的改动。面试官会考察你能否冷静地解决冲突、验证结果，并从源头预防。

## 概念
当两个分支自 merge base 以来修改了相同的行（或一方编辑的内容被另一方删除/重命名）时，就会发生**冲突**。Git 会自动合并互不重叠的改动，其余部分则停下并留下标记：

```
<<<<<<< HEAD
timeout = 30
=======
timeout = 60
>>>>>>> feature/retries
```

`=======` 之上是当前一侧（`HEAD`），之下是传入的一侧。启用 `merge.conflictStyle diff3`（或 `zdiff3`）后，还会多出一个 `||||||| base` 段显示原始内容，意图更清晰。

```bash
git merge feature            # CONFLICT (content): ... Automatic merge failed
git status                   # "both modified:" lists the files
# edit files: keep ours, theirs, or a combination; delete ALL markers
git add path/to/file         # marks as resolved
git merge --continue         # or: git commit   (rebase: git rebase --continue)
git merge --abort            # bail out to the pre-merge state
git checkout --ours file     # take a whole side (--theirs for the other)
git rerere                   # remember how you resolved, replay next time
```

**rebase 中角色互换**：“ours”是你变基到的分支，“theirs”是正在重放的你的提交。

**先解决，再验证**：搜索残留的 `<<<<<<<`，运行构建和测试（文本上干净的合并仍可能在语义上出错），并对照两个父提交检查 `git diff`。大文件用可视化三方合并工具。

**预防**：小而短命的分支、经常从 main 合并或 rebase、避免把大规模格式化和文件移动与修改混在一起、明确代码归属，并且不要手动合并 lockfile/生成文件（重新生成即可）。

## 示例讲解
自 merge base 起，`main` 和 `feature` 都修改了 `config.py`，其中原本 `timeout = 10`。main 把它提高到 30；feature 改为 60 并新增了 `retries = 3`。

结果只有一个冲突块：ours 为 `timeout = 30`，theirs 为 `timeout = 60`，而 `retries = 3` 在不重叠的区域干净地合并了。解决方式是一个决定，而非机械选择：启用重试后团队希望是 60。你保留 `timeout = 60`，删除 3 行标记，`git add config.py`，运行测试，然后提交。选 `ours` 会悄悄丢掉该功能的意图；选 `both` 会留下两个 `timeout` 赋值，虽是合法 Python，却是潜在 bug。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Git 因冲突停止了合并。完成合并的步骤是什么？",
  "options": [
    "立即 `git commit`；标记会被忽略",
    "删除冲突文件并重新 clone",
    "编辑文件删除标记并选择正确内容，`git add`，然后 `git commit`（或 `git merge --continue`）",
    "执行 `git push --force`"
  ],
  "explanation": "冲突标记只是工作区中的普通文本。你需要解决内容，暂存文件以标记已解决，再完成合并。`git merge --abort` 可回到合并前的状态。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 `git rebase main` 过程中，冲突标记里的 `HEAD`（“ours”）一侧代表什么？",
  "options": [
    "你要变基到的上游提交（main 加上已重放的提交）",
    "正在重放的你自己的提交",
    "共同祖先",
    "远程分支"
  ],
  "explanation": "rebase 先检出新的基点，再逐个应用你的提交，因此“ours”是基点一侧，“theirs”是正在重放的你的提交，与 merge 相反。这是经典的困惑来源。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "解析 Git 冲突标记。`parse_conflicts(text)` 对每个由 `<<<<<<<`、`=======`、`>>>>>>>` 界定的冲突块返回 `(ours_lines, theirs_lines)` 列表。`resolve(text, strategy)` 把每个冲突块替换为 `ours`、`theirs` 或 `both`（ours 在前），保留其他行；若输入以换行结尾则保留结尾换行。",
  "hints": [
    "用一个小状态机遍历各行：块外、ours 中、theirs 中。",
    "写一个同时产出普通行和冲突块的辅助函数，在两个函数中复用。"
  ]
}
```

> [!TIP] 面试技巧
> - 讲一个流程：理解双方意图（不确定就问作者）、解决、构建并测试、再提交；绝不盲目对整个文件使用 `--ours`/`--theirs`。
> - 陷阱：提交了残留的冲突标记，或解决 rebase 冲突后忘记 `git rebase --continue`。
> - 提到 `merge.conflictStyle diff3`、`git rerere`，以及通过小 PR 和频繁集成来减少冲突。
