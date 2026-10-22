---
id: computer-vision-object-detection
title: "目标检测（YOLO、Faster R-CNN）"
---

## 为什么重要
检测（是什么、在哪里）支撑着自动驾驶、零售、文档解析和安全系统。面试官会让你比较单阶段和两阶段检测器，并在白板上实现 IoU 和非极大值抑制。

## 概念
检测器输出一组 `(box, class, score)`。框通常是 `(x1, y1, x2, y2)`，重叠程度用 **IoU** $= \dfrac{|A \cap B|}{|A \cup B|}$ 衡量。

**两阶段（R-CNN 系列）**：主干网络（+ 用于多尺度特征的 FPN）送入**区域建议网络（RPN）**，它把 anchor 判为目标 / 背景并做微调；然后每个 proposal 经过池化（RoIAlign）再做分类和回归。Faster R-CNN 和 Mask R-CNN 精度高、对小目标友好，但较慢。

**单阶段（YOLO、SSD、RetinaNet）**：一次前向传播，在每个网格单元 / anchor 上直接预测类别和框偏移。速度快，适合实时。RetinaNet 的**焦点损失（focal loss）** $-(1 - p_t)^\gamma \log p_t$ 降低大量容易的背景 anchor 的权重。**无 anchor** 变体（FCOS、CenterNet、较新的 YOLO 版本）直接预测中心和大小，无需调 anchor。

**Transformer 检测器（DETR）**预测固定数量的 query，并用**匈牙利匹配**训练，因此不需要 NMS；收敛较慢（Deformable DETR、RT-DETR 解决了这一点）。

**训练信号**
- **Anchor 匹配**：anchor 与某个真值框的 IoU $\ge$ 阈值（如 0.5）则为正样本，低于更低阈值则为负样本，并且每个真值框还会指定其最佳 anchor。大多数 anchor 是负样本，因此存在类别不平衡（用 focal loss、难负例挖掘）。
- **损失** = 分类（交叉熵 / focal）+ 框回归（对偏移用 smooth L1，或基于 IoU 的损失 GIoU/CIoU）（YOLO 还有 objectness 项）。

**推理时的 NMS**：按分数过滤，降序排序，保留最高的框，丢弃同类别中与其 IoU 超过阈值（如 0.5）的其余框，重复。阈值越低，去重越多，但在拥挤场景中会抑制真实相邻目标；Soft-NMS 改为衰减分数。

## 示例讲解
框 $A = (0,0,10,10)$ 和 $B = (5,5,15,15)$：交集 $5 \times 5 = 25$，并集 $100 + 100 - 25 = 175$，IoU $= 25/175 \approx 0.143$。

阈值 0.5 的 NMS，框 $b_0 = (0,0,10,10)$ 分数 0.9，$b_1 = (1,1,11,11)$ 分数 0.8，$b_2 = (20,20,30,30)$ 分数 0.7：IoU$(b_0, b_1) = 81/119 \approx 0.68 > 0.5$，所以 $b_1$ 被抑制；$b_2$ 不重叠，被保留。结果：$\{b_0, b_2\}$。

规模估算：Faster R-CNN 的 RPN 在 $38 \times 50$ 特征图上每个位置 9 个 anchor，共评估 $38 \cdot 50 \cdot 9 = 17{,}100$ 个 anchor。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "RetinaNet 为什么使用 focal loss？",
  "options": [
    "加速 NMS",
    "降低数量庞大的容易背景 anchor 的权重，使稀少的目标主导梯度",
    "替代框回归",
    "支持无 anchor 预测"
  ],
  "explanation": "单阶段检测器每张图约有 10 万个 anchor，几乎都是容易的负样本。(1 - p_t)^gamma 因子缩小它们的损失，避免淹没少量正样本。"
}
```

```quiz
{
  "id": "q2",
  "question": "在拥挤场景（人们肩并肩站着）中，NMS 的典型失效是什么，如何修复？",
  "options": [
    "保留太多框；提高分数阈值",
    "高 IoU 的真实相邻目标被抑制；使用更高的 IoU 阈值或 Soft-NMS",
    "NMS 让框变小；使用 focal loss",
    "NMS 无法处理多类别；使用 softmax"
  ],
  "explanation": "高度重叠的真实目标超过 IoU 阈值，分数较低的那个被丢弃。可提高阈值、使用 Soft-NMS，或使用 DETR 这类基于集合的检测器。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "框的格式为 `(x1, y1, x2, y2)`。实现 `iou(a, b)`（无重叠则为 0）、`nms(boxes, scores, thr)`（按分数降序返回保留的索引；当与已保留框的 IoU 严格大于 `thr` 时抑制该框），以及 `match_anchors(anchors, gts, pos_thr)`：对每个 anchor，若其与最佳 IoU 真值框的 IoU `>= pos_thr` 则返回该真值框索引，否则返回 -1；此外每个真值框会强制其 IoU 最大的 anchor 成为该真值框的正样本。",
  "hints": [
    "交集宽度 = min(x2) - max(x1)；宽或高为负表示没有重叠。",
    "NMS 中，候选框只有在与所有已保留框的重叠都不过大时才会保留。"
  ]
}
```

> [!TIP] 面试技巧
> - 说明权衡：两阶段 = 精度和小目标；单阶段 = 速度和简洁；DETR = 无需 NMS 和 anchor，但训练更重。
> - 准备好手写 IoU 和 NMS（按分数排序、循环、按 IoU 抑制）。提到分类别 NMS 以及拥挤场景下的失效模式。
> - 解释类别不平衡（大多数 anchor 是背景）以及 focal loss 或难负例挖掘如何解决。评估用 mAP（见指标一课）。
