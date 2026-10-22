---
id: nlp-llms-n-gram-language-models
title: n-gram language models
estimatedMinutes: 12
difficulty: medium
tags: [nlp, language-models, n-gram, perplexity, smoothing]
---

## Why it matters
n-gram models are the simplest language models and the cleanest way to explain what "a language model" is: a probability distribution over the next token. Interviewers use them to probe smoothing, perplexity and why neural LMs replaced them.

## Concept
A language model assigns $P(w_1, \dots, w_n)$. By the chain rule $P(w_1..w_n) = \prod_i P(w_i \mid w_1..w_{i-1})$. An **n-gram model** makes a Markov assumption: only the previous $n-1$ words matter. For a bigram model:

$$P(w_i \mid w_{i-1}) = \frac{c(w_{i-1}, w_i)}{c(w_{i-1})}$$

This is the maximum-likelihood estimate (MLE) from counts. Pad sentences with `<s>` and `</s>` so the model learns sentence starts and ends.

**Sparsity problem**: most valid n-grams never appear in training, so MLE gives probability 0 and one unseen bigram zeroes the whole sentence. Fixes:
- **Add-$k$ (Laplace) smoothing**: $P(w \mid h) = \dfrac{c(h, w) + k}{c(h) + kV}$. Simple but moves too much mass to unseen events.
- **Backoff / interpolation**: mix higher- and lower-order estimates, $\lambda P_{\text{tri}} + \lambda' P_{\text{bi}} + \lambda'' P_{\text{uni}}$.
- **Kneser-Ney**: discount counts and back off to a *continuation* probability (how many distinct contexts a word follows). The best classic method.

**Perplexity** evaluates a model on held-out text with $N$ predicted tokens:

$$\text{PPL} = \exp\Big(-\frac1N \sum_i \ln P(w_i \mid w_{<i})\Big)$$

It is the exponentiated cross-entropy: the effective number of equally likely choices per step. Lower is better; compare only models with the same tokenization and vocabulary.

**Limits**: the context window is tiny, the number of parameters grows as $V^n$, and similar words share no statistics. Neural LMs (embeddings + RNN/transformer) generalize across similar words and use long contexts. Today n-grams survive in speech decoding, spell-check, and as a cheap baseline.

## Worked example
Training corpus (3 sentences): `i like cats`, `i like dogs`, `i eat cats`. With `<s>`/`</s>` padding, $c(\text{i}) = 3$, $c(\text{i like}) = 2$, $c(\text{like}) = 2$, $c(\text{like cats}) = 1$, $c(\text{cats}) = 2$, $c(\text{cats </s>}) = 2$.

$P(\text{i like cats}) = P(\text{i} \mid \text{<s>}) \cdot P(\text{like} \mid \text{i}) \cdot P(\text{cats} \mid \text{like}) \cdot P(\text{</s>} \mid \text{cats}) = 1 \cdot \tfrac23 \cdot \tfrac12 \cdot 1 = \tfrac13$.

With $N = 4$ predictions, $\text{PPL} = (1/3)^{-1/4} = 3^{0.25} \approx 1.32$. The unseen bigram `i dogs` gets probability 0 under MLE, so any sentence containing it has infinite perplexity. With add-1 smoothing and $V = 7$ symbols (`<s>`, `</s>`, `i`, `like`, `eat`, `cats`, `dogs`): $P(\text{like} \mid \text{i}) = (2+1)/(3+7) = 0.3$ and $P(\text{dogs} \mid \text{i}) = 1/10 = 0.1$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A bigram MLE model gives probability 0 to a test sentence containing a bigram never seen in training. What is the standard fix?",
  "options": ["Train for more epochs", "Smoothing (add-k, interpolation/backoff, Kneser-Ney)", "Increase n to 5", "Lowercase the text"],
  "answer": 1,
  "explanation": "Smoothing reserves probability mass for unseen n-grams. Raising n makes sparsity worse."
}
```

```quiz
{
  "id": "q2",
  "question": "A language model has perplexity 50 on a test set. How do you interpret it?",
  "options": ["50% accuracy", "On average it is as uncertain as choosing uniformly among 50 tokens at each step", "It needs 50 training epochs", "The vocabulary has 50 words"],
  "answer": 1,
  "explanation": "Perplexity is exp(average negative log-likelihood), the effective branching factor."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build a bigram language model. `train_bigram(sentences)` pads each token list with `<s>` and `</s>` and returns `(bigram_counts, context_counts, vocab)` (vocab includes the padding symbols). `bigram_prob(model, w1, w2, k=0.0)` returns the add-$k$ probability $(c(w_1,w_2)+k)/(c(w_1)+kV)$, or 0.0 if the denominator is 0. `perplexity(model, sentence, k=0.0)` returns the perplexity of a padded sentence, or `float('inf')` if any probability is 0.",
  "setup": "import math\nfrom collections import Counter",
  "starterCode": "import math\nfrom collections import Counter\n\ndef train_bigram(sentences):\n    # return (bigram_counts, context_counts, vocab)\n    pass\n\ndef bigram_prob(model, w1, w2, k=0.0):\n    pass\n\ndef perplexity(model, sentence, k=0.0):\n    pass\n\nmodel = train_bigram([['i', 'like', 'cats'], ['i', 'like', 'dogs'], ['i', 'eat', 'cats']])\nprint(bigram_prob(model, 'i', 'like'), perplexity(model, ['i', 'like', 'cats']))",
  "tests": "model = train_bigram([['i', 'like', 'cats'], ['i', 'like', 'dogs'], ['i', 'eat', 'cats']])\nassert abs(bigram_prob(model, 'i', 'like') - 2 / 3) < 1e-12\nassert abs(bigram_prob(model, '<s>', 'i') - 1.0) < 1e-12\nassert bigram_prob(model, 'i', 'dogs') == 0.0\nassert abs(bigram_prob(model, 'i', 'like', k=1) - 0.3) < 1e-12\nassert abs(bigram_prob(model, 'i', 'dogs', k=1) - 0.1) < 1e-12\nassert abs(perplexity(model, ['i', 'like', 'cats']) - 3 ** 0.25) < 1e-9\nassert perplexity(model, ['i', 'dogs']) == float('inf')\nassert math.isfinite(perplexity(model, ['i', 'dogs'], k=1))",
  "solution": "import math\nfrom collections import Counter\n\ndef train_bigram(sentences):\n    bi, ctx, vocab = Counter(), Counter(), set()\n    for s in sentences:\n        toks = ['<s>'] + list(s) + ['</s>']\n        vocab.update(toks)\n        for a, b in zip(toks, toks[1:]):\n            bi[(a, b)] += 1\n            ctx[a] += 1\n    return bi, ctx, vocab\n\ndef bigram_prob(model, w1, w2, k=0.0):\n    bi, ctx, vocab = model\n    denom = ctx[w1] + k * len(vocab)\n    if denom == 0:\n        return 0.0\n    return (bi[(w1, w2)] + k) / denom\n\ndef perplexity(model, sentence, k=0.0):\n    toks = ['<s>'] + list(sentence) + ['</s>']\n    total = 0.0\n    for a, b in zip(toks, toks[1:]):\n        p = bigram_prob(model, a, b, k)\n        if p == 0:\n            return float('inf')\n        total += math.log(p)\n    return math.exp(-total / (len(toks) - 1))",
  "hints": ["Count c(w1) as the number of times w1 appears as the first element of a bigram.", "perplexity = exp(-mean of log probabilities over the len(sentence)+1 predictions)."]
}
```

> [!TIP] Interview tips
> - Tie it together: perplexity = exp(cross-entropy); a model with PPL 100 is as uncertain as a uniform choice among 100 words.
> - Pitfall: comparing perplexities across different vocabularies or tokenizers is meaningless.
> - Know why smoothing is needed (zero counts) and name Kneser-Ney; explain neural LMs as generalizing through embeddings.
