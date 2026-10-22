---
id: nlp-llms-synthetic-data-and-data-curation
title: Synthetic data and data curation for LLMs
estimatedMinutes: 13
difficulty: medium
tags: [nlp, llm, data-curation, deduplication, minhash, synthetic-data, decontamination]
---

## Why it matters
Data quality is the largest lever in LLM training, often more than architecture. Interviewers ask how web-scale corpora are filtered and deduplicated, when synthetic data helps, and what can go wrong (see Pre-training objectives, Instruction tuning and Scaling laws for context).

## Concept
**Curation pipeline** (web text, e.g. Common Crawl)
1. **Extraction and language ID**: strip HTML boilerplate, detect language (fastText).
2. **Heuristic filters**: length, symbol-to-word ratio, repeated lines or n-grams, stop-word presence, bullet/ellipsis ratios (Gopher, C4-style rules).
3. **Quality classifier**: train a fastText or small-LM classifier to separate reference-quality text (Wikipedia, books, curated links) from random crawl, then keep the top fraction. Model-based filters (FineWeb-Edu style "educational value" scores) trade diversity for quality, and can bake in the bias of the reference set.
4. **Deduplication**: removes memorisation and wasted compute. **Exact** (hash of the document or line), **near-duplicate** (MinHash + LSH over shingles), and **substring** dedup (suffix arrays) for repeated boilerplate. Duplicated data increases verbatim regurgitation and hurts generalisation.
5. **Safety and privacy**: toxicity filters, PII scrubbing, license checks.
6. **Decontamination**: drop training documents sharing n-grams (e.g. 13-grams) with evaluation sets.
7. **Mixture and curriculum**: weight sources (web, code, math, books, multilingual); upsample high quality and anneal on it at the end of training.

**MinHash + LSH**: represent each doc by its set of word $n$-gram shingles. The probability that a random hash gives the same minimum for two sets equals their **Jaccard similarity** $J = |A \cap B|/|A \cup B|$, so the fraction of matching positions in a signature of $k$ hashes estimates $J$. LSH splits the signature into $b$ bands of $r$ rows; two docs become candidates if any band matches entirely, with probability $1 - (1 - J^r)^b$ (an S-curve with threshold near $(1/b)^{1/r}$).

**Synthetic data**
- **Uses**: instruction/chat data (Self-Instruct, distillation from a stronger model), reasoning traces filtered by a verifier (rejection sampling), code with unit tests, "textbook-style" rewrites (Phi), web rephrasing, preference data, and synthetic data for low-resource languages or rare scenarios.
- **Quality control**: verifiable checks (tests, answer match, a reward model or judge), diversity controls (seed topics, personas, dedup), and human audits.
- **Risks**: **model collapse** when models train recursively on their own outputs and the tails of the distribution vanish (mitigate by mixing in real data); error amplification and hallucinated facts; low diversity; benchmark leakage; and **licensing / terms of use** limits when distilling from a proprietary model.
- Synthetic data teaches *format and skills* well, but does not reliably add new knowledge.

## Worked example
Two documents. A: "the cat sat on the mat", B: "the cat sat on the rug". Word 2-shingles:
- A: {the cat, cat sat, sat on, on the, the mat}, B: {the cat, cat sat, sat on, on the, the rug}.
- Intersection 4, union 6, so $J = 4/6 = 0.667$. A signature with 128 hashes has a standard error of $\sqrt{0.667 \cdot 0.333/128} = 0.042$ around that.

LSH with $b = 20$ bands of $r = 5$ rows (100 hashes): a pair with $J = 0.8$ becomes a candidate with probability $1 - (1 - 0.8^5)^{20} = 1 - 0.672^{20} = 0.9996$, while a pair with $J = 0.5$ does so with probability $1 - (1 - 0.5^5)^{20} = 0.470$. The knee is near $(1/20)^{1/5} = 0.55$. Candidates are then verified with exact Jaccard.

Scale intuition: a 1B-document corpus cannot be compared pairwise ($\sim 5 \times 10^{17}$ pairs); LSH makes it near-linear.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In MinHash, the probability that two documents' signatures agree at one position equals what?",
  "options": ["The Jaccard similarity of their shingle sets", "Their cosine similarity", "The ratio of their lengths", "The number of words they share"],
  "answer": 0,
  "explanation": "For a random hash, the minimum over $A \\cup B$ lies in $A \\cap B$ with probability $|A \\cap B|/|A \\cup B|$, which is exactly the Jaccard similarity."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the main risk of repeatedly training each new model generation on the previous model's outputs?",
  "options": ["Model collapse: the tails of the distribution vanish and diversity and fidelity degrade", "The vocabulary grows", "Training is slower but quality is unchanged", "Gradients always explode"],
  "answer": 0,
  "explanation": "Recursive training on own outputs amplifies biases and loses rare patterns. Mitigate by retaining real data, verifier filtering and diversity controls."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `shingles(text, n)` (lower-cased word $n$-grams joined by a space, as a set), `jaccard(a, b)`, `minhash_signature(items, k)` (use the provided deterministic `h(item, seed)`; entry `seed` is the minimum over items), `est_jaccard(sig_a, sig_b)` (fraction of matching positions), `lsh_prob(s, b, r)`, and `contaminated(doc, bench_ngrams, n)` returning True if any word $n$-gram of the document is in the benchmark n-gram set.",
  "starterCode": "MASK = (1 << 64) - 1\n\ndef h(item, seed):\n    x = (14695981039346656037 ^ ((seed + 1) * 0x9E3779B97F4A7C15)) & MASK\n    for b in str(item).encode():\n        x ^= b\n        x = (x * 1099511628211) & MASK\n    x ^= x >> 33\n    x = (x * 0xFF51AFD7ED558CCD) & MASK\n    x ^= x >> 33\n    return x\n\ndef shingles(text, n):\n    pass\n\ndef jaccard(a, b):\n    pass\n\ndef minhash_signature(items, k):\n    pass\n\ndef est_jaccard(sig_a, sig_b):\n    pass\n\ndef lsh_prob(s, b, r):\n    pass\n\ndef contaminated(doc, bench_ngrams, n):\n    pass\n\nprint(shingles(\"the cat sat on the mat\", 2))",
  "tests": "A = shingles(\"the cat sat on the mat\", 2)\nB = shingles(\"the cat sat on the rug\", 2)\nassert A == {\"the cat\", \"cat sat\", \"sat on\", \"on the\", \"the mat\"}\nassert abs(jaccard(A, B) - 4 / 6) < 1e-12\nassert jaccard(set(), set()) == 0.0\nX = {\"t%d\" % i for i in range(0, 100)}\nY = {\"t%d\" % i for i in range(50, 150)}\nsx = minhash_signature(X, 256)\nsy = minhash_signature(Y, 256)\nassert len(sx) == 256\nassert est_jaccard(sx, minhash_signature(X, 256)) == 1.0\nassert abs(est_jaccard(sx, sy) - 50 / 150) < 0.1\nassert abs(lsh_prob(0.8, 20, 5) - 0.99964394) < 1e-6\nassert abs(lsh_prob(0.5, 20, 5) - 0.47005072) < 1e-6\nassert lsh_prob(0.0, 20, 5) == 0.0 and lsh_prob(1.0, 20, 5) == 1.0\nbench = shingles(\"what is the capital of france\", 4)\nassert contaminated(\"what is the capital of france please\", bench, 4)\nassert not contaminated(\"the capital city of france is paris\", bench, 4)",
  "solution": "MASK = (1 << 64) - 1\n\ndef h(item, seed):\n    x = (14695981039346656037 ^ ((seed + 1) * 0x9E3779B97F4A7C15)) & MASK\n    for b in str(item).encode():\n        x ^= b\n        x = (x * 1099511628211) & MASK\n    x ^= x >> 33\n    x = (x * 0xFF51AFD7ED558CCD) & MASK\n    x ^= x >> 33\n    return x\n\ndef shingles(text, n):\n    w = text.lower().split()\n    return {\" \".join(w[i:i + n]) for i in range(len(w) - n + 1)}\n\ndef jaccard(a, b):\n    u = a | b\n    return len(a & b) / len(u) if u else 0.0\n\ndef minhash_signature(items, k):\n    return [min(h(x, s) for x in items) for s in range(k)]\n\ndef est_jaccard(sig_a, sig_b):\n    return sum(1 for a, b in zip(sig_a, sig_b) if a == b) / len(sig_a)\n\ndef lsh_prob(s, b, r):\n    return 1 - (1 - s ** r) ** b\n\ndef contaminated(doc, bench_ngrams, n):\n    return len(shingles(doc, n) & bench_ngrams) > 0",
  "hints": ["Split on whitespace after lower(); a text with w words has w - n + 1 shingles.", "Jaccard of two empty sets is defined as 0.0 here to avoid dividing by zero.", "contaminated: intersect the document's shingles with the benchmark set."]
}
```

> [!TIP] Interview tips
> - Walk the pipeline in order: extraction, heuristics, quality classifier, dedup, safety/PII, decontamination, mixture weights.
> - Explain MinHash estimating Jaccard, the LSH $1-(1-s^r)^b$ S-curve, and why it is needed (no pairwise comparison at scale).
> - For synthetic data cover verifier filtering, diversity, model collapse and licensing; it teaches skills and format, not guaranteed new knowledge.
