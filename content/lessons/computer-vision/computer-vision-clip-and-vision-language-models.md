---
id: computer-vision-clip-and-vision-language-models
title: "CLIP & vision-language models"
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, clip, contrastive-learning, vision-language, multimodal]
---

## Why it matters
CLIP turned image classification into an open-vocabulary, text-driven problem, and its encoders power search, zero-shot classifiers, text-to-image models and multimodal LLMs. Interviewers ask for the contrastive loss, how zero-shot works, and where CLIP fails.

## Concept
**CLIP** trains two encoders, an image encoder (ViT or ResNet) and a text Transformer, on ~400M web image-caption pairs. Both outputs are projected to a shared space and L2-normalized. For a batch of $N$ pairs, the similarity matrix is $S_{ij} = \tau^{-1}\, \hat v_i \cdot \hat t_j$ with a learned temperature $\tau$. The loss is a symmetric **InfoNCE** cross-entropy: row $i$ should pick text $i$ among $N$ candidates, and column $j$ should pick image $j$:

$$\mathcal{L} = \tfrac{1}{2}\left[\mathrm{CE}(S, \text{diag}) + \mathrm{CE}(S^\top, \text{diag})\right]$$

The other $N - 1$ items in the batch are the negatives, so large batches (tens of thousands) help.

**Zero-shot classification**: embed prompts like "a photo of a {class}" for every class, embed the image, and pick the most similar prompt (softmax over cosine similarities scaled by $1/\tau$, about 100). No task-specific training; prompt wording and ensembling matter. A **linear probe** on frozen features is the next step up in accuracy; fine-tuning can hurt robustness.

**Uses**: image-text retrieval, filtering/dedup of datasets, zero-shot labeling (e.g. labeling SAM masks), conditioning for diffusion models, and as the vision tower in multimodal models.

**Beyond CLIP**
- **OpenCLIP / LAION**, **ALIGN**: open or noisier-data variants. **SigLIP** replaces softmax with a per-pair sigmoid loss, which decouples loss from batch size.
- **Generative VLMs** connect a vision encoder to an LLM: **LLaVA** (projector MLP), **Flamingo** (cross-attention), **BLIP-2** (Q-Former); frontier models such as GPT-4V/Gemini are natively multimodal. Typical recipe: align the projector on caption data, then instruction-tune.

**Limitations**: weak at counting, spatial relations, fine-grained categories and text-in-image (OCR); inherits web biases; "bag-of-words" behavior on compositional prompts; the zero-shot class set is only as good as your prompts.

## Worked example
Zero-shot with 3 classes. Cosine similarities between the image and the prompts are $(0.30, 0.25, 0.20)$. With logit scale 100, logits are $(30, 25, 20)$. Subtract the max: $(0, -5, -10)$, so $e^0 = 1$, $e^{-5} \approx 0.0067$, $e^{-10} \approx 0.00005$; probabilities $\approx (0.993, 0.007, 0.00005)$.

Sanity check on training: with untrained random embeddings the contrastive loss starts near $\ln N$. For $N = 3$ that is $\ln 3 \approx 1.099$; for a batch of 32,768 it is about 10.4.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In CLIP's contrastive loss, where do the negative examples for an image come from?",
  "options": [
    "A separate hard-negative miner",
    "The other captions in the same batch",
    "Randomly corrupted images",
    "The class labels"
  ],
  "answer": 1,
  "explanation": "The N x N similarity matrix treats the matching caption as positive and the other N - 1 captions in the batch as negatives (and symmetrically for text), which is why large batches help."
}
```

```quiz
{
  "id": "q2",
  "question": "How does CLIP classify an image into 1,000 classes without any task-specific training?",
  "options": [
    "It fine-tunes on 1,000 labeled images",
    "It embeds a text prompt per class and picks the prompt with highest cosine similarity to the image embedding",
    "It runs object detection first",
    "It clusters the image with k-means"
  ],
  "answer": 1,
  "explanation": "Class names become text prompts in the shared embedding space; classification is nearest-prompt retrieval."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `l2_normalize(x)` (row-wise), `clip_loss(img, txt, scale)` returning the symmetric InfoNCE loss for `N x D` image/text embedding matrices (normalize first; logits = `scale * img @ txt.T`; average of row-wise and column-wise cross-entropy against the diagonal), and `zero_shot(img_vec, prompt_embs, scale)` returning softmax probabilities over classes for one image.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def l2_normalize(x):\n    pass\n\ndef clip_loss(img, txt, scale):\n    pass\n\ndef zero_shot(img_vec, prompt_embs, scale):\n    pass\n",
  "tests": "x = l2_normalize(np.array([[3.0, 4.0], [0.0, 2.0]]))\nassert np.allclose(x, [[0.6, 0.8], [0.0, 1.0]])\nI = np.eye(3)\nexpected = np.log(np.e + 2) - 1\nassert abs(clip_loss(I, I, 1.0) - expected) < 1e-9\nassert abs(clip_loss(5 * I, 2 * I, 1.0) - expected) < 1e-9\nassert abs(clip_loss(I, I[::-1], 1.0) - (np.log(np.e + 2) - 1 / 3)) < 1e-9\nassert clip_loss(I, I, 100.0) < 1e-6\np = zero_shot(np.array([1.0, 0.0]), np.array([[0.30, 0.9539392], [0.25, 0.9682458], [0.20, 0.9797959]]), 100.0)\nassert abs(p.sum() - 1) < 1e-9 and p.argmax() == 0 and abs(p[0] - 0.99327) < 1e-4",
  "solution": "def l2_normalize(x):\n    x = np.asarray(x, dtype=float)\n    return x / np.linalg.norm(x, axis=1, keepdims=True)\n\ndef _ce_diag(logits):\n    z = logits - logits.max(axis=1, keepdims=True)\n    logp = z - np.log(np.exp(z).sum(axis=1, keepdims=True))\n    return -np.mean(np.diag(logp))\n\ndef clip_loss(img, txt, scale):\n    logits = scale * l2_normalize(img) @ l2_normalize(txt).T\n    return 0.5 * (_ce_diag(logits) + _ce_diag(logits.T))\n\ndef zero_shot(img_vec, prompt_embs, scale):\n    v = l2_normalize(np.asarray(img_vec, dtype=float)[None, :])[0]\n    logits = scale * l2_normalize(prompt_embs) @ v\n    z = np.exp(logits - logits.max())\n    return z / z.sum()\n",
  "hints": [
    "Use a numerically stable log-softmax: subtract the row max before exponentiating.",
    "The column-wise loss is the row-wise loss of the transposed logits."
  ]
}
```

> [!TIP] Interview tips
> - Write the symmetric InfoNCE loss and say negatives come from the rest of the batch (so batch size matters; SigLIP relaxes that).
> - Explain zero-shot as nearest text-prompt retrieval in a shared embedding space; mention prompt engineering.
> - Name concrete failure modes (counting, spatial reasoning, OCR, bias) and when to prefer a generative VLM over CLIP.
