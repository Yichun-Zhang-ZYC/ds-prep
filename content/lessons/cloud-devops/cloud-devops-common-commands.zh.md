---
id: cloud-devops-common-commands
title: 常用命令（grep、awk、sed、find）
---

## 为什么重要
在没有 Kibana 的机器上排查日志，是 DevOps 和数据工程每天的技能。面试官会给你一份日志，要求只用管道得出“出错最多的前 5 个 URL”。

## 概念
Unix 哲学：小工具读取 stdin、写出 stdout，并通过 `|` 组合。

- **`grep`** 按正则过滤行：`-E` 扩展正则，`-i` 忽略大小写，`-v` 反选，`-r` 递归，`-n` 行号，`-c` 计数，`-o` 只输出匹配部分，`-A/-B/-C N` 上下文行。
- **`awk`** 是按字段（`$1`、`$NF`、`NR`）逐行处理的程序：`awk 'pattern {action}'`。配合关联数组可做分组求和。`-F,` 设置分隔符。
- **`sed`** 是流编辑器；最常用的是替换 `s/regex/repl/flags`（`g` = 全部匹配）；`-i` 原地修改，`-n '5,10p'` 打印行范围。
- **`find`** 按元数据遍历目录：`-name`、`-type f`、`-mtime +7`、`-size +100M`，再接 `-exec cmd {} +` 或 `-print0 | xargs -0`。
- **组合工具**：`sort | uniq -c | sort -rn | head`（频次表）、`cut -d, -f1,3`、`wc -l`、`tr`、`tee`、`xargs`。

```bash
# top 5 URLs returning 5xx (nginx log: $7 = path, $9 = status)
awk '$9 ~ /^5/ {print $7}' access.log | sort | uniq -c | sort -rn | head -5

grep -rn --include='*.py' 'TODO' src/        # find TODOs
sed -i 's/DEBUG=true/DEBUG=false/' .env      # in-place edit
find /var/log -name '*.gz' -mtime +30 -delete
```

记住：`uniq` 之前要先 `sort`（它只合并相邻的重复行）；给模式加引号以免 shell 展开 `*`；大型目录树优先用 `rg`（ripgrep）。

## 示例讲解
给定 `access.log` 中形如 `10.0.0.1 - - [..] "GET /api/users HTTP/1.1" 500 123` 的行，找出失败请求中最活跃的客户端 IP。

```bash
awk '$9 >= 500 {print $1}' access.log | sort | uniq -c | sort -rn | head -3
```

如果日志有 1,000 行，其中 60 行状态码 ≥ 500，而 IP `10.0.0.7` 出现在其中 25 行，输出会以 `25 10.0.0.7` 开头。每个阶段都很廉价：`awk` 过滤（流式、常数内存），`sort` 分组，`uniq -c` 计数，最后的 `sort -rn` 按次数排名。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "哪条命令能找到 `/var/app` 下超过 7 天的 `.log` 文件，并且在文件名含空格时也能安全删除？",
  "options": [
    "`ls /var/app | grep log | rm`",
    "`find /var/app -name '*.log' -mtime +7 -print0 | xargs -0 rm`",
    "`grep -r '*.log' /var/app | rm`",
    "`rm /var/app/*.log -mtime +7`"
  ],
  "explanation": "`find` 按名称/时间过滤，`-print0 | xargs -0` 使用 NUL 分隔，因此文件名中的空格和换行都安全。`rm` 没有 `-mtime`，`grep` 搜索的是内容而非文件名。"
}
```

```quiz
{
  "id": "q2",
  "question": "`awk -F, '{c[$3]++} END{for (k in c) print k, c[k]}' data.csv` 计算的是什么？",
  "options": [
    "第 3 列的总和",
    "每行的列数",
    "按第 3 列的不同取值统计行数",
    "每组的第一行"
  ],
  "explanation": "`-F,` 按逗号切分；`c[$3]++` 是以第 3 个字段为键的关联数组计数器；END 块输出结果。相当于 shell 版的 `GROUP BY col3, COUNT(*)`。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 Python 重新实现三个经典命令：`grep(lines, pattern, invert, ignore_case)`（正则搜索、`-v`、`-i`）、`awk_sum(lines, key_col, val_col)`（按空白切分，列号从 1 开始，跳过字段不足的行，返回 `{key: float 之和}`）和 `sed_sub(line, pattern, repl, global_)`（替换第一个匹配，或用 `g` 替换全部）。",
  "hints": [
    "每行用 `re.search`；`-v` 时保留匹配结果与 `invert` 不同的行。",
    "`re.sub(..., count=1)` 替换第一个匹配；`count=0` 表示全部替换。"
  ]
}
```

> [!TIP] 面试技巧
> - 准备好逐阶段讲解一条管道；面试官在意你是否知道为什么 `sort` 要在 `uniq` 之前。
> - 陷阱：`grep pattern file | wc -l` 统计的是匹配的行数而不是出现次数；统计出现次数用 `grep -o ... | wc -l`。
> - 陷阱：`sed -i` 在 GNU 与 BSD/macOS 上用法不同（`-i ''`）；`xargs` 不加 `-0` 时遇到含空格的文件名会出错。
