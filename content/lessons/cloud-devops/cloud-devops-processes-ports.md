---
id: cloud-devops-processes-ports
title: "Processes, ports"
estimatedMinutes: 11
difficulty: medium
tags: [linux, processes, ports, networking]
---

## Why it matters
"The service is up but unreachable" and "port already in use" are classic on-call problems. You are expected to inspect processes, signals and sockets from the command line without a GUI.

## Concept
A **process** has a PID, a parent (PPID), an owner, open file descriptors and a state (running, sleeping, **zombie** = exited but not yet reaped by its parent). PID 1 (init/systemd) adopts orphans.

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

**Signals**: `SIGINT` (Ctrl-C, 2), `SIGTERM` (15, default of `kill`), `SIGKILL` (9) and `SIGSTOP` cannot be caught. Containers send SIGTERM to PID 1 on `docker stop`, then SIGKILL after the grace period, so apps must handle it.

**Ports and sockets**: a TCP server `bind()`s an address:port and `listen()`s. Binding `0.0.0.0` accepts on all interfaces; `127.0.0.1` only local clients. Ports below 1024 need root or a capability.

```bash
ss -ltnp                       # listening TCP + owning process
lsof -i :8080                  # who holds 8080
curl -v localhost:8080/health  # is it answering?
ss -s                          # socket totals; many TIME_WAIT is normal
```

Debug order for "unreachable": process alive? listening on the right address/port? local firewall / security group? DNS?

## Worked example
A Flask app crashes at start with `OSError: [Errno 98] Address already in use` on port 8080.

```bash
$ ss -ltnp | grep :8080
LISTEN 0 128 0.0.0.0:8080 users:(("gunicorn",pid=4121,fd=5))
$ ps -o pid,ppid,etime,cmd -p 4121
 4121     1 2-03:11:09 gunicorn app:app
```

A stale gunicorn (uptime 2 days, reparented to PID 1) still owns the port. Stop it gracefully with `kill -TERM 4121`, wait a few seconds, confirm with `ss` that the port is free, then start the new process. If it were a legitimate service, change your port instead of killing it.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A service ignores `kill <pid>` (SIGTERM) and keeps running. What is the right escalation?",
  "options": [
    "`kill -9` immediately, always",
    "Check why it traps/ignores SIGTERM, wait for graceful shutdown, then `kill -9` (SIGKILL) as a last resort",
    "`kill -1`, which restarts it cleanly",
    "Reboot the host"
  ],
  "answer": 1,
  "explanation": "SIGTERM lets the process flush buffers, close connections and remove locks. SIGKILL cannot be caught, so it skips cleanup and can corrupt state; use it last."
}
```

```quiz
{
  "id": "q2",
  "question": "`Address already in use` when starting a server on port 8080. Which command finds the culprit?",
  "options": [
    "`ps -ef | wc -l`",
    "`top`",
    "`ss -ltnp | grep :8080` (or `lsof -i :8080`)",
    "`netstat -r`"
  ],
  "answer": 2,
  "explanation": "`ss -ltnp` lists listening TCP sockets with the owning process; `lsof -i :8080` does the same. `netstat -r` shows routes, not sockets."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Parse `ss -ltnp`-style output and detect bind conflicts. `parse_listeners(text)` returns dicts `{addr, port, proc, pid}` for `LISTEN` lines like `LISTEN 0 128 0.0.0.0:8080 users:((\"nginx\",pid=123,fd=6))` (skip everything else). `can_bind(listeners, addr, port)` is False if some listener has the same port and either address is `0.0.0.0` or both addresses are equal.",
  "starterCode": "import re\n\ndef parse_listeners(text):\n    \"\"\"Parse lines like:\n    LISTEN 0 128 0.0.0.0:8080 users:((\"nginx\",pid=123,fd=6))\n    Return a list of dicts: {\"addr\", \"port\", \"proc\", \"pid\"} (skip non-LISTEN / malformed lines).\"\"\"\n    pass\n\ndef can_bind(listeners, addr, port):\n    \"\"\"A bind fails if the port is used and either side is 0.0.0.0 or the addresses are equal.\"\"\"\n    pass\n\nsample = 'LISTEN 0 128 0.0.0.0:8080 users:((\"nginx\",pid=123,fd=6))'\nprint(parse_listeners(sample))",
  "tests": "text = \"\"\"State Recv-Q Send-Q Local Peer\nLISTEN 0 128 0.0.0.0:8080 users:((\"nginx\",pid=123,fd=6))\nLISTEN 0 128 127.0.0.1:5432 users:((\"postgres\",pid=77,fd=5))\nESTAB 0 0 10.0.0.2:22 10.0.0.9:51234\ngarbage line\n\"\"\"\nls = parse_listeners(text)\nassert len(ls) == 2\nassert ls[0] == {\"addr\": \"0.0.0.0\", \"port\": 8080, \"proc\": \"nginx\", \"pid\": 123}\nassert ls[1][\"port\"] == 5432 and ls[1][\"proc\"] == \"postgres\" and ls[1][\"pid\"] == 77\nassert can_bind(ls, \"0.0.0.0\", 8080) is False\nassert can_bind(ls, \"127.0.0.1\", 8080) is False   # wildcard listener owns the port\nassert can_bind(ls, \"10.0.0.2\", 5432) is True     # postgres only on loopback\nassert can_bind(ls, \"127.0.0.1\", 5432) is False\nassert can_bind(ls, \"0.0.0.0\", 5432) is False\nassert can_bind(ls, \"0.0.0.0\", 9000) is True\nassert parse_listeners(\"\") == []",
  "solution": "import re\n\nRX = re.compile(r'^LISTEN\\s+\\d+\\s+\\d+\\s+(\\S+):(\\d+)\\s+users:\\(\\(\"([^\"]+)\",pid=(\\d+)')\n\ndef parse_listeners(text):\n    out = []\n    for line in text.splitlines():\n        m = RX.match(line.strip())\n        if m:\n            out.append({\"addr\": m.group(1), \"port\": int(m.group(2)), \"proc\": m.group(3), \"pid\": int(m.group(4))})\n    return out\n\ndef can_bind(listeners, addr, port):\n    for l in listeners:\n        if l[\"port\"] == port and (addr == \"0.0.0.0\" or l[\"addr\"] == \"0.0.0.0\" or l[\"addr\"] == addr):\n            return False\n    return True",
  "hints": [
    "One regex with groups for addr, port, process name and pid; use `re.match` on each stripped line.",
    "A wildcard `0.0.0.0` bind conflicts with any address on that port, but two different specific addresses can coexist."
  ]
}
```

> [!TIP] Interview tips
> - Escalate signals: TERM, wait, then KILL; explain that KILL skips cleanup.
> - Pitfall: a service listening on `127.0.0.1` is unreachable from other hosts, a very common "works on my machine" bug; bind `0.0.0.0` (behind a firewall) or use a reverse proxy.
> - Know zombies (reap by fixing/killing the parent) vs D-state processes (stuck on I/O), and that `load average` is not CPU usage.
