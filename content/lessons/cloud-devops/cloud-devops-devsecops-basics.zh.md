---
id: cloud-devops-devsecops-basics
title: "DevSecOps 基础"
---

## 为什么重要
在生产环境中发现安全问题代价高昂，在 pull request 中发现则代价很低。DevSecOps 的问题考察你能否把自动化检查接入 CI/CD 而不拖垮交付，以及你是否理解供应链风险。

## 概念
**DevSecOps** 指安全是流水线中共同负责、自动化的一部分，而不是最后的关卡。核心思想是**左移（shift left）**：尽早扫描、快速失败，并在 PR 中向开发者提供可执行的反馈。

**各阶段的检查**：
- **提交前 / PR**：密钥扫描（gitleaks）、linter、**SAST**（对自己代码的静态分析：Semgrep、CodeQL、Bandit）。
- **依赖（SCA）**：已知 CVE 扫描与更新（Dependabot、Renovate、pip-audit、Snyk）；固定版本并使用带哈希的锁文件。
- **构建**：容器镜像扫描（Trivy、Grype）、最小化/distroless 基础镜像、非 root 用户；生成 **SBOM**（软件物料清单），并对制品**签名**（cosign、Sigstore）及生成来源证明（SLSA）。
- **基础设施即代码**：Checkov / tfsec / KICS 在 `terraform apply` 之前发现开放的安全组、公开的存储桶、未加密的磁盘。
- **部署**：策略即代码的准入控制（OPA Gatekeeper、Kyverno）拒绝未签名镜像或特权 pod；**DAST** 对运行中的预发布应用进行探测。
- **运行时**：最小权限 IAM、网络策略、Falco 类检测、审计日志、打补丁。

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

**按严重程度分流**：CVSS 分数对应 Low（0.1 到 3.9）、Medium（4.0 到 6.9）、High（7.0 到 8.9）、Critical（9.0 到 10）。对可触达且可修复的 high/critical 发现阻止合并；其余发现使用带负责人且有时限的**豁免（waiver）**，并以工单形式跟进。误报太多会让开发者忽略扫描器，因此要调优规则，并带理由地抑制。

**供应链风险**：恶意或仿冒名称的包、被攻陷的构建系统、可变标签（`latest`）、未固定版本的 GitHub Actions。缓解手段包括固定摘要（digest）、私有镜像源、受信任的仓库，以及最小权限的 CI 令牌（OIDC，不使用长期云密钥）。

**对数据/ML 团队**：加载不受信任的 `pickle` 或模型文件可能执行任意代码（优先使用 safetensors）；notebook 会泄露密钥和数据；训练数据与模型需要访问控制和来源追溯；LLM 应用还带来提示注入和数据外泄风险。

## 示例讲解
一个 PR 升级了某 Python 服务。CI 发现：CVE-A（CVSS 9.8，位于运行时调用的库中）、CVE-B（7.5，位于仅开发用的测试依赖中）、CVE-C（5.0）。门禁在 $\ge 7.0$ 时阻止。CVE-A 使构建失败，开发者于是升级该库。CVE-B 由负责团队豁免到 2026-12-31（并创建了工单）。CVE-C 通过并附带工单。之后，Trivy 会每晚重新扫描已部署的镜像，因为旧镜像上会不断出现新的 CVE；准入控制器只允许由 CI 签名的镜像。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "DevSecOps 中的“左移”是什么意思？",
  "options": [
    "只在生产环境运行安全扫描",
    "把安全检查提前到生命周期的早期阶段（如 PR 和构建），使问题修复成本更低",
    "发布之后再把安全交给单独的团队",
    "先部署到最左边的区域"
  ],
  "explanation": "左移是把自动化检查嵌入早期阶段（提交前、PR、构建），提供快速反馈，而不是事后的人工审计。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪一类工具能发现第三方库中已知存在漏洞的版本？",
  "options": [
    "SAST",
    "SCA / 依赖扫描",
    "DAST",
    "压力测试"
  ],
  "explanation": "SCA 把你的依赖版本与 CVE 数据库进行比对。SAST 分析你自己的源码；DAST 探测运行中的应用。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现一个 CI 安全门禁。`severity_from_cvss(score)` 返回 \"none\"（0）、\"low\"（<4）、\"medium\"（<7）、\"high\"（<9），否则返回 \"critical\"。`gate(findings, waivers, today, block_at=7.0)` 接收发现列表 `{\"id\", \"cvss\"}`、豁免字典 `{id: 到期日 'YYYY-MM-DD'}` 以及今天的日期字符串。若某发现的 CVSS 不低于 `block_at`，且没有仍然有效的豁免（到期日 >= 今天；ISO 日期字符串可直接比较），则它是阻塞项。返回 `(passed, 排序后的阻塞 id 列表)`。",
  "hints": [
    "直接比较 ISO 日期字符串：'2026-12-31' >= '2026-10-22'。",
    "先跳过低于 block_at 的发现，再跳过豁免未过期的，其余收集起来。",
    "passed 就是 `len(blocking) == 0`。"
  ]
}
```

> [!TIP] 面试技巧
> - 按流水线逐步讲：密钥、SAST、SCA、IaC、镜像扫描、SBOM 与签名、准入策略、运行时。
> - 强调开发者体验：扫描快、有严重级别阈值、带过期时间的豁免、低误报。
> - 说出供应链防护：固定摘要和锁文件、签名制品、最小权限 CI 令牌。
> - 对 ML 场景，提到不安全的 pickle 反序列化和 notebook 中的密钥。
