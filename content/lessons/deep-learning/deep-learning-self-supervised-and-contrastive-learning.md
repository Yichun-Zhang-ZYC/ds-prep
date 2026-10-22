---
id: deep-learning-self-supervised-and-contrastive-learning
title: Self-supervised and contrastive learning
estimatedMinutes: 12
difficulty: hard
tags: [deep-learning, self-supervised, contrastive-learning]
---

## Why it matters
Labels are expensive; raw images, text and logs are not. Self-supervised learning (SSL) turns unlabeled data into pretraining signal and underlies every modern foundation model. Interviewers ask how contrastive losses work, why temperature and negatives matter, and how SSL differs from supervised and generative training.

## Concept
**Self-supervised learning** invents a **pretext task** whose labels come from the data itself, learns a representation, then reuses it (linear probe or fine-tuning) on downstream tasks with few labels. See *Transfer learning and fine-tuning* for the downstream side.

**Families**
- **Predictive / generative**: mask part of the input and predict it. Next-token prediction (GPT), masked language modelling (BERT), masked autoencoders (MAE) for images.
- **Contrastive**: pull two **views** of the same example together (positives) and push different examples apart (negatives). SimCLR, MoCo, CLIP (image-text pairs), SimCSE.
- **Non-contrastive** (no negatives): BYOL and SimSiam use a predictor head and stop-gradient (BYOL also an EMA target network) to avoid collapse; DINO uses self-distillation; Barlow Twins and VICReg add redundancy or variance terms.

**InfoNCE / NT-Xent loss.** For a batch of $N$ examples with two augmented views each, embed and L2-normalise to $z_i, z_i^+$. The loss for anchor $i$ treats the other $N-1$ items in the batch as negatives:
$$\ell_i = -\log \frac{\exp(z_i \cdot z_i^+ / \tau)}{\sum_{j=1}^{N} \exp(z_i \cdot z_j^+ / \tau)}$$
It is just a softmax cross-entropy over $N$ classes where the correct class is the positive. It lower-bounds mutual information: $I(z; z^+) \ge \log N - \mathcal{L}$, so **more negatives give a tighter bound**. SimCLR's symmetric version uses $2(N-1)$ negatives per anchor.

**Knobs and pitfalls**
- **Temperature $\tau$** (about 0.05 to 0.5): small $\tau$ sharpens the softmax and emphasises hard negatives (risking noise); large $\tau$ treats all negatives alike.
- **Batch size / negative count**: SimCLR needs thousands; MoCo uses a momentum encoder plus a queue to get many negatives cheaply. CLIP uses large batches over many devices.
- **Augmentations define the invariances learned**: crop, colour jitter and blur for images; dropout noise (SimCSE), span deletion or back-translation for text. Wrong augmentations (e.g. colour jitter when colour matters) erase useful information.
- **False negatives**: another example from the same class is pushed away. Supervised contrastive loss fixes this when labels exist.
- **Collapse**: all inputs map to one vector. Negatives, stop-gradients, or variance regularisation prevent it.
- Evaluate with a **linear probe** on frozen features, plus few-label fine-tuning.

## Worked example
Batch of $N = 2$, embeddings already normalised: $z_1 = (1, 0)$, $z_2 = (0, 1)$, and their positives are identical: $z_1^+ = (1, 0)$, $z_2^+ = (0, 1)$. With $\tau = 0.5$ the similarity matrix divided by $\tau$ is
$$S = \begin{pmatrix} 2 & 0 \\ 0 & 2 \end{pmatrix}.$$
Row 1: $\ell_1 = -\log \frac{e^{2}}{e^{2} + e^{0}} = \log(1 + e^{-2}) \approx 0.127$; row 2 is identical, so the mean loss is $\approx 0.127$.

Sanity checks: if every embedding were the same vector, all logits are equal and $\ell = \log N = \log 2 \approx 0.693$ (the loss of random guessing among $N$ items, and the value you see when training collapses). With $\tau = 1$ the same inputs give $\log(1 + e^{-1}) \approx 0.313$: a higher temperature makes the same geometry look less separated.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A contrastive model's InfoNCE loss on a batch of 256 sits at about 5.55 and never drops. What does that most likely indicate?",
  "options": [
    "It converged to a perfect solution",
    "The learning rate is too low to matter",
    "The loss is exactly the entropy of the labels",
    "It equals $\\log 256$, i.e. chance level: embeddings are not discriminating (for example collapse or a bug)"
  ],
  "answer": 3,
  "explanation": "With $N = 256$ candidates, random guessing gives $\\ln 256 \\approx 5.55$. A loss stuck at that value means the model cannot tell positives from negatives."
}
```

```quiz
{
  "id": "q2",
  "question": "What does a lower temperature $\\tau$ do in InfoNCE?",
  "options": [
    "Flattens the softmax so all negatives count equally",
    "Sharpens the softmax so hard negatives (similar but different examples) dominate the gradient",
    "Removes the need for negatives",
    "Makes embeddings unnormalised"
  ],
  "answer": 1,
  "explanation": "Dividing similarities by a small $\\tau$ amplifies differences, so the loss concentrates on the most similar negatives. Too small can overfit to false negatives and noise."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "With numpy, write `info_nce(z1, z2, tau)`. `z1` and `z2` are (N, d) arrays holding two views of the same N examples. L2-normalise rows, compute logits `S = z1 @ z2.T / tau`, and return the mean over anchors of the cross-entropy with the diagonal as the correct class (use a numerically stable log-softmax). Also write `num_negatives(N)` = number of negatives per anchor in SimCLR's symmetric setup with N examples (2N views).",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef info_nce(z1, z2, tau):\n    pass\n\ndef num_negatives(N):\n    pass\n\nz = np.array([[1.0, 0.0], [0.0, 1.0]])\nprint(info_nce(z, z, 0.5), num_negatives(256))",
  "tests": "z = np.array([[1.0, 0.0], [0.0, 1.0]])\nassert abs(info_nce(z, z, 0.5) - np.log(1 + np.exp(-2))) < 1e-9\nassert abs(info_nce(z, z, 1.0) - np.log(1 + np.exp(-1))) < 1e-9\nones = np.ones((4, 3))\nassert abs(info_nce(ones, ones, 0.1) - np.log(4)) < 1e-9\nassert abs(info_nce(5 * z, 0.1 * z, 0.5) - info_nce(z, z, 0.5)) < 1e-9\nrng = np.random.default_rng(0)\na = rng.normal(size=(8, 5))\nassert info_nce(a, a + 0.01 * rng.normal(size=(8, 5)), 0.1) < 0.05\nassert info_nce(a, a[::-1].copy(), 0.1) > 1.0\nassert num_negatives(256) == 510 and num_negatives(2) == 2",
  "solution": "import numpy as np\n\ndef info_nce(z1, z2, tau):\n    a = z1 / np.linalg.norm(z1, axis=1, keepdims=True)\n    b = z2 / np.linalg.norm(z2, axis=1, keepdims=True)\n    S = a @ b.T / tau\n    S = S - S.max(axis=1, keepdims=True)\n    logp = S - np.log(np.exp(S).sum(axis=1, keepdims=True))\n    return float(-np.mean(np.diag(logp)))\n\ndef num_negatives(N):\n    return 2 * (N - 1)",
  "hints": [
    "Normalise first so the dot product is cosine similarity; the loss is then invariant to input scale.",
    "Row-wise log-softmax: subtract the row max, then subtract the log of the row sum of exponentials.",
    "Anchor's own positive is on the diagonal, so the loss is the negative mean of the diagonal of the log-probabilities."
  ]
}
```

> [!TIP] Interview tips
> - State the idea in one line: InfoNCE is cross-entropy over a batch where the positive is the correct class and other samples are negatives.
> - Explain temperature, number of negatives and augmentation choice as the three levers, and name collapse and false negatives as failure modes.
> - Contrast contrastive (SimCLR, CLIP), masked/predictive (BERT, MAE) and non-contrastive (BYOL, DINO) methods, and say how you would evaluate (linear probe).
