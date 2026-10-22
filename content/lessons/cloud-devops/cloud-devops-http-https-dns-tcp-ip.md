---
id: cloud-devops-http-https-dns-tcp-ip
title: "HTTP/HTTPS, DNS, TCP/IP"
estimatedMinutes: 13
difficulty: medium
tags: [networking, http, dns, tcp, tls]
---

## Why it matters
"What happens when you type a URL?" is the classic infrastructure interview question, and real outages hide in each layer: stale DNS, expired certificates, exhausted ports, wrong status codes.

## Concept
**The layers** (simplified): application (HTTP, DNS, TLS) over transport (TCP reliable, UDP fast) over network (IP: addressing and routing) over link (Ethernet/Wi-Fi). Each layer wraps the one above.

**IP**: addresses identify interfaces (IPv4 32-bit, IPv6 128-bit); subnets use CIDR (`10.0.0.0/24` = 256 addresses); private ranges `10/8`, `172.16/12`, `192.168/16`; NAT lets private hosts share a public IP.

**TCP**: connection-oriented, ordered and retransmitted. 3-way handshake `SYN -> SYN-ACK -> ACK` costs 1 RTT; flow and congestion control throttle senders. **UDP** has no connection, used by DNS, QUIC, streaming.

**DNS** maps names to records: `A/AAAA` (IPs), `CNAME` (alias), `MX`, `TXT`, `NS`. A recursive resolver walks root -> TLD -> authoritative servers and caches answers for the record's **TTL**.

**TLS**: after TCP, the client and server agree on keys and the server proves identity with a certificate chain signed by a trusted CA (1 RTT in TLS 1.3, 2 in 1.2). HTTPS is HTTP inside TLS.

**HTTP**: request line + headers + body; methods `GET` (safe, idempotent), `POST`, `PUT` (idempotent), `DELETE`; status classes 2xx ok, 3xx redirect, 4xx client error (401 unauthenticated, 403 forbidden, 404, 429 rate limited), 5xx server error (502 bad gateway, 503 unavailable, 504 upstream timeout). HTTP/1.1 keep-alive reuses connections; HTTP/2 multiplexes streams; HTTP/3 runs over QUIC (UDP).

```bash
dig +short www.example.com           # DNS answer;  dig +trace to follow delegation
curl -v https://example.com/health   # DNS, TCP, TLS and HTTP in one view
curl -w '%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}\n' -o /dev/null -s URL
openssl s_client -connect example.com:443 -servername example.com   # inspect certificate
nc -zv host 5432                     # is the TCP port reachable?
```

## Worked example
A cold HTTPS request with a 50 ms round-trip time to the server, TLS 1.3, nothing cached:

- DNS 1 RTT = 50 ms, TCP handshake 1 RTT = 50 ms, TLS 1.3 handshake 1 RTT = 50 ms, HTTP request/response 1 RTT = 50 ms.
- Time to first byte = 4 x 50 = **200 ms** (plus server processing). On TLS 1.2 it is 5 x 50 = 250 ms.

A second request over the same keep-alive connection pays only 50 ms. That is why connection reuse, CDNs (shorter RTT), TLS 1.3 and DNS caching matter for latency: you cannot beat the speed of light, so cut round trips instead.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which sequence best describes what happens when a browser opens `https://example.com` for the first time?",
  "options": [
    "TCP handshake, DNS lookup, TLS handshake, HTTP request",
    "DNS lookup, TCP handshake, TLS handshake, HTTP request",
    "HTTP request, DNS lookup, TCP handshake, TLS handshake",
    "TLS handshake, DNS lookup, HTTP request, TCP handshake"
  ],
  "answer": 1,
  "explanation": "You must resolve the name to an IP (DNS) before you can open a TCP connection; TLS runs on top of TCP, and the encrypted HTTP request follows."
}
```

```quiz
{
  "id": "q2",
  "question": "You updated a DNS A record from IP1 to IP2 but some users still reach IP1 for an hour. Most likely cause?",
  "options": [
    "The server is rejecting new IPs",
    "TCP is caching the route",
    "HTTPS certificates are tied to IPs",
    "Resolvers and clients cache the old answer until its TTL expires"
  ],
  "answer": 3,
  "explanation": "DNS answers carry a TTL. Lower the TTL (for example to 60 s) well before a planned cutover, then raise it again afterwards."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate two networking ideas. `resolve(zone, name, max_depth)` follows CNAME chains in a zone dict (`(\"A\", [ips])` or `(\"CNAME\", target)`), returns `(chain_of_names, ips)` and raises `ValueError` on loops, over-long chains (more than `max_depth` names) or NXDOMAIN. `time_to_first_byte(rtt_ms, dns_cached, tls, reused_connection)` counts round trips: DNS 1 (0 if cached), TCP 1, TLS 1.2 = 2 or 1.3 = 1, request 1; a reused connection pays only the request RTT.",
  "starterCode": "def resolve(zone, name, max_depth=8):\n    \"\"\"zone: {name: (\"A\", [ips]) or (\"CNAME\", target)}.\n    Follow CNAME chains. Return (chain, ips) where chain lists every name visited in order\n    (starting with `name`). Raise ValueError on a loop, a chain longer than max_depth\n    names, or an unknown name (NXDOMAIN).\"\"\"\n    pass\n\ndef time_to_first_byte(rtt_ms, dns_cached, tls, reused_connection):\n    \"\"\"Round trips before the first response byte arrives for an HTTPS GET:\n    DNS lookup 1 RTT (0 if cached); TCP handshake 1 RTT; TLS 1.2 = 2 RTT, TLS 1.3 = 1 RTT\n    (tls is \"1.2\" or \"1.3\"); request/response 1 RTT.\n    A reused (keep-alive) connection skips TCP and TLS. Return milliseconds.\"\"\"\n    pass\n\nzone = {\"www.shop.com\": (\"CNAME\", \"shop.cdn.net\"), \"shop.cdn.net\": (\"A\", [\"198.51.100.7\"])}\nprint(resolve(zone, \"www.shop.com\"), time_to_first_byte(50, False, \"1.3\", False))",
  "tests": "zone = {\"www.shop.com\": (\"CNAME\", \"shop.cdn.net\"), \"shop.cdn.net\": (\"A\", [\"198.51.100.7\"]),\n        \"a.com\": (\"CNAME\", \"b.com\"), \"b.com\": (\"CNAME\", \"a.com\"), \"dead.com\": (\"CNAME\", \"gone.net\")}\nassert resolve(zone, \"www.shop.com\") == ([\"www.shop.com\", \"shop.cdn.net\"], [\"198.51.100.7\"])\nassert resolve(zone, \"shop.cdn.net\") == ([\"shop.cdn.net\"], [\"198.51.100.7\"])\nfor bad in (\"a.com\", \"dead.com\", \"nope.org\"):\n    try:\n        resolve(zone, bad)\n        raise AssertionError(\"should fail: \" + bad)\n    except ValueError:\n        pass\nchain = {\"n%d\" % i: (\"CNAME\", \"n%d\" % (i + 1)) for i in range(10)}\nchain[\"n10\"] = (\"A\", [\"1.1.1.1\"])\ntry:\n    resolve(chain, \"n0\", max_depth=5)\n    raise AssertionError(\"too long\")\nexcept ValueError:\n    pass\nassert resolve(chain, \"n0\", max_depth=20)[1] == [\"1.1.1.1\"]\n# cold: DNS + TCP + TLS1.3 + request = 4 RTT; TLS1.2 = 5 RTT\nassert time_to_first_byte(50, False, \"1.3\", False) == 200\nassert time_to_first_byte(50, False, \"1.2\", False) == 250\nassert time_to_first_byte(50, True, \"1.3\", False) == 150\nassert time_to_first_byte(50, False, \"1.2\", True) == 50\nassert time_to_first_byte(20, True, \"1.2\", True) == 20",
  "solution": "def resolve(zone, name, max_depth=8):\n    chain = []\n    cur = name\n    while True:\n        if cur in chain or len(chain) >= max_depth:\n            raise ValueError(\"loop or chain too long\")\n        chain.append(cur)\n        if cur not in zone:\n            raise ValueError(\"NXDOMAIN\")\n        kind, val = zone[cur]\n        if kind == \"A\":\n            return chain, list(val)\n        cur = val\n\ndef time_to_first_byte(rtt_ms, dns_cached, tls, reused_connection):\n    rtts = 1  # request/response\n    if not reused_connection:\n        rtts += 1  # TCP\n        rtts += 2 if tls == \"1.2\" else 1\n        if not dns_cached:\n            rtts += 1\n    return rtts * rtt_ms",
  "hints": [
    "Track visited names in the `chain` list; check for a repeat before appending.",
    "A keep-alive connection skips DNS, TCP and TLS; only the request/response RTT remains."
  ]
}
```

> [!TIP] Interview tips
> - Walk the "URL in a browser" story in order: cache, DNS, TCP, TLS, HTTP, response, render; mention TTLs and keep-alive.
> - Pitfall: 502 vs 503 vs 504: bad response from upstream, no healthy upstream, and upstream timed out; they point to different fixes.
> - Know debugging tools by layer: `dig` (DNS), `nc`/`telnet` (TCP), `openssl s_client` (TLS), `curl -v` (HTTP), `traceroute`/`mtr` (path).
