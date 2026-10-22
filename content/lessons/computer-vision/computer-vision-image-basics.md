---
id: computer-vision-image-basics
title: "Image basics (pixels, channels, augmentation)"
estimatedMinutes: 10
difficulty: easy
tags: [computer-vision, images, preprocessing, augmentation]
---

## Why it matters
Every vision pipeline starts with tensors of pixels, and most silent bugs (wrong channel order, wrong normalization, augmentations leaking into validation) live here. Interviewers check that you know how images are stored and which augmentations are label-preserving.

## Concept
An image is an array of shape $H \times W \times C$ (NumPy/OpenCV/PIL) or $C \times H \times W$ (PyTorch). Grayscale has $C=1$, RGB has $C=3$; typical dtype is `uint8` in $[0, 255]$. OpenCV loads **BGR**, PIL loads **RGB**; mixing them swaps colors without any error.

**Preprocessing**
- **Resize / crop** to a fixed input size (e.g. 224). Resizing without keeping the aspect ratio distorts shapes; use resize-then-center-crop or letterbox padding.
- **Scale and normalize** per channel: $x' = (x/255 - \mu_c)/\sigma_c$. Use the statistics the pretrained backbone was trained with (ImageNet: $\mu = (0.485, 0.456, 0.406)$, $\sigma = (0.229, 0.224, 0.225)$).
- **Grayscale** (luminance): $Y = 0.299R + 0.587G + 0.114B$.

**Augmentation** adds label-preserving variation to the training set only:
- Geometric: random crop / resized crop, horizontal flip, small rotation, scale, translation.
- Photometric: brightness, contrast, saturation, hue jitter, blur, noise.
- Regularizing mixes: Cutout/random erasing, Mixup, CutMix.
- Policies: RandAugment, AutoAugment, TrivialAugment.

**Label preservation depends on the task.** Horizontal flip is fine for cats but wrong for text or digits (6 vs 9 under rotation too). For detection and segmentation the same geometric transform must be applied to boxes/masks. Validation and test data get deterministic preprocessing only (resize, center crop, normalize).

Memory: a batch is $B \cdot H \cdot W \cdot C$ values; float32 is 4 bytes each, so 4x larger than `uint8`. Keep data as `uint8` on disk and in loaders, and convert on the GPU.

## Worked example
A 224x224 RGB image has $224 \cdot 224 \cdot 3 = 150{,}528$ values: 150,528 bytes as `uint8`, 602,112 bytes as float32. A batch of 256 is about 154 MB in float32.

Normalize a red-channel pixel of 200 with ImageNet statistics: $200/255 = 0.784$, then $(0.784 - 0.485)/0.229 \approx 1.31$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A model pretrained on RGB ImageNet gives poor accuracy on images you loaded with OpenCV, with no error. Most likely cause?",
  "options": [
    "Images are too large",
    "OpenCV returns BGR, so channels are swapped",
    "OpenCV returns float64",
    "Missing horizontal flip"
  ],
  "answer": 1,
  "explanation": "cv2.imread returns BGR. Convert with cv2.cvtColor(img, cv2.COLOR_BGR2RGB) before applying RGB-trained normalization and weights."
}
```

```quiz
{
  "id": "q2",
  "question": "Which augmentation setup is correct for a validation set?",
  "options": [
    "Same random augmentations as training, for consistency",
    "Deterministic resize, center crop and normalization only",
    "Random flips only",
    "Mixup with random labels"
  ],
  "answer": 1,
  "explanation": "Validation must measure performance on the real input distribution reproducibly, so use deterministic preprocessing with no random augmentation."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Given an `H x W x 3` uint8 array, implement `to_gray(img)` (luminance 0.299/0.587/0.114, returns `H x W` float), `normalize(img, mean, std)` (scale to [0, 1], then per-channel `(x - mean) / std`), `hflip(img)`, and `crop(img, top, left, size)` returning the `size x size` window starting at `(top, left)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def to_gray(img):\n    pass\n\ndef normalize(img, mean, std):\n    pass\n\ndef hflip(img):\n    pass\n\ndef crop(img, top, left, size):\n    pass\n",
  "tests": "img = np.arange(4 * 4 * 3, dtype=np.uint8).reshape(4, 4, 3)\ng = to_gray(img)\nassert g.shape == (4, 4)\nassert abs(g[0, 0] - (0.299 * 0 + 0.587 * 1 + 0.114 * 2)) < 1e-9\nm = np.array([0.485, 0.456, 0.406]); s = np.array([0.229, 0.224, 0.225])\nred = np.zeros((1, 1, 3), dtype=np.uint8); red[0, 0] = [200, 0, 0]\nn = normalize(red, m, s)\nassert n.shape == (1, 1, 3) and abs(n[0, 0, 0] - (200 / 255 - 0.485) / 0.229) < 1e-9\nassert abs(n[0, 0, 1] - (0 - 0.456) / 0.224) < 1e-9\nf = hflip(img)\nassert (f[:, 0] == img[:, -1]).all() and (f[:, -1] == img[:, 0]).all()\nc = crop(img, 1, 2, 2)\nassert c.shape == (2, 2, 3) and (c == img[1:3, 2:4]).all()",
  "solution": "def to_gray(img):\n    w = np.array([0.299, 0.587, 0.114])\n    return img.astype(float) @ w\n\ndef normalize(img, mean, std):\n    x = img.astype(float) / 255.0\n    return (x - np.asarray(mean)) / np.asarray(std)\n\ndef hflip(img):\n    return img[:, ::-1]\n\ndef crop(img, top, left, size):\n    return img[top:top + size, left:left + size]\n",
  "hints": [
    "Broadcasting handles the per-channel mean/std over the last axis.",
    "A horizontal flip reverses the width axis (axis 1) in HWC layout."
  ]
}
```

> [!TIP] Interview tips
> - Always state channel order and layout (HWC vs CHW, RGB vs BGR) and match the pretrained model's normalization.
> - Augment only training data; test-time preprocessing must be deterministic.
> - Pitfall: augmentations must be label-aware (flip a bounding box with its image; do not flip digits or text).
