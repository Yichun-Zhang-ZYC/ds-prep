---
id: deep-learning-autoencoders-vae
title: "Autoencoders, VAE"
estimatedMinutes: 11
difficulty: medium
tags: [deep-learning, autoencoder, vae, generative, elbo]
---

## Why it matters
Autoencoders compress data and learn representations; VAEs turn that idea into a proper generative model. Interviewers ask what the VAE loss means, why the reparameterization trick is needed, and how VAEs differ from plain autoencoders and GANs.

## Concept
**Autoencoder (AE)**: an encoder $z = f(x)$ squeezes the input through a bottleneck and a decoder $\hat x = g(z)$ reconstructs it, trained with reconstruction loss (MSE or cross-entropy). A linear AE with MSE learns the same subspace as PCA. Variants: **denoising** (corrupt the input, reconstruct the clean one), **sparse** (L1 penalty on $z$), **undercomplete** (small $z$). Uses: dimensionality reduction, pretraining, anomaly detection (high reconstruction error = anomaly). A plain AE's latent space has gaps, so sampling random $z$ gives garbage.

**VAE**: the encoder outputs a distribution $q_\phi(z \mid x) = \mathcal N(\mu, \text{diag}(\sigma^2))$ and the prior is $p(z) = \mathcal N(0, I)$. Training maximizes the **ELBO**:

$$\log p(x) \ge \mathbb E_{q(z|x)}[\log p_\theta(x \mid z)] - D_{KL}\big(q_\phi(z \mid x)\,\|\,p(z)\big)$$

The first term is reconstruction; the KL term regularizes the latent space toward the prior so that sampling $z \sim \mathcal N(0, I)$ and decoding yields plausible data. The gap between $\log p(x)$ and the ELBO is $D_{KL}(q(z|x)\,\|\,p(z|x))$.

**Closed-form KL** for diagonal Gaussians (encoder usually predicts $\log\sigma^2$ for stability):

$$D_{KL} = -\tfrac12 \sum_j \big(1 + \log\sigma_j^2 - \mu_j^2 - \sigma_j^2\big)$$

**Reparameterization trick**: sampling $z$ is not differentiable w.r.t. $\mu,\sigma$. Write $z = \mu + \sigma \odot \epsilon$ with $\epsilon \sim \mathcal N(0, I)$; randomness is now an input, so gradients flow through $\mu$ and $\sigma$.

**Common issues and variants**: blurry samples (Gaussian likelihood averages modes); **posterior collapse** (decoder ignores $z$, KL goes to 0, especially with strong autoregressive decoders); **$\beta$-VAE** weights KL by $\beta > 1$ for more disentangled but blurrier latents; KL annealing fights collapse. VAE vs GAN: VAE has stable training, an explicit likelihood bound and an encoder, but blurrier samples.

## Worked example
Latent dimension 2 with $\mu = [1, 0]$ and $\log\sigma^2 = [0, 0]$ (so $\sigma = 1$):

- dim 1: $-\tfrac12(1 + 0 - 1 - 1) = 0.5$
- dim 2: $-\tfrac12(1 + 0 - 0 - 1) = 0$
- $D_{KL} = 0.5$: only the shifted mean is penalized.

Now one dimension with $\mu = 0$, $\sigma = 2$ ($\log\sigma^2 = \ln 4 \approx 1.386$): $-\tfrac12(1 + 1.386 - 0 - 4) = 0.807$. Sampling with $\epsilon = 0.5$ gives $z = 0 + 2 \cdot 0.5 = 1$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is the reparameterization trick needed?",
  "options": ["To make the KL term closed-form", "To let gradients flow through the random sampling step to the encoder", "To make the decoder deterministic", "To increase the latent dimension"],
  "answer": 1,
  "explanation": "Writing z = mu + sigma * eps moves the randomness into eps, so z is a differentiable function of mu and sigma."
}
```

```quiz
{
  "id": "q2",
  "question": "A VAE's KL term is nearly 0 and its samples ignore the latent code. What is this called?",
  "options": ["Mode collapse", "Posterior collapse", "Vanishing gradients", "Overfitting"],
  "answer": 1,
  "explanation": "The decoder ignores z and the encoder outputs the prior. Fixes: KL annealing, weaker decoder, free bits."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `kl_diag_gaussian(mu, logvar)` (KL of N(mu, diag(exp(logvar))) from N(0, I), summed over dimensions), `reparameterize(mu, logvar, eps)` returning `mu + exp(0.5 * logvar) * eps` elementwise as a list, and `neg_elbo(recon, kl, beta=1.0)` = recon + beta * kl.",
  "setup": "import math",
  "starterCode": "import math\n\ndef kl_diag_gaussian(mu, logvar):\n    pass\n\ndef reparameterize(mu, logvar, eps):\n    pass\n\ndef neg_elbo(recon, kl, beta=1.0):\n    pass\n\nprint(kl_diag_gaussian([1, 0], [0, 0]))",
  "tests": "assert abs(kl_diag_gaussian([1, 0], [0, 0]) - 0.5) < 1e-9\nassert abs(kl_diag_gaussian([0.0], [math.log(4)]) - 0.806853) < 1e-5\nassert abs(kl_diag_gaussian([0, 0, 0], [0, 0, 0])) < 1e-12\nz = reparameterize([0.0, 1.0], [math.log(4), 0.0], [0.5, 2.0])\nassert abs(z[0] - 1.0) < 1e-9 and abs(z[1] - 3.0) < 1e-9\nassert abs(neg_elbo(10.0, 0.5, beta=4.0) - 12.0) < 1e-12\nassert abs(neg_elbo(10.0, 0.5) - 10.5) < 1e-12",
  "solution": "import math\n\ndef kl_diag_gaussian(mu, logvar):\n    return -0.5 * sum(1 + lv - m * m - math.exp(lv) for m, lv in zip(mu, logvar))\n\ndef reparameterize(mu, logvar, eps):\n    return [m + math.exp(0.5 * lv) * e for m, lv, e in zip(mu, logvar, eps)]\n\ndef neg_elbo(recon, kl, beta=1.0):\n    return recon + beta * kl",
  "hints": ["sigma = exp(0.5 * logvar), so sigma^2 = exp(logvar).", "KL is zero exactly when mu = 0 and logvar = 0."]
}
```

> [!TIP] Interview tips
> - State the loss as reconstruction + KL, and say what each term does to the latent space.
> - Explain reparameterization in one sentence: move the randomness into $\epsilon$ so backprop works.
> - Contrast with GANs (sharper but unstable, no encoder) and mention posterior collapse and $\beta$-VAE.
