---
id: cloud-devops-devsecops-basics
title: DevSecOps basics
estimatedMinutes: 10
difficulty: medium
tags: [security, devsecops, ci-cd, sast, supply-chain]
---

## Why it matters
Security found in production is expensive; security found in a pull request is cheap. DevSecOps questions test whether you can wire automated checks into CI/CD without grinding delivery to a halt, and whether you understand supply-chain risk.

## Concept
**DevSecOps** means security is a shared, automated part of the pipeline, not a final gate. The core idea is **shift left**: scan early, fail fast, give developers actionable feedback in the PR.

**Checks by stage**:
- **Pre-commit / PR**: secret scanning (gitleaks), linters, **SAST** (static analysis of your code: Semgrep, CodeQL, Bandit).
- **Dependencies (SCA)**: known-CVE scanning and updates (Dependabot, Renovate, pip-audit, Snyk); pin versions and use lock files with hashes.
- **Build**: container image scanning (Trivy, Grype), minimal/distroless base images, non-root user; generate an **SBOM** (software bill of materials) and **sign** artifacts (cosign, Sigstore) with provenance (SLSA).
- **Infrastructure as code**: Checkov / tfsec / KICS catch open security groups, public buckets, unencrypted disks before `terraform apply`.
- **Deploy**: policy-as-code admission control (OPA Gatekeeper, Kyverno) rejects unsigned images or privileged pods; **DAST** probes a running staging app.
- **Runtime**: least-privilege IAM, network policies, Falco-style detection, audit logs, patching.

```yaml
# .github/workflows/ci.yml (security stages)
jobs:
  security:
    runs-on: ubuntu-latest
    permissions: {contents: read}        # least-privilege token
    steps:
      - uses: actions/checkout@v4
      - run: gitleaks detect --no-banner          # secrets
      - run: semgrep --config auto --error        # SAST
      - run: pip-audit -r requirements.txt        # dependencies (SCA)
      - run: checkov -d infra/                    # IaC misconfigurations
      - run: docker build -t app:${{ github.sha }} .
      - run: trivy image --exit-code 1 --severity CRITICAL,HIGH app:${{ github.sha }}
```

**Triage with severity**: CVSS scores map to Low (0.1 to 3.9), Medium (4.0 to 6.9), High (7.0 to 8.9), Critical (9.0 to 10). Block merges on high/critical findings that are reachable and fixable; use time-boxed **waivers** with an owner for the rest, and surface the rest as tickets. Too many false positives make developers ignore the scanner, so tune rules and suppress with justification.

**Supply-chain risks**: malicious or typosquatted packages, compromised build systems, mutable tags (`latest`), unpinned GitHub Actions. Mitigate with pinned digests, private mirrors, trusted registries, and least-privilege CI tokens (OIDC, no long-lived cloud keys).

**For data/ML teams**: loading untrusted `pickle` or model files can execute arbitrary code (prefer safetensors); notebooks leak secrets and data; training data and models need access control and provenance; LLM apps add prompt-injection and data-exfiltration risks.

## Worked example
A PR bumps a Python service. CI finds: CVE-A (CVSS 9.8, in a library called at runtime), CVE-B (7.5, in a dev-only test dependency), CVE-C (5.0). The gate blocks at $\ge 7.0$. CVE-A fails the build, so the developer upgrades the library. CVE-B is waived until 2026-12-31 by the owning team (a ticket is filed). CVE-C passes with a ticket. Later, Trivy re-scans the deployed image nightly because new CVEs appear against old images; the admission controller only allows images signed by CI.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does \"shift left\" mean in DevSecOps?",
  "options": [
    "Running security scans only in production",
    "Moving security checks earlier in the lifecycle, such as PRs and builds, so issues are cheap to fix",
    "Delegating security to a separate team after release",
    "Deploying to the left-most region first"
  ],
  "answer": 1,
  "explanation": "Shift left embeds automated checks early (pre-commit, PR, build), giving fast feedback instead of a late manual audit."
}
```

```quiz
{
  "id": "q2",
  "question": "Which tool category finds a known-vulnerable version of a third-party library?",
  "options": [
    "SAST",
    "SCA / dependency scanning",
    "DAST",
    "Load testing"
  ],
  "answer": 1,
  "explanation": "SCA matches your dependency versions against CVE databases. SAST analyzes your own source; DAST probes the running app."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a CI security gate. `severity_from_cvss(score)` returns \"none\" (0), \"low\" (<4), \"medium\" (<7), \"high\" (<9), else \"critical\". `gate(findings, waivers, today, block_at=7.0)` takes findings `{\"id\", \"cvss\"}`, a dict of waivers `{id: expiry 'YYYY-MM-DD'}` and today's date string. A finding blocks if its CVSS is at least `block_at` and it has no waiver that is still valid (expiry >= today; ISO date strings compare correctly). Return `(passed, sorted_blocking_ids)`.",
  "starterCode": "def severity_from_cvss(score):\n    pass\n\ndef gate(findings, waivers, today, block_at=7.0):\n    pass\n\nf = [{\"id\": \"CVE-1\", \"cvss\": 9.8}, {\"id\": \"CVE-2\", \"cvss\": 5.0}]\nprint(severity_from_cvss(9.8), gate(f, {}, \"2026-10-22\"))",
  "tests": "assert severity_from_cvss(0) == \"none\"\nassert severity_from_cvss(0.1) == \"low\"\nassert severity_from_cvss(3.9) == \"low\"\nassert severity_from_cvss(4.0) == \"medium\"\nassert severity_from_cvss(6.9) == \"medium\"\nassert severity_from_cvss(7.0) == \"high\"\nassert severity_from_cvss(8.9) == \"high\"\nassert severity_from_cvss(9.0) == \"critical\"\nassert severity_from_cvss(10) == \"critical\"\nF = [{\"id\": \"CVE-1\", \"cvss\": 9.8}, {\"id\": \"CVE-2\", \"cvss\": 7.5}, {\"id\": \"CVE-3\", \"cvss\": 5.0}, {\"id\": \"CVE-4\", \"cvss\": 2.0}]\ntoday = \"2026-10-22\"\nassert gate(F, {}, today) == (False, [\"CVE-1\", \"CVE-2\"])\nassert gate(F, {\"CVE-2\": \"2026-12-31\"}, today) == (False, [\"CVE-1\"])\nassert gate(F, {\"CVE-1\": \"2026-10-01\"}, today) == (False, [\"CVE-1\", \"CVE-2\"])\nassert gate(F, {\"CVE-1\": \"2026-10-22\", \"CVE-2\": \"2027-01-01\"}, today) == (True, [])\nassert gate(F, {}, today, block_at=9.0) == (False, [\"CVE-1\"])\nassert gate([], {}, today) == (True, [])",
  "solution": "def severity_from_cvss(score):\n    if score == 0:\n        return \"none\"\n    if score < 4.0:\n        return \"low\"\n    if score < 7.0:\n        return \"medium\"\n    if score < 9.0:\n        return \"high\"\n    return \"critical\"\n\ndef gate(findings, waivers, today, block_at=7.0):\n    blocking = []\n    for f in findings:\n        if f[\"cvss\"] < block_at:\n            continue\n        expiry = waivers.get(f[\"id\"])\n        if expiry is not None and expiry >= today:\n            continue\n        blocking.append(f[\"id\"])\n    blocking.sort()\n    return (len(blocking) == 0, blocking)",
  "hints": [
    "Compare ISO date strings directly: '2026-12-31' >= '2026-10-22'.",
    "Skip findings below block_at, then skip those with an unexpired waiver, collect the rest.",
    "passed is simply `len(blocking) == 0`."
  ]
}
```

> [!TIP] Interview tips
> - Walk the pipeline: secrets, SAST, SCA, IaC, image scan, SBOM and signing, admission policy, runtime.
> - Stress developer experience: fast scans, severity thresholds, waivers with expiry, low false positives.
> - Name supply-chain defenses: pinned digests and lock files, signed artifacts, least-privilege CI tokens.
> - For ML, mention unsafe pickle deserialization and secrets in notebooks.
