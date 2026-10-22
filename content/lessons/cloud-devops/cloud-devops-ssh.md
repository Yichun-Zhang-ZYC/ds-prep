---
id: cloud-devops-ssh
title: SSH
estimatedMinutes: 11
difficulty: medium
tags: [ssh, keys, tunnels, security]
---

## Why it matters
SSH is how you reach nearly every server, bastion and Git remote. Interviews cover key-based auth, host verification, config files and tunnels, and the security mistakes people make.

## Concept
**SSH** gives an encrypted, authenticated channel to a remote host (default port 22). Two checks happen: the client verifies the **server** (host key fingerprint, stored in `~/.ssh/known_hosts`, trust on first use) and the server verifies the **user** (password, or better a public key).

**Key auth**: generate a keypair; put the public key in the server's `~/.ssh/authorized_keys`; the private key never leaves your machine (mode `600`, ideally passphrase-protected and held in `ssh-agent`). The server sends a challenge only the private key can sign. Prefer `ed25519`.

```bash
ssh-keygen -t ed25519 -C "alice@laptop"      # make a keypair
ssh-copy-id deploy@10.0.1.5                  # install the public key
ssh -i ~/.ssh/key.pem -p 2222 deploy@host    # explicit key and port
ssh host 'systemctl status app'              # run one command
scp file host:/tmp/ ; rsync -av dir/ host:/srv/dir/
ssh -L 5433:db.internal:5432 bastion         # local forward: localhost:5433 -> db via bastion
ssh -J bastion app-server                    # jump host (ProxyJump)
```

`~/.ssh/config` removes the flags; the first matching value wins, so put specific hosts above `Host *`:

```
Host prod-*
  ProxyJump bastion
  User deploy
  IdentityFile ~/.ssh/prod
Host *
  ServerAliveInterval 30
```

**Hardening** (`/etc/ssh/sshd_config`): `PasswordAuthentication no`, `PermitRootLogin no`, restrict users, keep a bastion as the only public entry, rotate keys, and use short-lived certificates or SSM-style access in the cloud. Agent forwarding (`-A`) lets a compromised server use your keys, so prefer `ProxyJump`.

## Worked example
Reach a private Postgres (`db.internal:5432`) from your laptop through bastion `203.0.113.9`:

```bash
ssh -N -L 5433:db.internal:5432 deploy@203.0.113.9 &
psql -h localhost -p 5433 -U app mydb
```

Traffic flows `psql -> localhost:5433 -> encrypted SSH -> bastion -> db.internal:5432`. The database needs no public IP; only the bastion's port 22 is exposed. With the config above, `ssh -N -L 5433:db.internal:5432 prod-bastion` is shorter, and the 30 s `ServerAliveInterval` keeps idle tunnels from dropping.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which file must stay secret and never leave your machine in SSH key-based auth?",
  "options": [
    "`~/.ssh/id_ed25519.pub`",
    "`~/.ssh/id_ed25519` (the private key)",
    "`~/.ssh/known_hosts`",
    "`~/.ssh/authorized_keys` on the server"
  ],
  "answer": 1,
  "explanation": "The public key is installed on servers (`authorized_keys`); the private key proves your identity and is never shared. ssh refuses a private key readable by others (needs mode 600)."
}
```

```quiz
{
  "id": "q2",
  "question": "You get `WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!` for a server you know was rebuilt. What is the correct response?",
  "options": [
    "Set `StrictHostKeyChecking no` globally",
    "Delete the whole `known_hosts` file",
    "Ignore it, ssh still connects",
    "Verify the new fingerprint out-of-band, then remove the old entry with `ssh-keygen -R host`"
  ],
  "answer": 3,
  "explanation": "The warning protects against man-in-the-middle attacks. A rebuild legitimately changes the host key, but confirm the new fingerprint through a trusted channel before replacing the single stale entry."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `resolve_config(text, host)` that mimics how OpenSSH reads `~/.ssh/config`: each `Host` line starts a block that applies if the host matches any listed pattern (shell wildcards via `fnmatchcase`, a `!pattern` excludes); lines before any `Host` apply to all; option names are case-insensitive (return them lowercase); and for each option the first value found wins. Return a dict of option to value.",
  "starterCode": "from fnmatch import fnmatchcase\n\ndef resolve_config(text, host):\n    \"\"\"Resolve ~/.ssh/config options for `host` like OpenSSH:\n    - `Host a b*` starts a block applying to any listed pattern (fnmatch, `!pat` negates).\n    - Lines before the first Host apply to everything.\n    - Keys are case-insensitive (return lowercase); for each key the FIRST value found wins.\n    - Ignore blank lines and # comments. Return a dict.\"\"\"\n    pass\n\ncfg = \"Host bastion\\n  HostName 203.0.113.9\\nHost *\\n  User deploy\"\nprint(resolve_config(cfg, \"bastion\"))",
  "tests": "cfg = \"\"\"\n# global-ish defaults come last on purpose\nHost bastion\n  HostName 203.0.113.9\n  User ec2-user\n  IdentityFile ~/.ssh/bastion.pem\n\nHost prod-*\n  ProxyJump bastion\n  User deploy\n\nHost prod-db !prod-db-old\n  Port 2222\n\nHost *\n  ServerAliveInterval 30\n  User fallback\n\"\"\"\nb = resolve_config(cfg, \"bastion\")\nassert b == {\"hostname\": \"203.0.113.9\", \"user\": \"ec2-user\", \"identityfile\": \"~/.ssh/bastion.pem\", \"serveraliveinterval\": \"30\"}\nw = resolve_config(cfg, \"prod-web1\")\nassert w == {\"proxyjump\": \"bastion\", \"user\": \"deploy\", \"serveraliveinterval\": \"30\"}\nd = resolve_config(cfg, \"prod-db\")\nassert d[\"port\"] == \"2222\" and d[\"user\"] == \"deploy\" and d[\"proxyjump\"] == \"bastion\"\nassert \"port\" not in resolve_config(cfg, \"prod-db-old\")\nassert resolve_config(cfg, \"other\") == {\"serveraliveinterval\": \"30\", \"user\": \"fallback\"}\nassert resolve_config(\"User a\\nHost x\\n  User b\", \"x\")[\"user\"] == \"a\"\nassert resolve_config(\"HOST x\\n  hostname h\", \"x\") == {\"hostname\": \"h\"}",
  "solution": "from fnmatch import fnmatchcase\n\ndef _applies(patterns, host):\n    matched = False\n    for p in patterns:\n        if p.startswith(\"!\"):\n            if fnmatchcase(host, p[1:]):\n                return False\n        elif fnmatchcase(host, p):\n            matched = True\n    return matched\n\ndef resolve_config(text, host):\n    out = {}\n    active = True\n    for raw in text.splitlines():\n        line = raw.strip()\n        if not line or line.startswith(\"#\"):\n            continue\n        parts = line.split(None, 1)\n        key = parts[0].lower()\n        val = parts[1].strip() if len(parts) > 1 else \"\"\n        if key == \"host\":\n            active = _applies(val.split(), host)\n        elif active and key not in out:\n            out[key] = val\n    return out",
  "hints": [
    "Keep an `active` flag that you recompute at every `Host` line; initially True.",
    "`if key not in out` gives the first-wins rule, so specific blocks must come before `Host *`."
  ]
}
```

> [!TIP] Interview tips
> - Explain the two-sided trust: host keys verify the server, user keys verify you; never answer a host-key warning with `StrictHostKeyChecking no`.
> - Pitfall: `Permissions 0644 for key are too open` means `chmod 600` the private key; `Permission denied (publickey)` means wrong user, key not offered, or wrong `authorized_keys` permissions.
> - Mention bastion + ProxyJump, local vs remote (`-R`) vs dynamic (`-D`) forwarding, and `ssh -v` for debugging.
