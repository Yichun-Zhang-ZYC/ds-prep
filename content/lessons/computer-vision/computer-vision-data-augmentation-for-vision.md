---
id: computer-vision-data-augmentation-for-vision
title: Data augmentation for vision
estimatedMinutes: 11
difficulty: medium
tags: [computer-vision, data-augmentation, mixup, cutmix, regularization]
---

## Why it matters
Augmentation is the cheapest source of accuracy and robustness in vision, and it encodes your assumptions about invariance. Interviewers probe whether you know which transforms are safe for which task, how mixing-based methods work, and how augmentation differs for detection, segmentation and self-supervised learning.

## Concept
**Principle**: apply label-preserving transformations to training images so the model sees many plausible variants of each sample. It acts as a regularizer and as a way to inject **invariances** (translation, scale, colour) you know the task has. Apply random augmentation **only to training**; validation and test use deterministic resize/centre crop. See *Image classification* for training recipes.

**Families**
- **Geometric**: flip, **RandomResizedCrop** (random area 8-100% and aspect ratio 3/4-4/3), rotation, affine, perspective.
- **Photometric**: brightness/contrast/saturation/hue jitter, grayscale, Gaussian blur, noise, JPEG compression, simulating the target camera.
- **Occlusion**: Cutout / random erasing drops a patch so the model cannot rely on one part.
- **Mixing**: **Mixup** blends two images and labels, $\tilde x = \lambda x_a + (1-\lambda)x_b$, $\tilde y = \lambda y_a + (1-\lambda)y_b$ with $\lambda \sim \text{Beta}(\alpha,\alpha)$. **CutMix** pastes a patch from $x_b$ and sets $\lambda$ to the **remaining area fraction**, so labels are proportional to visible pixels. **Mosaic** (YOLO) tiles four images, exposing small objects and varied contexts.
- **Learned policies**: AutoAugment searches policies with RL; **RandAugment** has only two knobs (number of ops $N$, shared magnitude $M$); TrivialAugment samples one op and magnitude per image with no tuning. Strong recipes for modern ViTs combine RandAugment, Mixup/CutMix, random erasing, label smoothing and stochastic depth.
- **Generative / synthetic**: copy-paste of objects onto new backgrounds, diffusion or simulator images; check the domain gap and never leak synthetic images into evaluation.

**Task-specific rules**
- **Detection / segmentation**: transform boxes and masks **together** with pixels (flip mirrors box x-coordinates; crop clips boxes and drops those mostly outside, keeping a minimum visible fraction); use nearest-neighbour interpolation for masks.
- **Self-supervised** (SimCLR, DINO): two strong views of one image (crop + colour jitter + blur) define the positives; the augmentations *are* the supervision signal.
- **Test-time augmentation (TTA)**: average predictions over flips/crops for a small accuracy gain at multiples of inference cost.

**Safety check: is it label-preserving?** Horizontal flip is wrong for text, digits (6/9 under rotation), traffic signs and anatomy where laterality matters; heavy colour jitter hurts when colour is the signal (ripeness, stained slides); vertical flip is fine for satellite images but not street scenes. Ask what real-world variation the deployed camera will show.

**Engineering**: augmentations are often the dataloader bottleneck, so use more workers, GPU pipelines (DALI, Kornia), and log augmented samples to **visually inspect** them. Augmentation does not fix label noise or distribution shift in collection.

## Worked example
CutMix on a $224 \times 224$ image with sampled $\lambda = 0.7$. The pasted box has area fraction $1-\lambda = 0.3$, so side ratio $\sqrt{0.3} \approx 0.548$ and a side of $\lfloor 224 \times 0.548 \rfloor = 122$ px. Centred at $(112, 112)$ it spans $[51, 173)$ on both axes. The actual pasted area is $122^2 = 14{,}884$ of $50{,}176$ pixels, so the label weight is recomputed as $\lambda_{adj} = 1 - 0.2966 = 0.7034$: target $= 0.7034\,y_a + 0.2966\,y_b$. If the box were centred at a corner, it would be clipped and $\lambda_{adj}$ must be recomputed from the clipped area, which is why implementations always adjust $\lambda$ after clipping.

Horizontal flip of box $(10, 20, 50, 60)$ in a 100-px-wide image gives $(100-50, 20, 100-10, 60) = (50, 20, 90, 60)$: note the x-coordinates swap roles so that $x_1 < x_2$ still holds.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You train a model to read street signs and add random horizontal flips. What is the most likely consequence?",
  "options": [
    "Better robustness at no cost",
    "Text and arrows get mirrored, so the label is no longer preserved and accuracy can drop",
    "Slower convergence only",
    "Nothing, since CNNs are flip-invariant"
  ],
  "answer": 1,
  "explanation": "Flips are label-changing for text, arrows and left/right-specific classes. Choose augmentations that match real variation."
}
```

```quiz
{
  "id": "q2",
  "question": "After CutMix pastes a box that was clipped at the image border, how should the mixed label be computed?",
  "options": [
    "Use the originally sampled lambda",
    "Always use 0.5",
    "Recompute lambda from the actual pasted area after clipping",
    "Use the label of the larger image only"
  ],
  "answer": 2,
  "explanation": "Label weights should be proportional to visible pixels from each source, so lambda is adjusted using the final clipped box."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `hflip_box(box, W)` for `(x1, y1, x2, y2)` in an image of width `W`. Then implement `crop_boxes(boxes, crop, min_visible)`: for a crop window `(cx1, cy1, cx2, cy2)`, clip each box to the window, keep it only if the visible area divided by the original box area is `>= min_visible`, and return boxes translated into crop coordinates (in input order).",
  "starterCode": "def hflip_box(box, W):\n    pass\n\ndef crop_boxes(boxes, crop, min_visible):\n    pass\n\nprint(hflip_box((10, 20, 50, 60), 100))",
  "tests": "assert hflip_box((10, 20, 50, 60), 100) == (50, 20, 90, 60)\nassert hflip_box(hflip_box((10, 20, 50, 60), 100), 100) == (10, 20, 50, 60)\nb = [(10, 10, 50, 50), (60, 60, 100, 100)]\nassert crop_boxes(b, (0, 0, 40, 40), 0.5) == [(10, 10, 40, 40)]\nassert crop_boxes(b, (30, 30, 80, 80), 0.5) == []\nassert crop_boxes(b, (30, 30, 80, 80), 0.2) == [(0, 0, 20, 20), (30, 30, 50, 50)]\nassert crop_boxes([], (0, 0, 10, 10), 0.5) == []",
  "solution": "def hflip_box(box, W):\n    x1, y1, x2, y2 = box\n    return (W - x2, y1, W - x1, y2)\n\ndef crop_boxes(boxes, crop, min_visible):\n    cx1, cy1, cx2, cy2 = crop\n    out = []\n    for x1, y1, x2, y2 in boxes:\n        ix1, iy1 = max(x1, cx1), max(y1, cy1)\n        ix2, iy2 = min(x2, cx2), min(y2, cy2)\n        if ix2 <= ix1 or iy2 <= iy1:\n            continue\n        visible = (ix2 - ix1) * (iy2 - iy1) / ((x2 - x1) * (y2 - y1))\n        if visible >= min_visible:\n            out.append((ix1 - cx1, iy1 - cy1, ix2 - cx1, iy2 - cy1))\n    return out",
  "hints": [
    "After flipping, new x1 = W - x2 and new x2 = W - x1.",
    "Skip boxes whose intersection with the crop is empty; subtract (cx1, cy1) from kept coordinates."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `mixup(x1, y1, x2, y2, lam)` where `x` are flat feature lists and `y` are one-hot lists; return `(x, y)` with each element `lam * a + (1 - lam) * b`.",
  "starterCode": "def mixup(x1, y1, x2, y2, lam):\n    pass\n\nprint(mixup([1.0, 0.0], [1, 0], [0.0, 1.0], [0, 1], 0.7))",
  "tests": "x, y = mixup([1.0, 0.0], [1, 0], [0.0, 1.0], [0, 1], 0.7)\nassert all(abs(a - b) < 1e-12 for a, b in zip(x, [0.7, 0.3]))\nassert all(abs(a - b) < 1e-12 for a, b in zip(y, [0.7, 0.3]))\nx, y = mixup([2.0, 4.0], [1, 0], [6.0, 8.0], [0, 1], 0.25)\nassert all(abs(a - b) < 1e-12 for a, b in zip(x, [5.0, 7.0]))\nassert all(abs(a - b) < 1e-12 for a, b in zip(y, [0.25, 0.75]))\nx, y = mixup([1.0], [1], [9.0], [0], 1.0)\nassert x == [1.0] and y == [1.0]",
  "solution": "def mixup(x1, y1, x2, y2, lam):\n    x = [lam * a + (1 - lam) * b for a, b in zip(x1, x2)]\n    y = [lam * a + (1 - lam) * b for a, b in zip(y1, y2)]\n    return x, y",
  "hints": [
    "Apply the same lambda to inputs and labels.",
    "lam = 1 must return the first sample unchanged."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `cutmix_box(H, W, lam, cx, cy)`: cut width and height are `int(W * sqrt(1 - lam))` and `int(H * sqrt(1 - lam))`; the box is `(cx - cw//2, cy - ch//2, cx + cw//2, cy + ch//2)` clipped to the image. Return `(box, lam_adj)` with `lam_adj = 1 - box_area / (H * W)`.",
  "starterCode": "import math\n\ndef cutmix_box(H, W, lam, cx, cy):\n    pass\n\nprint(cutmix_box(224, 224, 0.7, 112, 112))",
  "tests": "box, lam = cutmix_box(224, 224, 0.7, 112, 112)\nassert box == (51, 51, 173, 173)\nassert abs(lam - (1 - 122 * 122 / 224 ** 2)) < 1e-12\nbox, lam = cutmix_box(224, 224, 0.7, 0, 0)\nassert box == (0, 0, 61, 61)\nassert abs(lam - (1 - 61 * 61 / 224 ** 2)) < 1e-12\nbox, lam = cutmix_box(100, 200, 1.0, 50, 50)\nassert box == (50, 50, 50, 50) and lam == 1.0",
  "solution": "import math\n\ndef cutmix_box(H, W, lam, cx, cy):\n    r = math.sqrt(1 - lam)\n    cw, ch = int(W * r), int(H * r)\n    x1, x2 = max(cx - cw // 2, 0), min(cx + cw // 2, W)\n    y1, y2 = max(cy - ch // 2, 0), min(cy + ch // 2, H)\n    lam_adj = 1 - (x2 - x1) * (y2 - y1) / (W * H)\n    return (x1, y1, x2, y2), lam_adj",
  "hints": [
    "Clip x to [0, W] and y to [0, H] with max/min.",
    "Compute lam_adj from the clipped box, not from the sampled lambda."
  ]
}
```

> [!TIP] Interview tips
> - Treat augmentation as encoding invariances; for each transform ask whether it preserves the label for this task.
> - Explain Mixup vs CutMix and why CutMix relabels by visible area; mention RandAugment as a two-parameter policy.
> - For detection/segmentation say that boxes and masks must be transformed with the image; for SSL the augmentations define positives.
> - Mention inspecting samples, GPU augmentation for throughput, and TTA with its inference cost.
