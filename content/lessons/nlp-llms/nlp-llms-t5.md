---
id: nlp-llms-t5
title: T5 (encoder-decoder)
estimatedMinutes: 11
difficulty: medium
tags: [nlp, transformers, t5, encoder-decoder, seq2seq]
---

## Why it matters
T5 is the canonical encoder-decoder transformer and a favourite for comparing architectures. Interviewers ask how it differs from BERT and GPT, what span corruption is, and when a seq2seq model is the right choice.

## Concept
**Text-to-text framing**: every task is string in, string out, selected by a prefix: `translate English to German: ...`, `summarize: ...`, `cola sentence: ...`. One model, one loss (cross-entropy on target tokens), one decoding procedure.

**Architecture**
- **Encoder**: bidirectional self-attention over the input, run once.
- **Decoder**: causal self-attention over the tokens generated so far, plus **cross-attention** where queries come from the decoder and keys/values from the encoder output.
- T5 uses relative position biases, pre-layer-norm without bias, and a SentencePiece vocabulary of 32k. Sizes range from 60M (small) to 11B.

**Pre-training: span corruption (denoising)**
- Drop about 15% of tokens in contiguous spans (mean length 3) and replace each span with a unique sentinel `<extra_id_k>`.
- The target is the sentinels followed by the dropped tokens, ending with a final sentinel. Short targets make training cheaper than reconstructing the whole input.
- Pre-trained on C4 (cleaned Common Crawl); the paper's ablations compared objectives, architectures and data.

**Choosing a family**
- **Encoder-decoder**: translation, summarisation, structured output where input and output are distinct; the encoder reads the input bidirectionally and cross-attention gives direct access to it.
- **Decoder-only**: general chat and in-context learning; simpler and scales cleanly.
- **Encoder-only**: classification, retrieval, tagging.
- **Variants**: mT5 (multilingual), Flan-T5 (instruction-tuned), UL2 (mixed denoising objectives), ByT5 (bytes).
- **Cost note**: each token passes through only the encoder or only the decoder, so an encoder-decoder with $2P$ parameters has about the same FLOPs per token as a decoder-only model with $P$ parameters.

## Worked example
Input sentence: `Thank you for inviting me to your party last week`. Corrupt tokens 2-3 (`for inviting`) and token 8 (`last`):

- Encoder input: `Thank you <X0> me to your party <X1> week`
- Decoder target: `<X0> for inviting <X1> last <X2>`

The encoder sees 8 tokens, the decoder produces 6, instead of reconstructing all 10. Cross-attention lets each decoder step look at all encoder positions.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In a T5 decoder, where do the keys and values of cross-attention come from?",
  "options": [
    "The decoder's previous layer",
    "The encoder's final output",
    "The input embeddings",
    "The target tokens"
  ],
  "answer": 1,
  "explanation": "Cross-attention queries come from the decoder; keys and values come from the encoder output, giving the decoder access to the whole input."
}
```

```quiz
{
  "id": "q2",
  "question": "Why does T5's span-corruption target contain only the dropped spans, not the full sentence?",
  "options": [
    "The decoder is bidirectional",
    "A shorter target makes pre-training cheaper while still forcing the model to recover the missing content",
    "Sentinels cannot be repeated",
    "The encoder is frozen"
  ],
  "answer": 1,
  "explanation": "Predicting about 15% of the tokens costs far fewer decoder steps than regenerating the input, yet still teaches language understanding."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `span_corrupt(tokens, spans)` where `spans` is a sorted list of non-overlapping `(start, end)` pairs (end exclusive). Return `(inputs, targets)`: in `inputs` each span is replaced by the sentinel `<extra_id_k>` (k = span index); `targets` is, for each span, its sentinel followed by the dropped tokens, and ends with one extra final sentinel `<extra_id_n>` (n = number of spans).",
  "starterCode": "def span_corrupt(tokens, spans):\n    pass\n\ntoks = 'Thank you for inviting me to your party last week'.split()\nprint(span_corrupt(toks, [(2, 4), (8, 9)]))",
  "tests": "toks = 'Thank you for inviting me to your party last week'.split()\ni, t = span_corrupt(toks, [(2, 4), (8, 9)])\nassert i == 'Thank you <extra_id_0> me to your party <extra_id_1> week'.split()\nassert t == '<extra_id_0> for inviting <extra_id_1> last <extra_id_2>'.split()\ni, t = span_corrupt(['a', 'b', 'c'], [])\nassert i == ['a', 'b', 'c'] and t == ['<extra_id_0>']\ni, t = span_corrupt(['a', 'b', 'c'], [(0, 3)])\nassert i == ['<extra_id_0>'] and t == ['<extra_id_0>', 'a', 'b', 'c', '<extra_id_1>']",
  "solution": "def span_corrupt(tokens, spans):\n    inputs, targets = [], []\n    pos = 0\n    for k, (s, e) in enumerate(spans):\n        sentinel = \"<extra_id_%d>\" % k\n        inputs += tokens[pos:s] + [sentinel]\n        targets += [sentinel] + tokens[s:e]\n        pos = e\n    inputs += tokens[pos:]\n    targets.append(\"<extra_id_%d>\" % len(spans))\n    return inputs, targets",
  "hints": [
    "Walk through the spans keeping a pointer to the end of the previous span; copy the tokens between spans into the inputs.",
    "Append the final sentinel to the targets after the loop."
  ]
}
```

> [!TIP] Interview tips
> - Contrast the three families by attention pattern: bidirectional (BERT), causal (GPT), bidirectional encoder plus causal decoder with cross-attention (T5).
> - Explain span corruption and why it has sentinel tokens and a short target.
> - Mention text-to-text: new tasks need only a prefix, no new heads.

