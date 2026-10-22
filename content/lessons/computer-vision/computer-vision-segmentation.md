---
id: computer-vision-segmentation
title: "Segmentation (U-Net, SAM)"
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, segmentation, u-net, sam, dice, miou]
---

## Why it matters
Segmentation gives pixel-level answers: tumor boundaries in medical scans, drivable area, background removal. Interviewers probe the task variants, the U-Net design, why pixel accuracy misleads, and what SAM changed.

## Concept
**Task variants**
- **Semantic**: a class per pixel; instances of the same class are not separated.
- **Instance**: a mask per object (Mask R-CNN = Faster R-CNN + a mask head).
- **Panoptic**: both, with "stuff" (sky, road) and "things" (cars, people).

**FCN / U-Net.** Replace the classifier with convolutions so the network outputs a map. **U-Net** is an encoder-decoder: the encoder downsamples to capture context, the decoder upsamples (transposed convs or bilinear upsampling + conv) to recover resolution, and **skip connections** concatenate encoder features to the decoder to restore fine spatial detail. It works well with little data (medical imaging) and is the backbone of diffusion models. Transposed conv output size: $n_{out} = (n - 1)s - 2p + k$.

**DeepLab** uses **atrous (dilated) convolutions** and ASPP to enlarge the receptive field without losing resolution. Modern models (SegFormer, Mask2Former) use transformers.

**SAM (Segment Anything)**: a promptable foundation model. A heavy ViT **image encoder** runs once per image; a lightweight **prompt encoder** (points, boxes, text-like masks) and a fast **mask decoder** return masks in milliseconds, so interactive use is cheap. Trained on SA-1B (over 1B masks) and strongly zero-shot; it is class-agnostic (it does not say what the segment is), so pair it with a detector or CLIP for labels. SAM 2 extends it to video.

**Losses and metrics**
- Pixel-wise cross-entropy, often with class weights; **Dice** or **IoU (Jaccard)** loss to handle tiny foreground regions.
- Metrics: **IoU** $= \frac{|P \cap G|}{|P \cup G|}$, **Dice** $= \frac{2|P \cap G|}{|P| + |G|} = \frac{2\,\text{IoU}}{1 + \text{IoU}}$, and **mIoU** (mean of per-class IoU).
- **Pixel accuracy is misleading**: if a lesion covers 1% of the image, predicting all background is 99% accurate with IoU 0.

## Worked example
Prediction mask has 40 foreground pixels, ground truth has 50, and 30 overlap. Union $= 40 + 50 - 30 = 60$.
- IoU $= 30/60 = 0.5$.
- Dice $= 2 \cdot 30/(40 + 50) = 0.667$, which matches $2(0.5)/(1.5)$.

U-Net decoder doubling resolution with a transposed conv ($k=4$, $s=2$, $p=1$): $4 \to (4-1) \cdot 2 - 2 + 4 = 8$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What do U-Net skip connections provide?",
  "options": [
    "Fewer parameters",
    "High-resolution encoder features to the decoder, recovering fine spatial detail lost by downsampling",
    "Class labels for each pixel",
    "Faster training via smaller batches"
  ],
  "answer": 1,
  "explanation": "Downsampling discards localization detail. Concatenating same-resolution encoder features into the decoder restores sharp boundaries."
}
```

```quiz
{
  "id": "q2",
  "question": "A lesion covers 1% of each scan. A model predicting all background has 99% pixel accuracy. Which metric exposes the failure?",
  "options": [
    "Pixel accuracy",
    "Foreground IoU or Dice",
    "Image size",
    "Number of classes"
  ],
  "answer": 1,
  "explanation": "Foreground IoU and Dice are 0 for an all-background prediction; they do not reward the dominant background class."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `iou_dice(pred, gt)` for two boolean numpy masks returning `(iou, dice)` (both 1.0 if both masks are empty), `mean_iou(pred, gt, n_classes)` for integer label maps (average IoU over classes that appear in either map), and `transposed_conv_out(n, k, s, p)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "def iou_dice(pred, gt):\n    pass\n\ndef mean_iou(pred, gt, n_classes):\n    pass\n\ndef transposed_conv_out(n, k, s, p):\n    pass\n",
  "tests": "pred = np.array([[0, 0, 1], [1, 1, 1]])\ngt = np.array([[0, 1, 1], [1, 1, 0]])\niou, dice = iou_dice(pred == 1, gt == 1)\nassert abs(iou - 0.6) < 1e-12 and abs(dice - 0.75) < 1e-12\nassert abs(mean_iou(pred, gt, 2) - (0.6 + 1 / 3) / 2) < 1e-12\nassert abs(mean_iou(pred, gt, 5) - (0.6 + 1 / 3) / 2) < 1e-12\nz = np.zeros((3, 3), dtype=bool)\nassert iou_dice(z, z) == (1.0, 1.0)\nassert iou_dice(z, ~z) == (0.0, 0.0)\nassert transposed_conv_out(4, 4, 2, 1) == 8",
  "solution": "def iou_dice(pred, gt):\n    pred = np.asarray(pred, dtype=bool)\n    gt = np.asarray(gt, dtype=bool)\n    inter = np.logical_and(pred, gt).sum()\n    union = np.logical_or(pred, gt).sum()\n    total = pred.sum() + gt.sum()\n    if union == 0:\n        return 1.0, 1.0\n    return inter / union, 2 * inter / total\n\ndef mean_iou(pred, gt, n_classes):\n    ious = []\n    for c in range(n_classes):\n        p, g = pred == c, gt == c\n        if (p | g).sum() == 0:\n            continue\n        ious.append(iou_dice(p, g)[0])\n    return float(np.mean(ious))\n\ndef transposed_conv_out(n, k, s, p):\n    return (n - 1) * s - 2 * p + k\n",
  "hints": [
    "Dice = 2 * intersection / (|P| + |G|); IoU = intersection / union.",
    "Skip classes that appear in neither map, otherwise you divide by zero."
  ]
}
```

> [!TIP] Interview tips
> - Explain U-Net in one sentence: downsample for context, upsample for resolution, skip connections for detail.
> - For class imbalance (tiny foreground) say Dice/focal loss and report IoU or Dice, never plain pixel accuracy.
> - Position SAM correctly: promptable, class-agnostic, zero-shot; fine-tune or pair with a detector for domain-specific labels.
