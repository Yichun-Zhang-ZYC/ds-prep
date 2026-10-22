---
id: computer-vision-face-recognition-and-verification
title: Face recognition and verification
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, face-recognition, embeddings, arcface, far-frr]
---

## Why it matters
Face unlock, KYC identity checks and photo search are textbook embedding problems, and they raise sharp interview questions: how do you evaluate an open-set system, why does the threshold depend on the gallery size, and what are the fairness and privacy risks? It is also a clean case study of metric learning.

## Concept
**Pipeline**: detect faces (RetinaFace, MTCNN, YuNet) $\to$ **align** with a similarity transform using 5 landmarks (eyes, nose, mouth corners) to a canonical crop (e.g. 112x112) $\to$ **embed** with a CNN/ViT into a 128-512-d vector $\to$ **compare** with cosine similarity or L2 distance on normalized vectors. Add **liveness / anti-spoofing** (print, replay and mask attacks) before trusting the result.

**Two tasks**
- **Verification (1:1)**: "is this person who they claim?" Compare two embeddings, accept if similarity $\ge$ threshold.
- **Identification (1:N)**: "who is this?" Search a gallery (ANN index at scale), return the top match only if it clears the threshold. This is **open-set**: most probes may be absent from the gallery.

**Training the embedding**: classification over identities with a **margin-based softmax** is the standard. Normalize features and class weights, then penalize the target angle: **ArcFace** uses $s\cos(\theta_y + m)$, CosFace $s(\cos\theta_y - m)$, so classes must be separated by an angular margin. Older alternatives: **triplet loss** (FaceNet) needs careful mining; contrastive pairs. Faces are an open-set problem, so you want embeddings that generalize to unseen identities, not a closed classifier.

**Metrics**
- Score distributions for **genuine** (same person) and **impostor** (different person) pairs.
- $\text{FAR} = P(\text{accept} \mid \text{impostor})$ (a.k.a. FMR), $\text{FRR} = P(\text{reject} \mid \text{genuine})$ (FNMR); $\text{TAR} = 1 - \text{FRR}$. Sweep the threshold for an ROC; report **TAR @ fixed FAR** (e.g. $10^{-4}$, $10^{-6}$) and the **EER** (FAR = FRR). Accuracy on balanced LFW pairs saturates near 99.8% and says little.
- Identification: rank-1/rank-k accuracy (closed-set) and **detection-and-identification rate vs false-positive identification rate** (open-set).

**Pitfall: gallery size.** With $N$ gallery identities, the expected false matches per impostor probe is about $N \cdot \text{FAR}_{1:1}$, so a threshold fine for 1:1 floods a large 1:N system with false hits; set the threshold from the target system-level FAR.

**Risks**: accuracy differences across demographic groups (NIST FRVT/FRTE report them), low light and occlusion, template aging, **embedding leakage** (embeddings are biometric data), spoofing, and law (biometric privacy statutes such as BIPA, GDPR special-category data, EU AI Act limits on real-time remote biometric identification). Evaluate per subgroup, minimise retention, and keep a human in the loop for high-stakes decisions.

## Worked example
Illustrative: an airport gate compares each traveller against a gallery of $N = 1{,}000{,}000$ watchlist faces. The model is run at $\text{FAR}_{1:1} = 10^{-6}$ per comparison. Expected false alarms per traveller $\approx 10^6 \times 10^{-6} = 1$, so nearly every traveller is flagged. To get about 1 false alarm per 10,000 travellers you need $\text{FAR}_{1:1} \approx 10^{-10}$, which drives TAR down sharply, so the design uses a tighter threshold, smaller galleries (flight manifest instead of a global list), or two-stage verification.

Threshold example: genuine scores $[0.9, 0.8, 0.4]$, impostor $[0.1, 0.5, 0.2, 0.3]$, threshold 0.45. Impostors accepted: only 0.5, so $\text{FAR} = 1/4$. Genuine rejected: only 0.4, so $\text{FRR} = 1/3$. Raising the threshold to 0.55 gives FAR 0 and FRR 1/3; lowering it to 0.35 gives FAR 1/4 and FRR 0.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is a plain softmax classifier over identities a poor fit for face recognition unless modified?",
  "options": [
    "Faces cannot be classified",
    "Softmax cannot be trained on millions of images",
    "Test identities are unseen, so you need compact, well-separated embeddings; plain softmax only separates the training classes and not by a margin",
    "Softmax outputs are not probabilities"
  ],
  "answer": 2,
  "explanation": "Recognition is open-set. Margin-based losses (ArcFace, CosFace) on normalized features enforce angular separation that transfers to new identities."
}
```

```quiz
{
  "id": "q2",
  "question": "You raise the similarity threshold of a face verification system. What happens?",
  "options": [
    "FAR and FRR both fall",
    "FAR falls and FRR rises",
    "FAR rises and FRR falls",
    "Neither changes, only the AUC changes"
  ],
  "answer": 1,
  "explanation": "A stricter threshold accepts fewer impostors (lower FAR) but also rejects more genuine pairs (higher FRR). AUC is threshold-independent."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `far_frr(genuine, impostor, thr)` returning `(FAR, FRR)` where a pair is accepted if its score is `>= thr`: FAR is the fraction of impostor scores accepted, FRR the fraction of genuine scores rejected.",
  "starterCode": "def far_frr(genuine, impostor, thr):\n    pass\n\nprint(far_frr([0.9, 0.8, 0.4], [0.1, 0.5, 0.2, 0.3], 0.45))",
  "tests": "far, frr = far_frr([0.9, 0.8, 0.4], [0.1, 0.5, 0.2, 0.3], 0.45)\nassert abs(far - 0.25) < 1e-12 and abs(frr - 1 / 3) < 1e-12\nfar, frr = far_frr([0.9, 0.8], [0.5], 0.5)\nassert far == 1.0 and frr == 0.0\nfar, frr = far_frr([0.4], [0.1, 0.2], 0.9)\nassert far == 0.0 and frr == 1.0",
  "solution": "def far_frr(genuine, impostor, thr):\n    far = sum(s >= thr for s in impostor) / len(impostor)\n    frr = sum(s < thr for s in genuine) / len(genuine)\n    return far, frr",
  "hints": [
    "FAR counts impostor scores `>= thr`; FRR counts genuine scores `< thr`.",
    "Divide by the size of the respective list."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `threshold_for_far(impostor, target_far)`: the smallest impostor score used as a threshold (accept if `>= t`) whose FAR is at most the target; if none qualifies return `max(impostor) + 1e-6`. Also implement `eer_threshold(genuine, impostor)`: among candidate thresholds (all scores, ascending) return the one minimizing $|\\text{FAR} - \\text{FRR}|$, keeping the first on ties.",
  "starterCode": "def threshold_for_far(impostor, target_far):\n    pass\n\ndef eer_threshold(genuine, impostor):\n    pass\n\nprint(threshold_for_far([0.1, 0.2, 0.3, 0.4, 0.5], 0.2))",
  "tests": "imp = [0.1, 0.2, 0.3, 0.4, 0.5]\nassert threshold_for_far(imp, 0.2) == 0.5\nassert threshold_for_far(imp, 0.4) == 0.4\nassert threshold_for_far(imp, 1.0) == 0.1\nassert threshold_for_far(imp, 0.0) > 0.5\ng = [0.6, 0.7, 0.8, 0.9]\nt = eer_threshold(g, [0.1, 0.2, 0.3, 0.65])\nassert t == 0.65\nt2 = eer_threshold([0.8, 0.9], [0.1, 0.2])\nassert t2 == 0.8",
  "solution": "def threshold_for_far(impostor, target_far):\n    n = len(impostor)\n    for t in sorted(set(impostor)):\n        if sum(s >= t for s in impostor) / n <= target_far + 1e-12:\n            return t\n    return max(impostor) + 1e-6\n\ndef eer_threshold(genuine, impostor):\n    best, best_gap = None, None\n    for t in sorted(set(genuine) | set(impostor)):\n        far = sum(s >= t for s in impostor) / len(impostor)\n        frr = sum(s < t for s in genuine) / len(genuine)\n        gap = abs(far - frr)\n        if best_gap is None or gap < best_gap - 1e-12:\n            best, best_gap = t, gap\n    return best",
  "hints": [
    "Try candidate thresholds in ascending order; FAR is non-increasing in the threshold.",
    "Allow a tiny tolerance when comparing fractions to the target, and update the best EER candidate only on a strictly smaller gap."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `cosine(a, b)` and `identify(probe, gallery, thr)` where `gallery` maps names to embeddings: return the name with the highest cosine similarity if it is at least `thr`, otherwise `None` (open-set rejection). Return `None` for an empty gallery.",
  "starterCode": "import math\n\ndef cosine(a, b):\n    pass\n\ndef identify(probe, gallery, thr):\n    pass\n\nprint(identify([1, 0], {'ann': [0.9, 0.1], 'bob': [0, 1]}, 0.8))",
  "tests": "g = {'ann': [0.9, 0.1], 'bob': [0, 1], 'cy': [-1, 0]}\nassert abs(cosine([1, 0], [1, 1]) - 2 ** -0.5) < 1e-12\nassert identify([1, 0], g, 0.8) == 'ann'\nassert identify([0.1, 1], g, 0.8) == 'bob'\nassert identify([1, -1], g, 0.8) is None\nassert identify([1, 0], {}, 0.1) is None",
  "solution": "import math\n\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))\n\ndef identify(probe, gallery, thr):\n    best, best_s = None, -2.0\n    for name in sorted(gallery):\n        s = cosine(probe, gallery[name])\n        if s > best_s:\n            best, best_s = name, s\n    return best if best is not None and best_s >= thr else None",
  "hints": [
    "Loop over the gallery, tracking the best score and name.",
    "Only compare the best score against the threshold at the end."
  ]
}
```

> [!TIP] Interview tips
> - Walk through detect, align, embed, compare, then separate 1:1 verification from 1:N identification.
> - Explain ArcFace as a normalized softmax with an additive angular margin so embeddings generalize to unseen identities.
> - Quote TAR at a fixed FAR, not accuracy, and note that the 1:N threshold must account for gallery size.
> - Bring up liveness, subgroup performance, biometric privacy law and human review without being asked.
