---
id: nlp-llms-word2vec-glove
title: Word2Vec, GloVe
estimatedMinutes: 12
difficulty: medium
tags: [nlp, embeddings, word2vec, glove, negative-sampling]
---

## Why it matters
Word2Vec and GloVe introduced dense, learned word vectors where geometry encodes meaning. Interviewers ask how skip-gram training works, why negative sampling is needed, and how these static embeddings differ from contextual ones.

## Concept
**Distributional hypothesis**: words that appear in similar contexts have similar meanings. Both methods learn a dense vector (50-300 dims) per word from co-occurrence statistics, replacing sparse one-hot or count vectors.

**Word2Vec** is a shallow neural model with two architectures:
- **Skip-gram**: predict context words from the center word. Better for rare words.
- **CBOW**: predict the center word from the averaged context. Faster, smoother for frequent words.

Training pairs come from a sliding window of size $m$: each (center, context) pair within $m$ positions is one example. A full softmax over the vocabulary, $P(o \mid c) = \dfrac{\exp(v_o^\top u_c)}{\sum_{w} \exp(v_w^\top u_c)}$, costs $O(V)$ per example. **Negative sampling (SGNS)** replaces it with $K$ binary classifications: the true context word vs $K$ random "noise" words drawn from the unigram distribution raised to the 3/4 power:

$$\mathcal{L} = -\ln \sigma(v_o^\top u_c) - \sum_{k=1}^{K} \ln \sigma(-v_{n_k}^\top u_c)$$

Frequent words are also **subsampled** to cut the weight of `the`, `of`. Each word ends up with two vectors (center $u$, context $v$); you usually keep $u$ or their average. Skip-gram with negative sampling implicitly factorizes a shifted pointwise mutual information (PMI) matrix.

**GloVe** instead fits vectors to the global co-occurrence matrix $X$ with a weighted least squares loss:

$$J = \sum_{i,j} f(X_{ij})\,\big(w_i^\top \tilde w_j + b_i + \tilde b_j - \ln X_{ij}\big)^2$$

where $f$ caps the influence of very frequent pairs. Quality is similar to Word2Vec; GloVe uses global counts directly, Word2Vec streams local windows.

**FastText** adds character n-gram vectors, so it handles typos and unseen words (and morphology-rich languages).

**What embeddings give you**: nearest neighbors, analogies (`king - man + woman ≈ queen`, a rough approximation), and features for downstream models. **Limits**: one vector per word type, so `bank` (river vs money) is a blend; they absorb corpus biases; no sentence-level meaning. Contextual embeddings (next lesson) fix polysemy.

## Worked example
Sentence `the quick brown fox jumps`, window $m = 1$. The center `brown` yields pairs (`brown`, `quick`) and (`brown`, `fox`). Over the 5 tokens there are $1+2+2+2+1 = 8$ pairs.

SGNS loss for one pair with $K = 1$ negative: center $u_c = [1, 1]$, true context $v_o = [1, 1]$ (dot $= 2$), negative $v_n = [1, -2]$ (dot $= -1$).

$\mathcal{L} = -\ln \sigma(2) - \ln \sigma(1) = 0.127 + 0.313 = 0.440$. Gradient steps pull $u_c$ toward $v_o$ and push it away from $v_n$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does Word2Vec use negative sampling instead of a full softmax?",
  "options": ["Softmax cannot be differentiated", "A full softmax costs O(V) per example; negative sampling needs only the true word plus K sampled noise words", "Negative sampling gives exact probabilities", "It removes the need for a window"],
  "answer": 1,
  "explanation": "With vocabularies of 10^5-10^6 words, normalizing over all words is too expensive; K (5-20) binary logistic losses approximate it."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main limitation of Word2Vec/GloVe compared with BERT-style embeddings?",
  "options": ["They are slower to train", "Each word type has one vector regardless of context, so polysemy (bank, apple) is blended", "They cannot be used for similarity", "They need labeled data"],
  "answer": 1,
  "explanation": "Static embeddings give one vector per word type; contextual models produce a different vector per occurrence."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `skipgram_pairs(tokens, window)`: return the list of `(center, context)` pairs for every token and every other token within `window` positions, ordered by center position and then context position. Then implement `sgns_loss(u_c, v_pos, v_negs)`, the negative-sampling loss $-\\ln\\sigma(v_o^\\top u_c) - \\sum_k \\ln\\sigma(-v_{n_k}^\\top u_c)$ for plain Python lists.",
  "setup": "import math",
  "starterCode": "import math\n\ndef skipgram_pairs(tokens, window):\n    # list of (center, context) pairs, ordered by center position, then context position\n    pass\n\ndef sgns_loss(u_c, v_pos, v_negs):\n    pass\n\nprint(skipgram_pairs(['the', 'quick', 'brown', 'fox', 'jumps'], 1))\nprint(sgns_loss([1, 1], [1, 1], [[1, -2]]))",
  "tests": "toks = ['the', 'quick', 'brown', 'fox', 'jumps']\np = skipgram_pairs(toks, 1)\nassert len(p) == 8\nassert p[:3] == [('the', 'quick'), ('quick', 'the'), ('quick', 'brown')]\nassert ('brown', 'quick') in p and ('brown', 'fox') in p and ('brown', 'the') not in p\nassert len(skipgram_pairs(toks, 2)) == 14\nassert skipgram_pairs(['a'], 3) == []\nl = sgns_loss([1, 1], [1, 1], [[1, -2]])\nassert abs(l - 0.4402) < 1e-3\nassert abs(sgns_loss([0, 0], [1, 1], []) - math.log(2)) < 1e-12\nassert sgns_loss([1, 1], [2, 2], [[-2, -2]]) < sgns_loss([1, 1], [-2, -2], [[2, 2]])",
  "solution": "import math\n\ndef skipgram_pairs(tokens, window):\n    pairs = []\n    for i, c in enumerate(tokens):\n        for j in range(max(0, i - window), min(len(tokens), i + window + 1)):\n            if j != i:\n                pairs.append((c, tokens[j]))\n    return pairs\n\ndef _dot(a, b):\n    return sum(x * y for x, y in zip(a, b))\n\ndef _log_sigmoid(z):\n    return -math.log(1 + math.exp(-z))\n\ndef sgns_loss(u_c, v_pos, v_negs):\n    loss = -_log_sigmoid(_dot(v_pos, u_c))\n    for v in v_negs:\n        loss -= _log_sigmoid(-_dot(v, u_c))\n    return loss",
  "hints": ["For center i, loop j over range(max(0, i - window), min(n, i + window + 1)) and skip j == i.", "Use -ln sigma(z) = ln(1 + exp(-z)); the negative term uses -dot."]
}
```

> [!TIP] Interview tips
> - Be able to write the SGNS loss and say why negative sampling avoids the $O(V)$ softmax.
> - Pitfall: calling these "contextual"; `bank` has a single vector regardless of the sentence. Mention FastText for OOV words.
> - Say that analogies are noisy and that embeddings encode societal biases from the training text.
