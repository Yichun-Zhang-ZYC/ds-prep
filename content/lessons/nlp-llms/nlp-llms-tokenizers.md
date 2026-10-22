---
id: nlp-llms-tokenizers
title: Tokenizers (BPE, WordPiece)
estimatedMinutes: 12
difficulty: medium
tags: [nlp, tokenization, bpe, wordpiece, subword]
---

## Why it matters
Tokenization decides sequence length, vocabulary size, cost per request and how a model handles rare words, numbers and other languages. Interviewers ask how BPE is trained, how WordPiece differs, and why subwords beat words or characters.

## Concept
**Why subwords**: word-level vocabularies explode and hit out-of-vocabulary (OOV) words; character-level sequences are very long. Subword tokenizers keep frequent words whole and split rare words into pieces, so nothing is OOV and sequences stay short.

**BPE (byte-pair encoding)** (GPT-2/3/4, Llama, RoBERTa)
1. Pre-tokenize into words (split on whitespace/regex) and count them; start with characters (or bytes) as the vocabulary.
2. Repeatedly find the **most frequent adjacent pair** and merge it into a new symbol; record the merge.
3. Stop at the target vocabulary size (e.g. 32k-200k).
4. **Encoding**: split a word into characters, then apply the merges in the order learned.
- **Byte-level BPE** starts from the 256 bytes, so any Unicode text is representable with no unknown token.

**WordPiece** (BERT, DistilBERT)
- Same loop, but the merge score is $\dfrac{\text{count}(ab)}{\text{count}(a)\,\text{count}(b)}$ (likelihood gain), which favours pairs whose parts rarely appear apart.
- Continuation pieces carry a `##` prefix: `unhappiness` $\to$ `un ##happi ##ness`. Encoding uses greedy **longest match first**.

**Unigram / SentencePiece** (T5, Llama 1/2): start with a big vocabulary and prune pieces by likelihood loss; SentencePiece treats whitespace as a symbol (`▁`), so it is language-agnostic.

**Practical effects**
- Larger vocabulary: shorter sequences but a bigger embedding matrix and sparser rows for rare tokens.
- Tokenization drives cost and context limits: roughly 1 token $\approx$ 4 English characters or 0.75 words; other languages and code often need more tokens.
- Typical failure modes: poor arithmetic and spelling (digits split inconsistently), glitch tokens, whitespace sensitivity. A tokenizer is fixed after pre-training; changing it means retraining or an embedding transplant.

## Worked example
Corpus word counts: `hug`:10, `pug`:5, `pun`:12, `bun`:4, `hugs`:5.

Pair counts: `(u,g)` = 10+5+5 = 20, `(p,u)` = 5+12 = 17, `(u,n)` = 12+4 = 16, `(h,u)` = 15, `(g,s)` = 5, `(b,u)` = 4.

- Merge 1: `u g` $\to$ `ug` (20). Now `(u,n)`=16, `(h,ug)`=15, `(p,u)`=12.
- Merge 2: `u n` $\to$ `un` (16). Now `(h,ug)`=15, `(p,un)`=12.
- Merge 3: `h ug` $\to$ `hug` (15).

`hugs` encodes as `hug` + `s`; `bug` as `b` + `ug`. WordPiece on the same corpus first merges `(g,s)`: score $5/(20 \cdot 5) = 0.05$, versus $20/(36 \cdot 20) \approx 0.028$ for `(u,g)`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the main advantage of byte-level BPE over character-level BPE?",
  "options": [
    "Faster training",
    "Any Unicode string can be encoded with no unknown token, using a base vocabulary of only 256 symbols",
    "It produces longer sequences",
    "It removes the need for merges"
  ],
  "answer": 1,
  "explanation": "Every string is a byte sequence, so nothing is out of vocabulary; merges then build common multi-byte pieces."
}
```

```quiz
{
  "id": "q2",
  "question": "How does WordPiece choose which pair to merge?",
  "options": [
    "Most frequent pair",
    "Pair maximising count(ab) / (count(a) * count(b))",
    "Longest pair",
    "Random pair"
  ],
  "answer": 1,
  "explanation": "The score approximates the likelihood gain of the merge, favouring pairs whose parts rarely occur separately; BPE uses raw frequency."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `learn_bpe(word_freqs, num_merges)` where `word_freqs` maps word to count. Start with each word as a list of characters, and for each merge pick the adjacent pair with the highest weighted count (ties: the lexicographically smallest pair), merge it everywhere, and record it. Return the list of merged pairs. Then write `bpe_encode(word, merges)` that splits a word into characters and applies the merges in learned order.",
  "starterCode": "def learn_bpe(word_freqs, num_merges):\n    pass\n\ndef bpe_encode(word, merges):\n    pass\n\nfreqs = {'hug': 10, 'pug': 5, 'pun': 12, 'bun': 4, 'hugs': 5}\nm = learn_bpe(freqs, 3)\nprint(m, bpe_encode('hugs', m))",
  "tests": "freqs = {'hug': 10, 'pug': 5, 'pun': 12, 'bun': 4, 'hugs': 5}\nm = learn_bpe(freqs, 3)\nassert m == [('u', 'g'), ('u', 'n'), ('h', 'ug')]\nassert bpe_encode('hugs', m) == ['hug', 's']\nassert bpe_encode('bug', m) == ['b', 'ug']\nassert bpe_encode('pun', m) == ['p', 'un']\nassert bpe_encode('xyz', m) == ['x', 'y', 'z']\nassert learn_bpe({'ab': 1}, 5) == [('a', 'b')]\nassert learn_bpe(freqs, 0) == []",
  "solution": "from collections import Counter\n\ndef _merge_word(symbols, pair):\n    out, i = [], 0\n    while i < len(symbols):\n        if i + 1 < len(symbols) and (symbols[i], symbols[i + 1]) == pair:\n            out.append(symbols[i] + symbols[i + 1])\n            i += 2\n        else:\n            out.append(symbols[i])\n            i += 1\n    return out\n\ndef learn_bpe(word_freqs, num_merges):\n    words = {w: list(w) for w in word_freqs}\n    merges = []\n    for _ in range(num_merges):\n        counts = Counter()\n        for w, syms in words.items():\n            for pair in zip(syms, syms[1:]):\n                counts[pair] += word_freqs[w]\n        if not counts:\n            break\n        best = min(counts, key=lambda p: (-counts[p], p))\n        merges.append(best)\n        words = {w: _merge_word(s, best) for w, s in words.items()}\n    return merges\n\ndef bpe_encode(word, merges):\n    symbols = list(word)\n    for pair in merges:\n        symbols = _merge_word(symbols, pair)\n    return symbols",
  "hints": [
    "Count pairs with `zip(symbols, symbols[1:])`, adding the word's frequency each time.",
    "Pick the best with `min(counts, key=lambda p: (-counts[p], p))`, then rebuild every word merging that pair left to right."
  ]
}
```

> [!TIP] Interview tips
> - Describe BPE in one breath: start from characters/bytes, greedily merge the most frequent adjacent pair until the vocabulary is full.
> - Say how WordPiece differs (likelihood-based score, `##` prefix, longest-match encoding) and that byte-level BPE has no unknown tokens.
> - Link tokenization to cost, context length and failure modes (numbers, non-English text).

