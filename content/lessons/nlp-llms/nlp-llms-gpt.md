---
id: nlp-llms-gpt
title: GPT (decoder-only)
estimatedMinutes: 12
difficulty: medium
tags: [nlp, transformers, gpt, decoder, llm]
---

## Why it matters
Almost every modern LLM (GPT, Llama, Claude, Gemini, Mistral) is a decoder-only transformer. Interviewers ask how it is trained, why the causal mask matters, and why this design won over encoder-decoder.

## Concept
A decoder-only model is a stack of transformer layers with **causal self-attention** (token $t$ attends only to tokens $\le t$) and no cross-attention.

- **Objective**: model the sequence autoregressively, $p(x) = \prod_t p(x_t \mid x_{<t})$. Loss is the mean cross-entropy of predicting each next token.
- **Teacher forcing**: during training the true prefix is fed in, so one forward pass over $n$ tokens yields $n$ losses in parallel. Generation is sequential: one forward pass per new token (made cheaper by the **KV cache**).
- **Causal mask**: lower-triangular matrix, applied by setting scores above the diagonal to $-\infty$ before softmax. It stops the model from "cheating" by reading the answer.
- **Perplexity** $= \exp(\text{mean NLL per token})$, the effective branching factor; lower is better, and it is only comparable under the same tokenizer.
- **Output head**: final hidden state $\to$ linear layer over the vocabulary (often weight-tied with the input embedding) $\to$ softmax.
- **In-context learning**: with enough scale, the model follows instructions and examples in the prompt without weight updates. Base model = pre-trained next-token predictor; chat model = base plus instruction tuning and RLHF.
- **Why decoder-only won**: one simple objective on unlabelled text, every token provides signal, a single stack handles every task as text continuation, and the KV cache makes serving efficient. Encoder-decoders can match it at equal compute but are less convenient for open-ended chat.
- **Limits**: sees only left context at each position (weaker for pure classification per parameter than a bidirectional encoder), can hallucinate, and attention cost grows with context.

## Worked example
A model assigns probabilities $0.5, 0.25, 0.5, 0.125$ to the four true next tokens of a sentence.

NLL in bits: $1 + 2 + 1 + 3 = 7$, mean $= 7/4 = 1.75$ bits per token. Perplexity $= 2^{1.75} \approx 3.36$: as uncertain as choosing uniformly among about 3.4 tokens each step. (In nats: $\exp(\text{mean } -\ln p)$ gives the same value.)

For a 4-token input, the causal mask is $\begin{pmatrix}1&0&0&0\\1&1&0&0\\1&1&1&0\\1&1&1&1\end{pmatrix}$, so row 2 mixes only tokens 0, 1, 2.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can a decoder-only model compute the loss for all positions of a training sequence in one forward pass?",
  "options": [
    "It uses a bidirectional mask",
    "Teacher forcing feeds the true prefix and the causal mask hides future tokens, so every position predicts its next token in parallel",
    "It caches the keys and values",
    "It samples multiple tokens at once"
  ],
  "answer": 1,
  "explanation": "The causal mask guarantees position t cannot see tokens after t, so all next-token predictions are valid simultaneously."
}
```

```quiz
{
  "id": "q2",
  "question": "A model's perplexity is 8 on a validation set. What does that mean?",
  "options": [
    "It is wrong 8% of the time",
    "It is as uncertain as a uniform choice among 8 tokens per step",
    "Its loss is 8 nats",
    "It needs 8 passes per token"
  ],
  "answer": 1,
  "explanation": "Perplexity $= \\exp(\\text{mean NLL})$, the effective number of equally likely choices; mean NLL here is $\\ln 8 \\approx 2.08$ nats."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `causal_mask(n)` returning an n x n list of lists with 1 where position i may attend to j (j <= i) and 0 otherwise; `perplexity(probs)` taking the probabilities the model gave to each true next token; and `sequence_log_prob(token_probs)` returning the natural-log probability of the whole sequence.",
  "starterCode": "import math\n\ndef causal_mask(n):\n    pass\n\ndef perplexity(probs):\n    pass\n\ndef sequence_log_prob(token_probs):\n    pass\n\nprint(causal_mask(3), perplexity([0.5, 0.25, 0.5, 0.125]))",
  "tests": "assert causal_mask(3) == [[1, 0, 0], [1, 1, 0], [1, 1, 1]]\nassert causal_mask(1) == [[1]]\nassert abs(perplexity([0.5, 0.25, 0.5, 0.125]) - 2 ** 1.75) < 1e-9\nassert abs(perplexity([0.25] * 5) - 4) < 1e-9\nassert abs(perplexity([1.0, 1.0]) - 1) < 1e-12\nassert abs(sequence_log_prob([0.5, 0.25]) - math.log(0.125)) < 1e-12",
  "solution": "import math\n\ndef causal_mask(n):\n    return [[1 if j <= i else 0 for j in range(n)] for i in range(n)]\n\ndef perplexity(probs):\n    return math.exp(-sum(math.log(p) for p in probs) / len(probs))\n\ndef sequence_log_prob(token_probs):\n    return sum(math.log(p) for p in token_probs)",
  "hints": [
    "Perplexity is exp of the average negative log probability.",
    "The log probability of a sequence is the sum of per-token log probabilities (chain rule)."
  ]
}
```

> [!TIP] Interview tips
> - Describe training (parallel, teacher forcing) versus inference (sequential, KV cache); this asymmetry is a favourite question.
> - Know that the causal mask is what makes the objective valid; without it the model could copy the next token.
> - Say why decoder-only dominates: a simple scalable objective, in-context learning, and one architecture for every task.

