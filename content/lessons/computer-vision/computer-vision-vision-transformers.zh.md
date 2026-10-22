---
id: computer-vision-vision-transformers
title: "视觉 Transformer（ViT）"
---

## 为什么重要
ViT 风格的主干网络现在支撑着大多数现代视觉系统（CLIP、SAM、DINOv2、多模态大模型）。面试官会问图像如何变成 token 序列、为什么 ViT 比 CNN 更需要数据，以及计算成本如何随分辨率增长。

## 概念
**ViT 流程**
1. 把图像切分成互不重叠的 $P \times P$ 块（patch）；把每块展平成长度为 $P^2 C$ 的向量。
2. 把每个向量线性投影到维度 $D$（等价于卷积核大小和步长都为 $P$ 的卷积）。
3. 在前面加上可学习的 **[CLS]** token，并加上**位置嵌入**（可学习的一维嵌入；patch 本身没有顺序）。
4. 把 $N + 1$ 个 token 的序列（$N = (H/P)(W/P)$）送入标准 Transformer 编码器（自注意力 + MLP、pre-LayerNorm、残差）。
5. 用最后的 [CLS] 嵌入（或平均池化的 token）经线性头做分类。

**归纳偏置。** CNN 内置了局部性和平移等变性；ViT 必须自己学习，所以在小数据（ImageNet-1k）上从头训练时不如 CNN，但在**大规模预训练**（ImageNet-21k、JFT、LAION）或强训练方案下会胜出。**DeiT** 借助强数据增强和蒸馏在 ImageNet 上取得了良好精度。

**成本。** 自注意力对 token 数是 $O(N^2 D)$。patch 大小减半会让 $N$ 变为 4 倍，注意力成本约为 16 倍。在更高分辨率上微调时，位置嵌入需要插值。

**变体**
- **Swin**：在局部窗口内做注意力，窗口在层间移动，并有层次化（金字塔）特征图，所以成本与图像大小呈线性，可作为检测 / 分割的主干。
- **MAE**：自监督；遮挡约 75% 的 patch，只编码可见部分，重建其余部分。预训练便宜且可扩展。
- **DINO / DINOv2**：自蒸馏，无需标签即可得到强大的通用特征。
- 混合模型使用卷积 stem；ConvNeXt 表明现代化的 CNN 依然有竞争力。

## 示例讲解
ViT-B/16 处理 $224 \times 224 \times 3$ 的图像：$N = (224/16)^2 = 14^2 = 196$ 个 patch，每个长度为 $16 \cdot 16 \cdot 3 = 768$（$D = 768$ 时投影是方阵）。加上 [CLS]，序列有 197 个 token，因此每个注意力头形成 $197 \times 197 = 38{,}809$ 的矩阵。

若 $P = 8$：$N = 28^2 = 784$（785 个 token），注意力矩阵有 $785^2 = 616{,}225$ 项，约为前者的 15.9 倍。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么在小数据集上从头训练的 ViT 常常不如 CNN？",
  "options": [
    "ViT 的参数更少",
    "ViT 没有内置的局部性和平移等变性偏置，必须从数据中学习",
    "patch 无法编码颜色",
    "自注意力无法用 SGD 训练"
  ],
  "explanation": "CNN 内置了局部性和权重共享，对小数据有利。ViT 更灵活，但需要大规模预训练或强数据增强 / 蒸馏。"
}
```

```quiz
{
  "id": "q2",
  "question": "在图像尺寸不变时，把 patch 大小从 16 改为 8，每层的注意力成本会怎样？",
  "options": [
    "不变",
    "约 2 倍",
    "约 16 倍",
    "约 4 倍"
  ],
  "explanation": "token 数从 N 变为 4N，而注意力对 token 数是二次的，所以成本增长约 16 倍。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `num_tokens(h, w, patch, cls=True)`；实现 `patchify(img, patch)`，把 `H x W x C` 的 numpy 数组转成 `(N, patch*patch*C)` 的展平 patch 数组（patch 按行优先排列，patch 内像素也按行优先，通道在最后）；再实现 `attn_entries(h, w, patch)` = 单个注意力头的注意力矩阵大小（token 数的平方，包含 [CLS]）。",
  "hints": [
    "N = (H // P) * (W // P)；再为 [CLS] token 加 1。",
    "对每个 patch 起点切片 img[i:i+P, j:j+P] 并 reshape(-1)。"
  ]
}
```

> [!TIP] 面试技巧
> - 按“切 patch、线性投影、[CLS] + 位置嵌入、Transformer 编码器”来回答；提到与步长为 $P$ 的卷积等价。
> - 通过归纳偏置解释数据上的权衡；建议使用预训练的 ViT（或 Swin/ConvNeXt），而不是在小数据集上从头训练。
> - 了解注意力的二次方成本及缓解办法：更大的 patch、窗口注意力（Swin）、token 剪枝/合并、FlashAttention。
