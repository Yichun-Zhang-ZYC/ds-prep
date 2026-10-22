---
id: deep-learning-regularization-weight-decay-and-augmentation
title: "正则化：权重衰减与数据增强"
---

## 为什么重要
过参数化的网络可以记住训练集，因此泛化来自正则化。面试官喜欢考细节：Adam 下 L2 与权重衰减的区别、为什么增强是图像上最强的正则手段，以及应优先使用哪些工具。（Dropout 和早停有各自的课程；本课涵盖其余内容。）

## 概念
**L2 正则化**在损失中加入 $\frac{\lambda}{2}\lVert w \rVert^2$，使梯度增加 $\lambda w$。它等价于对权重的高斯先验（MAP 视角），把权重向 0 收缩。L1 则带来稀疏性。

**权重衰减**是更新规则 $w \leftarrow (1 - \eta\lambda) w - \eta g$。
- 使用**普通 SGD** 时两者完全相同：$w - \eta(g + \lambda w)$。
- 使用 **Adam** 时则不同。L2 把 $\lambda w$ 放进梯度，随后被 $\sqrt{\hat v}$ 除，因此梯度历史大的权重被衰减得更少，有效衰减与学习率缩放纠缠在一起。**AdamW** 将其解耦：$w \leftarrow w - \eta\left(\frac{\hat m}{\sqrt{\hat v} + \epsilon} + \lambda w\right)$。Transformer 使用 AdamW（常见 $\lambda$ 为 0.01 到 0.1），且不对偏置和 LayerNorm/BatchNorm 的缩放参数做衰减。
- 权重衰减还与归一化层相互作用：使用 BatchNorm 时权重具有尺度不变性，衰减主要是提高了*有效*学习率。

**数据增强**通过保持标签的变换扩充数据集，把模型原本要从数据中学习的不变性直接编码进去。
- **图像**：翻转、随机裁剪、颜色抖动、**Cutout**（擦除一块区域）、**Mixup**（$\tilde x = \lambda x_i + (1-\lambda) x_j$，标签同样混合，$\lambda \sim \text{Beta}(\alpha,\alpha)$）、**CutMix**（粘贴图块，按面积混合标签）、RandAugment / AutoAugment（搜索得到的策略）。
- **文本**：同义词替换、回译、token 掩码。**音频**：时间拉伸、SpecAugment。**表格**：加噪声、类似 SMOTE 的插值（需谨慎）。
- 只对**训练**数据使用；验证集和测试集保持原样（**测试时增强**对多个视图的预测取平均是例外）。
- 变换必须保持标签（把 “6” 翻转成 “9” 就不行）。

**其他工具**：标签平滑（软目标 $1-\epsilon$ 与 $\epsilon/(K-1)$；也有助于校准）、随机深度、噪声注入、更小的模型、更多数据、集成和早停。

**实践顺序**：先增加数据和增强，再用权重衰减，然后是 dropout/标签平滑；$\lambda$ 在对数尺度上调参。

## 示例讲解
**SGD，等价性。** $w = 2$，$\eta = 0.1$，$\lambda = 0.01$，损失梯度 $g = 0.5$。L2 更新：$2 - 0.1(0.5 + 0.02) = 1.948$。权重衰减形式：$(1 - 0.001) \cdot 2 - 0.1 \cdot 0.5 = 1.998 - 0.05 = 1.948$。完全相同。

**Adam，差异。** 取 $w = 1$，损失梯度 $g = 0$，$\eta = 0.01$，$\lambda = 0.1$，第一步（$\hat m = g'$，$\hat v = g'^2$）。
- *Adam 内部的 L2*：$g' = \lambda w = 0.1$，步长 $= \eta\, g'/(|g'| + \epsilon) \approx \eta = 0.01$，所以 $w \approx 0.99$。无论 $\lambda$ 取何值步长都约为 $\eta$：自适应缩放抹掉了惩罚的强度。
- *AdamW*：$\hat m = 0$，所以只有解耦项起作用：$w = 1 - 0.01 \cdot 0.1 \cdot 1 = 0.999$。衰减强度按预期随 $\lambda$ 变化。

**Mixup。** $x_i = (1, 0)$，标签 1；$x_j = (0, 1)$，标签 0；$\lambda = 0.7$：$\tilde x = (0.7, 0.3)$，软标签为 $0.7$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么相比带 L2 惩罚的 Adam，更推荐 AdamW？",
  "options": [
    "AdamW 使用更大的学习率",
    "L2 惩罚不可微",
    "在 Adam 中，梯度里的 L2 项会被自适应分母重新缩放，衰减强度被扭曲；AdamW 直接对权重施加衰减",
    "AdamW 不再需要学习率调度"
  ],
  "explanation": "Adam 会把整个梯度（损失梯度加 $\\lambda w$）除以 $\\sqrt{\\hat v}$，使有效惩罚因参数而异。AdamW 把衰减与基于梯度的更新步骤解耦。"
}
```

```quiz
{
  "id": "q2",
  "question": "下列哪一项是数据增强的正确用法？",
  "options": [
    "也对验证集做增强，使指标更稳定",
    "只对训练批次做增强，并使用保持标签不变的变换",
    "先增强再划分数据，使每个划分都看到相同的变体",
    "在数字识别中使用垂直翻转"
  ],
  "explanation": "增强用于在训练中编码不变性。在增强后的验证数据上评估会改变目标分布；先增强再划分会让近似重复样本泄漏到各个划分；翻转后的数字可能改变标签。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `adam_step(w, g, m, v, t, lr=0.01, b1=0.9, b2=0.999, eps=1e-8, wd=0.0, decoupled=True)`，针对 numpy 数组（或浮点数），返回 `(w_new, m_new, v_new)`。使用偏差修正后的矩 `m_hat = m/(1-b1**t)`、`v_hat = v/(1-b2**t)`，步长为 `lr * m_hat / (sqrt(v_hat) + eps)`。若 `decoupled` 为 False，先把 `wd * w` 加到梯度上（经典 L2）；若为 True（AdamW），再从权重中减去 `lr * wd * w`（用旧的 `w` 计算）。然后编写 `mixup(x1, y1, x2, y2, lam)`，返回 `(lam*x1 + (1-lam)*x2, lam*y1 + (1-lam)*y2)`。",
  "hints": [
    "零矩的第一步：`m = (1-b1) g`，`v = (1-b2) g^2`；偏差修正后 `m_hat = g`，`v_hat = g^2`。",
    "当 `g = 0` 且使用解耦衰减时，只有 `lr * wd * w` 这一项在移动权重。",
    "梯度很小时，耦合 L2 产生约 `lr` 的步长，与 `wd` 无关：自适应分母抵消了惩罚的量级。"
  ]
}
```

> [!TIP] 面试技巧
> - 要说：对 SGD，L2 等价于权重衰减，对 Adam 则不然；AdamW 把衰减与自适应步长解耦。偏置和归一化参数不做衰减。
> - 把增强看作编码不变性、最便宜的“额外数据”；提到图像的 Mixup/CutMix，以及增强只用于训练。
> - 给出缓解过拟合的顺序：更多数据/增强、权重衰减、dropout、更小的模型、早停。
