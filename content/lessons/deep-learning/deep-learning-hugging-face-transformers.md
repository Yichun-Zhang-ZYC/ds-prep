---
id: deep-learning-hugging-face-transformers
title: "Hugging Face Transformers"
estimatedMinutes: 12
difficulty: medium
tags: [deep-learning, huggingface, transformers, tokenizer, fine-tuning]
---

## Why it matters
Hugging Face `transformers` is the standard toolkit for using and fine-tuning pretrained models. Interviews check that you know the Auto classes, what a tokenizer returns (`input_ids`, `attention_mask`), how padding and truncation work, and how to fine-tune with `Trainer` or a manual loop.

## Concept
**Pipelines** are the one-liner for inference: tokenizer + model + post-processing.

```python
from transformers import pipeline
clf = pipeline("sentiment-analysis")                 # downloads a default model
clf(["I love this", "Terrible service"])             # [{'label': 'POSITIVE', 'score': ...}, ...]
```

**Auto classes** load the right architecture from a checkpoint name or path. The model class must match the task head: `AutoModel` (bare encoder, hidden states), `AutoModelForSequenceClassification`, `AutoModelForTokenClassification`, `AutoModelForCausalLM`, `AutoModelForSeq2SeqLM`.

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
name = "distilbert-base-uncased"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, num_labels=2)
batch = tok(["good movie", "a very long review ..."], padding=True, truncation=True,
            max_length=128, return_tensors="pt")
out = model(**batch, labels=torch.tensor([1, 0]))    # out.loss, out.logits
```

**Tokenizer outputs**: `input_ids` (subword ids with special tokens such as `[CLS]`/`[SEP]`), `attention_mask` (1 = real token, 0 = padding, so attention ignores pads) and for pair tasks `token_type_ids`. Padding is dynamic (to the longest in the batch) to save compute; `truncation=True` cuts to `max_length`. Always use the tokenizer that matches the checkpoint; decoder-only models usually need `pad_token = eos_token` and often left padding for generation.

**Fine-tuning with `Trainer`**: wrap data (`datasets.Dataset.map(tokenize, batched=True)`), a `DataCollatorWithPadding`, and `TrainingArguments`.

```python
from transformers import Trainer, TrainingArguments, DataCollatorWithPadding
args = TrainingArguments("out", learning_rate=2e-5, per_device_train_batch_size=16,
                         num_train_epochs=3, weight_decay=0.01, eval_strategy="epoch",
                         warmup_ratio=0.1, fp16=True)
trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=val_ds,
                  data_collator=DataCollatorWithPadding(tok), compute_metrics=compute_metrics)
trainer.train()
```

**Generation** (`model.generate`): `max_new_tokens`, greedy by default, `do_sample=True` with `temperature`, `top_k`, `top_p`, or `num_beams` for beam search. **Efficiency**: `torch_dtype=torch.bfloat16`, `device_map="auto"`, 8/4-bit loading via bitsandbytes, and the `peft` library for LoRA. **Hub**: `push_to_hub`, model cards, and `revision` pinning for reproducibility.

**Common bugs**: forgetting `model.eval()` for inference; mismatched tokenizer/model; labels not matching `num_labels`; leaking padding into pooling (mean-pool must use the mask); evaluating with a stale `max_length` truncation.

## Worked example
Toy vocab: `[PAD]=0, [UNK]=1, [CLS]=2, [SEP]=3, hello=4, world=5, i=6, love=7, nlp=8`. Tokenize `["I love NLP", "hello"]` after lowercasing:

- "I love NLP" gives `[CLS] i love nlp [SEP]` = `[2, 6, 7, 8, 3]`
- "hello" gives `[2, 4, 3]`

Pad to the longest (length 5) and build the mask:

| | input_ids | attention_mask |
|---|---|---|
| 1 | 2 6 7 8 3 | 1 1 1 1 1 |
| 2 | 2 4 3 0 0 | 1 1 1 0 0 |

With `max_length = 4`, the first sequence is truncated but must keep `[SEP]`: `[2, 6, 7, 3]`. An unknown word such as "pizza" maps to `[UNK]` = 1. Mean pooling over sequence 2 must divide by 3 (mask sum), not 5.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does attention_mask tell the model?",
  "options": ["Which tokens are masked for language modeling", "Which positions are real tokens (1) versus padding (0)", "Which sentence a token belongs to", "Which tokens to drop"],
  "answer": 1,
  "explanation": "It prevents attention from using pad positions. Masked-LM masking is a separate mechanism. Sentence membership is token_type_ids."
}
```

```quiz
{
  "id": "q2",
  "question": "Why use dynamic padding with a data collator rather than padding everything to max_length?",
  "options": ["It changes the model output", "It wastes less compute because each batch is padded only to its longest sequence", "It is required for the attention mask to work", "It increases sequence length"],
  "answer": 1,
  "explanation": "Cost grows with sequence length, so padding per batch avoids processing many pad tokens, especially with variable-length text."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "The real library cannot run in the browser, so implement the tokenizer-to-batch idea in plain Python. `encode(text, vocab, max_length=None)`: lowercase, split on whitespace, map unknown words to vocab['[UNK]'], wrap with [CLS] ... [SEP]; if max_length is set and the result is longer, truncate the words so the total is max_length and [SEP] is kept. `pad_batch(seqs, pad_id=0)` returns `(input_ids, attention_mask)` padded to the longest sequence. `batch_encode(texts, vocab, max_length=None)` chains them.",
  "starterCode": "VOCAB = {'[PAD]': 0, '[UNK]': 1, '[CLS]': 2, '[SEP]': 3, 'hello': 4, 'world': 5, 'i': 6, 'love': 7, 'nlp': 8}\n\ndef encode(text, vocab, max_length=None):\n    pass\n\ndef pad_batch(seqs, pad_id=0):\n    pass\n\ndef batch_encode(texts, vocab, max_length=None):\n    pass\n\nprint(batch_encode(['I love NLP', 'hello'], VOCAB))",
  "tests": "V = {'[PAD]': 0, '[UNK]': 1, '[CLS]': 2, '[SEP]': 3, 'hello': 4, 'world': 5, 'i': 6, 'love': 7, 'nlp': 8}\nassert encode('I love NLP', V) == [2, 6, 7, 8, 3]\nassert encode('hello pizza', V) == [2, 4, 1, 3]\nassert encode('I love NLP', V, max_length=4) == [2, 6, 7, 3]\nassert encode('hello', V, max_length=4) == [2, 4, 3]\nids, mask = pad_batch([[2, 6, 7, 8, 3], [2, 4, 3]])\nassert ids == [[2, 6, 7, 8, 3], [2, 4, 3, 0, 0]]\nassert mask == [[1, 1, 1, 1, 1], [1, 1, 1, 0, 0]]\nout = batch_encode(['I love NLP', 'hello'], V, max_length=4)\nassert out == ([[2, 6, 7, 3], [2, 4, 3, 0]], [[1, 1, 1, 1], [1, 1, 1, 0]])",
  "solution": "VOCAB = {'[PAD]': 0, '[UNK]': 1, '[CLS]': 2, '[SEP]': 3, 'hello': 4, 'world': 5, 'i': 6, 'love': 7, 'nlp': 8}\n\ndef encode(text, vocab, max_length=None):\n    ids = [vocab.get(w, vocab['[UNK]']) for w in text.lower().split()]\n    if max_length is not None:\n        ids = ids[:max(max_length - 2, 0)]\n    return [vocab['[CLS]']] + ids + [vocab['[SEP]']]\n\ndef pad_batch(seqs, pad_id=0):\n    n = max(len(s) for s in seqs)\n    input_ids = [s + [pad_id] * (n - len(s)) for s in seqs]\n    mask = [[1] * len(s) + [0] * (n - len(s)) for s in seqs]\n    return input_ids, mask\n\ndef batch_encode(texts, vocab, max_length=None):\n    return pad_batch([encode(t, vocab, max_length) for t in texts], vocab['[PAD]'])",
  "hints": ["Truncate the word ids to max_length - 2 before adding [CLS] and [SEP].", "The mask is 1 for each original token and 0 for each pad."]
}
```

> [!TIP] Interview tips
> - Describe the pipeline: tokenizer, model with the right task head, post-processing; know Auto classes.
> - Explain `input_ids` vs `attention_mask`, dynamic padding and why pooling must respect the mask.
> - For fine-tuning, quote sensible defaults (LR around 2e-5, warm-up, 2-4 epochs) and mention PEFT/LoRA for large models.
