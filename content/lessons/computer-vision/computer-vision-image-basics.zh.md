---
id: computer-vision-image-basics
title: "图像基础（像素、通道、数据增强）"
---

## 为什么重要
每个视觉流水线都从像素张量开始，大多数隐蔽的 bug（通道顺序错误、归一化错误、数据增强泄漏到验证集）都出在这里。面试官会检查你是否知道图像如何存储，以及哪些增强不改变标签。

## 概念
图像是形状为 $H \times W \times C$（NumPy/OpenCV/PIL）或 $C \times H \times W$（PyTorch）的数组。灰度图 $C=1$，RGB 图 $C=3$；常见 dtype 是 `uint8`，取值 $[0, 255]$。OpenCV 读入的是 **BGR**，PIL 读入的是 **RGB**；混用会让颜色互换且不报任何错误。

**预处理**
- **缩放 / 裁剪**到固定输入尺寸（如 224）。不保持长宽比的缩放会扭曲形状；使用先缩放再中心裁剪，或 letterbox 填充。
- 按通道**缩放并归一化**：$x' = (x/255 - \mu_c)/\sigma_c$。使用预训练主干网络训练时的统计量（ImageNet：$\mu = (0.485, 0.456, 0.406)$，$\sigma = (0.229, 0.224, 0.225)$）。
- **灰度化**（亮度）：$Y = 0.299R + 0.587G + 0.114B$。

**数据增强**只对训练集加入不改变标签的变化：
- 几何类：随机裁剪 / resized crop、水平翻转、小角度旋转、缩放、平移。
- 光度类：亮度、对比度、饱和度、色调抖动，模糊，噪声。
- 正则化混合：Cutout/random erasing、Mixup、CutMix。
- 策略：RandAugment、AutoAugment、TrivialAugment。

**标签是否保持取决于任务。** 水平翻转对猫没问题，对文字或数字就不对（旋转时 6 与 9 也会混淆）。检测和分割任务中，同样的几何变换必须同时作用于框 / 掩码。验证和测试数据只做确定性的预处理（缩放、中心裁剪、归一化）。

内存：一个 batch 有 $B \cdot H \cdot W \cdot C$ 个值；float32 每个 4 字节，是 `uint8` 的 4 倍。磁盘和数据加载器中保持 `uint8`，在 GPU 上再转换。

## 示例讲解
一张 224x224 的 RGB 图像有 $224 \cdot 224 \cdot 3 = 150{,}528$ 个值：`uint8` 为 150,528 字节，float32 为 602,112 字节。256 张的 batch 用 float32 约 154 MB。

用 ImageNet 统计量归一化红色通道值 200 的像素：$200/255 = 0.784$，然后 $(0.784 - 0.485)/0.229 \approx 1.31$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 RGB 的 ImageNet 上预训练的模型，对你用 OpenCV 读取的图像准确率很差，却没有报错。最可能的原因是？",
  "options": [
    "图像太大",
    "OpenCV 返回 BGR，通道被互换",
    "OpenCV 返回 float64",
    "缺少水平翻转"
  ],
  "explanation": "cv2.imread 返回 BGR。应先用 cv2.cvtColor(img, cv2.COLOR_BGR2RGB) 转换，再应用针对 RGB 训练的归一化和权重。"
}
```

```quiz
{
  "id": "q2",
  "question": "验证集应使用哪种增强设置？",
  "options": [
    "与训练相同的随机增强，以保持一致",
    "只做确定性的缩放、中心裁剪和归一化",
    "只做随机翻转",
    "带随机标签的 Mixup"
  ],
  "explanation": "验证必须可复现地衡量在真实输入分布上的表现，因此使用确定性预处理，不做随机增强。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "给定 `H x W x 3` 的 uint8 数组，实现 `to_gray(img)`（亮度权重 0.299/0.587/0.114，返回 `H x W` 浮点数组）、`normalize(img, mean, std)`（缩放到 [0, 1]，再按通道 `(x - mean) / std`）、`hflip(img)`，以及 `crop(img, top, left, size)`（返回从 `(top, left)` 开始的 `size x size` 窗口）。",
  "hints": [
    "广播会在最后一个轴上处理按通道的 mean/std。",
    "在 HWC 布局中，水平翻转就是反转宽度轴（axis 1）。"
  ]
}
```

> [!TIP] 面试技巧
> - 始终说明通道顺序和布局（HWC 还是 CHW，RGB 还是 BGR），并匹配预训练模型的归一化方式。
> - 只增强训练数据；测试时的预处理必须是确定性的。
> - 陷阱：增强必须感知标签（框要和图像一起翻转；不要翻转数字或文字）。
