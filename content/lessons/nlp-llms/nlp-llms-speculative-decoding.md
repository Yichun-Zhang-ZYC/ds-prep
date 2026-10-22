---
id: nlp-llms-speculative-decoding
title: Speculative decoding
estimatedMinutes: 12
difficulty: hard
tags: [nlp, llm, inference, speculative-decoding, latency, sampling]
---

## Why it matters
Autoregressive decoding is memory-bound: each token needs a full pass over the weights while the GPU's compute sits idle. Speculative decoding turns that slack into lower latency without changing the output distribution. It is a favourite "can you reason about speedups" question (see Inference serving and Decoding strategies for the background).

## Concept
**Idea**: a cheap **draft** model $q$ proposes $\gamma$ tokens; the large **target** model $p$ scores all of them in **one parallel forward pass** (like a short prefill) and keeps the longest prefix it agrees with. Verifying $\gamma$ tokens costs about as much as generating one, because decode is memory-bound.

**Exact acceptance rule** (Leviathan et al.; Chen et al.) for each drafted token $x \sim q$:
- Accept with probability $\min\!\big(1, p(x)/q(x)\big)$.
- On the first rejection, discard the rest and sample a replacement from the **residual** $p'(x) \propto \max(0, p(x) - q(x))$.
- If all $\gamma$ are accepted, sample one **bonus** token from $p$ at the next position.
The output distribution is **exactly** $p$, not an approximation: $q(x)\min(1, p/q) + P(\text{reject})\,p'(x) = p(x)$. With greedy decoding this reduces to "accept while the draft token equals the target's argmax".

**Speed model**: let $\alpha$ be the per-token acceptance probability (assumed i.i.d.) and $c$ the draft/target cost ratio per step.
- Expected tokens per target pass: $\dfrac{1 - \alpha^{\gamma+1}}{1 - \alpha}$ (always at least 1).
- Time per iteration $\propto 1 + \gamma c$, so speedup $= \dfrac{1-\alpha^{\gamma+1}}{(1-\alpha)(1+\gamma c)}$.
- Larger $\gamma$ helps only while $\alpha$ stays high; there is an optimum, typically 3-8.

**Draft sources**:
- A smaller model of the same family (needs a shared tokenizer).
- **Self-speculation**: extra heads on the target (**Medusa**), feature-level drafting (**EAGLE**), early-exit or layer-skipping drafts.
- **Prompt-lookup / n-gram** drafting: copy continuations from the prompt, very effective for summarisation, code editing and RAG where outputs echo the input.

**When it helps / pitfalls**: best at small batch sizes, where decoding is memory-bound. At large batch the GPU is already compute-bound, so extra verification FLOPs can erase the gain. Acceptance drops at high temperature or on creative text, the draft model needs memory and its own KV cache, and gains depend on the draft matching the *target's* behaviour (a fine-tuned target needs a re-aligned draft).

## Worked example
Acceptance with $p = (0.5, 0.3, 0.2)$ and $q = (0.2, 0.5, 0.3)$ over three tokens.
- Draft token 0: $p/q = 2.5$, accepted with probability 1. Token 1: $p/q = 0.6$, accepted with probability 0.6. Token 2: $p/q = 0.67$.
- Total accept mass $\sum \min(p, q) = 0.2 + 0.3 + 0.2 = 0.7$, so rejection probability 0.3.
- Residual $\max(0, p - q) = (0.3, 0, 0)$, normalised to $(1, 0, 0)$.
- Output probability of token 0: $0.2 + 0.3 \cdot 1 = 0.5 = p(0)$. Token 1: $0.3$. Token 2: $0.2$. The target distribution is recovered exactly.

Speedup with $\alpha = 0.8$, $\gamma = 4$, $c = 0.05$ (draft is 5% of the target's per-step cost): expected tokens $= (1 - 0.8^5)/0.2 = 3.36$; iteration cost $1 + 4 \cdot 0.05 = 1.2$; speedup $\approx 3.36/1.2 = 2.8\times$. With $\alpha = 0.5$ the same setup gives $1.94/1.2 = 1.6\times$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How does speculative decoding change the output distribution compared with sampling directly from the target?",
  "options": ["It does not: the accept/reject rule with residual resampling recovers exactly the target distribution", "It moves it closer to the draft model's distribution", "It makes outputs greedy", "It is exact only at temperature 0, approximate otherwise"],
  "answer": 0,
  "explanation": "Accepting with probability $\\min(1, p/q)$ and resampling from the normalised $\\max(0, p-q)$ reproduces $p$ exactly, so it is a lossless speedup."
}
```

```quiz
{
  "id": "q2",
  "question": "Why do the gains of speculative decoding shrink at very large batch sizes?",
  "options": ["Decoding is already compute-bound, so the extra FLOPs for verifying several draft tokens are no longer free", "The draft model cannot handle large batches", "The acceptance rate is always 0 at large batch", "The KV cache cannot be used with batching"],
  "answer": 0,
  "explanation": "The benefit comes from idle compute during memory-bound decoding. When the batch saturates compute, extra verification work slows overall throughput."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `expected_tokens(alpha, gamma)` (equal to `gamma + 1` when `alpha == 1`), `speedup(alpha, gamma, c)`, `residual_dist(p, q)` (normalised $\\max(0, p - q)$), and `output_dist(p, q)`, the exact distribution of one drafted token after the accept/reject-and-resample step. It should equal `p`.",
  "starterCode": "def expected_tokens(alpha, gamma):\n    pass\n\ndef speedup(alpha, gamma, c):\n    pass\n\ndef residual_dist(p, q):\n    pass\n\ndef output_dist(p, q):\n    pass\n\nprint(expected_tokens(0.8, 4))",
  "tests": "assert abs(expected_tokens(0.8, 4) - 3.3616) < 1e-9\nassert abs(expected_tokens(1.0, 4) - 5) < 1e-12\nassert abs(expected_tokens(0.0, 4) - 1) < 1e-12\nassert abs(speedup(0.8, 4, 0.05) - 3.3616 / 1.2) < 1e-9\nassert speedup(0.5, 4, 0.05) < speedup(0.8, 4, 0.05)\np = [0.5, 0.3, 0.2]\nq = [0.2, 0.5, 0.3]\nr = residual_dist(p, q)\nassert all(abs(a - b) < 1e-12 for a, b in zip(r, [1.0, 0.0, 0.0]))\nout = output_dist(p, q)\nassert all(abs(a - b) < 1e-12 for a, b in zip(out, p))\np2 = [0.1, 0.2, 0.3, 0.4]\nq2 = [0.4, 0.3, 0.2, 0.1]\nout2 = output_dist(p2, q2)\nassert all(abs(a - b) < 1e-12 for a, b in zip(out2, p2))\nassert all(abs(a - b) < 1e-12 for a, b in zip(output_dist(p, p), p))",
  "solution": "def expected_tokens(alpha, gamma):\n    if alpha == 1.0:\n        return gamma + 1\n    return (1 - alpha ** (gamma + 1)) / (1 - alpha)\n\ndef speedup(alpha, gamma, c):\n    return expected_tokens(alpha, gamma) / (1 + gamma * c)\n\ndef residual_dist(p, q):\n    r = [max(0.0, a - b) for a, b in zip(p, q)]\n    z = sum(r)\n    return [x / z for x in r] if z > 0 else list(p)\n\ndef output_dist(p, q):\n    accept = [min(a, b) for a, b in zip(p, q)]\n    reject = 1 - sum(accept)\n    res = residual_dist(p, q)\n    return [a + reject * r for a, r in zip(accept, res)]",
  "hints": ["Closed form: (1 - alpha**(gamma+1)) / (1 - alpha), but alpha = 1 needs its own branch.", "P(propose x and accept) = q(x) * min(1, p(x)/q(x)) = min(q(x), p(x)).", "If p equals q the residual is all zeros; the rejection probability is then 0, so any fallback works."]
}
```

> [!TIP] Interview tips
> - Start with why it works: decode is memory-bound, so verifying $\gamma$ tokens costs about the same as generating one.
> - State the accept rule $\min(1, p/q)$, residual resampling and bonus token, and stress that the distribution is exact.
> - Estimate speedup with $\frac{1-\alpha^{\gamma+1}}{1-\alpha}$ and discuss how $\alpha$, $c$ and batch size change it.
