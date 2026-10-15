---
id: ml-gaussian-mixture-models-and-em
title: Gaussian Mixture Models & EM
estimatedMinutes: 14
difficulty: hard
tags: [ml, unsupervised, clustering, probabilistic-models, em]
---

## Why it matters
GMMs give **soft** cluster assignments and model elliptical clusters, and the Expectation-Maximization (EM) algorithm behind them is a classic theory question. EM also appears in HMMs, missing-data problems and topic models.

## Concept
A GMM says each point comes from one of $K$ Gaussian components:

$$
p(x) = \sum_{k=1}^{K} \pi_k \, \mathcal{N}(x \mid \mu_k, \Sigma_k), \qquad \sum_k \pi_k = 1
$$

The component that generated each point is a hidden (latent) variable, so we can't maximize the likelihood directly. **EM** alternates:

- **E-step**: compute **responsibilities**, the posterior probability that component $k$ generated point $i$:
$$
\gamma_{ik} = \frac{\pi_k \, \mathcal{N}(x_i \mid \mu_k, \Sigma_k)}{\sum_j \pi_j \, \mathcal{N}(x_i \mid \mu_j, \Sigma_j)}
$$
- **M-step**: re-estimate parameters as responsibility-weighted statistics: $N_k = \sum_i \gamma_{ik}$, $\pi_k = N_k / n$, $\mu_k = \frac{1}{N_k}\sum_i \gamma_{ik} x_i$, $\Sigma_k = \frac{1}{N_k}\sum_i \gamma_{ik}(x_i - \mu_k)(x_i - \mu_k)^\top$.

Each iteration never decreases the likelihood; it converges to a local optimum, so use multiple inits (often from k-means).

vs k-means: k-means is the limit of a GMM with equal, spherical, shrinking variances and hard assignments. GMMs handle elliptical clusters of different sizes and give probabilities, but are slower and can collapse (a component shrinking onto one point; add a small variance floor). Choose $K$ with **BIC/AIC**. Low $p(x)$ under a fitted GMM is a simple anomaly score.

## Worked example
1-D, two components with $\pi = (0.5, 0.5)$, $\mu = (0, 4)$, $\sigma = (1, 1)$. For $x = 1$: $\mathcal{N}(1 \mid 0, 1) \propto e^{-0.5}$, $\mathcal{N}(1 \mid 4, 1) \propto e^{-4.5}$. Responsibility of component 1 $= e^{-0.5}/(e^{-0.5} + e^{-4.5}) = 1/(1 + e^{-4}) \approx 0.982$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does the E-step of EM for a GMM compute?",
  "options": ["New means and variances", "Each point's posterior probability of belonging to each component", "The number of components", "The gradient of the likelihood"],
  "answer": 1,
  "explanation": "The E-step fills in the hidden assignments softly (responsibilities); the M-step updates parameters."
}
```

```quiz
{
  "id": "q2",
  "question": "Why might you choose a GMM over k-means?",
  "options": ["It's faster", "You need soft (probabilistic) assignments or clusters are elliptical with different sizes", "It doesn't need the number of clusters", "It works better in very high dimensions"],
  "answer": 1,
  "explanation": "GMMs model covariance and give membership probabilities; you still choose K (e.g. by BIC)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement one EM iteration for a 1-D GMM. `normal_pdf(x, mu, sigma)`, `e_step(xs, pis, mus, sigmas)` returning a list of responsibility lists (one per point), and `m_step(xs, resp)` returning `(pis, mus, sigmas)` with sigma as the weighted standard deviation.",
  "starterCode": "import math\n\ndef normal_pdf(x, mu, sigma):\n    pass\n\ndef e_step(xs, pis, mus, sigmas):\n    pass\n\ndef m_step(xs, resp):\n    pass\n\nxs = [-1.0, 0.0, 1.0, 3.0, 4.0, 5.0]\nr = e_step(xs, [0.5, 0.5], [0.0, 4.0], [1.0, 1.0])\nprint([round(v[0], 3) for v in r])\nprint(m_step(xs, r))",
  "tests": "import math\nassert abs(normal_pdf(0, 0, 1) - 1 / math.sqrt(2 * math.pi)) < 1e-12\nr = e_step([1.0], [0.5, 0.5], [0.0, 4.0], [1.0, 1.0])\nassert abs(r[0][0] - 1 / (1 + math.exp(-4))) < 1e-12\nxs = [-1.0, 0.0, 1.0, 3.0, 4.0, 5.0]\npis, mus, sig = m_step(xs, [[1, 0], [1, 0], [1, 0], [0, 1], [0, 1], [0, 1]])\nassert pis == [0.5, 0.5] and mus == [0.0, 4.0]\nassert abs(sig[0] - math.sqrt(2 / 3)) < 1e-12\nr = e_step(xs, [0.5, 0.5], [0.0, 4.0], [1.0, 1.0])\nassert all(abs(sum(v) - 1) < 1e-12 for v in r)\npis, mus, sig = m_step(xs, r)\nassert mus[0] < 0.5 and mus[1] > 3.5 and abs(sum(pis) - 1) < 1e-12",
  "solution": "import math\n\ndef normal_pdf(x, mu, sigma):\n    return math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * math.sqrt(2 * math.pi))\n\ndef e_step(xs, pis, mus, sigmas):\n    out = []\n    for x in xs:\n        w = [p * normal_pdf(x, m, s) for p, m, s in zip(pis, mus, sigmas)]\n        t = sum(w)\n        out.append([v / t for v in w])\n    return out\n\ndef m_step(xs, resp):\n    K = len(resp[0])\n    n = len(xs)\n    pis, mus, sigmas = [], [], []\n    for k in range(K):\n        Nk = sum(r[k] for r in resp)\n        mu = sum(r[k] * x for r, x in zip(resp, xs)) / Nk\n        var = sum(r[k] * (x - mu) ** 2 for r, x in zip(resp, xs)) / Nk\n        pis.append(Nk / n)\n        mus.append(mu)\n        sigmas.append(math.sqrt(var))\n    return pis, mus, sigmas",
  "hints": ["E-step: weight = π·N(x), then normalize per point.", "M-step: N_k = Σ responsibilities; mean and variance are responsibility-weighted."]
}
```

> [!TIP] Interview tips
> - Explain EM in two sentences: E-step guesses the hidden assignments softly; M-step refits parameters as if those guesses were true.
> - Relate to k-means (hard assignments, spherical clusters) and mention BIC for choosing K.
> - Note local optima, k-means initialization, and variance floors against collapse.
