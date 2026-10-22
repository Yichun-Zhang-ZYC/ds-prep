---
id: nlp-llms-mixture-of-experts
title: Mixture of Experts
estimatedMinutes: 13
difficulty: hard
tags: [nlp, llm, moe, routing, scaling, mixtral]
---

## Why it matters
Mixtral, DeepSeek-V3 and many frontier models are sparse Mixture-of-Experts: they hold far more parameters than they use per token. Interviewers ask how routing works, why load balancing matters, and why MoE saves compute but not memory (see Scaling laws and Inference serving for context).

## Concept
**Idea**: replace the dense feed-forward network (FFN) in a Transformer block with $E$ parallel FFN **experts** and a small **router**. Each token is sent to only its top-$k$ experts, so compute per token tracks **active** parameters while capacity tracks **total** parameters. Attention layers stay dense.

**Router**: logits $h = W_r x$; take the top-$k$ experts and weight their outputs by a softmax over the selected logits: $y = \sum_{i \in \text{top-}k} g_i\, \text{FFN}_i(x)$. Mixtral uses $E = 8$, $k = 2$; Switch Transformer uses $k = 1$; DeepSeekMoE uses many **fine-grained** experts (e.g. 64-256) plus a few always-on **shared experts** that hold common knowledge.

**Load balancing**: without help the router collapses onto a few favourite experts (rich-get-richer), wasting capacity.
- **Auxiliary loss** (Switch): $\mathcal{L}_{aux} = \alpha E \sum_{i=1}^{E} f_i P_i$, where $f_i$ is the fraction of tokens routed to expert $i$ and $P_i$ the mean router probability for it. It is minimised (value $\alpha$) when both are uniform $1/E$.
- **Capacity factor**: each expert processes at most $C = \text{cf} \cdot T/E$ tokens per batch; overflow tokens are dropped (they pass through the residual only). Dropless implementations avoid this.
- **Aux-loss-free balancing** (DeepSeek-V3): add a per-expert bias to routing scores, nudged up or down based on recent load, avoiding the gradient interference of an aux loss.
- Some systems add a **router z-loss** to keep logits small and training stable.

**Systems**: experts are sharded across GPUs (**expert parallelism**) with all-to-all communication to dispatch and combine tokens; this can dominate step time. At inference **all experts must sit in memory** even though only $k$ run per token, so MoE saves FLOPs and latency at large batch but not memory. At small batch, different tokens hit different experts, so many weights are read anyway.

**Trade-offs**: higher quality per training FLOP and per active parameter than dense; harder to train (instability, balancing), to fine-tune (overfit, router drift) and to serve (memory, communication).

## Worked example
Mixtral-8x7B-like numbers: $d = 4096$, FFN width 14336, SwiGLU (3 weight matrices), 32 layers, 8 experts, $k = 2$.

One expert FFN: $3 \times 4096 \times 14336 = 176.2$M parameters. All experts in all layers: $176.2\text{M} \times 8 \times 32 = 45.1$B. Attention, embeddings and routers add about 1.6B, for roughly **46.7B total**.

Per token only 2 of 8 experts run: $176.2\text{M} \times 2 \times 32 = 11.3$B, plus the 1.6B shared parts, about **12.9B active**. Compute is like a 13B dense model, but you still need memory for 46.7B (about 93 GB in fp16).

Balance loss for 4 tokens, $E = 2$, top-1 assignments $[0, 0, 0, 1]$ and mean router probabilities $P = [0.7, 0.3]$: $f = [0.75, 0.25]$ so $\mathcal{L} = 2(0.75 \cdot 0.7 + 0.25 \cdot 0.3) = 1.2$ (in units of $\alpha$). A perfectly balanced router gives 1.0.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A MoE with 46.7B total and 12.9B active parameters is deployed instead of a dense model of similar quality. What is the main serving cost?",
  "options": ["All experts must be resident, so you need memory for 46.7B parameters", "It uses more FLOPs per token than a 46.7B dense model", "It cannot use a KV cache", "It can only run on CPUs"],
  "answer": 0,
  "explanation": "Compute per token follows active parameters, but weight memory follows total parameters, and expert parallelism adds all-to-all communication."
}
```

```quiz
{
  "id": "q2",
  "question": "What typically goes wrong with an MoE router that has no load-balancing mechanism?",
  "options": ["It collapses onto a few experts while the rest are undertrained, wasting capacity", "Every expert learns the same function with zero gradient", "Router outputs no longer sum to 1", "Attention layers stop working"],
  "answer": 0,
  "explanation": "Experts that do slightly better early get more tokens, train more, and get even more tokens, a positive feedback loop. Aux losses, capacity factors or bias adjustment break it."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `top_k_route(logits, k)` returning `(expert_indices, weights)` sorted by logit descending, with weights a softmax over the selected logits; `load_balance_loss(probs, assign, E)` returning $E \\sum_i f_i P_i$ (`probs` is a list of per-token router probability lists, `assign` the top-1 expert of each token); and `moe_params(shared_b, expert_b, n_experts, top_k)` returning `(total, active)` in billions.",
  "starterCode": "import math\n\ndef top_k_route(logits, k):\n    pass\n\ndef load_balance_loss(probs, assign, E):\n    pass\n\ndef moe_params(shared_b, expert_b, n_experts, top_k):\n    pass\n\nprint(top_k_route([0.1, 2.0, 1.0, -1.0], 2))",
  "tests": "import math\nidx, w = top_k_route([0.1, 2.0, 1.0, -1.0], 2)\nassert idx == [1, 2]\ne1, e2 = math.exp(2.0), math.exp(1.0)\nassert abs(w[0] - e1 / (e1 + e2)) < 1e-12 and abs(w[1] - e2 / (e1 + e2)) < 1e-12\nassert abs(sum(w) - 1.0) < 1e-12\nidx, w = top_k_route([5.0, 5.0, 1.0], 1)\nassert idx == [0] and abs(w[0] - 1.0) < 1e-12\nprobs = [[0.8, 0.2], [0.7, 0.3], [0.7, 0.3], [0.6, 0.4]]\nassert abs(load_balance_loss(probs, [0, 0, 0, 1], 2) - 1.2) < 1e-12\nassert abs(load_balance_loss([[0.5, 0.5], [0.5, 0.5]], [0, 1], 2) - 1.0) < 1e-12\nassert abs(load_balance_loss([[1.0, 0.0]] * 4, [0, 0, 0, 0], 2) - 2.0) < 1e-12\ntot, act = moe_params(1.6, 5.637, 8, 2)\nassert abs(tot - 46.696) < 1e-9 and abs(act - 12.874) < 1e-9\ntot, act = moe_params(2.0, 0.5, 64, 4)\nassert abs(tot - 34.0) < 1e-9 and abs(act - 4.0) < 1e-9",
  "solution": "import math\n\ndef top_k_route(logits, k):\n    idx = sorted(range(len(logits)), key=lambda i: -logits[i])[:k]\n    m = max(logits[i] for i in idx)\n    ex = [math.exp(logits[i] - m) for i in idx]\n    z = sum(ex)\n    return idx, [e / z for e in ex]\n\ndef load_balance_loss(probs, assign, E):\n    T = len(assign)\n    total = 0.0\n    for i in range(E):\n        f = assign.count(i) / T\n        P = sum(p[i] for p in probs) / T\n        total += f * P\n    return E * total\n\ndef moe_params(shared_b, expert_b, n_experts, top_k):\n    return shared_b + n_experts * expert_b, shared_b + top_k * expert_b",
  "hints": ["sorted(range(n), key=lambda i: -logits[i]) is stable, so ties keep the lower index first.", "f_i is a hard count fraction from assign; P_i is the mean of the soft probabilities.", "total = shared + n_experts * expert; active = shared + top_k * expert."]
}
```

> [!TIP] Interview tips
> - Separate total from active parameters: FLOPs and latency follow active, memory follows total.
> - Cover balancing: aux loss $\alpha E \sum f_i P_i$, capacity factor and token dropping, DeepSeek aux-loss-free bias, shared experts.
> - Mention systems costs: all-to-all for expert parallelism, and fine-tuning and small-batch serving difficulties.
