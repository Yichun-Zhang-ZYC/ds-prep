---
id: cloud-devops-processes-ports
title: 进程与端口
---

## 为什么重要
“服务启动了但访问不到”和“端口已被占用”是经典的值班问题。你需要能在没有图形界面的情况下，通过命令行检查进程、信号和套接字。

## 概念
**进程**有 PID、父进程（PPID）、所有者、打开的文件描述符和状态（运行、睡眠、**僵尸** = 已退出但父进程尚未回收）。PID 1（init/systemd）会收养孤儿进程。

```bash
ps aux --sort=-%mem | head     # who eats memory
pgrep -af nginx                # find PIDs by name
top / htop                     # live view; load average = runnable + uninterruptible tasks
kill -TERM 1234                # polite stop (15); kill -9 = SIGKILL, uncatchable
kill -HUP 1234                 # many daemons reload config on SIGHUP
nohup ./job.sh & ; jobs; fg    # background and job control
systemctl status|restart app   # services under systemd
journalctl -u app -f           # follow service logs
```

**信号**：`SIGINT`（Ctrl-C，2）、`SIGTERM`（15，`kill` 默认）、`SIGKILL`（9）和 `SIGSTOP` 无法被捕获。`docker stop` 会先向容器的 PID 1 发送 SIGTERM，宽限期后再发 SIGKILL，因此应用必须处理该信号。

**端口与套接字**：TCP 服务器 `bind()` 一个地址:端口并 `listen()`。绑定 `0.0.0.0` 接受所有网卡的连接；`127.0.0.1` 只接受本机客户端。1024 以下的端口需要 root 或相应 capability。

```bash
ss -ltnp                       # listening TCP + owning process
lsof -i :8080                  # who holds 8080
curl -v localhost:8080/health  # is it answering?
ss -s                          # socket totals; many TIME_WAIT is normal
```

排查“不可达”的顺序：进程是否存活？是否在正确的地址/端口监听？本机防火墙 / 安全组？DNS？

## 示例讲解
一个 Flask 应用启动时崩溃，报 `OSError: [Errno 98] Address already in use`（端口 8080）。

```bash
$ ss -ltnp | grep :8080
LISTEN 0 128 0.0.0.0:8080 users:(("gunicorn",pid=4121,fd=5))
$ ps -o pid,ppid,etime,cmd -p 4121
 4121     1 2-03:11:09 gunicorn app:app
```

一个陈旧的 gunicorn（运行 2 天，已被 PID 1 收养）仍占着端口。用 `kill -TERM 4121` 优雅停止，等几秒，用 `ss` 确认端口已释放，再启动新进程。如果它是合法服务，应改用其他端口而不是杀掉它。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某服务忽略 `kill <pid>`（SIGTERM）仍在运行。正确的升级处理方式是什么？",
  "options": [
    "总是立即 `kill -9`",
    "先查明它为何忽略 SIGTERM，等待优雅退出，最后才用 `kill -9`（SIGKILL）",
    "`kill -1`，它会干净地重启",
    "重启主机"
  ],
  "explanation": "SIGTERM 让进程有机会刷新缓冲区、关闭连接并清理锁。SIGKILL 无法被捕获，会跳过清理，可能损坏状态，因此最后才用。"
}
```

```quiz
{
  "id": "q2",
  "question": "在 8080 端口启动服务时报 `Address already in use`。哪个命令能找到占用者？",
  "options": [
    "`ps -ef | wc -l`",
    "`top`",
    "`ss -ltnp | grep :8080`（或 `lsof -i :8080`）",
    "`netstat -r`"
  ],
  "explanation": "`ss -ltnp` 列出监听的 TCP 套接字及其所属进程；`lsof -i :8080` 作用相同。`netstat -r` 显示的是路由而不是套接字。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "解析 `ss -ltnp` 风格的输出并检测绑定冲突。`parse_listeners(text)` 对形如 `LISTEN 0 128 0.0.0.0:8080 users:((\"nginx\",pid=123,fd=6))` 的 `LISTEN` 行返回字典 `{addr, port, proc, pid}`（其他行跳过）。`can_bind(listeners, addr, port)`：若存在端口相同且任一地址为 `0.0.0.0` 或两个地址相同的监听者，则返回 False。",
  "hints": [
    "用一个带分组的正则提取地址、端口、进程名和 pid；对每行 strip 后用 `re.match`。",
    "通配的 `0.0.0.0` 绑定会与该端口上的任何地址冲突，但两个不同的具体地址可以共存。"
  ]
}
```

> [!TIP] 面试技巧
> - 信号逐级升级：先 TERM，等待，再 KILL；并说明 KILL 会跳过清理。
> - 陷阱：监听 `127.0.0.1` 的服务无法被其他主机访问，是非常常见的“我本机能跑”问题；应绑定 `0.0.0.0`（配合防火墙）或使用反向代理。
> - 了解僵尸进程（通过修复/杀掉父进程来回收）与 D 状态进程（卡在 I/O 上）的区别，以及 `load average` 不等于 CPU 使用率。
