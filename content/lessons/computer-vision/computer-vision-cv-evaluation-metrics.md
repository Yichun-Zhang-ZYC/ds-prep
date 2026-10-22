---
id: computer-vision-cv-evaluation-metrics
title: "CV evaluation metrics (IoU, mAP)"
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, evaluation, iou, map, precision-recall]
---

## Why it matters
Detection and segmentation cannot be scored with plain accuracy: a prediction has both a class and a location, and duplicates matter. mAP is the headline number in papers and benchmarks, and interviewers want you to compute it by hand and explain COCO vs VOC conventions.

## Concept
**IoU** (Jaccard) $= \dfrac{|A \cap B|}{|A \cup B|}$ measures overlap of boxes or masks. A detection is a **true positive (TP)** if its class is right and IoU with an unmatched ground-truth box is $\ge$ a threshold (0.5 for VOC / AP50). Duplicates of an already matched box and low-IoU boxes are **false positives (FP)**; unmatched ground truths are **false negatives (FN)**. True negatives are not defined, so there is no accuracy.

**Computing AP for one class at one IoU threshold**
1. Sort all detections by confidence, descending.
2. Greedily mark each TP or FP (each ground truth can be matched once).
3. Cumulative TP/FP give precision $= TP/(TP + FP)$ and recall $= TP/\text{num\_gt}$ at every rank, tracing the **precision-recall curve**.
4. Make precision monotone: $p_{\text{interp}}(r) = \max_{r' \ge r} p(r')$.
5. **AP** = area under the interpolated curve, $\sum_k (r_k - r_{k-1})\, p_{\text{interp}}(r_k)$ (all-point, VOC 2010+). COCO uses 101 recall points.

**mAP** averages AP over classes. **COCO mAP** (reported as "AP") additionally averages over IoU thresholds $0.5, 0.55, \dots, 0.95$, so it rewards precise localization; AP50 and AP75 are the lenient and strict slices, and APs/APm/APl split by object size. AR measures recall at fixed detections per image. Report FPS/latency and model size alongside accuracy.

**Other tasks**
- Classification: top-1/top-5, per-class precision/recall/F1, confusion matrix (macro vs micro averaging for imbalance).
- Segmentation: IoU, Dice, **mIoU**; panoptic quality PQ = segmentation quality x recognition quality.
- Depth: AbsRel, RMSE, $\delta < 1.25$. Retrieval/CLIP: recall@K.
- Caveats: AP depends on the IoU threshold and the matching rule; low confidence thresholds do not hurt AP (the curve just extends), but deployment needs a concrete operating threshold chosen from the PR curve.

## Worked example
Class "car" has 4 ground-truth boxes. Five detections sorted by score are TP, TP, FP, TP, FP.

| rank | TP/FP | precision | recall |
|---|---|---|---|
| 1 | TP | 1/1 = 1.00 | 0.25 |
| 2 | TP | 2/2 = 1.00 | 0.50 |
| 3 | FP | 2/3 = 0.67 | 0.50 |
| 4 | TP | 3/4 = 0.75 | 0.75 |
| 5 | FP | 3/5 = 0.60 | 0.75 |

Interpolated precision is $(1, 1, 0.75, 0.75, 0.60)$ (max to the right). AP $= 0.25 \cdot 1 + 0.25 \cdot 1 + 0.25 \cdot 0.75 = 0.6875$. The fourth ground truth was never found, so recall stops at 0.75 and the rest of the curve contributes 0.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A detector has AP50 = 0.80 but COCO AP@[.5:.95] = 0.45. What does this gap most likely indicate?",
  "options": [
    "It misses many objects entirely",
    "It finds objects but its boxes are loosely localized, failing at strict IoU thresholds",
    "The classifier is poor",
    "Too many classes"
  ],
  "answer": 1,
  "explanation": "At IoU 0.5 most detections count as correct, but as the threshold rises toward 0.95 imprecise boxes become FPs, pulling the averaged AP down."
}
```

```quiz
{
  "id": "q2",
  "question": "Two detections overlap the same ground-truth box with IoU 0.9 and 0.85. How are they scored at IoU 0.5?",
  "options": [
    "Both TP",
    "Higher-confidence one is TP, the other is FP (duplicate)",
    "Both FP",
    "Both ignored"
  ],
  "answer": 1,
  "explanation": "Each ground truth can be matched only once, so the second detection is a false positive. This is why NMS matters."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`iou` is provided. Implement `match_detections(dets, gts, thr)` where `dets` is a list of `(score, box)` and `gts` a list of boxes for one class: process detections by descending score; find the ground truth with the highest IoU; it is a TP if that IoU is `>= thr` and that ground truth is not yet matched, otherwise FP. Return the list of 1/0 flags in score order. Then implement `average_precision(flags, num_gt)` (all-point interpolated AP: precision made monotone from the right, summed over recall increments).",
  "setup": "",
  "starterCode": "def iou(a, b):\n    iw = min(a[2], b[2]) - max(a[0], b[0])\n    ih = min(a[3], b[3]) - max(a[1], b[1])\n    if iw <= 0 or ih <= 0:\n        return 0.0\n    inter = iw * ih\n    area = lambda r: (r[2] - r[0]) * (r[3] - r[1])\n    return inter / (area(a) + area(b) - inter)\n\ndef match_detections(dets, gts, thr=0.5):\n    pass\n\ndef average_precision(flags, num_gt):\n    pass\n",
  "tests": "assert abs(average_precision([1, 1, 0, 1, 0], 4) - 0.6875) < 1e-12\nassert average_precision([1, 1, 1], 3) == 1.0\nassert average_precision([], 3) == 0.0\nassert average_precision([0, 0], 2) == 0.0\ngts = [(0, 0, 10, 10), (20, 20, 30, 30)]\ndets = [(0.7, (50, 50, 60, 60)), (0.9, (0, 0, 10, 10)), (0.6, (20, 20, 30, 31)), (0.8, (1, 1, 11, 11))]\nflags = match_detections(dets, gts, 0.5)\nassert flags == [1, 0, 0, 1]\nassert abs(average_precision(flags, 2) - 0.75) < 1e-12\nassert match_detections(dets, gts, 0.95) == [1, 0, 0, 0]",
  "solution": "def iou(a, b):\n    iw = min(a[2], b[2]) - max(a[0], b[0])\n    ih = min(a[3], b[3]) - max(a[1], b[1])\n    if iw <= 0 or ih <= 0:\n        return 0.0\n    inter = iw * ih\n    area = lambda r: (r[2] - r[0]) * (r[3] - r[1])\n    return inter / (area(a) + area(b) - inter)\n\ndef match_detections(dets, gts, thr=0.5):\n    used = set()\n    flags = []\n    for score, box in sorted(dets, key=lambda d: -d[0]):\n        ious = [iou(box, g) for g in gts]\n        if ious:\n            j = max(range(len(gts)), key=lambda k: ious[k])\n            if ious[j] >= thr and j not in used:\n                used.add(j)\n                flags.append(1)\n                continue\n        flags.append(0)\n    return flags\n\ndef average_precision(flags, num_gt):\n    tp = fp = 0\n    prec, rec = [], []\n    for f in flags:\n        tp += f\n        fp += 1 - f\n        prec.append(tp / (tp + fp))\n        rec.append(tp / num_gt)\n    for i in range(len(prec) - 2, -1, -1):\n        prec[i] = max(prec[i], prec[i + 1])\n    ap, prev = 0.0, 0.0\n    for p, r in zip(prec, rec):\n        ap += (r - prev) * p\n        prev = r\n    return ap\n",
  "hints": [
    "Precision at rank k = cumulative TP / k; recall = cumulative TP / num_gt.",
    "Interpolate by sweeping from the last rank backwards with a running maximum, then sum (recall increment x precision)."
  ]
}
```

> [!TIP] Interview tips
> - Walk through AP: sort by confidence, label TP/FP via IoU matching, trace the PR curve, interpolate, integrate. Offer the table above as the example.
> - Contrast AP50 (loose) with COCO AP@[.5:.95] (rewards tight boxes); a big gap points to localization error.
> - Mention duplicates count as FP (so NMS matters), AP is per class and averaged, and production needs a chosen confidence threshold plus latency.
