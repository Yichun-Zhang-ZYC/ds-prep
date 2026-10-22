---
id: cloud-devops-http-https-dns-tcp-ip
title: HTTP/HTTPS、DNS、TCP/IP
---

## 为什么重要
“在浏览器输入 URL 后发生了什么？”是经典的基础设施面试题，而真实故障就藏在每一层：过期的 DNS、过期的证书、耗尽的端口、错误的状态码。

## 概念
**分层**（简化）：应用层（HTTP、DNS、TLS）位于传输层（TCP 可靠、UDP 快速）之上，再往下是网络层（IP：寻址与路由）和链路层（以太网/Wi-Fi）。每层封装上一层。

**IP**：地址标识网络接口（IPv4 为 32 位，IPv6 为 128 位）；子网使用 CIDR（`10.0.0.0/24` = 256 个地址）；私有地址段 `10/8`、`172.16/12`、`192.168/16`；NAT 让私有主机共享一个公网 IP。

**TCP**：面向连接、有序且会重传。三次握手 `SYN -> SYN-ACK -> ACK` 耗时 1 个 RTT；流量控制和拥塞控制会限制发送方。**UDP** 无连接，用于 DNS、QUIC、流媒体。

**DNS** 把名称映射到记录：`A/AAAA`（IP）、`CNAME`（别名）、`MX`、`TXT`、`NS`。递归解析器依次查询根 -> TLD -> 权威服务器，并按记录的 **TTL** 缓存结果。

**TLS**：TCP 之后，客户端与服务器协商密钥，服务器用受信任 CA 签发的证书链证明身份（TLS 1.3 需 1 个 RTT，1.2 需 2 个）。HTTPS 就是 TLS 内的 HTTP。

**HTTP**：请求行 + 头部 + 正文；方法 `GET`（安全、幂等）、`POST`、`PUT`（幂等）、`DELETE`；状态码类别：2xx 成功、3xx 重定向、4xx 客户端错误（401 未认证、403 禁止、404、429 限流）、5xx 服务器错误（502 网关错误、503 不可用、504 上游超时）。HTTP/1.1 keep-alive 复用连接；HTTP/2 多路复用流；HTTP/3 运行在 QUIC（UDP）之上。

```bash
dig +short www.example.com           # DNS answer;  dig +trace to follow delegation
curl -v https://example.com/health   # DNS, TCP, TLS and HTTP in one view
curl -w '%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}\n' -o /dev/null -s URL
openssl s_client -connect example.com:443 -servername example.com   # inspect certificate
nc -zv host 5432                     # is the TCP port reachable?
```

## 示例讲解
一次冷启动的 HTTPS 请求，到服务器的往返时间为 50 ms，使用 TLS 1.3，没有任何缓存：

- DNS 1 个 RTT = 50 ms，TCP 握手 1 个 RTT = 50 ms，TLS 1.3 握手 1 个 RTT = 50 ms，HTTP 请求/响应 1 个 RTT = 50 ms。
- 首字节时间 = 4 x 50 = **200 ms**（外加服务器处理时间）。若是 TLS 1.2 则为 5 x 50 = 250 ms。

在同一条 keep-alive 连接上的第二个请求只需 50 ms。这就是连接复用、CDN（缩短 RTT）、TLS 1.3 和 DNS 缓存对延迟重要的原因：光速无法超越，所以要减少往返次数。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "浏览器首次打开 `https://example.com` 时，下列哪个顺序最准确？",
  "options": [
    "TCP 握手、DNS 查询、TLS 握手、HTTP 请求",
    "DNS 查询、TCP 握手、TLS 握手、HTTP 请求",
    "HTTP 请求、DNS 查询、TCP 握手、TLS 握手",
    "TLS 握手、DNS 查询、HTTP 请求、TCP 握手"
  ],
  "explanation": "必须先把域名解析为 IP（DNS）才能建立 TCP 连接；TLS 运行在 TCP 之上，之后才是加密的 HTTP 请求。"
}
```

```quiz
{
  "id": "q2",
  "question": "你把 DNS A 记录从 IP1 改为 IP2，但部分用户一小时内仍访问 IP1。最可能的原因是什么？",
  "options": [
    "服务器拒绝新的 IP",
    "TCP 缓存了路由",
    "HTTPS 证书与 IP 绑定",
    "解析器和客户端会缓存旧答案，直到 TTL 过期"
  ],
  "explanation": "DNS 应答带有 TTL。应在计划切换前很早就把 TTL 降低（例如 60 秒），切换后再调高。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟两个网络概念。`resolve(zone, name, max_depth)` 在 zone 字典（`(\"A\", [ips])` 或 `(\"CNAME\", target)`）中跟随 CNAME 链，返回 `(名称链, ips)`，遇到循环、链过长（超过 `max_depth` 个名称）或 NXDOMAIN 时抛出 `ValueError`。`time_to_first_byte(rtt_ms, dns_cached, tls, reused_connection)` 统计往返次数：DNS 1 次（缓存则 0）、TCP 1 次、TLS 1.2 为 2 次或 1.3 为 1 次、请求 1 次；复用连接只需请求这 1 个 RTT。",
  "hints": [
    "用 `chain` 列表记录访问过的名称；追加前先检查是否重复。",
    "keep-alive 连接跳过 DNS、TCP 和 TLS；只剩请求/响应这 1 个 RTT。"
  ]
}
```

> [!TIP] 面试技巧
> - 按顺序讲“浏览器输入 URL”的故事：缓存、DNS、TCP、TLS、HTTP、响应、渲染；并提到 TTL 和 keep-alive。
> - 陷阱：502、503、504 的区别：上游返回了错误响应、没有健康的上游、上游超时；它们对应不同的修复。
> - 按层记住调试工具：`dig`（DNS）、`nc`/`telnet`（TCP）、`openssl s_client`（TLS）、`curl -v`（HTTP）、`traceroute`/`mtr`（路径）。
