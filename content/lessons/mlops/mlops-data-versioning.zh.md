---
id: mlops-data-versioning
title: 数据版本管理（DVC）
---

## 为什么重要
Git 装不下 50 GB 的数据集，但只有明确知道模型用了哪份数据，模型才可复现。面试官会问你如何对数据做版本管理，并把它与代码和模型关联。

## 概念
**为什么要给数据做版本管理**：复现过去的模型、审计训练数据、回滚有问题的数据变更，以及在同一份快照上比较实验。

**DVC（Data Version Control）**与 Git 配合使用：
- `dvc add data/train.parquet` 会把文件移入按内容寻址的**缓存**（以 MD5 哈希命名），并写出一个很小的指针文件 `data/train.parquet.dvc`（哈希、大小、路径）。**Git 跟踪指针，远程存储（S3、GCS、Azure、SSH）保存真正的字节**（`dvc push` / `dvc pull`）。
- `git checkout <commit> && dvc checkout` 恢复该 commit 对应的确切数据。缓存链接（reflink、hardlink、symlink、copy）避免重复存储文件。
- `dvc.yaml` 中的**流水线**用 `cmd`、`deps`、`params`、`outs` 和 `metrics` 声明各个阶段。`dvc.lock` 记录每个依赖和输出的哈希。`dvc repro` 只重跑依赖或参数发生变化的阶段。`dvc exp run` 和 `dvc metrics diff` 用于比较实验。

**内容寻址**：相同内容有相同哈希，所以未变化的文件只存一份。目录的哈希由其文件哈希列表计算得出。

**替代方案**：**lakeFS**（在对象存储之上提供类似 Git 的分支和提交）、**Delta Lake / Iceberg 时间旅行**（`VERSION AS OF`、快照；最适合表）、**Git LFS**（简单，没有流水线）、Pachyderm，以及带清单（manifest）的不可变按日期分区。在数据仓库或 lakehouse 中，通常用时间旅行来管理*表*的版本；DVC 更适合基于文件的 ML 数据集。

**最佳实践**：不要原地修改原始数据；把数据集版本视为不可变；在实验跟踪工具和模型注册表中记录数据哈希或快照 id；保存数据集元数据（schema、行数、来源查询、标签策略）；敏感数据不要进 Git，并遵守保留和删除规则。

**陷阱**：只给文件做了版本，却没有记录生成它们的*查询或代码*，导致“新快照”无法重建。

## 示例讲解
周一的 `train.csv` 哈希为 `a1f3...`（2.0 GB）。周二追加了 40 MB 行，哈希变为 `9c02...`。使用 DVC 时，Git diff 只是 `train.csv.dvc` 的三行改动（`md5:` 行、`size:`），而远程存储新增一个 2.04 GB 的对象。提交 `m_v1` 指向 `a1f3...`，`m_v2` 指向 `9c02...`。

几周后，“为什么 AUC 下降了？”就变成 `git checkout m_v1 && dvc checkout && dvc repro`，即可复现旧结果。如果只改了训练参数，`dvc repro` 会跳过预处理阶段，因为该阶段的依赖和参数哈希与 `dvc.lock` 匹配。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "对大型数据集执行 `dvc add` 时，Git 里存的是什么？",
  "options": ["完整数据集", "带内容哈希的小型 .dvc 指针文件；数据存放在 DVC 缓存和远程存储中", "什么都不存", "数据集的 zip 包"],
  "explanation": "Git 跟踪元数据（哈希、大小、路径）；远程存储保存真正的字节。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于被多个团队查询的 lakehouse 表，哪种版本机制最合适？",
  "options": ["每天手动把表复制到新文件夹", "表格式的时间旅行（Delta/Iceberg 快照）", "把 parquet 文件提交到 Git", "邮件附件"],
  "explanation": "表格式提供原子的、可查询的快照，无需自己管理文件。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用纯 Python 模拟 DVC 的思路。`file_hash(content)` 返回字符串（UTF-8）的 SHA-256 十六进制摘要。`make_manifest(files)` 把字典 `{name: content}` 中的每个文件名映射到其哈希。`diff_manifests(old, new)` 返回 `(added, modified, removed)`，即三个排好序的文件名列表。`stale_stages(stages, old, new)` 中 `stages` 把阶段名映射到其依赖文件名列表，返回必须重跑的阶段（任一依赖被新增、修改或删除）的排序列表。",
  "hints": ["hashlib.sha256(content.encode()).hexdigest()。", "对 old 与 new 的键集合做差集和交集运算；修改指两边都有但哈希不同。"]
}
```

> [!TIP] 面试技巧
> - 解释“指针在 Git、字节在远程存储”的设计和内容寻址，并说明 `dvc.lock` 让流水线可复现。
> - 按使用场景说出替代方案：文件和流水线用 DVC，带分支的对象存储用 lakeFS，表用 Delta/Iceberg 时间旅行。
> - 陷阱：只记录数据集版本却没有记录构建它的代码/查询，或原地修改原始数据。
