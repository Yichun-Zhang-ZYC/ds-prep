---
id: nlp-llms-pre-training-objectives
title: Pre-training objectives
estimatedMinutes: 11
difficulty: medium
tags: [nlp, llm, pretraining, clm, mlm]
---

## Why it matters
The pre-training objective decides what a model can do afterwards: generate, understand, or embed. Interviewers ask you to compare causal LM, masked LM and denoising objectives, and to justify why most LLMs use next-token prediction.

## Concept
All objectives are **self-supervised**: labels come from the text itself, so the data scales to trillions of tokens.

| Objective | Corrupt input | Predict | Context | Typical models |
|---|---|---|---|---|
| **Causal LM (CLM)** | none | next token | left only | GPT, Llama |
| **Masked LM (MLM)** | mask ~15% of tokens | masked tokens | both sides | BERT, RoBERTa |
| **Span corruption** | drop spans, add sentinels | dropped spans | encoder: both; decoder: causal | T5, UL2 |
| **Replaced token detection** | swap tokens using a small generator | original vs replaced, per token | both sides | ELECTRA |
| **Contrastive** | augment / pair texts | match positives against negatives | whole text | SimCSE, CLIP, embedding models |

- **CLM loss**: $\mathcal{L} = -\frac{1}{n-1}\sum_{t} \log p(x_{t+1} \mid x_{\le t})$. Every position provides a training signal.
- **MLM loss**: the same cross-entropy, averaged over **masked positions only**, so each sequence gives about 15% of the signal. ELECTRA recovers efficiency by classifying all positions.
- **Generation**: CLM matches inference exactly (no train/test gap). MLM models cannot generate fluently, but give better bidirectional features per parameter for classification and retrieval.
- **Objective mixing**: UL2 combines short-span, long-span and prefix-LM denoising; **fill-in-the-middle** (FIM) trains code models to insert text.
- **Next-sentence / sentence-order** objectives add little and were dropped.
- **Why CLM won at scale**: simple, no mismatch with generation, uniform signal across all tokens, clean scaling laws, and in-context abilities emerge.
- Pre-training loss is a cross-entropy over the vocabulary; its exponential is perplexity. Alignment stages (instruction tuning, RLHF) come after, with different objectives.

## Worked example
A model predicts a masked sentence at two `[MASK]` positions, assigning the true tokens probabilities 0.2 and 0.5. MLM loss $= -(\ln 0.2 + \ln 0.5)/2 = (1.609 + 0.693)/2 = 1.151$ nats.

For a 100-token sequence: CLM gives 99 loss terms; MLM gives about 15. To match the CLM signal, BERT-style training needs about 6.6 times more passes over the data, one reason causal LMs are more sample-efficient for generation.

A uniform model over a vocabulary of $V = 4$ has loss $\ln 4 = 1.386$, a handy sanity check for any implementation (perplexity 4).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is MLM less sample-efficient than causal LM per sequence?",
  "options": [
    "It uses a smaller vocabulary",
    "Only the masked ~15% of positions contribute to the loss",
    "It needs labels",
    "Its attention is causal"
  ],
  "answer": 1,
  "explanation": "CLM gets a loss term at every position; MLM computes loss only at masked positions, so each sequence provides far fewer training signals."
}
```

```quiz
{
  "id": "q2",
  "question": "Which objective best matches how a chat model is used at inference time?",
  "options": [
    "Masked language modelling",
    "Next-sentence prediction",
    "Causal language modelling",
    "Contrastive learning"
  ],
  "answer": 2,
  "explanation": "Generation is autoregressive next-token prediction, which is exactly what CLM trains, so there is no train/inference gap."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `cross_entropy(logits, target)` (stable log-softmax for one position), `clm_loss(logits, tokens)` where `logits[t]` is the model's output at position t and predicts `tokens[t+1]` (mean over t = 0..n-2), and `mlm_loss(logits, tokens, masked)` where `logits[i]` predicts `tokens[i]` and the mean is taken over the indices in `masked` only.",
  "starterCode": "import math\n\ndef cross_entropy(logits, target):\n    pass\n\ndef clm_loss(logits, tokens):\n    pass\n\ndef mlm_loss(logits, tokens, masked):\n    pass\n\nprint(cross_entropy([0.0, 0.0, 0.0, 0.0], 2), math.log(4))",
  "tests": "assert abs(cross_entropy([0.0] * 4, 2) - math.log(4)) < 1e-12\nassert abs(cross_entropy([2.0, 0.0, 0.0], 0) - math.log(1 + 2 * math.exp(-2))) < 1e-12\nassert abs(cross_entropy([1000.0, 0.0], 0)) < 1e-9\nassert abs(cross_entropy([1000.0, 0.0], 1) - 1000.0) < 1e-9\nlg = [[0.0] * 4 for _ in range(3)]\nassert abs(clm_loss(lg, [0, 1, 2]) - math.log(4)) < 1e-12\nlg = [[5.0, 0.0], [0.0, 5.0], [0.0, 0.0]]\nexp = (cross_entropy(lg[0], 1) + cross_entropy(lg[1], 1)) / 2\nassert abs(clm_loss(lg, [0, 1, 1]) - exp) < 1e-12\nassert abs(mlm_loss(lg, [0, 1, 0], [0, 1]) - cross_entropy(lg[1], 1) / 2 - cross_entropy(lg[0], 0) / 2) < 1e-12\nassert abs(mlm_loss(lg, [0, 1, 0], [2]) - math.log(2)) < 1e-12",
  "solution": "import math\n\ndef cross_entropy(logits, target):\n    m = max(logits)\n    lse = m + math.log(sum(math.exp(x - m) for x in logits))\n    return lse - logits[target]\n\ndef clm_loss(logits, tokens):\n    losses = [cross_entropy(logits[t], tokens[t + 1]) for t in range(len(tokens) - 1)]\n    return sum(losses) / len(losses)\n\ndef mlm_loss(logits, tokens, masked):\n    losses = [cross_entropy(logits[i], tokens[i]) for i in masked]\n    return sum(losses) / len(losses)",
  "hints": [
    "Subtract the max logit before exponentiating: loss = logsumexp(logits) - logits[target].",
    "CLM shifts targets by one position; MLM uses the same position but averages over `masked` only."
  ]
}
```

```reveal
{
  "prompt": "Interview: why not train a decoder-only LLM with MLM-style bidirectional masking on a small fraction of tokens to get better representations?",
  "answer": "You can (that is BERT), but the trade-offs are: (1) only ~15% of positions give signal, so it is less sample-efficient; (2) `[MASK]` tokens create a train/inference mismatch; (3) the model cannot generate left to right without extra machinery, and prompting/in-context learning works far better with CLM; (4) CLM's clean scaling behaviour made it the safe bet for very large compute. Bidirectional models remain better per parameter for classification and retrieval, so encoders are still used there, and prefix-LM or UL2 mixtures try to get both."
}
```

> [!TIP] Interview tips
> - Be able to write the CLM loss and say how MLM differs (masked positions only, bidirectional context).
> - Tie the objective to downstream use: CLM for generation, MLM for encoders and embeddings, span corruption for seq2seq.
> - Use the sanity check: untrained loss should be about $\ln V$.

