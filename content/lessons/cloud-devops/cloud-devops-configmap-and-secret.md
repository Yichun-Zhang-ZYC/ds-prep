---
id: cloud-devops-configmap-and-secret
title: ConfigMap & Secret
estimatedMinutes: 10
difficulty: medium
tags: [cloud-devops, kubernetes, configmap, secret, config]
---

## Why it matters
Twelve-factor apps keep configuration out of the image. In Kubernetes that means ConfigMaps and Secrets, and interviewers like to probe how they are injected and why a Secret is not really secret by default.

## Concept
**ConfigMap**: non-sensitive key-value config (feature flags, URLs, whole config files). **Secret**: same shape for sensitive data (passwords, tokens, TLS keys), stored base64-encoded.

**Base64 is encoding, not encryption.** Anyone who can read the Secret object can decode it. Real protection comes from **RBAC** (limit who can `get` secrets), **encryption at rest** in etcd (KMS provider), and external managers (Vault, AWS Secrets Manager via External Secrets or the CSI driver). Never commit Secret manifests with real values to git; use sealed secrets or an external store.

**Three ways to consume**:
```yaml
spec:
  containers:
  - name: api
    image: myrepo/api:2.1
    envFrom:
    - configMapRef: {name: api-config}
    - secretRef: {name: api-secret}
    env:
    - name: LOG_LEVEL
      value: debug
    volumeMounts:
    - {name: cfg, mountPath: /etc/api}
  volumes:
  - name: cfg
    configMap: {name: api-files}
```
1. **Environment variables** (`env` with `valueFrom`, or `envFrom` for all keys). Read once at container start, so **changes need a pod restart**.
2. **Mounted volume**: each key becomes a file; Kubernetes refreshes the files in place after a delay (not for `subPath` mounts). The app must re-read them.
3. **Command-line arguments** built from env vars.

**Precedence**: explicit `env` entries override `envFrom`; among several `envFrom` sources, the later one wins.

**Practices**: one config per environment (dev/staging/prod via Helm values or Kustomize); roll pods when config changes (a hash annotation in the pod template or `kubectl rollout restart`); mark `immutable: true` for config that should not change; prefer mounting secrets as files over env vars (env vars leak into logs, crash dumps and child processes).

## Worked example
A ConfigMap sets `LOG_LEVEL=info` and `DB_HOST=db.prod`. A Secret holds `DB_PASSWORD` as `czNjcjN0`, which decodes to `s3cr3t`. The container has `envFrom` for both and an explicit `env: LOG_LEVEL=debug`. The resulting environment is `LOG_LEVEL=debug` (explicit wins), `DB_HOST=db.prod`, `DB_PASSWORD=s3cr3t`. Later someone edits the ConfigMap to `LOG_LEVEL=warn`; running pods still see `debug` until they are restarted, because env vars are fixed at start.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is a Kubernetes Secret not secure just because it is a Secret?",
  "options": [
    "Secrets are plain text files on disk",
    "Values are only base64-encoded, so anyone with read access can decode them; you need RBAC and encryption at rest",
    "Secrets expire daily",
    "Secrets cannot be used in pods"
  ],
  "answer": 1,
  "explanation": "Base64 is reversible encoding. Protect secrets with RBAC, etcd encryption and ideally an external secret manager."
}
```

```quiz
{
  "id": "q2",
  "question": "You change a ConfigMap that a running pod consumes through environment variables. What happens?",
  "options": [
    "The pod sees the new value immediately",
    "The pod keeps the old value until it is restarted",
    "The pod is deleted by the API server",
    "The ConfigMap change is rejected"
  ],
  "answer": 1,
  "explanation": "Environment variables are set when the container starts. Mounted volumes refresh eventually, but env vars need a restart (for example `kubectl rollout restart`)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build a container's environment the way Kubernetes does. `resolve_env(env_from, env)`: `env_from` is a list of `(kind, data)` where kind is `'configmap'` (data is a dict of plain strings) or `'secret'` (data is a dict of base64-encoded strings, which you must decode to text). Later sources override earlier ones. `env` is a dict of explicit variables that override everything. Return the final dict. Also write `mask(env, secret_keys)` that returns a copy where values of `secret_keys` are replaced with `'***'` (safe to log).",
  "starterCode": "import base64\n\ndef resolve_env(env_from, env):\n    pass\n\ndef mask(env, secret_keys):\n    pass\n",
  "tests": "cm = {'LOG_LEVEL': 'info', 'DB_HOST': 'db.prod'}\nsec = {'DB_PASSWORD': base64.b64encode(b's3cr3t').decode()}\nout = resolve_env([('configmap', cm), ('secret', sec)], {'LOG_LEVEL': 'debug'})\nassert out == {'LOG_LEVEL': 'debug', 'DB_HOST': 'db.prod', 'DB_PASSWORD': 's3cr3t'}\nassert base64.b64encode(b's3cr3t').decode() == 'czNjcjN0'\ncm2 = {'DB_HOST': 'db.staging'}\nassert resolve_env([('configmap', cm), ('configmap', cm2)], {})['DB_HOST'] == 'db.staging'\nassert resolve_env([], {'A': '1'}) == {'A': '1'}\nm = mask(out, ['DB_PASSWORD'])\nassert m['DB_PASSWORD'] == '***' and m['LOG_LEVEL'] == 'debug'\nassert out['DB_PASSWORD'] == 's3cr3t'",
  "solution": "import base64\n\ndef resolve_env(env_from, env):\n    out = {}\n    for kind, data in env_from:\n        for k, v in data.items():\n            out[k] = base64.b64decode(v).decode() if kind == 'secret' else v\n    out.update(env)\n    return out\n\ndef mask(env, secret_keys):\n    return {k: ('***' if k in secret_keys else v) for k, v in env.items()}",
  "hints": [
    "Apply sources in order with dict assignment so later ones overwrite earlier ones, then apply `env` last.",
    "`base64.b64decode(v).decode()` turns a Secret value into text."
  ]
}
```

> [!TIP] Interview tips
> - State plainly that Secrets are base64, not encrypted; mention RBAC, encryption at rest and external secret stores.
> - Know env var vs volume trade-offs: env needs a restart, volumes update eventually but the app must reload.
> - Pitfall: putting config in the image or committing Secret YAML to git; keep config per environment and out of the repo.
