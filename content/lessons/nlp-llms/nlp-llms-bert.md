---
id: nlp-llms-bert
title: BERT (encoder-only)
estimatedMinutes: 12
difficulty: medium
tags: [nlp, transformers, bert, encoder]
---

## Why it matters
BERT introduced the pre-train then fine-tune recipe and still powers classification, NER, reranking and embedding models. Interviewers ask what "bidirectional" buys you, how masked language modelling works, and when BERT is the wrong tool.

## Concept
BERT is a stack of transformer **encoder** layers with full (non-causal) self-attention, so every token sees both left and right context.

- **Input**: `[CLS] A tokens [SEP] B tokens [SEP]`, built from WordPiece tokens. Embedding = token + learned position + segment (A/B). Max length 512.
- **Masked LM (MLM)**: pick 15% of tokens; of those, 80% become `[MASK]`, 10% a random token, 10% stay unchanged. Predict the original token at the selected positions only. The 10/10 split reduces the train/fine-tune mismatch, since `[MASK]` never appears at inference.
- **Next sentence prediction (NSP)**: binary "is B the next sentence?" from `[CLS]`. Later work (RoBERTa) showed it adds little and dropped it; ALBERT replaced it with sentence-order prediction.
- **Sizes**: BERT-base 12 layers, hidden 768, 12 heads, about 110M parameters; BERT-large 24 layers, hidden 1024, 16 heads, about 340M.
- **Fine-tuning**: sentence classification uses the `[CLS]` vector plus a linear head; token tasks (NER) use each token's vector; extractive QA predicts start and end positions. Typical recipe: lr $2\text{-}5 \times 10^{-5}$, 2-4 epochs.
- **Strengths**: strong understanding tasks, small and fast to serve, good for embeddings and rerankers.
- **Limits**: no natural text generation; MLM learns from only 15% of tokens per sequence (less sample-efficient than causal LM); 512-token limit; train/inference mismatch from `[MASK]`.
- **Descendants**: RoBERTa (more data, dynamic masking, no NSP), DistilBERT (distillation), ALBERT (parameter sharing), ELECTRA (replaced-token detection), DeBERTa (disentangled position attention).

## Worked example
Sequence of 100 tokens. About 15 are selected: roughly 12 become `[MASK]`, 1.5 are replaced by random words, 1.5 are left as is. The loss is the cross-entropy at those 15 positions only; the other 85 provide context but no loss.

Parameter check for BERT-base: each layer has attention $4 \times 768^2 \approx 2.36$M and FFN $2 \times 768 \times 3072 \approx 4.72$M, so $12 \times 7.08\text{M} \approx 85$M. Embeddings: $30{,}522 \times 768 \approx 23.4$M. Total $\approx 109$M, plus small terms, giving the quoted 110M.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does BERT replace only 80% of the selected tokens with [MASK]?",
  "options": [
    "To save compute",
    "[MASK] never appears at fine-tuning or inference, so keeping some random or original tokens reduces the train/test mismatch",
    "To make the vocabulary smaller",
    "Because [MASK] is rare"
  ],
  "answer": 1,
  "explanation": "With 10% random and 10% unchanged, the model can't tell which tokens were selected, so it must build good representations for every token."
}
```

```quiz
{
  "id": "q2",
  "question": "Which task is BERT least suited to out of the box?",
  "options": [
    "Named entity recognition",
    "Sentence-pair classification",
    "Open-ended text generation",
    "Extractive question answering"
  ],
  "answer": 2,
  "explanation": "BERT is an encoder trained with bidirectional context and has no left-to-right generation mechanism."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `build_bert_input(a, b, max_len)` for two token lists. Return `(tokens, segment_ids, attention_mask)` for `[CLS] a [SEP] b [SEP]` padded with `[PAD]` to `max_len`. Segment ids are 0 for `[CLS]`, `a` and the first `[SEP]`, and 1 for `b` and the last `[SEP]`; padding has segment 0 and attention 0. If too long, repeatedly drop the last token of the longer list (of `a` on ties) until it fits.",
  "starterCode": "def build_bert_input(a, b, max_len):\n    pass\n\nprint(build_bert_input(['the', 'cat'], ['sat'], 8))",
  "tests": "t, s, m = build_bert_input(['the', 'cat'], ['sat'], 8)\nassert t == ['[CLS]', 'the', 'cat', '[SEP]', 'sat', '[SEP]', '[PAD]', '[PAD]']\nassert s == [0, 0, 0, 0, 1, 1, 0, 0]\nassert m == [1, 1, 1, 1, 1, 1, 0, 0]\nt, s, m = build_bert_input(['a', 'b', 'c', 'd'], ['x', 'y'], 7)\nassert t == ['[CLS]', 'a', 'b', '[SEP]', 'x', 'y', '[SEP]']\nassert s == [0, 0, 0, 0, 1, 1, 1] and m == [1] * 7\nt, s, m = build_bert_input([], [], 4)\nassert t == ['[CLS]', '[SEP]', '[SEP]', '[PAD]'] and s == [0, 0, 1, 0] and m == [1, 1, 1, 0]",
  "solution": "def build_bert_input(a, b, max_len):\n    a, b = list(a), list(b)\n    while len(a) + len(b) > max_len - 3:\n        if len(a) >= len(b):\n            a.pop()\n        else:\n            b.pop()\n    tokens = [\"[CLS]\"] + a + [\"[SEP]\"] + b + [\"[SEP]\"]\n    segments = [0] * (len(a) + 2) + [1] * (len(b) + 1)\n    mask = [1] * len(tokens)\n    pad = max_len - len(tokens)\n    return tokens + [\"[PAD]\"] * pad, segments + [0] * pad, mask + [0] * pad",
  "hints": [
    "Reserve 3 slots for [CLS] and the two [SEP] tokens: trim until len(a) + len(b) <= max_len - 3.",
    "Segment ids: 0 repeated len(a) + 2 times, then 1 repeated len(b) + 1 times."
  ]
}
```

```reveal
{
  "prompt": "Interview: you need to classify support tickets and have 2,000 labelled examples. Would you fine-tune BERT or call a large decoder-only LLM? Give one argument for each side.",
  "answer": "**BERT-style encoder**: cheap to fine-tune on 2,000 labels, millisecond latency on CPU or small GPU, a few hundred MB, deterministic outputs, easy to calibrate and monitor, and data stays in-house. **Large LLM**: no training needed (few-shot prompting) and handles new or changing label sets and long, messy text, but costs more per request, is slower and less deterministic. Practical answer: baseline with a fine-tuned encoder (or embeddings plus logistic regression); use an LLM when labels change often, data is scarce, or tickets need reasoning. Compare both on a held-out set for accuracy, latency and cost."
}
```

> [!TIP] Interview tips
> - Explain MLM with the 80/10/10 rule and say why it exists.
> - Contrast with GPT: BERT is bidirectional and good at understanding, GPT is causal and good at generation.
> - Know the fine-tuning heads: `[CLS]` for sequence tasks, per-token for NER, start/end for QA.

