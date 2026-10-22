---
id: deep-learning-diffusion-models
title: "Diffusion models"
estimatedMinutes: 12
difficulty: hard
tags: [deep-learning, diffusion, ddpm, generative]
---

## Why it matters
Diffusion models power modern image, audio and video generation (Stable Diffusion, DALL-E, Sora-style systems). Interviewers probe the forward/reverse process, what the network is trained to predict, and the trade-off against GANs and VAEs (quality and stability vs sampling speed).

## Concept
**Forward process** (fixed, no learning): gradually add Gaussian noise over $T$ steps with variance schedule $\beta_t$:

$$q(x_t \mid x_{t-1}) = \mathcal N\big(\sqrt{1-\beta_t}\,x_{t-1},\ \beta_t I\big)$$

With $\alpha_t = 1 - \beta_t$ and $\bar\alpha_t = \prod_{s \le t} \alpha_s$, any step can be sampled in closed form:

$$x_t = \sqrt{\bar\alpha_t}\,x_0 + \sqrt{1 - \bar\alpha_t}\,\epsilon,\qquad \epsilon \sim \mathcal N(0, I)$$

As $t \to T$, $\bar\alpha_t \to 0$ and $x_T \approx \mathcal N(0, I)$.

**Reverse process** (learned): a network (a U-Net or, increasingly, a Transformer / DiT) removes the noise step by step. In DDPM it is trained to predict the noise $\epsilon_\theta(x_t, t)$ with the simple loss

$$L = \mathbb E_{x_0, t, \epsilon}\big[\|\epsilon - \epsilon_\theta(x_t, t)\|^2\big]$$

Training is just: pick a random $t$, noise the image, regress the noise. This is a reweighted form of the ELBO and is very stable (no adversary). Equivalent parameterizations: predict $x_0$ or the velocity $v$.

**Sampling**: start from $x_T \sim \mathcal N(0, I)$ and iterate

$$x_{t-1} = \frac{1}{\sqrt{\alpha_t}}\Big(x_t - \frac{\beta_t}{\sqrt{1-\bar\alpha_t}}\,\epsilon_\theta(x_t, t)\Big) + \sigma_t z$$

with fresh noise $z$ (none at the last step). The weakness is speed: hundreds to 1000 network calls. **DDIM** uses a deterministic non-Markov update that skips steps (20-50 steps); distillation and consistency models go to 1-4 steps.

**Conditioning and efficiency**: **classifier-free guidance** trains with the condition randomly dropped and extrapolates at sampling, $\hat\epsilon = \epsilon_u + w(\epsilon_c - \epsilon_u)$, trading diversity for fidelity. **Latent diffusion** (Stable Diffusion) runs diffusion in a VAE's latent space, cutting compute by an order of magnitude; text enters through cross-attention.

**Versus others**: stable training and excellent mode coverage and quality, but slow sampling and no direct likelihood compared with GANs (fast, sharp, unstable).

## Worked example
Schedule $\beta = [0.1, 0.2, 0.3]$, so $\alpha = [0.9, 0.8, 0.7]$ and $\bar\alpha = [0.9,\ 0.72,\ 0.504]$.

Noise a scalar $x_0 = 2$ to $t = 3$ with $\epsilon = 1$:
$x_3 = \sqrt{0.504}\cdot 2 + \sqrt{0.496}\cdot 1 = 0.7099 \cdot 2 + 0.7043 = 2.1241$.

If the network predicts $\epsilon$ perfectly, recover $x_0 = (x_t - \sqrt{1-\bar\alpha_t}\,\epsilon)/\sqrt{\bar\alpha_t} = (2.1241 - 0.7043)/0.7099 = 2$. One reverse step with $\epsilon_\theta = 1$ gives mean $(2.1241 - \tfrac{0.3}{0.7043})/\sqrt{0.7} = 2.0297$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In DDPM, what is the network typically trained to predict?",
  "options": ["The next image x_{t-1} directly", "The noise epsilon added to produce x_t", "A real/fake probability", "The latent mean and variance"],
  "answer": 1,
  "explanation": "The simple loss regresses the noise epsilon from (x_t, t); the denoising mean follows from it."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main drawback of diffusion models relative to GANs?",
  "options": ["Unstable adversarial training", "Poor sample diversity", "Slow sampling that needs many network evaluations", "They cannot be conditioned on text"],
  "answer": 2,
  "explanation": "Sampling is iterative. DDIM, distillation and consistency models reduce the number of steps."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `alpha_bars(betas)` (cumulative product of 1 - beta, as a list), `q_sample(x0, abar, eps)` = sqrt(abar) * x0 + sqrt(1 - abar) * eps, `predict_x0(xt, abar, eps_pred)` (invert q_sample), and `ddpm_mean(xt, beta, abar, eps_pred)` = (xt - beta / sqrt(1 - abar) * eps_pred) / sqrt(1 - beta).",
  "setup": "import math",
  "starterCode": "import math\n\ndef alpha_bars(betas):\n    pass\n\ndef q_sample(x0, abar, eps):\n    pass\n\ndef predict_x0(xt, abar, eps_pred):\n    pass\n\ndef ddpm_mean(xt, beta, abar, eps_pred):\n    pass\n\nab = alpha_bars([0.1, 0.2, 0.3])\nprint(ab, q_sample(2.0, ab[2], 1.0))",
  "tests": "ab = alpha_bars([0.1, 0.2, 0.3])\nassert all(abs(a - b) < 1e-12 for a, b in zip(ab, [0.9, 0.72, 0.504]))\nxt = q_sample(2.0, ab[2], 1.0)\nassert abs(xt - 2.124132) < 1e-5\nassert abs(predict_x0(xt, ab[2], 1.0) - 2.0) < 1e-9\nassert abs(ddpm_mean(xt, 0.3, ab[2], 1.0) - 2.02969) < 1e-4\nassert abs(q_sample(5.0, 1.0, 3.0) - 5.0) < 1e-12",
  "solution": "import math\n\ndef alpha_bars(betas):\n    out, prod = [], 1.0\n    for b in betas:\n        prod *= 1 - b\n        out.append(prod)\n    return out\n\ndef q_sample(x0, abar, eps):\n    return math.sqrt(abar) * x0 + math.sqrt(1 - abar) * eps\n\ndef predict_x0(xt, abar, eps_pred):\n    return (xt - math.sqrt(1 - abar) * eps_pred) / math.sqrt(abar)\n\ndef ddpm_mean(xt, beta, abar, eps_pred):\n    return (xt - beta / math.sqrt(1 - abar) * eps_pred) / math.sqrt(1 - beta)",
  "hints": ["abar_t is a running product of (1 - beta_s).", "predict_x0 is q_sample solved for x0."]
}
```

> [!TIP] Interview tips
> - State the closed-form forward step $x_t = \sqrt{\bar\alpha_t}x_0 + \sqrt{1-\bar\alpha_t}\epsilon$ and that training is noise regression.
> - Explain why sampling is slow and name DDIM, distillation and latent diffusion as fixes.
> - Mention classifier-free guidance as the standard way to trade diversity for prompt fidelity.
