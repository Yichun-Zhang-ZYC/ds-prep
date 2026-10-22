---
id: math-kl-divergence
title: KL divergence
estimatedMinutes: 12
difficulty: medium
tags: [information-theory, kl-divergence, vae, distribution-shift]
---

## Why it matters
KL divergence measures how one distribution differs from another. It appears in VAEs, RLHF/PPO penalties, knowledge distillation, drift monitoring and variational inference. Interviewers probe its asymmetry and what each direction of the KL does.

## Concept
$$D_{KL}(p \,\|\, q) = \sum_x p(x) \log \frac{p(x)}{q(x)} = \mathbb E_{x \sim p}\!\left[\log \frac{p(x)}{q(x)}\right] = H(p, q) - H(p)$$

**Properties**:
- $D_{KL} \ge 0$ with equality iff $p = q$ (Gibbs' inequality, from Jensen).
- **Not symmetric** and not a metric (no triangle inequality). $D_{KL}(p\|q) = \infty$ if $q(x) = 0$ somewhere $p(x) > 0$ (needs absolute continuity).
- Extra bits/nats paid for coding $p$-samples with a code optimized for $q$.

**Direction matters** (fit $q$ to a target $p$):
- **Forward KL** $D_{KL}(p\|q)$ (maximum likelihood): $q$ must cover everything $p$ covers, so it is *mass-covering* and spreads out over multiple modes.
- **Reverse KL** $D_{KL}(q\|p)$ (variational inference): $q$ must avoid regions where $p$ is small, so it is *mode-seeking* and locks onto one mode.

**Gaussians** (closed form): $D_{KL}(\mathcal N(\mu_1, \sigma_1^2) \| \mathcal N(\mu_2, \sigma_2^2)) = \ln\frac{\sigma_2}{\sigma_1} + \frac{\sigma_1^2 + (\mu_1 - \mu_2)^2}{2\sigma_2^2} - \frac12$. The VAE regularizer is this against $\mathcal N(0, 1)$.

**Symmetric variant**: Jensen-Shannon $\text{JS}(p, q) = \tfrac12 D_{KL}(p\|m) + \tfrac12 D_{KL}(q\|m)$ with $m = (p+q)/2$; always finite and bounded by $\log 2$.

## Worked example
$p = (0.5, 0.25, 0.25)$, $q = (1/3, 1/3, 1/3)$, in bits.

Forward: $D_{KL}(p\|q) = 0.5 \log_2 1.5 + 2 \cdot 0.25 \log_2 0.75 = 0.5(0.585) + 0.5(-0.415) = 0.0850$.

Reverse: $D_{KL}(q\|p) = \tfrac13 \log_2\frac{2}{3} + \tfrac23 \log_2 \frac43 = \tfrac13(-0.585) + \tfrac23(0.415) = 0.0817$.

They differ (0.0850 vs 0.0817): KL is asymmetric. If instead $q = (0.5, 0.5, 0)$, then $D_{KL}(p\|q) = \infty$ (the model gives zero probability to an event that happens), while $D_{KL}(q\|p) = 0.5\log_2 1 + 0.5 \log_2 2 = 0.5$ bits is finite. Gaussian check: $D_{KL}(\mathcal N(0,1)\|\mathcal N(1,1)) = 0.5$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You fit a single Gaussian $q$ to a bimodal target $p$. Minimizing which divergence gives a wide $q$ that covers both modes?",
  "options": [
    "Reverse KL $D_{KL}(q\\|p)$",
    "Forward KL $D_{KL}(p\\|q)$",
    "Both give the same result",
    "Neither; KL can't be used for continuous densities"
  ],
  "answer": 1,
  "explanation": "Forward KL (maximum likelihood) heavily penalizes $q$ being small where $p$ has mass, so $q$ spreads over both modes. Reverse KL is mode-seeking and picks one."
}
```

```quiz
{
  "id": "q2",
  "type": "multi",
  "question": "Which statements about KL divergence are true?",
  "options": [
    "It is symmetric",
    "It is always non-negative",
    "It satisfies the triangle inequality",
    "It can be infinite"
  ],
  "answer": [
    1,
    3
  ],
  "explanation": "KL is $\\ge 0$ and can be infinite when $q$ assigns zero probability to something $p$ can produce. It is neither symmetric nor a metric."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `kl(p, q, base=2)` for discrete distributions (terms with $p_i = 0$ contribute 0; return `float('inf')` if some $p_i > 0$ has $q_i = 0$), `js(p, q, base=2)` using the mixture $m = (p+q)/2$, and `kl_gauss(mu1, s1, mu2, s2)` for the closed-form KL between two univariate normals (in nats; `s` are standard deviations).",
  "starterCode": "import math\n\ndef kl(p, q, base=2):\n    pass\n\ndef js(p, q, base=2):\n    pass\n\ndef kl_gauss(mu1, s1, mu2, s2):\n    pass\n\np = [0.5, 0.25, 0.25]\nq = [1/3] * 3\nprint(kl(p, q), kl(q, p), js(p, q), kl_gauss(0, 1, 1, 1))",
  "tests": "import math\np = [0.5, 0.25, 0.25]\nq = [1 / 3] * 3\nassert abs(kl(p, q) - (math.log2(3) - 1.5)) < 1e-12\nassert abs(kl(q, p) - sum(qi * math.log2(qi / pi) for qi, pi in zip(q, p))) < 1e-12\nassert abs(kl(p, p)) < 1e-12\nassert kl([0.5, 0.5], [1.0, 0.0]) == float('inf')\nassert abs(kl([0.5, 0.5, 0.0], [0.5, 0.25, 0.25]) - 0.5) < 1e-12\nassert abs(js(p, q) - js(q, p)) < 1e-12\nassert abs(js([1.0, 0.0], [0.0, 1.0]) - 1.0) < 1e-12\nassert abs(kl_gauss(0, 1, 1, 1) - 0.5) < 1e-12\nassert abs(kl_gauss(0, 1, 0, 2) - (math.log(2) + 0.125 - 0.5)) < 1e-12\nassert abs(kl_gauss(3, 2, 3, 2)) < 1e-12",
  "solution": "import math\n\ndef kl(p, q, base=2):\n    total = 0.0\n    for pi, qi in zip(p, q):\n        if pi > 0:\n            if qi == 0:\n                return float('inf')\n            total += pi * math.log(pi / qi, base)\n    return total\n\ndef js(p, q, base=2):\n    m = [(a + b) / 2 for a, b in zip(p, q)]\n    return 0.5 * kl(p, m, base) + 0.5 * kl(q, m, base)\n\ndef kl_gauss(mu1, s1, mu2, s2):\n    return math.log(s2 / s1) + (s1 ** 2 + (mu1 - mu2) ** 2) / (2 * s2 ** 2) - 0.5",
  "hints": [
    "Only sum over indices where p is positive; check q = 0 there first.",
    "The mixture m is positive wherever p or q is, so JS is always finite."
  ]
}
```

> [!TIP] Interview tips
> - Always state the asymmetry and which direction you mean: forward (ML, mass-covering) vs reverse (VI, mode-seeking).
> - Know where it shows up: VAE ELBO, PPO/RLHF KL penalty to a reference model, distillation, PSI/drift checks (a symmetrized KL).
> - Pitfall: zeros in $q$ blow up forward KL. Smooth distributions (add a small $\epsilon$) or use JS.
