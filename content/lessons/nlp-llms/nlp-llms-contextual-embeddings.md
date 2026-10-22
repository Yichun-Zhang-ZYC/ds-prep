---
id: nlp-llms-contextual-embeddings
title: Contextual embeddings
estimatedMinutes: 10
difficulty: medium
tags: [nlp, embeddings, elmo, bert, contextual]
---

## Why it matters
Static embeddings give `bank` one vector for rivers and money. Contextual embeddings made pretrain-then-fine-tune the default in NLP. Interviewers ask how a word's vector depends on its sentence, which layer to use, and how ELMo differs from BERT.

## Concept
A **contextual embedding** is the hidden state of a deep sequence model at a token's position, so it is a function of the whole sentence: $h_i = f(w_1, \dots, w_n)_i$. The same word type gets different vectors in `river bank` and `bank loan`, which resolves polysemy.

**Evolution**:
- **ELMo (2018)**: two-layer **bidirectional LSTM** language model (one forward LM, one backward LM, concatenated), pretrained on next/previous word prediction. Features are frozen and **mixed per task**: $\text{ELMo}_k = \gamma \sum_{j=0}^{L} s_j h_{k,j}$ with softmax-normalized layer weights $s$ and a scalar $\gamma$.
- **GPT**: left-to-right **transformer decoder**; each token sees only earlier tokens. Fine-tuned end to end.
- **BERT**: **bidirectional transformer encoder** trained with masked language modeling, so each token's vector uses both left and right context.

**Which layer?** Lower layers capture surface and syntactic information, upper layers more semantic and task-specific information (probing studies). For frozen features, a weighted mix or the average of the last 4 layers often beats the final layer alone. For fine-tuning, you train the entire network plus a small head.

**Two ways to use them**:
- **Feature-based**: freeze the model, feed embeddings to a separate classifier (ELMo style).
- **Fine-tuning**: update all weights on the downstream task (BERT/GPT style); usually stronger.

**Practical notes**: vectors are per sub-word token, so pool the pieces to get a word vector (first piece or mean). Contextual vectors of one word are **anisotropic**: they occupy a narrow cone, so raw cosine similarities are all high. Context matters at inference too: cost scales with sequence length and the encoder must run per input, unlike a static lookup table.

## Worked example
ELMo-style mix of three layers for one token: $h_0 = [1, 0]$ (embedding layer), $h_1 = [0, 1]$, $h_2 = [2, 2]$, scalar logits $s = [0, 0, \ln 2]$, $\gamma = 1$.

Softmax weights: $e^0 = 1, 1, 2$ over a sum of $4$, so $[0.25, 0.25, 0.5]$. Mixed vector: $0.25[1,0] + 0.25[0,1] + 0.5[2,2] = [1.25, 1.25]$. In training, the task loss learns $s$ and $\gamma$, so each task can emphasize the layer it needs.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What distinguishes a contextual embedding from a static one?",
  "options": ["It has more dimensions", "Its vector for a word depends on the surrounding sentence", "It is trained without text", "It only works for English"],
  "answer": 1,
  "explanation": "The vector is the model's hidden state at that position, computed from the entire input, so \"bank\" differs across sentences."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does BERT see both left and right context while GPT-style models do not?",
  "options": ["BERT is larger", "BERT is a bidirectional encoder trained with masked-token prediction; GPT is a causal decoder predicting the next token", "GPT uses LSTMs", "BERT has no attention mask"],
  "answer": 1,
  "explanation": "Causal masking in GPT restricts each token to earlier positions, which suits generation; BERT's masked LM allows full bidirectional attention but is not a natural generator."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement ELMo-style layer mixing `scalar_mix(layers, s, gamma=1.0)`: softmax the raw logits `s` into weights, then return $\\gamma \\sum_j w_j h_j$ as a list. Also implement `pool_pieces(piece_vectors, mode='mean')` to combine the sub-word vectors of one word: the element-wise mean, or just the first piece when `mode='first'`.",
  "setup": "import math",
  "starterCode": "import math\n\ndef scalar_mix(layers, s, gamma=1.0):\n    # layers: list of equal-length vectors; s: raw layer logits\n    pass\n\ndef pool_pieces(piece_vectors, mode='mean'):\n    # combine sub-word vectors into one word vector ('mean' or 'first')\n    pass\n\nprint(scalar_mix([[1, 0], [0, 1], [2, 2]], [0, 0, math.log(2)]))",
  "tests": "out = scalar_mix([[1, 0], [0, 1], [2, 2]], [0, 0, math.log(2)])\nassert all(abs(a - b) < 1e-9 for a, b in zip(out, [1.25, 1.25]))\nout = scalar_mix([[1, 0], [0, 1], [2, 2]], [5, 5, 5], gamma=2.0)\nassert all(abs(a - b) < 1e-9 for a, b in zip(out, [2 * 1.0, 2 * 1.0]))\nout = scalar_mix([[1.0, 2.0], [3.0, 4.0]], [100.0, -100.0])\nassert abs(out[0] - 1.0) < 1e-9 and abs(out[1] - 2.0) < 1e-9\nassert pool_pieces([[1, 2], [3, 4], [5, 9]]) == [3.0, 5.0]\nassert pool_pieces([[1, 2], [3, 4]], mode='first') == [1, 2]",
  "solution": "import math\n\ndef scalar_mix(layers, s, gamma=1.0):\n    exps = [math.exp(x) for x in s]\n    z = sum(exps)\n    w = [e / z for e in exps]\n    d = len(layers[0])\n    return [gamma * sum(w[j] * layers[j][i] for j in range(len(layers))) for i in range(d)]\n\ndef pool_pieces(piece_vectors, mode='mean'):\n    if mode == 'first':\n        return list(piece_vectors[0])\n    n = len(piece_vectors)\n    return [sum(v[i] for v in piece_vectors) / n for i in range(len(piece_vectors[0]))]",
  "hints": ["Softmax: exp(s_j) / sum(exp(s)).", "The mixed vector at dimension i is gamma * sum_j w_j * layers[j][i]."]
}
```

```reveal
{
  "prompt": "Interview: 'Your team wants to use BERT embeddings as frozen features for a classifier. Which layer(s) would you take and why? When would you fine-tune instead?'",
  "answer": "**Layer choice**: the last layer is specialized to the pretraining objective (masked-token prediction), so it is not always the best feature. Probing studies show lower/middle layers hold syntax and surface information, upper layers more semantics. A practical default is the mean or concatenation of the last 4 layers, or a learned scalar mix as in ELMo; pick by validation score.\n\n**Pooling**: mean over tokens (masking padding) is usually more robust than the single `[CLS]` vector for frozen features.\n\n**When to fine-tune**: if you have a few hundred or more labels, the task differs from pretraining, or you need top accuracy; fine-tuning adapts every layer. Stay frozen when labels are scarce, latency or training budget is tight, or you want one shared encoder for many tasks (cache the embeddings).\n\n**Caveat**: contextual vectors are anisotropic, so compare them with a trained classifier or centered/normalized vectors, not raw cosine thresholds."
}
```

> [!TIP] Interview tips
> - One-liner: static = one vector per word type, contextual = one vector per token occurrence, computed from the whole sentence.
> - Contrast ELMo (shallow concatenation of two unidirectional LSTMs, feature-based) with BERT (deeply bidirectional transformer, fine-tuned).
> - Pitfall: using the `[CLS]` vector or last layer raw as a sentence embedding without fine-tuning; it is often poor (see sentence embeddings).
