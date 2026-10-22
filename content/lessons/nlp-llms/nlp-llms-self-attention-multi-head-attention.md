---
id: nlp-llms-self-attention-multi-head-attention
title: Self-attention, multi-head attention
estimatedMinutes: 14
difficulty: hard
tags: [nlp, transformers, attention]
---

## Why it matters
Self-attention is the core operation of every transformer. Interviewers ask you to write the formula, explain the $\sqrt{d_k}$ scaling, count the cost, and say what multiple heads add.

## Concept
Each token's vector $x_i$ is projected to a **query**, **key** and **value**: $Q = XW_Q$, $K = XW_K$, $V = XW_V$. Then
$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}} + M\right)V$$

- Row $i$ of $QK^\top$ scores how much token $i$ should read from every token $j$; softmax turns scores into weights that sum to 1; the output is a weighted average of the values.
- **Scaling**: if entries of $q, k$ have unit variance, $q \cdot k$ has variance $d_k$. Dividing by $\sqrt{d_k}$ keeps logits $O(1)$; otherwise softmax saturates and gradients vanish.
- **Mask $M$**: $-\infty$ above the diagonal gives **causal** attention (decoders); a padding mask hides pad tokens; encoders use no causal mask.
- **Multi-head**: split $d_{model}$ into $h$ heads of size $d_k = d_{model}/h$, run attention in each with its own $W_Q, W_K, W_V$, concatenate, and apply $W_O$. Heads can specialise (syntax, coreference, position) at the same total cost as one big head.
- **Self vs cross**: self-attention takes $Q, K, V$ from the same sequence; cross-attention takes $Q$ from the decoder and $K, V$ from the encoder.
- **Cost**: time $O(n^2 d)$ and attention-matrix memory $O(n^2)$ per head; this is why long contexts are expensive (FlashAttention fixes memory I/O, not the $n^2$ FLOPs).
- Attention is **permutation-equivariant**, so position information must be added (sinusoidal, learned, RoPE, ALiBi).

## Worked example
Two tokens, $d_k = 2$, $Q = K = I$, $V = \begin{pmatrix}1 & 2\\3 & 4\end{pmatrix}$.

Scores $QK^\top = I$, scaled by $1/\sqrt 2$: $\begin{pmatrix}0.707 & 0\\0 & 0.707\end{pmatrix}$. Row 0 softmax: $e^{0.707} = 2.028$, so weights $= (2.028, 1)/3.028 = (0.670, 0.330)$.

Output row 0 $= 0.670\,(1, 2) + 0.330\,(3, 4) = (1.660, 2.660)$. By symmetry row 1 $= (2.340, 3.340)$. With a causal mask, row 0 can only see itself and equals $(1, 2)$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why divide the attention logits by $\\sqrt{d_k}$?",
  "options": [
    "To make the matrix square",
    "To keep dot-product variance near 1 so softmax doesn't saturate and gradients survive",
    "To reduce memory",
    "To enforce causality"
  ],
  "answer": 1,
  "explanation": "Without scaling, $q \\cdot k$ has variance $d_k$; large logits make softmax nearly one-hot with vanishing gradients."
}
```

```quiz
{
  "id": "q2",
  "question": "Going from 1k to 4k tokens, how does the attention-matrix size per head change?",
  "options": [
    "4x larger",
    "8x larger",
    "16x larger",
    "Unchanged"
  ],
  "answer": 2,
  "explanation": "The matrix is $n \\times n$, so it grows quadratically: $4^2 = 16$."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "prompt": "With numpy, write `attention(Q, K, V, causal=False)` returning `(output, weights)` for a single head: scaled dot-product attention with a numerically stable row-wise softmax. If `causal` is true, token i must not attend to tokens j > i.",
  "starterCode": "import numpy as np\n\ndef attention(Q, K, V, causal=False):\n    pass\n\nQ = K = np.eye(2)\nV = np.array([[1.0, 2.0], [3.0, 4.0]])\nprint(attention(Q, K, V))",
  "tests": "Q = K = np.eye(2)\nV = np.array([[1.0, 2.0], [3.0, 4.0]])\nout, w = attention(Q, K, V)\ne = np.exp(1 / np.sqrt(2))\np = e / (e + 1)\nassert abs(w[0, 0] - p) < 1e-9 and abs(w[0, 1] - (1 - p)) < 1e-9\nassert np.allclose(w.sum(axis=1), 1)\nassert np.allclose(out[0], p * V[0] + (1 - p) * V[1])\nout, w = attention(Q, K, V, causal=True)\nassert np.allclose(out[0], V[0]) and w[0, 1] == 0\nassert np.allclose(out[1], p * V[1] + (1 - p) * V[0])\nrng = np.random.default_rng(0)\nA = rng.normal(size=(5, 4)) * 100\nout, w = attention(A, A, rng.normal(size=(5, 3)), causal=True)\nassert np.isfinite(out).all() and np.allclose(np.triu(w, 1), 0)",
  "solution": "import numpy as np\n\ndef attention(Q, K, V, causal=False):\n    d_k = Q.shape[-1]\n    scores = Q @ K.T / np.sqrt(d_k)\n    if causal:\n        n = scores.shape[0]\n        scores = np.where(np.triu(np.ones((n, n), dtype=bool), k=1), -np.inf, scores)\n    scores = scores - scores.max(axis=-1, keepdims=True)\n    w = np.exp(scores)\n    w = w / w.sum(axis=-1, keepdims=True)\n    return w @ V, w",
  "hints": [
    "scores = Q @ K.T / sqrt(d_k); subtract each row's max before exp for stability.",
    "Set scores above the diagonal (np.triu with k=1) to -inf before the softmax."
  ]
}
```

```reveal
{
  "prompt": "Interview: a transformer has $d_{model} = 512$ and 8 heads. What is $d_k$, and how many parameters do the attention projections ($W_Q, W_K, W_V, W_O$) have (ignore biases)? Does using 8 heads cost more than 1 head?",
  "answer": "$d_k = 512/8 = 64$. Each of $W_Q, W_K, W_V, W_O$ is $512 \\times 512$, so the layer has $4 \\times 512^2 = 1{,}048{,}576$ parameters, the same for 1 head or 8. Compute is also the same: 8 heads of size 64 do $8 \\times n^2 \\times 64 = n^2 \\times 512$ multiply-adds, equal to one 512-dim head. The only extra cost is the 8 separate $n \\times n$ attention matrices (more memory). Benefit: each head learns a different attention pattern."
}
```

> [!TIP] Interview tips
> - Write $\text{softmax}(QK^\top/\sqrt{d_k})V$ from memory and say why each piece is there (similarity, scale, weights, mixing).
> - Quote the cost: $O(n^2 d)$ time and $O(n^2)$ memory per head; mention FlashAttention, sparse and linear variants as mitigations.
> - Multi-head does not add compute versus one wide head; it adds representational diversity.

