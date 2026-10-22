---
id: deep-learning-gans
title: "GANs"
estimatedMinutes: 10
difficulty: medium
tags: [deep-learning, gan, generative, minimax]
---

## Why it matters
GANs introduced adversarial training and still show up in interviews as the classic "generator vs discriminator" question. Expect to write the minimax objective, explain mode collapse and training instability, and compare GANs with VAEs and diffusion models.

## Concept
Two networks play a game. The **generator** $G(z)$ maps noise $z \sim \mathcal N(0, I)$ to fake samples; the **discriminator** $D(x) \in (0, 1)$ estimates the probability that $x$ is real. Objective:

$$\min_G \max_D\ \mathbb E_{x \sim p_{data}}[\log D(x)] + \mathbb E_{z}[\log(1 - D(G(z)))]$$

Training alternates: update $D$ on real and fake batches, then update $G$. There is no likelihood and no encoder; the discriminator is a learned loss.

**Theory.** For a fixed $G$ the optimal discriminator is $D^*(x) = \dfrac{p_{data}(x)}{p_{data}(x) + p_g(x)}$. Plugging it in, the generator minimizes $2\,\text{JSD}(p_{data}\,\|\,p_g) - \log 4$, with the global optimum $p_g = p_{data}$, $D^* \equiv 1/2$, value $-\log 4$.

**Non-saturating loss.** Early on $D$ easily rejects fakes, $D(G(z)) \approx 0$, and $\log(1 - D(G(z)))$ is flat, so $G$ gets tiny gradients. In practice $G$ minimizes $-\log D(G(z))$ instead: same fixed point, strong gradients when it is losing.

**Failure modes**:
- **Mode collapse**: $G$ produces a few plausible outputs and ignores the rest of the data distribution.
- **Instability / non-convergence**: two coupled optimizers oscillate; loss curves are not a quality signal.
- **Vanishing gradients** when $D$ is too strong (supports of $p_g$ and $p_{data}$ barely overlap, so JSD is constant).

**Fixes and variants**: **WGAN** (Wasserstein distance, critic with Lipschitz constraint via weight clipping or gradient penalty, meaningful loss); spectral normalization; DCGAN conventions (strided convs, BatchNorm, LeakyReLU); **conditional GAN** (feed a label to both networks); StyleGAN; CycleGAN / pix2pix for image translation. Evaluate with **FID** (Fréchet distance between Inception features) and Inception Score; there is no tractable test log-likelihood.

**Versus others**: GANs give sharp samples and fast one-pass sampling but unstable training and poor mode coverage; VAEs are stable with an encoder but blurry; diffusion models are stable and diverse but slow to sample.

## Worked example
One real sample with $D(x) = 0.9$ and one fake with $D(G(z)) = 0.2$:

- $D$ loss $= -[\ln 0.9 + \ln(1 - 0.2)] = 0.1054 + 0.2231 = 0.3285$
- Saturating $G$ loss $\ln(1 - 0.2) = -0.2231$; its gradient shrinks as $D(G(z)) \to 0$.
- Non-saturating $G$ loss $= -\ln 0.2 = 1.6094$, large when $G$ is losing.

Optimal discriminator at a point where $p_{data} = 0.6$ and $p_g = 0.2$: $D^* = 0.6 / 0.8 = 0.75$. At equilibrium $p_g = p_{data}$ gives $D^* = 0.5$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is the non-saturating generator loss -log D(G(z)) preferred over log(1 - D(G(z)))?",
  "options": ["It has a different global optimum", "It gives strong gradients when the discriminator confidently rejects fakes", "It removes the need for a discriminator", "It prevents mode collapse"],
  "answer": 1,
  "explanation": "Early in training D(G(z)) is near 0 where log(1 - D) is flat; -log D has a steep gradient there. The fixed point is the same."
}
```

```quiz
{
  "id": "q2",
  "question": "A GAN generates only a handful of distinct, realistic-looking faces. What is this?",
  "options": ["Posterior collapse", "Mode collapse", "Overfitting the discriminator", "Exploding gradients"],
  "answer": 1,
  "explanation": "The generator covers only a few modes of the data distribution. Remedies include WGAN-GP, minibatch discrimination and conditioning."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement, for lists of discriminator outputs in (0, 1): `d_loss(d_real, d_fake)` = mean of -[log D(x) + log(1 - D(G(z)))] over paired samples; `g_loss_nonsat(d_fake)` = mean of -log D(G(z)); and `d_optimal(p_data, p_g)` = p_data / (p_data + p_g).",
  "setup": "import math",
  "starterCode": "import math\n\ndef d_loss(d_real, d_fake):\n    pass\n\ndef g_loss_nonsat(d_fake):\n    pass\n\ndef d_optimal(p_data, p_g):\n    pass\n\nprint(d_loss([0.9], [0.2]), g_loss_nonsat([0.2]), d_optimal(0.6, 0.2))",
  "tests": "assert abs(d_loss([0.9], [0.2]) - 0.328504) < 1e-5\nassert abs(g_loss_nonsat([0.2]) - 1.609438) < 1e-5\nassert abs(g_loss_nonsat([0.5, 0.5]) - math.log(2)) < 1e-12\nassert abs(d_loss([0.5, 0.5], [0.5, 0.5]) - 2 * math.log(2)) < 1e-12\nassert abs(d_optimal(0.6, 0.2) - 0.75) < 1e-12\nassert abs(d_optimal(0.3, 0.3) - 0.5) < 1e-12",
  "solution": "import math\n\ndef d_loss(d_real, d_fake):\n    n = len(d_real)\n    return sum(-(math.log(r) + math.log(1 - f)) for r, f in zip(d_real, d_fake)) / n\n\ndef g_loss_nonsat(d_fake):\n    return sum(-math.log(f) for f in d_fake) / len(d_fake)\n\ndef d_optimal(p_data, p_g):\n    return p_data / (p_data + p_g)",
  "hints": ["Average the per-sample loss over the batch.", "At equilibrium D outputs 0.5, so D loss = 2 ln 2 (that is, log 4)."]
}
```

> [!TIP] Interview tips
> - Write the minimax objective from memory and state $D^*$ and the JSD connection.
> - Name mode collapse and instability, plus two concrete fixes (WGAN-GP, spectral norm).
> - Compare with VAE and diffusion on sample quality, speed, stability and mode coverage.
