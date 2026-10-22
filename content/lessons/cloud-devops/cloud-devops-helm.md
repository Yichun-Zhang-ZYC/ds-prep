---
id: cloud-devops-helm
title: Helm
estimatedMinutes: 11
difficulty: medium
tags: [cloud-devops, kubernetes, helm, templating]
---

## Why it matters
Real clusters run dozens of near-identical manifests across dev, staging and prod. Helm is the standard way to template, version and release them, and it shows up in nearly every Kubernetes interview.

## Concept
**Helm** is the package manager for Kubernetes. A **chart** is a directory of templates plus defaults; a **release** is one installed instance of a chart in a cluster, with a revision history.

```text
mychart/
  Chart.yaml        # name, version, appVersion, dependencies
  values.yaml       # default configuration
  templates/
    deployment.yaml
    service.yaml
    _helpers.tpl
```

Templates use Go templating over the `.Values` object:

```yaml
# templates/deployment.yaml
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: api
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
```

**Values** come from layers merged in this order (later wins): chart `values.yaml` < `-f prod.yaml` files (in the order given) < `--set key=value`. Maps merge **deeply**; lists are **replaced**, not merged.

**Everyday commands**:
```bash
helm install api ./mychart -f values-prod.yaml --set image.tag=2.1
helm upgrade --install api ./mychart -f values-prod.yaml   # idempotent deploy
helm template ./mychart -f values-prod.yaml               # render locally
helm lint ./mychart && helm diff upgrade api ./mychart    # diff is a plugin
helm history api && helm rollback api 3
```

**Why teams use it**: one chart, many environments (only values differ); versioned releases with **atomic upgrades** (`--atomic` rolls back on failure) and `helm rollback`; chart **dependencies** (e.g. Redis sub-chart); public charts via OCI registries.

**Caveats**: Go templates are easy to make unreadable; keep logic small. Do not store secrets in values files in git (use sops, External Secrets). Helm does not delete CRDs on uninstall. **Kustomize** is the overlay-based alternative with no templating; many teams use Helm for third-party apps and Kustomize or Helm for their own, and pair either with GitOps (Argo CD, Flux).

## Worked example
Chart defaults: `replicaCount: 1`, `image: {repository: myrepo/api, tag: latest}`. The prod file sets `replicaCount: 5` and `image: {tag: 2.1}`. Deep merge gives `replicaCount: 5`, `image.repository: myrepo/api` (kept from defaults), `image.tag: 2.1`. Adding `--set replicaCount=8` for a one-off beats the file, so the rendered Deployment has `replicas: 8` and image `myrepo/api:2.1`. If revision 4 breaks, `helm rollback api 3` restores the manifests of revision 3 as a new revision 5.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "The chart default is `resources: {cpu: 1, memory: 1Gi}` and your override file sets `resources: {cpu: 2}`. What is the final `resources`?",
  "options": [
    "{cpu: 2}",
    "{cpu: 2, memory: 1Gi}",
    "{cpu: 1, memory: 1Gi}",
    "An error"
  ],
  "answer": 1,
  "explanation": "Helm merges maps deeply, so the unspecified `memory` keeps its default. Lists, in contrast, are replaced wholesale."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the difference between a Helm chart and a release?",
  "options": [
    "They are the same",
    "A chart is the package of templates; a release is one installed instance of it with a revision history",
    "A release is a template; a chart is a running pod",
    "A chart can only be installed once per cluster"
  ],
  "answer": 1,
  "explanation": "You can install the same chart several times under different release names, each with its own values and revisions."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Mimic Helm values handling. `deep_merge(base, override)` returns a new dict where nested dicts merge recursively, and any other value (including lists) in `override` replaces the base value; inputs must not be mutated. `render(template, values)` replaces every `{{ .Values.a.b }}` (optional spaces inside the braces, dotted path into nested dicts) with `str(value)`; raise `KeyError` if the path is missing.",
  "starterCode": "import re\n\ndef deep_merge(base, override):\n    pass\n\ndef render(template, values):\n    pass\n",
  "tests": "defaults = {'replicaCount': 1, 'image': {'repository': 'myrepo/api', 'tag': 'latest'}, 'ports': [80, 443]}\nprod = {'replicaCount': 5, 'image': {'tag': '2.1'}, 'ports': [8080]}\nm = deep_merge(defaults, prod)\nassert m == {'replicaCount': 5, 'image': {'repository': 'myrepo/api', 'tag': '2.1'}, 'ports': [8080]}\nassert defaults['image']['tag'] == 'latest' and defaults['ports'] == [80, 443]\nm2 = deep_merge(m, {'replicaCount': 8})\nt = 'replicas: {{ .Values.replicaCount }}\\nimage: \"{{.Values.image.repository}}:{{ .Values.image.tag }}\"'\nassert render(t, m2) == 'replicas: 8\\nimage: \"myrepo/api:2.1\"'\ntry:\n    render('{{ .Values.nope.x }}', m2)\n    raise AssertionError('expected KeyError')\nexcept KeyError:\n    pass",
  "solution": "import re\n\ndef deep_merge(base, override):\n    out = dict(base)\n    for k, v in override.items():\n        if isinstance(v, dict) and isinstance(out.get(k), dict):\n            out[k] = deep_merge(out[k], v)\n        else:\n            out[k] = v\n    return out\n\ndef render(template, values):\n    def sub(m):\n        cur = values\n        for part in m.group(1).split('.'):\n            cur = cur[part]\n        return str(cur)\n    return re.sub(r'\\{\\{\\s*\\.Values\\.([A-Za-z0-9_.]+)\\s*\\}\\}', sub, template)",
  "hints": [
    "Recurse only when both the base value and the override value are dicts; otherwise the override wins.",
    "`re.sub` accepts a function; inside it, walk the dotted path with successive dict lookups."
  ]
}
```

> [!TIP] Interview tips
> - Explain chart vs release, the values precedence order and that maps merge deeply while lists are replaced.
> - Mention `helm upgrade --install --atomic`, `helm template` and `helm diff` for safe, reviewable deploys.
> - Pitfall: secrets in values files and over-clever templates; keep charts simple and compare with Kustomize when asked.
