---
id: nlp-llms-decoding-greedy-beam-search-temperature-top-k-top-p
title: "Decoding: greedy, beam search, temperature, top-k, top-p"
estimatedMinutes: 12
difficulty: medium
tags: [nlp, llm, decoding, sampling, temperature, beam-search]
---

## Why it matters
The same model can sound deterministic or creative depending on decoding. Interviewers expect you to explain temperature, top-k and top-p precisely, choose settings for a task, and know when beam search helps.

## Concept
The model outputs logits $z$ over the vocabulary; a **decoding strategy** picks the next token.

- **Greedy**: always take $\arg\max$. Fast and deterministic, but can be repetitive and misses sequences whose early tokens are not individually the most likely.
- **Beam search**: keep the $B$ highest-scoring partial sequences (score = sum of log-probs, usually **length-normalized**). Good for translation, summarization and ASR, where there is one right answer; for open-ended text it yields bland, repetitive output.
- **Sampling**: draw from the distribution, optionally reshaped:
  - **Temperature**: $p_i = \dfrac{e^{z_i / T}}{\sum_j e^{z_j / T}}$. $T < 1$ sharpens (→ greedy as $T \to 0$), $T > 1$ flattens (more random), $T = 1$ is the raw model.
  - **Top-k**: keep only the $k$ most likely tokens, renormalize.
  - **Top-p (nucleus)**: keep the **smallest** set of top tokens whose cumulative probability is $\ge p$, renormalize. The candidate set **adapts**: 1 token when the model is confident, many when it is uncertain, unlike fixed $k$.
  - Also: min-p, repetition / frequency penalties.

Typical order: temperature → top-k / top-p filter → renormalize → sample. Low $T$ (0-0.3) for code, extraction and QA; higher ($0.7$-$1.0$) for brainstorming and creative writing. Even $T = 0$ is not bit-exactly reproducible on GPUs (non-deterministic floating-point reductions, batching).

## Worked example
Logits $[2, 1, 0]$. At $T = 1$: $e^2, e^1, e^0 = 7.389, 2.718, 1$, sum $11.107$, so $p = [0.665, 0.245, 0.090]$. At $T = 0.5$ the logits become $[4, 2, 0]$: $[54.60, 7.39, 1]/62.99 = [0.867, 0.117, 0.016]$, sharper.

Probabilities $[0.5, 0.3, 0.15, 0.05]$:
- **Top-k = 2**: keep $0.5, 0.3$, renormalize by $0.8$: $[0.625, 0.375]$.
- **Top-p = 0.9**: cumulative $0.5, 0.8, 0.95$. The third token crosses 0.9, so keep three tokens; renormalize by $0.95$: $[0.526, 0.316, 0.158]$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What happens to the output distribution as temperature $T \\to 0$?",
  "options": [
    "It becomes uniform",
    "It collapses onto the highest-logit token (greedy)",
    "It is unchanged",
    "The logits are clipped to [0, 1]"
  ],
  "answer": 1,
  "explanation": "Dividing logits by a tiny $T$ makes the largest logit dominate the softmax; $T \\to \\infty$ gives the uniform distribution."
}
```

```quiz
{
  "id": "q2",
  "question": "Why is top-p often preferred over a fixed top-k?",
  "options": [
    "It is faster to compute",
    "The candidate set size adapts: few tokens when the model is confident, more when it is uncertain",
    "It guarantees deterministic outputs",
    "It removes the need for temperature"
  ],
  "answer": 1,
  "explanation": "With fixed k, a confident step may still admit k-1 junk tokens and an uncertain step may cut off good ones. Top-p keeps probability mass instead of a count."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `softmax_t(logits, T)` (numerically stable softmax with temperature) and `filter_probs(probs, top_k=None, top_p=None)`, which keeps the top-k tokens and/or the smallest set of top tokens whose cumulative probability reaches `top_p`, zeroes the rest, and renormalizes. When both are given, apply both limits.",
  "starterCode": "import math\n\ndef softmax_t(logits, T=1.0):\n    pass\n\ndef filter_probs(probs, top_k=None, top_p=None):\n    \"\"\"Zero out tokens outside the top-k and/or nucleus (top-p) set, then renormalize.\n    Return a list the same length as probs.\"\"\"\n    pass\n\nprint(softmax_t([2, 1, 0], 0.5), filter_probs([0.5, 0.3, 0.15, 0.05], top_p=0.9))",
  "tests": "p = softmax_t([2, 1, 0], 1.0)\nassert all(abs(a - b) < 1e-3 for a, b in zip(p, [0.665, 0.245, 0.090]))\np = softmax_t([2, 1, 0], 0.5)\nassert all(abs(a - b) < 1e-3 for a, b in zip(p, [0.867, 0.117, 0.016]))\nassert abs(sum(softmax_t([1000, 999], 1.0)) - 1) < 1e-12\nbase = [0.5, 0.3, 0.15, 0.05]\ndef close(a, b):\n    return len(a) == len(b) and all(abs(x - y) < 1e-9 for x, y in zip(a, b))\nassert close(filter_probs(base, top_k=2), [0.625, 0.375, 0, 0])\nassert close(filter_probs(base, top_p=0.9), [0.5 / 0.95, 0.3 / 0.95, 0.15 / 0.95, 0])\nassert close(filter_probs(base, top_p=0.8), [0.625, 0.375, 0, 0])\nassert close(filter_probs(base, top_p=0.1), [1, 0, 0, 0])\nassert close(filter_probs([0.05, 0.5, 0.15, 0.3], top_k=2, top_p=0.9), [0, 0.625, 0, 0.375])\nassert close(filter_probs(base), base)",
  "solution": "import math\n\ndef softmax_t(logits, T=1.0):\n    m = max(logits)\n    exps = [math.exp((z - m) / T) for z in logits]\n    s = sum(exps)\n    return [e / s for e in exps]\n\ndef filter_probs(probs, top_k=None, top_p=None):\n    order = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    keep = []\n    cum = 0.0\n    for i in order:\n        if top_k is not None and len(keep) >= top_k:\n            break\n        if top_p is not None and keep and cum >= top_p - 1e-12:\n            break\n        keep.append(i)\n        cum += probs[i]\n    total = sum(probs[i] for i in keep)\n    out = [0.0] * len(probs)\n    for i in keep:\n        out[i] = probs[i] / total\n    return out",
  "hints": [
    "Subtract the max logit before exponentiating.",
    "Sort token indices by probability descending and add tokens until adding another would exceed top_k or the cumulative probability already reached top_p."
  ]
}
```

> [!TIP] Interview tips
> - Give the temperature formula and its limits ($T \to 0$ greedy, $T \to \infty$ uniform).
> - Explain top-p adapts to model confidence while top-k does not; they are often combined.
> - Pick by task: beam search / low $T$ for deterministic tasks, sampling for open-ended generation.
