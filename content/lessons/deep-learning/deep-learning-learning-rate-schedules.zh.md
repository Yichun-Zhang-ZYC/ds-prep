---
id: deep-learning-learning-rate-schedules
title: 学习率调度
---

## 为什么重要
学习率是最重要的超参数，固定学习率很少是最优的。大模型训练总是使用 warmup 加衰减。面试官会问为什么 warmup 有帮助，以及你会选择哪种调度。

## 概念
为什么要调度？训练早期需要大步长以快速推进；训练后期需要小步长以收敛到极小值而不是在其周围来回跳动（SGD 的噪声随学习率增大）。

**常见调度**
- **阶梯衰减**：$\eta_t = \eta_0\,\gamma^{\lfloor t/s\rfloor}$（例如每 30 个 epoch 乘以 0.1；经典的 ResNet 配方）。
- **指数 / 多项式 / 线性衰减**：更平滑的版本；线性衰减到零常用于微调。
- **余弦退火**：$\eta_t = \eta_{min} + \tfrac12(\eta_{max}-\eta_{min})\big(1 + \cos(\pi t/T)\big)$。平滑，除 $T$ 外没有额外超参数；是 LLM 的默认选择。**热重启**（SGDR）会周期性地重置它。
- **逆平方根**：warmup 之后 $\eta_t \propto 1/\sqrt t$（原始 Transformer）。
- **One-cycle**：先升后降，通常配合反向变化的动量；允许很高的峰值学习率。
- **ReduceLROnPlateau**：验证损失停滞时降低学习率（被动式，不需要总步数）。
- **带 warmup 的常数 / WSD**（warmup-stable-decay）：无需固定训练总长即可延长训练。

**Warmup**：在前几百到几千步里把学习率从约 0 线性上升。原因：初始化时梯度大且噪声多，Adam 的二阶矩估计不可靠，激活值和归一化统计量尚未稳定，满学习率可能导致发散。对 Transformer 和大 batch 至关重要。

**如何选择学习率**：学习率范围测试（指数级增大学习率，选择损失开始爆炸之前的值）；**线性缩放规则**：对 SGD，batch 大小 $\times k$ 则学习率 $\times k$（配合 warmup），Adam 常用 $\sqrt k$。更大的模型通常需要更小的峰值学习率。衰减后的终点学习率通常是峰值的 10%（或 0）。

## 示例讲解
带线性 warmup 的余弦调度：峰值 $\eta_{max} = 10^{-3}$，warmup 100 步，总共 1000 步，$\eta_{min}=0$。
- Warmup（步数 $t<100$）：$\eta_t = 10^{-3}\,t/100$，所以 $t=50$ 时为 $5\times10^{-4}$。
- 第 100 步：进度 $=(100-100)/900 = 0$，$\cos 0 = 1$，所以 $\eta = 10^{-3}$。
- 第 550 步：进度 $= 450/900 = 0.5$，$\cos(\pi/2) = 0$，所以 $\eta = \tfrac12\cdot10^{-3}\cdot 1 = 5\times10^{-4}$。
- 第 1000 步：进度为 1，$\cos\pi = -1$，所以 $\eta = 0$。

阶梯衰减，$\eta_0 = 0.1$，$\gamma = 0.1$，每 30 个 epoch：epoch 0-29：0.1；30-59：0.01；60-89：0.001。

warmup 为 100 步之后的逆平方根：在第 400 步，$\eta = \eta_{max}\sqrt{100/400} = 0.5\,\eta_{max}$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "学习率 warmup 的主要目的是什么？",
  "options": ["让训练收敛到更尖锐的极小值", "避免训练早期梯度噪声大、优化器统计量（如 Adam 的 $v$）不可靠导致的不稳定", "减少 epoch 数", "取代权重衰减"],
  "explanation": "初始化时使用完整大小的学习率可能发散；逐步上升让激活值、归一化统计量和 Adam 的矩有时间稳定下来。"
}
```

```quiz
{
  "id": "q2",
  "question": "对 SGD 训练，把 batch 大小从 256 增加到 1024。线性缩放规则建议怎么做？",
  "options": ["保持学习率不变", "学习率除以 4", "学习率乘以 4（配合 warmup）", "学习率乘以 2"],
  "explanation": "每个 epoch 的步数减少为 1/4 且噪声更小，用 4 倍的学习率来补偿；warmup 防止早期不稳定。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `step_decay(step, base, gamma, every)`、`warmup_cosine(step, base, warmup, total, min_lr=0.0)`（`step < warmup` 时线性 warmup：`base*step/warmup`，之后余弦从 `base` 衰减到 `total` 时的 `min_lr`；`step >= total` 时返回 `min_lr`），以及 `inverse_sqrt(step, base, warmup)`（线性 warmup，之后为 `base*sqrt(warmup/step)`）。",
  "hints": ["余弦进度 = (step - warmup) / (total - warmup)；lr = min_lr + 0.5*(base - min_lr)*(1 + cos(pi*progress))。", "step_decay 使用整数除法：gamma ** (step // every)。"]
}
```

> [!TIP] 面试技巧
> - 说出 warmup + 余弦衰减是现代默认方案，并解释为什么需要 warmup。
> - 被问到更大 batch 如何选学习率时，提到学习率范围测试和线性缩放规则。
> - 了解被动式方案（ReduceLROnPlateau）与固定总长的调度（余弦、one-cycle）的区别。
