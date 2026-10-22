---
id: cloud-devops-file-system-permissions
title: 文件系统与权限
---

## 为什么重要
每一次部署、定时任务和容器故障，最终往往都归结为“permission denied”或路径错误。面试官会考察你能否读懂 `ls -l`、推理 `chmod`，并解释目录与文件的权限差异。

## 概念
Linux 只有一棵以 `/` 为根的目录树；一切（磁盘、设备、`/proc`）都是文件。关键目录：`/etc` 配置、`/var/log` 日志、`/tmp` 临时文件、`/home` 用户目录、`/usr/bin` 程序。

每个文件有**所有者**、**组**和 9 位权限：针对 **user / group / other** 的读（4）、写（2）、执行（1）。访问检查只会选择一个类别（先所有者，再组，最后其他），不会叠加。

```bash
ls -l deploy.sh          # -rwxr-x--- 1 alice devs 412 Jan 3 deploy.sh
chmod 750 deploy.sh      # u=rwx g=r-x o=---   (7=4+2+1, 5=4+1, 0)
chmod g+w,o-rwx file     # symbolic form
chown alice:devs file    # change owner and group (needs root)
umask 022                # new files 644, new dirs 755 (666/777 minus mask)
```

**目录**对这些位的含义不同：`r` 列出名称，`w` 创建/删除目录项，`x` 允许进入（`cd`、访问其中文件）。删除文件需要父目录的 `w+x`，而不是文件本身的权限。

**特殊位**：setuid（`4000`）以文件所有者身份运行程序；目录上的 setgid（`2000`）让新文件继承该组；**sticky**（`1000`，如 `/tmp`）只允许文件所有者删除文件。链接：**硬链接**是同一 inode 的另一个名字；**符号链接**是路径指针，可能悬空。用 `df -h` 查看文件系统空间，用 `du -sh *` 查看目录占用。

## 示例讲解
CI 任务在写入 `/var/app/cache/out.json` 时报 `Permission denied`。

```bash
$ ls -ld /var/app/cache
drwxr-x--- 2 root app 4096 Jan 3 /var/app/cache
$ id
uid=1001(ci) gid=1001(ci) groups=1001(ci)
```

任务以 `ci` 身份运行，既不是所有者（`root`），也不在 `app` 组，所以适用“其他”类别：`---`。按最小权限修复：把 `ci` 加入 `app` 并给组写权限，即 `usermod -aG app ci` 和 `chmod 770 /var/app/cache`。不要用 `chmod 777`，那会向所有人开放。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某脚本权限为 0644，且属于你。执行 `./deploy.sh` 会怎样？",
  "options": [
    "可以运行，因为你是所有者",
    "只有使用 sudo 才能运行",
    "Permission denied：没有执行位",
    "可以运行，但以所属组身份"
  ],
  "explanation": "执行文件需要所在类别的 x 位。0644 即 rw-r--r--，用 `chmod +x deploy.sh` 修复（或用 `bash deploy.sh`，只需读权限）。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么无法删除权限为 0666 的 `/shared/report.txt`，当其所在目录权限为 0555？",
  "options": [
    "删除需要文件的写权限",
    "删除文件名需要父目录的写+执行权限",
    "0555 表示设置了 sticky 位",
    "只有 root 能删除文件"
  ],
  "explanation": "删除（unlink）修改的是目录项，因此需要目录上的 w+x，而不是文件本身的权限。文件自身权限无关。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `mode_to_string(mode)`（如 `0o754` -> `rwxr-xr--`）和 `can_access(mode, owner, group, uid, gids, want)`。Linux 只选一个类别：`uid == owner` 为所有者，否则 `group in gids` 为组，否则为其他。root（uid 0）总能读写；只有存在任一 x 位时才能执行。",
  "hints": [
    "类别位移：所有者 6、组 3、其他 0；再取 `(mode >> shift) & 7`。",
    "不要“落空”到下一类：如果你是所有者，即使组权限更宽松，也只看所有者位。"
  ]
}
```

> [!TIP] 面试技巧
> - 熟记八进制：可执行文件和目录用 755，普通文件用 644，密钥（如 SSH 私钥）用 600（权限更宽松时 ssh 会拒绝使用）。
> - 陷阱：`chmod -R 777` 不是任何权限问题的正确答案；应使用 `ls -ld`、`id` 和 `namei -l path` 来诊断。
> - 陷阱：只有当每一级父目录都对你有 `x` 权限时文件才可达；仅文件本身的权限不够。
