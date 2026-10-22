---
id: nlp-llms-tokenization-pitfalls
title: Tokenization pitfalls in practice
estimatedMinutes: 12
difficulty: medium
tags: [nlp, llm, tokenization, bpe, unicode, chat-template, evaluation]
---

## Why it matters
Many puzzling LLM failures (bad arithmetic, can't count letters, odd behaviour at the end of a prompt, higher bills in some languages) trace back to tokenization. Interviewers use these to test whether you understand that the model sees token ids, not characters (see Tokenizers (BPE, WordPiece) for how vocabularies are built).

## Concept
**The model never sees characters.** Everything below follows from that.

**Whitespace and case**
- In byte-level BPE, " the" (with a leading space) and "the" are **different tokens**, as are "The", " The" and "THE". The same word can have several ids and embeddings, and rare variants are less well trained.
- **Trailing space in prompts**: ending a prompt with a space forces the next token to be a no-space variant, which is unnatural (the model normally merges the space into the next word). Strip trailing whitespace, or use *token healing*.
- Indentation and newlines in code have their own tokens; inconsistent formatting changes the input distribution.

**Numbers and characters**
- Numbers are chunked arbitrarily ("12345" may become "123" + "45"), so digit alignment is inconsistent and arithmetic suffers. Newer tokenizers split digits individually or into fixed groups, ideally right-aligned.
- Spelling, counting letters, reversing strings and rhyming are hard because the characters are hidden inside tokens. Tools (code execution) or spelling out letters first are the usual fix.

**Languages and cost**
- **Fertility** (tokens per word) varies widely: English is efficient while many other languages, scripts and emoji need 2-5x more tokens (byte fallback gives up to 3-4 tokens per CJK character in small vocabularies). That means higher cost, less effective context and sometimes weaker quality.

**Vocabulary artefacts**
- **Glitch / under-trained tokens**: strings that made it into the vocabulary (from the tokenizer's training data) but almost never appeared in model training (SolidGoldMagikarp, Reddit usernames) have near-random embeddings and cause odd outputs. Audit by embedding norm or by prompting.
- **Unicode**: the same visible text can have different code points (composed "é" vs "e" + combining accent), plus homoglyphs and zero-width characters. Normalise (NFC/NFKC) consistently, and know that normalisation can also destroy information.

**Special tokens and templates**
- Chat models rely on special tokens and a chat template. Using the wrong template at fine-tuning or serving is a silent quality loss. Double BOS tokens, missing EOS, wrong padding side and **special-token injection** (user text containing `<|im_start|>` being parsed as control tokens) are classic bugs; disable special-token parsing on untrusted text.

**Evaluation and engineering**
- **Perplexity is not comparable across tokenizers** because the number of tokens differs. Compare **bits per byte** (or per character): $\text{BPB} = \dfrac{\sum \text{NLL (nats)}}{\ln 2 \cdot \text{bytes}}$.
- Count tokens with the model's own tokenizer for billing, truncation and context limits; heuristics like 4 characters per token drift by language and content.
- Truncating at a token boundary in a streaming decoder can split a multi-byte UTF-8 character; buffer partial bytes. Constrained decoding (JSON, regex) must respect token boundaries.
- Changing the tokenizer after pre-training invalidates the embeddings; it needs vocabulary extension and continued training.

## Worked example
**Leading space**: with a vocabulary containing "the" and " the", the text "the cat" tokenizes as ["the", " cat"] but "I see the cat" has [" the"] in the middle. Same word, different id, so any exact-token matching (stop strings, logit bias, constrained decoding) has to cover both.

**Fertility cost**: an English sentence of 20 words takes about 26 tokens; a translation in a language with fertility 3.0 takes 60 tokens. At equal price per token it costs 2.3x more and uses 2.3x more context.

**Comparing tokenizers fairly**: model A (32k vocabulary) gets 2.0 nats per token on a text of 4,000 bytes that it splits into 1,000 tokens. Model B (128k vocabulary) gets 2.4 nats per token over 700 tokens of the same text.
- A: $2000 / (4000 \ln 2) = 0.721$ bits per byte.
- B: $1680 / (4000 \ln 2) = 0.606$ bits per byte.
B's per-token loss is higher (2.4 vs 2.0) and its perplexity is $e^{2.4} = 11.0$ vs $e^{2.0} = 7.4$, yet B models the text better, which only the per-byte metric shows.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can't you directly compare per-token perplexity of two models that use different tokenizers?",
  "options": ["The same text splits into different numbers of tokens, so per-token loss means different things; compare bits per byte (or per character)", "Perplexity can only be computed on the same GPU", "Larger-vocabulary models always have zero loss", "Perplexity only applies to encoder models"],
  "answer": 0,
  "explanation": "Total NLL divided by token count depends on tokenization granularity. Dividing by bytes (BPB) gives a tokenizer-independent measure."
}
```

```quiz
{
  "id": "q2",
  "question": "A prompt ends with \"The answer is \" (trailing space) and output quality drops. What is the most likely cause?",
  "options": ["The trailing space becomes its own token and forces the next token to be a no-space variant, which is atypical of training tokenization", "The space invalidates the KV cache", "The space triggers a safety filter", "The space doubles the context length"],
  "answer": 0,
  "explanation": "In BPE the space normally merges into the next word (\" 42\"). A dangling trailing space is a rare tokenization, so strip trailing whitespace or use token healing."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `greedy_tokenize(text, vocab)` (longest match first; if nothing in the vocabulary matches at a position, emit one character as a token), `fertility(tokens, text)` (tokens per whitespace-separated word), `bits_per_byte(total_nats, n_bytes)`, `nfc_equal(a, b)` (compare after `unicodedata` NFC normalisation) and `utf8_len(s)` (number of UTF-8 bytes).",
  "starterCode": "import math\nimport unicodedata\n\ndef greedy_tokenize(text, vocab):\n    pass\n\ndef fertility(tokens, text):\n    pass\n\ndef bits_per_byte(total_nats, n_bytes):\n    pass\n\ndef nfc_equal(a, b):\n    pass\n\ndef utf8_len(s):\n    pass\n\nprint(greedy_tokenize(\"the cat\", {\"the\", \" cat\"}))",
  "tests": "import math\nvocab = {\"the\", \" the\", \" cat\", \"cat\", \"t\", \"h\", \"e\", \" \", \"c\", \"a\"}\nassert greedy_tokenize(\"the cat\", vocab) == [\"the\", \" cat\"]\nassert greedy_tokenize(\"I see the cat\", vocab | {\"I\", \" see\"}) == [\"I\", \" see\", \" the\", \" cat\"]\nassert greedy_tokenize(\" the\", vocab) == [\" the\"]\nassert greedy_tokenize(\"the\", vocab) == [\"the\"]\nassert greedy_tokenize(\"zq\", vocab) == [\"z\", \"q\"]\nassert greedy_tokenize(\"\", vocab) == []\nassert \"\".join(greedy_tokenize(\"the cat zzz\", vocab)) == \"the cat zzz\"\nassert abs(fertility([\"Hel\", \"lo\", \" wor\", \"ld\"], \"Hello world\") - 2.0) < 1e-12\nassert abs(bits_per_byte(2000, 4000) - 0.7213475204444818) < 1e-9\nassert abs(bits_per_byte(1680, 4000) - 0.6059319171733647) < 1e-9\nassert bits_per_byte(1680, 4000) < bits_per_byte(2000, 4000)\na = \"caf\\u00e9\"\nb = \"cafe\\u0301\"\nassert a != b and nfc_equal(a, b)\nassert not nfc_equal(\"cafe\", a)\nassert utf8_len(\"hello\") == 5 and utf8_len(\"\\u4f60\\u597d\") == 6",
  "solution": "import math\nimport unicodedata\n\ndef greedy_tokenize(text, vocab):\n    out = []\n    i = 0\n    longest = max((len(v) for v in vocab), default=1)\n    while i < len(text):\n        for j in range(min(len(text), i + longest), i, -1):\n            if text[i:j] in vocab:\n                out.append(text[i:j])\n                i = j\n                break\n        else:\n            out.append(text[i])\n            i += 1\n    return out\n\ndef fertility(tokens, text):\n    return len(tokens) / len(text.split())\n\ndef bits_per_byte(total_nats, n_bytes):\n    return total_nats / (n_bytes * math.log(2))\n\ndef nfc_equal(a, b):\n    return unicodedata.normalize(\"NFC\", a) == unicodedata.normalize(\"NFC\", b)\n\ndef utf8_len(s):\n    return len(s.encode(\"utf-8\"))",
  "hints": ["At each position try the longest candidate substring first and shrink until it is in the vocabulary.", "for/else is handy: the else branch runs when no candidate matched.", "BPB = total_nats / (n_bytes * ln 2); unicodedata.normalize('NFC', s) composes characters."]
}
```

> [!TIP] Interview tips
> - Open with: the model sees token ids, not characters; then give examples: leading space, number chunking, letter counting, multilingual cost.
> - Mention silent bugs: special-token injection, chat-template mismatch, duplicated BOS, and how to fix them.
> - Compare models with bits per byte, not perplexity; count tokens for billing and truncation with the model's own tokenizer.
