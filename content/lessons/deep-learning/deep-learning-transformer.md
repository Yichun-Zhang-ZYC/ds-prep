---
id: deep-learning-transformer
title: "Transformer (encoder, decoder, positional encoding)"
estimatedMinutes: 12
difficulty: medium
tags: [deep-learning, transformer, positional-encoding, layer-norm]
---

## Why it matters
The Transformer is the backbone of modern NLP, vision and generative models. Interviewers ask you to sketch the full architecture, explain why position information must be injected, and justify design choices such as residuals, LayerNorm placement and the FFN.

## Concept
**Encoder block** (repeated $N$ times): multi-head self-attention → add & norm → position-wise FFN → add & norm. **Decoder block**: *masked* self-attention (causal) → cross-attention over encoder outputs (queries from decoder, keys/values from encoder) → FFN, each wrapped with residual + norm. Encoder-only (BERT) drops the decoder; decoder-only (GPT) drops the encoder and cross-attention.

**Positional encoding.** Self-attention is permutation-equivariant, so token order must be injected. Original sinusoidal version, added to the embeddings:

$$PE_{(pos,2i)} = \sin\!\big(pos / 10000^{2i/d}\big),\quad PE_{(pos,2i+1)} = \cos\!\big(pos / 10000^{2i/d}\big)$$

Each pair of dimensions is a sinusoid with a different wavelength, and $PE_{pos+k}$ is a linear function of $PE_{pos}$, so relative offsets are easy to learn. Alternatives: learned absolute embeddings, relative biases, RoPE (rotates $q,k$) and ALiBi (linear distance penalty); the last two extrapolate better to long contexts.

**Residuals + normalization.** $y = x + \text{Sublayer}(x)$ gives gradients a direct path through depth. **Post-LN** (original): $\text{LN}(x + F(x))$. **Pre-LN** (most modern models): $x + F(\text{LN}(x))$, which trains stably without long warm-up. LayerNorm normalizes over features per token, so it does not depend on batch size or sequence padding (unlike BatchNorm).

**FFN.** $\text{FFN}(x) = W_2\,\phi(W_1 x + b_1) + b_2$ applied independently to each position, with hidden size usually $4d$ (GELU or SwiGLU). It holds about two thirds of the parameters per block and supplies the nonlinearity; attention only mixes tokens, the FFN transforms each one.

**Cost.** Attention is $O(n^2 d)$ time and $O(n^2)$ memory in sequence length $n$; the FFN is $O(n d^2)$. Scaling $QK^\top$ by $1/\sqrt{d_k}$ keeps softmax out of saturation.

## Worked example
Sinusoidal PE with $d = 4$ at position $pos = 1$. Pair $i=0$ has frequency $1/10000^0 = 1$; pair $i=1$ has frequency $1/10000^{2/4} = 1/100$.

$PE_1 = [\sin 1,\ \cos 1,\ \sin 0.01,\ \cos 0.01] \approx [0.8415,\ 0.5403,\ 0.0100,\ 1.0000]$

Fast dimensions distinguish neighboring positions; slow ones encode coarse location. Parameter count for one block with $d = 512$: attention $4d^2 \approx 1.05$M, FFN $2 \cdot d \cdot 4d \approx 4.19$M.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does a Transformer need positional encoding?",
  "options": ["To normalize activations", "Self-attention is permutation-equivariant and has no notion of order", "To reduce the O(n^2) cost", "To let the FFN see neighboring tokens"],
  "answer": 1,
  "explanation": "Without it, shuffling the input tokens just shuffles the outputs; order information must be added explicitly."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main practical advantage of Pre-LN over Post-LN?",
  "options": ["Fewer parameters", "Lower attention cost", "More stable gradients, so deep stacks train with less warm-up", "It makes the model bidirectional"],
  "answer": 2,
  "explanation": "In Pre-LN the residual path is an identity from input to output, so gradients flow unimpeded."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "With numpy implement `positional_encoding(n_pos, d)` (sinusoidal, shape n_pos x d, even d; sin on even dims, cos on odd dims), `layer_norm(x, eps=1e-5)` (normalize over the last axis, no learned gain/bias) and `pre_ln_block(x, sublayer)` returning `x + sublayer(layer_norm(x))`.",
  "setup": "import numpy as np",
  "packages": ["numpy"],
  "starterCode": "import numpy as np\n\ndef positional_encoding(n_pos, d):\n    pass\n\ndef layer_norm(x, eps=1e-5):\n    pass\n\ndef pre_ln_block(x, sublayer):\n    pass\n\nprint(positional_encoding(3, 4).round(4))",
  "tests": "pe = positional_encoding(3, 4)\nassert pe.shape == (3, 4)\nassert np.allclose(pe[0], [0, 1, 0, 1])\nassert np.allclose(pe[1], [np.sin(1), np.cos(1), np.sin(0.01), np.cos(0.01)])\nx = np.array([[1.0, 2.0, 3.0], [10.0, 10.0, 40.0]])\nz = layer_norm(x)\nassert np.allclose(z.mean(axis=-1), 0, atol=1e-9)\nassert np.allclose(z[0], [-1.2247, 0, 1.2247], atol=1e-3)\nout = pre_ln_block(x, lambda h: 2 * h)\nassert np.allclose(out, x + 2 * layer_norm(x))",
  "solution": "import numpy as np\n\ndef positional_encoding(n_pos, d):\n    pos = np.arange(n_pos)[:, None]\n    i = np.arange(d // 2)[None, :]\n    angle = pos / (10000.0 ** (2 * i / d))\n    pe = np.zeros((n_pos, d))\n    pe[:, 0::2] = np.sin(angle)\n    pe[:, 1::2] = np.cos(angle)\n    return pe\n\ndef layer_norm(x, eps=1e-5):\n    mu = x.mean(axis=-1, keepdims=True)\n    var = x.var(axis=-1, keepdims=True)\n    return (x - mu) / np.sqrt(var + eps)\n\ndef pre_ln_block(x, sublayer):\n    return x + sublayer(layer_norm(x))",
  "hints": ["angle = pos / 10000^(2i/d) where i indexes pairs of dimensions.", "Use keepdims=True so broadcasting works over the last axis; var is the population variance (ddof=0)."]
}
```

> [!TIP] Interview tips
> - Draw encoder and decoder blocks, and name the three attention types: encoder self, masked decoder self, cross-attention.
> - Explain why order must be injected, and mention RoPE as the modern default.
> - Know Pre-LN vs Post-LN, why LayerNorm (not BatchNorm), and that attention costs $O(n^2)$ in length.
