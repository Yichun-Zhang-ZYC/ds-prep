---
id: computer-vision-object-detection
title: "Object detection (YOLO, Faster R-CNN)"
estimatedMinutes: 14
difficulty: hard
tags: [computer-vision, object-detection, yolo, faster-rcnn, nms, iou]
---

## Why it matters
Detection (what and where) powers autonomous driving, retail, document parsing and safety systems. Interviewers ask you to compare one-stage and two-stage detectors and to implement IoU and non-maximum suppression on a whiteboard.

## Concept
A detector outputs a set of `(box, class, score)`. Boxes are usually `(x1, y1, x2, y2)` and overlap is measured by **IoU** $= \dfrac{|A \cap B|}{|A \cup B|}$.

**Two-stage (R-CNN family)**: a backbone (+ FPN for multi-scale features) feeds a **Region Proposal Network** that scores anchors as object/background and refines them; then each proposal is pooled (RoIAlign) and classified and regressed. Faster R-CNN and Mask R-CNN are accurate and good for small objects, but slower.

**One-stage (YOLO, SSD, RetinaNet)**: predict classes and box offsets directly at every grid cell / anchor in a single pass. Fast, real-time friendly. RetinaNet's **focal loss** $-(1 - p_t)^\gamma \log p_t$ down-weights the huge number of easy background anchors. **Anchor-free** variants (FCOS, CenterNet, recent YOLO versions) predict center and size directly, with no anchor tuning.

**Transformer detectors (DETR)** predict a fixed set of queries and train with **Hungarian matching**, so no NMS is needed; they converge slower (Deformable DETR, RT-DETR fix that).

**Training signal**
- **Anchor matching**: an anchor is positive if IoU with a ground-truth box $\ge$ a threshold (e.g. 0.5), negative below a lower one, and each ground truth also claims its best anchor. Most anchors are negatives, hence class imbalance (focal loss, hard-negative mining).
- **Loss** = classification (cross-entropy / focal) + box regression (smooth L1 on offsets, or IoU-based losses GIoU/CIoU) (+ objectness in YOLO).

**Inference with NMS**: filter by score, sort descending, keep the top box, drop remaining boxes of the same class with IoU above a threshold (e.g. 0.5), repeat. A lower threshold removes more duplicates but suppresses real adjacent objects in crowds; Soft-NMS decays scores instead.

## Worked example
Boxes $A = (0,0,10,10)$ and $B = (5,5,15,15)$: intersection $5 \times 5 = 25$, union $100 + 100 - 25 = 175$, IoU $= 25/175 \approx 0.143$.

NMS at 0.5 with boxes $b_0 = (0,0,10,10)$ score 0.9, $b_1 = (1,1,11,11)$ score 0.8, $b_2 = (20,20,30,30)$ score 0.7: IoU$(b_0, b_1) = 81/119 \approx 0.68 > 0.5$, so $b_1$ is suppressed; $b_2$ does not overlap and stays. Result: $\{b_0, b_2\}$.

Scale check: a Faster R-CNN RPN with 9 anchors per location on a $38 \times 50$ feature map evaluates $38 \cdot 50 \cdot 9 = 17{,}100$ anchors.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does RetinaNet use focal loss?",
  "options": [
    "To speed up NMS",
    "To down-weight the overwhelming number of easy background anchors so rare objects drive the gradient",
    "To replace box regression",
    "To enable anchor-free prediction"
  ],
  "answer": 1,
  "explanation": "One-stage detectors see ~100k anchors per image, almost all easy negatives. The (1 - p_t)^gamma factor shrinks their loss so they do not swamp the few positives."
}
```

```quiz
{
  "id": "q2",
  "question": "In a crowded scene (people standing shoulder to shoulder), what is the typical NMS failure and a fix?",
  "options": [
    "Too many boxes survive; raise the score threshold",
    "True neighbors with high IoU get suppressed; use a higher IoU threshold or Soft-NMS",
    "NMS makes boxes smaller; use focal loss",
    "NMS cannot handle multiple classes; use softmax"
  ],
  "answer": 1,
  "explanation": "Heavily overlapping real objects exceed the IoU threshold and the lower-scored one is dropped. Raise the threshold, use Soft-NMS, or use a set-based detector like DETR."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Boxes are `(x1, y1, x2, y2)`. Implement `iou(a, b)` (0 if no overlap), `nms(boxes, scores, thr)` returning kept indices in descending score order (suppress a box when IoU with a kept box is strictly greater than `thr`), and `match_anchors(anchors, gts, pos_thr)` returning, for each anchor, the index of its best-IoU ground truth if that IoU is `>= pos_thr`, else -1; additionally each ground truth forces its best-IoU anchor to be positive for that ground truth.",
  "setup": "",
  "starterCode": "def iou(a, b):\n    pass\n\ndef nms(boxes, scores, thr):\n    pass\n\ndef match_anchors(anchors, gts, pos_thr=0.5):\n    pass\n",
  "tests": "assert abs(iou((0, 0, 10, 10), (5, 5, 15, 15)) - 25 / 175) < 1e-12\nassert iou((0, 0, 1, 1), (2, 2, 3, 3)) == 0\nassert abs(iou((0, 0, 10, 10), (0, 0, 10, 10)) - 1) < 1e-12\nboxes = [(0, 0, 10, 10), (1, 1, 11, 11), (20, 20, 30, 30), (50, 50, 60, 60)]\nscores = [0.9, 0.8, 0.7, 0.95]\nassert nms(boxes, scores, 0.5) == [3, 0, 2]\nassert nms(boxes, scores, 0.7) == [3, 0, 1, 2]\nanchors = [(0, 0, 10, 10), (0, 0, 20, 20), (30, 30, 40, 40)]\ngts = [(0, 0, 10, 8), (32, 32, 50, 50)]\nassert match_anchors(anchors, gts, 0.5) == [0, -1, 1]\nassert match_anchors(anchors, gts, 0.9) == [0, -1, 1]",
  "solution": "def iou(a, b):\n    iw = min(a[2], b[2]) - max(a[0], b[0])\n    ih = min(a[3], b[3]) - max(a[1], b[1])\n    if iw <= 0 or ih <= 0:\n        return 0.0\n    inter = iw * ih\n    area = lambda r: (r[2] - r[0]) * (r[3] - r[1])\n    return inter / (area(a) + area(b) - inter)\n\ndef nms(boxes, scores, thr):\n    order = sorted(range(len(boxes)), key=lambda i: -scores[i])\n    keep = []\n    for i in order:\n        if all(iou(boxes[i], boxes[k]) <= thr for k in keep):\n            keep.append(i)\n    return keep\n\ndef match_anchors(anchors, gts, pos_thr=0.5):\n    out = []\n    for a in anchors:\n        ious = [iou(a, g) for g in gts]\n        best = max(range(len(gts)), key=lambda j: ious[j])\n        out.append(best if ious[best] >= pos_thr else -1)\n    for j, g in enumerate(gts):\n        ai = max(range(len(anchors)), key=lambda i: iou(anchors[i], g))\n        out[ai] = j\n    return out\n",
  "hints": [
    "Intersection width = min(x2) - max(x1); clamp negative widths/heights to no overlap.",
    "In NMS, a candidate survives only if it does not overlap too much with any box already kept."
  ]
}
```

> [!TIP] Interview tips
> - Frame the trade-off: two-stage = accuracy and small objects; one-stage = speed and simplicity; DETR = no NMS and anchors but heavier training.
> - Be ready to code IoU and NMS (sort by score, loop, suppress by IoU). Mention class-wise NMS and the crowded-scene failure mode.
> - Explain class imbalance (most anchors are background) and how focal loss or hard-negative mining addresses it. Evaluation is mAP (see the metrics lesson).
