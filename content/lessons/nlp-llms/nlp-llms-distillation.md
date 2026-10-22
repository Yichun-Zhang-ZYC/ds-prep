---
id: nlp-llms-distillation
title: Distillation
estimatedMinutes: 10
difficulty: medium
tags: [nlp, llm, efficiency, distillation, knowledge-distillation]
---

## Why it matters
Distillation turns a large, expensive model into a small, fast one that keeps most of the quality. It is behind DistilBERT, many small chat models and reasoning-model "distills". Interviewers ask about the loss, temperature and how it differs from quantization.

## Concept
**Knowledge distillation**: train a **student** to imitate a **teacher**. The teacher's output distribution carries "dark knowledge", such as which wrong classes are similar to the right one, that one-hot labels lack.

**Classic loss** (Hinton et al.), with temperature $T$ softening both distributions:

$$\mathcal{L} = \lambda\, T^2\, \mathrm{KL}\big(p^{t}_T \,\|\, p^{s}_T\big) + (1-\lambda)\, \mathrm{CE}(y, p^{s}_1), \qquad p_T = \mathrm{softmax}(z/T)$$

- Higher $T$ flattens the distribution and exposes the relative probabilities of wrong classes.
- Soft-target gradients scale like $1/T^2$, so multiply by $T^2$ to keep the balance with the hard-label term.
- Inference uses $T = 1$.

**For LLMs**:
- **Sequence-level / data distillation**: sample text from the teacher and run ordinary SFT on it (Alpaca-style, reasoning-trace "distills"). Works through an API, needs no logits.
- **Logit-level (token-wise)**: minimise KL between teacher and student next-token distributions on the same text. Needs teacher logits and a shared tokenizer; richer signal per token.
- **Forward vs reverse KL**: forward KL (above) makes the student cover all teacher modes; reverse KL is mode-seeking; **on-policy** distillation scores the student's own samples with the teacher to reduce train/inference mismatch.
- Other targets: intermediate hidden states or attention maps (TinyBERT).

**Versus other compression**: quantization keeps the architecture and shrinks bits; pruning removes weights; distillation trains a *new, smaller architecture*. They stack. The student rarely beats the teacher on the teacher's own tasks, and teacher licence terms may forbid using outputs for training.

## Worked example
Teacher logits $[2, 1, 0]$. At $T=1$: $e^2, e^1, e^0 = 7.389, 2.718, 1$, sum 11.107, so $p = [0.665, 0.245, 0.090]$. At $T=2$: logits become $[1, 0.5, 0]$, exponentials $2.718, 1.649, 1$, sum 5.367, so $p = [0.507, 0.307, 0.186]$.

The student now sees that class 2 is about 1.6 times as likely as class 3, which the hard label (class 1) never says. A student with uniform logits has KL at $T=2$ of $\sum p_i \log(p_i \cdot 3) \approx 0.08$ (about $0.507\ln 1.52 + 0.307\ln 0.92 + 0.186\ln 0.56$), scaled by $T^2 = 4$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is the soft-target KL term multiplied by T^2?",
  "options": [
    "Gradients of the softened term shrink roughly as 1/T^2, so the factor keeps it comparable to the hard-label loss",
    "To make KL symmetric",
    "To convert logits to probabilities",
    "To lower the temperature at inference"
  ],
  "answer": 0,
  "explanation": "Dividing logits by T scales the gradient of the soft term by about 1/T^2. Multiplying by T^2 keeps the soft and hard terms balanced as T changes."
}
```

```quiz
{
  "id": "q2",
  "question": "You can only call the teacher through an API that returns text. Which distillation is available?",
  "options": [
    "Token-wise logit KL on the full vocabulary",
    "Sequence-level distillation: SFT the student on teacher-generated text",
    "Matching hidden states",
    "Attention-map matching"
  ],
  "answer": 1,
  "explanation": "Without logits or hidden states you can still sample teacher outputs and fine-tune the student on them (and check the provider's terms of use)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `softmax_t(logits, T)` (numerically stable softmax of logits / T), `kl_div(p, q)` = $\\sum p_i \\log(p_i/q_i)$ (skip terms with $p_i = 0$), and `distill_loss(teacher_logits, student_logits, T)` = $T^2 \\cdot \\mathrm{KL}(p^t_T \\| p^s_T)$.",
  "starterCode": "import math\n\ndef softmax_t(logits, T):\n    pass\n\ndef kl_div(p, q):\n    pass\n\ndef distill_loss(teacher_logits, student_logits, T):\n    # T^2 * KL(teacher_T || student_T)\n    pass\n\nprint(softmax_t([2, 1, 0], 2))",
  "tests": "p = softmax_t([2.0, 1.0, 0.0], 1)\nassert abs(sum(p) - 1) < 1e-12\nassert abs(p[0] - 0.6652) < 1e-4 and abs(p[1] - 0.2447) < 1e-4 and abs(p[2] - 0.0900) < 1e-4\np2 = softmax_t([2.0, 1.0, 0.0], 2)\nassert abs(p2[0] - 0.5065) < 1e-4 and abs(p2[1] - 0.3072) < 1e-4 and abs(p2[2] - 0.1863) < 1e-4\nassert abs(softmax_t([1000.0, 1000.0], 1)[0] - 0.5) < 1e-12\nassert abs(kl_div([0.5, 0.5], [0.5, 0.5])) < 1e-12\nassert abs(kl_div([0.9, 0.1], [0.5, 0.5]) - (0.9 * math.log(1.8) + 0.1 * math.log(0.2))) < 1e-12\nassert abs(distill_loss([2.0, 1.0, 0.0], [2.0, 1.0, 0.0], 3)) < 1e-12\nt = [2.0, 1.0, 0.0]\ns = [0.0, 0.0, 0.0]\nexpected = 4 * kl_div(softmax_t(t, 2), [1 / 3] * 3)\nassert abs(distill_loss(t, s, 2) - expected) < 1e-12\nassert distill_loss(t, s, 2) > 0",
  "solution": "import math\n\ndef softmax_t(logits, T):\n    z = [v / T for v in logits]\n    m = max(z)\n    e = [math.exp(v - m) for v in z]\n    s = sum(e)\n    return [v / s for v in e]\n\ndef kl_div(p, q):\n    return sum(a * math.log(a / b) for a, b in zip(p, q) if a > 0)\n\ndef distill_loss(teacher_logits, student_logits, T):\n    return T * T * kl_div(softmax_t(teacher_logits, T), softmax_t(student_logits, T))",
  "hints": [
    "Subtract the max of the scaled logits before exponentiating.",
    "Both distributions use the same temperature T; the loss is zero when the logits are identical."
  ]
}
```

> [!TIP] Interview tips
> - Write the loss: soft-target KL at temperature $T$ with a $T^2$ factor, plus hard-label CE.
> - Distinguish sequence-level (SFT on teacher outputs) from logit-level distillation.
> - Position it against quantization and pruning, and note that they can be combined.
