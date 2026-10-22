---
id: cloud-devops-file-system-permissions
title: "File system, permissions"
estimatedMinutes: 10
difficulty: easy
tags: [linux, permissions, filesystem]
---

## Why it matters
Every deploy, cron job and container failure eventually comes down to "permission denied" or a wrong path. Interviewers check that you can read `ls -l`, reason about `chmod` and explain how directories differ from files.

## Concept
Linux has one tree rooted at `/`; everything (disks, devices, `/proc`) is a file. Key directories: `/etc` config, `/var/log` logs, `/tmp` scratch, `/home` users, `/usr/bin` programs.

Each file has an **owner**, a **group** and a mode of 9 bits: read (4), write (2), execute (1) for **user / group / other**. Access checks pick exactly one class (owner first, then group, then other), they do not combine.

```bash
ls -l deploy.sh          # -rwxr-x--- 1 alice devs 412 Jan 3 deploy.sh
chmod 750 deploy.sh      # u=rwx g=r-x o=---   (7=4+2+1, 5=4+1, 0)
chmod g+w,o-rwx file     # symbolic form
chown alice:devs file    # change owner and group (needs root)
umask 022                # new files 644, new dirs 755 (666/777 minus mask)
```

**Directories** reinterpret the bits: `r` lists names, `w` creates/deletes entries, `x` lets you traverse (`cd`, access files inside). Deleting a file needs `w+x` on the parent, not on the file.

**Special bits**: setuid (`4000`) runs a binary as its owner; setgid (`2000`) on a directory makes new files inherit the group; **sticky** (`1000`, as in `/tmp`) lets only a file's owner delete it. Links: a **hard link** is another name for the same inode; a **symlink** is a path pointer that can dangle. Check space with `df -h` (filesystems) and `du -sh *` (directories).

## Worked example
A CI job fails with `Permission denied` writing `/var/app/cache/out.json`.

```bash
$ ls -ld /var/app/cache
drwxr-x--- 2 root app 4096 Jan 3 /var/app/cache
$ id
uid=1001(ci) gid=1001(ci) groups=1001(ci)
```

The job runs as `ci`, which is neither owner (`root`) nor in group `app`, so the "other" class applies: `---`. Fix with least privilege: add `ci` to `app` and give the group write, i.e. `usermod -aG app ci` and `chmod 770 /var/app/cache`. Not `chmod 777`, which opens it to everyone.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A script has mode 0644 and is owned by you. What happens on `./deploy.sh`?",
  "options": [
    "It runs, since you own it",
    "It runs only with sudo",
    "Permission denied: no execute bit is set",
    "It runs but as the group owner"
  ],
  "answer": 2,
  "explanation": "Executing a file needs the x bit for your class. 0644 is rw-r--r--, so fix it with `chmod +x deploy.sh` (or run it as `bash deploy.sh`, which only needs read)."
}
```

```quiz
{
  "id": "q2",
  "question": "Why can you not delete `/shared/report.txt` (mode 0666) in a directory with mode 0555?",
  "options": [
    "Deleting needs write on the file",
    "Deleting a name needs write+execute on the parent directory",
    "0555 means the sticky bit is set",
    "Only root can delete files"
  ],
  "answer": 1,
  "explanation": "Unlinking edits the directory entry, so you need w+x on the directory, not on the file. The file's own mode is irrelevant."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `mode_to_string(mode)` (e.g. `0o754` -> `rwxr-xr--`) and `can_access(mode, owner, group, uid, gids, want)`. Linux picks exactly one class: owner if `uid == owner`, else group if `group in gids`, else other. Root (uid 0) can always read/write; it can execute only if any x bit is set.",
  "starterCode": "def mode_to_string(mode):\n    pass\n\ndef can_access(mode, owner, group, uid, gids, want):\n    \"\"\"mode: int like 0o754; owner: uid; group: gid; uid/gids: the caller;\n    want: 'r', 'w' or 'x'. Root (uid 0) bypasses r/w (and x if any x bit is set).\"\"\"\n    pass\n\nprint(mode_to_string(0o754), can_access(0o640, 1000, 50, 1001, [50], \"r\"))",
  "tests": "assert mode_to_string(0o754) == \"rwxr-xr--\"\nassert mode_to_string(0o600) == \"rw-------\"\nassert mode_to_string(0o000) == \"---------\"\nassert can_access(0o640, 1000, 50, 1000, [1000], \"w\") is True\nassert can_access(0o640, 1000, 50, 1001, [50], \"r\") is True\nassert can_access(0o640, 1000, 50, 1001, [50], \"w\") is False\nassert can_access(0o640, 1000, 50, 1002, [7], \"r\") is False\n# owner class is checked first and does NOT fall through to group\nassert can_access(0o070, 1000, 50, 1000, [50], \"r\") is False\nassert can_access(0o644, 1000, 50, 0, [0], \"w\") is True\nassert can_access(0o644, 1000, 50, 0, [0], \"x\") is False\nassert can_access(0o744, 1000, 50, 0, [0], \"x\") is True",
  "solution": "def mode_to_string(mode):\n    s = \"\"\n    for shift in (6, 3, 0):\n        bits = (mode >> shift) & 7\n        s += (\"r\" if bits & 4 else \"-\") + (\"w\" if bits & 2 else \"-\") + (\"x\" if bits & 1 else \"-\")\n    return s\n\ndef can_access(mode, owner, group, uid, gids, want):\n    bit = {\"r\": 4, \"w\": 2, \"x\": 1}[want]\n    if uid == 0:\n        return want != \"x\" or bool(mode & 0o111)\n    if uid == owner:\n        shift = 6\n    elif group in gids:\n        shift = 3\n    else:\n        shift = 0\n    return bool(((mode >> shift) & 7) & bit)",
  "hints": [
    "Class shift: owner 6, group 3, other 0; then `(mode >> shift) & 7`.",
    "Do not fall through: if you are the owner, only the owner bits matter even if group bits are more generous."
  ]
}
```

> [!TIP] Interview tips
> - Know octal by heart: 755 for executables and dirs, 644 for regular files, 600 for secrets such as SSH private keys (ssh refuses looser modes).
> - Pitfall: `chmod -R 777` is the wrong answer to any permissions question; diagnose with `ls -ld`, `id` and `namei -l path` instead.
> - Pitfall: a file is only reachable if every parent directory has `x` for you; permissions on the file alone are not enough.
