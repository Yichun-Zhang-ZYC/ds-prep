---
id: deep-learning-attention-mechanism
title: Attention mechanism
estimatedMinutes: 12
difficulty: medium
tags: [deep-learning, attention, sequence-models]
---

## Why it matters
Attention began as a fix for the seq2seq bottleneck and became the core of modern models. Interviewers ask where it came from, how additive and dot-product scoring differ, and what cross-attention is. (For the transformer's self-attention and multi-head details see the NLP lesson.)

## Concept
**Motivation**: an encoder-decoder RNN compresses the whole source sentence into one fixed vector, which becomes a bottleneck for long inputs. **Attention** (Bahdanau et al., 2014) lets the decoder look back at *all* encoder states and pick the relevant ones at every output step.

**General recipe** with a **query** $q$ (decoder state), **keys** $k_j$ and **values** $v_j$ (encoder states):
1. **Score** each position: $e_j = \text{score}(q, k_j)$.
2. **Normalize**: $\alpha = \text{softmax}(e)$, giving weights that sum to 1 (a soft alignment).
3. **Aggregate**: context $c = \sum_j \alpha_j v_j$, a weighted average fed to the decoder.

**Scoring functions**:
- **Additive** (Bahdanau): $e_j = v^\top \tanh(W_q q + W_k k_j)$, a small MLP. Works when query and key dimensions differ.
- **Multiplicative / dot** (Luong): $e_j = q^\top k_j$; "general": $q^\top W k_j$. Faster, matmul-friendly.
- **Scaled dot-product** (transformer): $q^\top k_j/\sqrt{d_k}$, since dot products grow with dimension and saturate the softmax.

**Properties and uses**:
- Everything is differentiable (**soft attention**), so it trains end to end. *Hard* attention samples one position and needs REINFORCE-style training.
- A **mask** (set masked scores to $-\infty$) handles padding and, for decoders, hides future tokens.
- **Cross-attention**: queries from one sequence, keys/values from another (decoder to encoder, text to image regions in captioning). **Self-attention**: all three from the same sequence.
- Cost is $O(nm)$ for $n$ queries and $m$ keys; the weights are interpretable-ish but not proof of the model's reasoning.
- It shortens gradient paths between positions to one step, which is why it handles long-range dependencies better than RNNs.

## Worked example
Query $q = (1, 0)$, keys $k_1 = (1,0),\ k_2 = (0,1),\ k_3 = (1,1)$, values $v_1 = (1,0),\ v_2 = (0,1),\ v_3 = (2,2)$.

Dot scores: $e = (1, 0, 1)$. Softmax: $e^1 = 2.718$, $e^0 = 1$; sum $= 6.437$, so $\alpha = (0.422, 0.155, 0.422)$.

Context $= 0.422\,(1,0) + 0.155\,(0,1) + 0.422\,(2,2) = (0.422 + 0.845,\ 0.155 + 0.845) = (1.267,\ 1.000)$.

Masking position 3 sets its score to $-\infty$: $\alpha = (2.718, 1)/3.718 = (0.731, 0.269, 0)$ and the context becomes $(0.731, 0.269)$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What problem motivated the original attention mechanism in neural machine translation?",
  "options": [
    "Vanishing gradients in the output softmax",
    "Compressing a whole source sentence into one fixed-size vector is a bottleneck",
    "Too many parameters in the embedding layer",
    "RNNs cannot be run on GPUs"
  ],
  "answer": 1,
  "explanation": "Attention lets the decoder access every encoder state, weighted by relevance, instead of one summary vector."
}
```

```quiz
{
  "id": "q2",
  "question": "In cross-attention for an encoder-decoder model, where do the queries, keys and values come from?",
  "options": [
    "All from the decoder",
    "All from the encoder",
    "Queries from the encoder, keys and values from the decoder",
    "Queries from the decoder, keys and values from the encoder"
  ],
  "answer": 3,
  "explanation": "The decoder asks questions (queries) about the source, and the encoder outputs supply the keys to match against and the values to read."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `attention(q, K, V, scale=False, mask=None)` for one query vector `q` (d,), keys `K` (m, d) and values `V` (m, dv). Scores are `K @ q` (divided by `sqrt(d)` if `scale`). If `mask` (boolean, length m) is given, positions where it is False get score -1e9. Return `(weights, context)` using a numerically stable softmax. Also write `additive_scores(s, H, Ws, Wh, v)` = `tanh(H @ Wh.T + Ws @ s) @ v` for states `H` (m, dh).",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef attention(q, K, V, scale=False, mask=None):\n    pass\n\ndef additive_scores(s, H, Ws, Wh, v):\n    pass\n\nq = np.array([1.0, 0.0])\nK = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])\nV = np.array([[1.0, 0.0], [0.0, 1.0], [2.0, 2.0]])\nprint(attention(q, K, V))",
  "tests": "q = np.array([1.0, 0.0])\nK = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])\nV = np.array([[1.0, 0.0], [0.0, 1.0], [2.0, 2.0]])\nw, ctx = attention(q, K, V)\ne = np.exp([1.0, 0.0, 1.0])\nassert np.allclose(w, e / e.sum())\nassert np.allclose(ctx, [1.26696, 1.0], atol=1e-4)\nw2, _ = attention(q, K, V, scale=True)\ne2 = np.exp(np.array([1.0, 0.0, 1.0]) / np.sqrt(2))\nassert np.allclose(w2, e2 / e2.sum())\nw3, c3 = attention(q, K, V, mask=np.array([True, True, False]))\nassert abs(w3[2]) < 1e-12 and abs(w3.sum() - 1) < 1e-12\nassert np.allclose(c3, [0.7310586, 0.2689414], atol=1e-6)\nw4, _ = attention(np.zeros(2), K, V)\nassert np.allclose(w4, 1 / 3)\nw5, _ = attention(np.array([500.0, 0.0]), K, V)\nassert np.all(np.isfinite(w5))\nI = np.eye(2)\nsc = additive_scores(np.zeros(2), np.array([[0.0, 0.0], [1.0, 0.0]]), I, I, np.ones(2))\nassert np.allclose(sc, [0.0, np.tanh(1.0)])",
  "solution": "import numpy as np\n\ndef attention(q, K, V, scale=False, mask=None):\n    scores = K @ q\n    if scale:\n        scores = scores / np.sqrt(len(q))\n    if mask is not None:\n        scores = np.where(mask, scores, -1e9)\n    scores = scores - scores.max()\n    w = np.exp(scores)\n    w = w / w.sum()\n    return w, w @ V\n\ndef additive_scores(s, H, Ws, Wh, v):\n    return np.tanh(H @ Wh.T + Ws @ s) @ v",
  "hints": [
    "Subtract the max score before exponentiating.",
    "`np.where(mask, scores, -1e9)` applies the mask."
  ]
}
```

> [!TIP] Interview tips
> - Tell the story: fixed-vector bottleneck, then query-key-value soft lookup with softmax weights.
> - Name additive (Bahdanau) vs dot-product (Luong) scoring and why scaling by $\sqrt{d_k}$ helps.
> - Distinguish cross-attention from self-attention, and mention masking for padding and causality.
