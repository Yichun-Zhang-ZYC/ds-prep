---
id: cloud-devops-ssh
title: SSH
---

## 为什么重要
几乎所有服务器、堡垒机和 Git 远程仓库都通过 SSH 访问。面试会涉及密钥认证、主机验证、配置文件、隧道，以及人们常犯的安全错误。

## 概念
**SSH** 为远程主机提供加密且经过认证的通道（默认端口 22）。会进行两项检查：客户端验证**服务器**（主机密钥指纹，保存在 `~/.ssh/known_hosts`，首次使用即信任），服务器验证**用户**（密码，或更好的公钥）。

**密钥认证**：生成密钥对；把公钥放入服务器的 `~/.ssh/authorized_keys`；私钥永不离开你的机器（权限 `600`，最好有口令保护并交给 `ssh-agent`）。服务器发出只有私钥才能签名的挑战。优先选择 `ed25519`。

```bash
ssh-keygen -t ed25519 -C "alice@laptop"      # make a keypair
ssh-copy-id deploy@10.0.1.5                  # install the public key
ssh -i ~/.ssh/key.pem -p 2222 deploy@host    # explicit key and port
ssh host 'systemctl status app'              # run one command
scp file host:/tmp/ ; rsync -av dir/ host:/srv/dir/
ssh -L 5433:db.internal:5432 bastion         # local forward: localhost:5433 -> db via bastion
ssh -J bastion app-server                    # jump host (ProxyJump)
```

`~/.ssh/config` 可省去这些参数；第一个匹配的值生效，所以具体主机要写在 `Host *` 之上：

```
Host prod-*
  ProxyJump bastion
  User deploy
  IdentityFile ~/.ssh/prod
Host *
  ServerAliveInterval 30
```

**加固**（`/etc/ssh/sshd_config`）：`PasswordAuthentication no`、`PermitRootLogin no`、限制用户、只把堡垒机作为公网入口、轮换密钥，在云上使用短期证书或 SSM 式访问。Agent 转发（`-A`）会让被攻陷的服务器使用你的密钥，所以优先使用 `ProxyJump`。

## 示例讲解
从笔记本通过堡垒机 `203.0.113.9` 访问私有 Postgres（`db.internal:5432`）：

```bash
ssh -N -L 5433:db.internal:5432 deploy@203.0.113.9 &
psql -h localhost -p 5433 -U app mydb
```

流量路径：`psql -> localhost:5433 -> 加密 SSH -> 堡垒机 -> db.internal:5432`。数据库无需公网 IP；只暴露堡垒机的 22 端口。有了上面的配置，`ssh -N -L 5433:db.internal:5432 prod-bastion` 更简短，30 秒的 `ServerAliveInterval` 可避免空闲隧道断开。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 SSH 密钥认证中，哪个文件必须保密、绝不能离开你的机器？",
  "options": [
    "`~/.ssh/id_ed25519.pub`",
    "`~/.ssh/id_ed25519`（私钥）",
    "`~/.ssh/known_hosts`",
    "服务器上的 `~/.ssh/authorized_keys`"
  ],
  "explanation": "公钥安装在服务器上（`authorized_keys`）；私钥用于证明你的身份，绝不共享。若私钥可被他人读取（需要 600 权限），ssh 会拒绝使用。"
}
```

```quiz
{
  "id": "q2",
  "question": "一台你确认已重建的服务器出现 `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!`。正确的处理方式是什么？",
  "options": [
    "全局设置 `StrictHostKeyChecking no`",
    "删除整个 `known_hosts` 文件",
    "忽略它，ssh 仍会连接",
    "通过带外渠道核对新指纹，然后用 `ssh-keygen -R host` 删除旧条目"
  ],
  "explanation": "该警告用于防范中间人攻击。重建服务器确实会改变主机密钥，但应先通过可信渠道确认新指纹，再替换那一条过期记录。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `resolve_config(text, host)`，模拟 OpenSSH 读取 `~/.ssh/config` 的方式：每个 `Host` 行开启一个块，当主机匹配所列任一模式（用 `fnmatchcase` 实现 shell 通配，`!pattern` 表示排除）时生效；第一个 `Host` 之前的行对所有主机生效；选项名不区分大小写（返回小写）；每个选项取第一个找到的值。返回选项到值的字典。",
  "hints": [
    "维护一个 `active` 标志，在每个 `Host` 行重新计算；初始为 True。",
    "`if key not in out` 实现“先到先得”，所以具体的块必须写在 `Host *` 之前。"
  ]
}
```

> [!TIP] 面试技巧
> - 讲清双向信任：主机密钥验证服务器，用户密钥验证你；遇到主机密钥警告绝不要用 `StrictHostKeyChecking no` 应付。
> - 陷阱：`Permissions 0644 for key are too open` 意味着要对私钥 `chmod 600`；`Permission denied (publickey)` 意味着用户名错误、未提供密钥，或 `authorized_keys` 权限不对。
> - 提到堡垒机 + ProxyJump，本地转发与远程转发（`-R`）及动态转发（`-D`）的区别，以及用 `ssh -v` 调试。
