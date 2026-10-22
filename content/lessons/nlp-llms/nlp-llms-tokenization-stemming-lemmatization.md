---
id: nlp-llms-tokenization-stemming-lemmatization
title: Tokenization, stemming, lemmatization
estimatedMinutes: 10
difficulty: easy
tags: [nlp, tokenization, bpe, preprocessing]
---

## Why it matters
Every NLP system starts by turning raw text into discrete units. Interviewers ask how tokenization choices affect vocabulary size, out-of-vocabulary (OOV) words and downstream model quality, and when to stem versus lemmatize.

## Concept
**Tokenization** splits text into units (tokens). Choices trade vocabulary size against sequence length:
- **Word-level**: simple, but huge vocabularies and OOV words (typos, names, new words).
- **Character-level**: no OOV, but long sequences and weak per-token meaning.
- **Subword** (BPE, WordPiece, Unigram/SentencePiece): the modern default. Frequent words stay whole, rare words split into pieces (`unhappiness` → `un`, `happi`, `ness`), so there is no true OOV and the vocabulary stays at ~30k-100k.

**Byte-Pair Encoding (BPE)** training: start with characters as symbols, repeatedly merge the most frequent adjacent pair into a new symbol, stop at a target vocabulary size. At inference, apply the learned merges in order. Byte-level BPE (GPT-2 onward) starts from raw bytes, so any string is encodable. WordPiece (BERT) picks merges by likelihood gain and marks continuations with `##`.

**Normalization** often comes first: lowercasing, Unicode normalization (NFKC), stripping accents, whitespace cleanup. Lowercasing loses signal (`US` vs `us`), so many modern models keep case.

**Stemming** chops suffixes with heuristic rules (Porter, Snowball): `running` → `run`, but `studies` → `studi` and `university`/`universe` collide. Fast, language-specific, may produce non-words.

**Lemmatization** maps a word to its dictionary form using vocabulary and part of speech: `was` → `be`, `better` (adj.) → `good`. Slower but cleaner.

Stemming and lemmatization shrink the vocabulary for sparse models (bag of words, search indexes). Neural models with subword tokenizers rarely need them, and they can hurt (tense or number carries meaning). Stop-word removal is similar: useful for TF-IDF, usually skipped for transformers.

## Worked example
BPE on the word counts `low`×5, `lower`×2, `newest`×6, `widest`×3, starting from characters.

Adjacent pair counts: (`e`,`s`) = 6 + 3 = 9, (`s`,`t`) = 9, (`w`,`e`) = 2 + 6 = 8, (`l`,`o`) = (`o`,`w`) = 7. Merge the tie winner (`e`,`s`) → `es`; `newest` is now `n e w es t`. Next the pair (`es`,`t`) has count 9 and becomes `est`. After two merges the vocabulary has learned the suffix `est`, which then generalizes to unseen words like `fastest`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the key difference between stemming and lemmatization?",
  "options": ["Stemming is rule-based and fast but may output non-words (\"studies\" → \"studi\"); lemmatization uses a dictionary and part of speech to return real words (\"better\" → \"good\")", "Stemming always gives better accuracy than lemmatization", "Lemmatization only removes plural endings", "They are identical, just different names"],
  "answer": 0,
  "explanation": "Stemming strips suffixes by rules and can yield non-words; lemmatization returns a valid dictionary form using vocabulary and part of speech, at higher cost."
}
```

```quiz
{
  "id": "q2",
  "question": "Why do subword tokenizers (BPE, WordPiece) largely eliminate the OOV problem?",
  "options": ["They store every possible word", "Rare or unseen words decompose into smaller known pieces, down to characters or bytes", "They lowercase everything", "They drop unknown words"],
  "answer": 1,
  "explanation": "Any string can be spelled with the base symbols, so unseen words become several known subword tokens instead of a single unknown token."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `tokenize(text)`: lowercase, then return the list of tokens matching letters/digits runs, keeping internal apostrophes (`don't` stays one token). Then write `bpe_step(vocab)` for one BPE training step: `vocab` maps a tuple of symbols to a count. Find the most frequent adjacent pair (break ties by the lexicographically smallest pair), merge it everywhere into a single concatenated symbol, and return `(best_pair, new_vocab)`.",
  "setup": "import re",
  "starterCode": "import re\n\ndef tokenize(text):\n    pass\n\ndef bpe_step(vocab):\n    # vocab: {tuple_of_symbols: count}; return (best_pair, new_vocab)\n    pass\n\nvocab = {('l','o','w'): 5, ('n','e','w','e','s','t'): 6}\nprint(tokenize(\"Don't stop!\"), bpe_step(vocab))",
  "tests": "assert tokenize(\"Don't stop, it's 3 PM!\") == [\"don't\", \"stop\", \"it's\", \"3\", \"pm\"]\nassert tokenize(\"\") == []\nvocab = {('l','o','w'): 5, ('l','o','w','e','r'): 2, ('n','e','w','e','s','t'): 6, ('w','i','d','e','s','t'): 3}\npair, v1 = bpe_step(vocab)\nassert pair == ('e', 's')\nassert v1[('n','e','w','es','t')] == 6 and v1[('w','i','d','es','t')] == 3 and v1[('l','o','w')] == 5\npair2, v2 = bpe_step(v1)\nassert pair2 == ('es', 't')\nassert v2[('n','e','w','est')] == 6\nassert sum(v2.values()) == 16",
  "solution": "import re\nfrom collections import Counter\n\ndef tokenize(text):\n    return re.findall(\"[a-z0-9]+(?:'[a-z]+)?\", text.lower())\n\ndef bpe_step(vocab):\n    pairs = Counter()\n    for word, c in vocab.items():\n        for pair in zip(word, word[1:]):\n            pairs[pair] += c\n    best = min(pairs, key=lambda p: (-pairs[p], p))\n    new_vocab = {}\n    for word, c in vocab.items():\n        out, i = [], 0\n        while i < len(word):\n            if i + 1 < len(word) and (word[i], word[i + 1]) == best:\n                out.append(word[i] + word[i + 1])\n                i += 2\n            else:\n                out.append(word[i])\n                i += 1\n        key = tuple(out)\n        new_vocab[key] = new_vocab.get(key, 0) + c\n    return best, new_vocab",
  "hints": ["Count pairs with zip(word, word[1:]) weighted by the word count.", "Pick the pair with min(pairs, key=lambda p: (-pairs[p], p)); merge left to right with an index loop."]
}
```

> [!TIP] Interview tips
> - Explain why subword tokenization removes the OOV problem while keeping sequences short, and name BPE vs WordPiece vs SentencePiece.
> - Pitfall: tokenizers differ across models; always use the tokenizer that matches the checkpoint, and remember token counts (not words) drive cost and context limits.
> - Say stemming is a crude heuristic and lemmatization is linguistic; for transformer pipelines you usually do neither.
