---
id: nlp-llms-multimodal-models
title: Multimodal Models (vision-language)
estimatedMinutes: 12
difficulty: medium
tags: [nlp, llm, multimodal, vision-language, clip, vit]
---

## Why it matters
Modern assistants read images, charts and screenshots. Interviewers ask how images become tokens, how CLIP is trained, and how a vision encoder is attached to an LLM.

## Concept
**Vision Transformer (ViT)**: split an image into $P \times P$ patches, flatten and linearly project each to an embedding, add position embeddings, and run a Transformer encoder. An $H \times W$ image gives $(H/P)(W/P)$ patch tokens, so **resolution drives token cost**.

**Three common designs**:
- **Dual encoder, contrastive (CLIP, SigLIP)**: an image encoder and a text encoder map into a shared space. For a batch of $N$ pairs, the logits are $S_{ij} = \cos(v_i, t_j)/\tau$ with a learned temperature $\tau$, and the loss is a symmetric cross-entropy: image-to-text over rows plus text-to-image over columns, with the diagonal as the positives. The $N^2 - N$ off-diagonal pairs are in-batch negatives, so large batches matter. Gives **zero-shot classification** by comparing an image to prompts like "a photo of a {class}", and retrieval. It cannot generate text. SigLIP replaces the softmax with a per-pair sigmoid loss.
- **Bridged LLM (LLaVA, BLIP-2, Flamingo)**: a (usually frozen) vision encoder produces patch features; a **projector** (MLP, or a Q-Former or cross-attention resampler) maps them to the LLM's embedding space as "visual tokens" that are prepended to the text. Training is two-stage: first align the projector on caption data, then **visual instruction tuning** on VQA/chat data.
- **Native multimodal (Gemini, GPT-4o)**: one model trained from scratch on interleaved text, image, audio tokens. Strongest cross-modal reasoning, most expensive to build.

**Known issues**:
- **Object hallucination**: describing things that are not in the image, because the language prior overrides weak visual evidence.
- Weak fine-grained spatial reasoning, counting and small-text OCR, mitigated by higher resolution or image tiling at the cost of tokens.
- Evaluation: VQA, MMMU, DocVQA/ChartQA, POPE for hallucination. Image-text data quality (alt-text noise) matters more than size.

## Worked example
A 224 × 224 image with $P = 16$ gives $14 \times 14 = 196$ tokens. LLaVA-1.5 uses 336 × 336 with $P = 14$, so $24 \times 24 = 576$ visual tokens per image; a prompt with 4 images spends 2,304 tokens before any text, which is why tiling and token-pooling are cost decisions.

CLIP with batch $N = 32{,}768$ computes a similarity matrix with $32{,}768^2 \approx 1.07 \times 10^9$ entries. For $N = 2$ with sims $[[1,0],[0,1]]$ and $\tau = 1$, each row's loss is $-\ln\frac{e}{e+1} = \ln(1 + e^{-1}) \approx 0.313$, and the columns give the same value.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In CLIP training with a batch of N image-text pairs, what are the negatives for image i?",
  "options": [
    "Only augmentations of image i",
    "The N-1 other texts in the batch",
    "All texts in the whole dataset",
    "There are no negatives"
  ],
  "answer": 1,
  "explanation": "The N x N similarity matrix has the matching pair on the diagonal; the other N-1 texts in the batch act as negatives, which is why large batches help."
}
```

```quiz
{
  "id": "q2",
  "question": "In a LLaVA-style model, what does the projector do?",
  "options": [
    "Generates image captions",
    "Maps vision-encoder patch features into the LLM's token-embedding space",
    "Replaces the tokenizer",
    "Quantizes the image"
  ],
  "answer": 1,
  "explanation": "The projector turns patch features into visual tokens the LLM can attend to. It is trained first on caption data while the encoder and LLM stay frozen, then tuned with instruction data."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `num_patches(height, width, patch)` (number of non-overlapping square patches) and `clip_loss(sim, temperature)`: `sim` is an N×N list of image-text similarities with matching pairs on the diagonal. Divide by the temperature, take cross-entropy of each row against its diagonal index (image-to-text) and of each column (text-to-image), and return the average of the two mean losses.",
  "starterCode": "import math\n\ndef num_patches(height, width, patch):\n    pass\n\ndef clip_loss(sim, temperature):\n    # sim: N x N image-text similarity matrix, matches on the diagonal\n    pass\n\nprint(num_patches(336, 336, 14))",
  "tests": "assert num_patches(224, 224, 16) == 196\nassert num_patches(336, 336, 14) == 576\nassert num_patches(448, 224, 16) == 28 * 14\nloss = clip_loss([[1.0, 0.0], [0.0, 1.0]], 1.0)\nassert abs(loss - math.log(1 + math.exp(-1))) < 1e-9\nassert clip_loss([[1.0, 0.0], [0.0, 1.0]], 0.01) < 1e-6\nbad = clip_loss([[0.0, 1.0], [1.0, 0.0]], 1.0)\nassert bad > loss\nassert abs(clip_loss([[0.3, 0.3], [0.3, 0.3]], 0.5) - math.log(2)) < 1e-9\nasym = clip_loss([[2.0, 0.0, 0.0], [0.0, 1.0, 1.0], [0.0, 0.0, 3.0]], 1.0)\nassert asym > 0",
  "solution": "import math\n\ndef num_patches(height, width, patch):\n    return (height // patch) * (width // patch)\n\ndef _ce_diag(logits):\n    total = 0.0\n    for i, row in enumerate(logits):\n        m = max(row)\n        lse = m + math.log(sum(math.exp(v - m) for v in row))\n        total += lse - row[i]\n    return total / len(logits)\n\ndef clip_loss(sim, temperature):\n    logits = [[v / temperature for v in row] for row in sim]\n    cols = [list(c) for c in zip(*logits)]\n    return (_ce_diag(logits) + _ce_diag(cols)) / 2",
  "hints": [
    "Cross-entropy for row i = logsumexp(row) - row[i]; use the max-subtraction trick.",
    "Columns are the transpose: zip(*logits)."
  ]
}
```

> [!TIP] Interview tips
> - Describe ViT patching and compute the token count; mention resolution vs cost.
> - Give the CLIP loss in one line (symmetric InfoNCE, in-batch negatives, learned temperature) and zero-shot usage.
> - For VLMs: frozen vision encoder + projector + LLM, two-stage training, and object hallucination as the main failure.
