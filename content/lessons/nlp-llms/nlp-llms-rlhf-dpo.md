---
id: nlp-llms-rlhf-dpo
title: RLHF, DPO
estimatedMinutes: 15
difficulty: hard
tags: [nlp, llm, alignment, rlhf, dpo, preference]
---

## Why it matters
SFT makes a model follow instructions; preference tuning makes it *helpful, honest and harmless*. RLHF and DPO are core alignment topics, and interviewers expect you to write the losses and compare the two approaches.

## Concept
**RLHF pipeline**:
1. **SFT**: start from an instruction-tuned model $\pi_{\text{ref}}$.
2. **Reward model**: collect human comparisons (chosen $y_w$ vs rejected $y_l$ for a prompt $x$). Using the Bradley-Terry model, $P(y_w \succ y_l) = \sigma(r(x, y_w) - r(x, y_l))$, and train with $-\log \sigma(r_w - r_l)$.
3. **RL (usually PPO)**: sample responses from the policy $\pi_\theta$ and maximize
$$\mathbb{E}\big[r(x, y)\big] - \beta\, \mathrm{KL}(\pi_\theta \,\|\, \pi_{\text{ref}})$$
The **KL penalty** keeps the policy near the reference and limits **reward hacking** (exploiting reward-model flaws such as length or flattery).

PPO needs four models in memory (policy, reference, reward, value) and is unstable and sensitive to hyperparameters.

**DPO** (Direct Preference Optimization) shows the optimal policy of the objective above implies the reward $r = \beta \log \frac{\pi_\theta}{\pi_{\text{ref}}} + \text{const}$, so you can skip the reward model and RL and train directly on preference pairs:
$$\mathcal{L}_{\text{DPO}} = -\log \sigma\Big(\beta\big[(\log \pi_\theta(y_w) - \log \pi_{\text{ref}}(y_w)) - (\log \pi_\theta(y_l) - \log \pi_{\text{ref}}(y_l))\big]\Big)$$
It is a simple classification-style loss: **offline**, stable, only two models, $\beta \approx 0.1$. Downsides: limited to the fixed preference dataset (no exploration of new samples), and it can lower the likelihood of *both* responses.

**Variants**: RLAIF (AI-generated preferences), GRPO and other RL with **verifiable rewards** (math, code) that drop the value model, KTO, IPO.

## Worked example
Sequence log-probs: chosen $y_w$: policy $-10$, reference $-12$ (log-ratio $+2$). Rejected $y_l$: policy $-15$, reference $-14$ (log-ratio $-1$). Margin $= 2 - (-1) = 3$. With $\beta = 0.1$: $z = 0.3$, so loss $= -\log\sigma(0.3) = \log(1 + e^{-0.3}) \approx 0.554$. At initialization (policy = reference) $z = 0$ and the loss is $\log 2 \approx 0.693$. Training raises the policy's relative likelihood of $y_w$ and lowers that of $y_l$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main practical advantage of DPO over PPO-based RLHF?",
  "options": [
    "It needs no preference data",
    "It trains directly on preference pairs with a classification-style loss, without a separate reward model or RL sampling loop",
    "It always yields a higher-quality model",
    "It removes the need for the reference model"
  ],
  "answer": 1,
  "explanation": "DPO reparameterizes the reward through the policy/reference log-ratio, so you optimize a stable supervised loss. It still needs the reference model."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the purpose of the KL term $\\beta\\,\\mathrm{KL}(\\pi_\\theta \\| \\pi_{\\text{ref}})$ in RLHF?",
  "options": [
    "To speed up sampling",
    "To keep the policy close to the SFT model, limiting reward hacking and loss of fluency",
    "To normalize rewards to zero mean",
    "To make the reward model more accurate"
  ],
  "answer": 1,
  "explanation": "The reward model is only reliable near the data it was trained on. Without the KL penalty the policy drifts into degenerate outputs that score high but are poor."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `bt_loss(r_chosen, r_rejected)` = $-\\log\\sigma(r_w - r_l)$, numerically stable for large negative margins. Then write `dpo_loss(logp_w, logp_l, ref_logp_w, ref_logp_l, beta=0.1)` for one preference pair (all inputs are sequence log-probabilities).",
  "starterCode": "import math\n\ndef bt_loss(r_chosen, r_rejected):\n    \"\"\"Bradley-Terry reward-model loss: -log sigmoid(r_chosen - r_rejected).\"\"\"\n    pass\n\ndef dpo_loss(logp_w, logp_l, ref_logp_w, ref_logp_l, beta=0.1):\n    \"\"\"DPO loss for one preference pair of sequence log-probs.\"\"\"\n    pass\n\nprint(dpo_loss(-10, -15, -12, -14, 0.1))",
  "tests": "assert abs(bt_loss(0.0, 0.0) - math.log(2)) < 1e-12\nassert abs(bt_loss(2.0, 0.0) - math.log(1 + math.exp(-2))) < 1e-12\nassert bt_loss(-800.0, 0.0) > 799 and not math.isinf(bt_loss(-800.0, 0.0))\nassert abs(dpo_loss(-10, -15, -12, -14, 0.1) - 0.5544) < 1e-4\nassert abs(dpo_loss(-12, -14, -12, -14) - math.log(2)) < 1e-12\nassert dpo_loss(-5, -20, -12, -14, 0.1) < dpo_loss(-10, -15, -12, -14, 0.1)",
  "solution": "import math\n\ndef bt_loss(r_chosen, r_rejected):\n    z = r_chosen - r_rejected\n    # -log(sigmoid(z)) = softplus(-z), computed stably\n    return math.log1p(math.exp(-z)) if z >= 0 else -z + math.log1p(math.exp(z))\n\ndef dpo_loss(logp_w, logp_l, ref_logp_w, ref_logp_l, beta=0.1):\n    margin = (logp_w - ref_logp_w) - (logp_l - ref_logp_l)\n    return bt_loss(beta * margin, 0.0)",
  "hints": [
    "$-\\log\\sigma(z) = \\log(1 + e^{-z})$; for $z < 0$ rewrite as $-z + \\log(1 + e^{z})$ to avoid overflow.",
    "DPO is the same loss applied to $z = \\beta \\cdot$ (chosen log-ratio minus rejected log-ratio)."
  ]
}
```

```reveal
{
  "prompt": "What is reward hacking in RLHF, and how do you mitigate it?",
  "answer": "**Reward hacking** (over-optimization): the policy exploits flaws in the learned reward model to get a high proxy reward while true quality drops. Typical symptoms: ever-longer answers, sycophancy, confident but wrong text, repetitive phrases the reward model likes.\n\n**Mitigations**:\n- **KL penalty** to the reference model (larger $\\beta$, or early stopping).\n- Larger / better reward models, **ensembles**, and uncertainty penalties.\n- Length normalization or explicit length penalties.\n- **Iterative collection**: re-label preferences on the current policy's outputs so the reward model sees the new distribution.\n- Use **verifiable rewards** (unit tests, math answers) where possible.\n- Monitor held-out human or gold-reward evaluations: proxy reward rising while gold reward falls is the signature of over-optimization."
}
```

> [!TIP] Interview tips
> - Be able to write the Bradley-Terry loss and the DPO loss, and explain the role of $\beta$ and the reference model.
> - Compare: PPO-RLHF is online and flexible but complex; DPO is simple and stable but offline.
> - Mention reward hacking, KL regularization, and that preference data quality (annotator agreement) caps results.
