---
id: cloud-devops-bash-scripting
title: Bash 脚本
---

## 为什么重要
部署、备份和数据拉取的胶水脚本无处不在，其中一次静默失败就可能发布出有问题的版本。面试官会考察严格模式、引号、退出码，以及何时不该再用 Bash。

## 概念
每个命令都会在 `$?` 中返回**退出状态**（`0` = 成功，非零 = 失败）。脚本通过 `&&`、`||`、`if` 和管道来组合它们。

```bash
#!/usr/bin/env bash
set -euo pipefail            # -e exit on error, -u error on unset var, pipefail: any failed pipe stage fails
IFS=$'\n\t'
trap 'rm -rf "$tmp"' EXIT    # cleanup runs on any exit

usage() { echo "usage: $0 <env>" >&2; exit 2; }
[[ $# -eq 1 ]] || usage
env=$1
tmp=$(mktemp -d)             # command substitution

for f in "$@"; do            # iterate safely
  [[ -f $f ]] && echo "ok $f"
done

retry() { local n=0; until "$@"; do ((++n >= 3)) && return 1; sleep $((2 ** n)); done; }
retry curl -fsS "https://example.com/health"
```

要点：**始终加引号** `"$var"` 和 `"$@"`；`[[ ... ]]` 比 `[ ... ]` 更安全；`${var:-default}` 提供默认值；用 `$(cmd)` 而非反引号；`>file` 截断、`>>` 追加、`2>&1` 合并 stderr、`>&2` 把诊断信息写到 stderr；`<<EOF` 为 heredoc；函数返回的是状态而不是值（需打印后捕获）。

`set -e` 有盲区：在 `if`/`&&` 条件中会被忽略，且没有 `pipefail` 时对管道的非末尾阶段无效。用 **shellcheck** 做静态检查。一旦脚本需要数据结构、JSON 解析或测试，就换成 Python。

## 示例讲解
一个备份脚本 `pg_dump db | gzip > backup.sql.gz; aws s3 cp backup.sql.gz s3://b/` 每晚运行。`pg_dump` 失败（密码错误），但 `gzip` 对空输入也成功，所以管道返回 0，一个 20 字节的“备份”被上传。用阶段状态 `[1, 0]` 模拟：

- 默认：管道状态 0，脚本继续，执行 2 条命令，退出码 0（虚假的成功）；
- 使用 `set -eo pipefail`：管道状态 1，脚本在第 1 条命令后停止，退出码 1，没有任何上传，调度器会告警。

严格模式把静默的数据丢失 bug 变成了明显的失败。再加上 `trap` 清理，避免残留不完整的文件。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "仅使用 `set -e` 时，若 `curl -f $URL | tee out.json` 中 curl 因 404 失败，会发生什么？",
  "options": [
    "脚本继续运行，因为管道状态取最后一个命令 `tee`（0）",
    "脚本立即退出",
    "tee 收到 SIGPIPE，脚本中止",
    "Bash 自动重试该命令"
  ],
  "explanation": "默认情况下管道返回最后一个命令的状态。加上 `set -o pipefail` 后，任一阶段失败都会使管道失败，`set -e` 才会触发。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么要把 `cp $src $dst` 写成 `cp \"$src\" \"$dst\"`？",
  "options": [
    "加引号复制更快",
    "不加引号的展开会进行分词和通配，遇到空格或 `*` 就会出错",
    "变量必须加引号",
    "可以防止变量被取消设置"
  ],
  "explanation": "不加引号的 `$var` 会按空白分词并进行通配展开。`\"$var\"` 保持为一个整体；这是最常见的 Bash 错误（可用 shellcheck 发现）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟 Bash 的退出状态语义。`pipeline_status(stages, pipefail)` 默认返回最后一个阶段的状态；启用 `pipefail` 时返回最右侧的非零状态（否则为 0）。`run_script(pipelines, errexit, pipefail)` 依次运行管道列表，`errexit` 开启时在第一个失败的管道处停止，返回 `(已执行数量, 退出码)`，退出码为最后执行的管道的状态。",
  "hints": [
    "启用 pipefail 时，从右向左扫描各阶段，返回第一个非零值。",
    "在跳出循环之前，要把失败的那个管道计入已执行数量。"
  ]
}
```

> [!TIP] 面试技巧
> - 回答任何脚本题都以 `set -euo pipefail`、引号和 `trap ... EXIT` 开头，并提到 shellcheck。
> - 陷阱：`cmd || true` 会有意吞掉错误；只应对预期内的失败（如 `grep -q`）有意识地使用。
> - 知道何时离开 Bash：需要记录数组、带抖动的重试或 API 调用时，用 Python，并把 Bash 仅作为入口。
