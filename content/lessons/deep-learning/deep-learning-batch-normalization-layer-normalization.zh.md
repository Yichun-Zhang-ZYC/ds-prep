---
id: deep-learning-batch-normalization-layer-normalization
title: 批归一化与层归一化
---

## 为什么重要
归一化层让深度网络训练更快，并能承受更大的学习率。面试官会问 BatchNorm 计算了什么、为什么训练和推理行为不同，以及为什么 Transformer 用 LayerNorm。

## 概念
**批归一化（BN）**在 mini-batch 上对每个特征（CNN 中为每个通道）做归一化：
$$\hat x = \frac{x - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \qquad y = \gamma \hat x + \beta$$
$\gamma, \beta$ 是可学习参数，因此在需要时该层可以撤销归一化。

- **训练 vs 推理**：训练时使用当前批次的 $\mu_B, \sigma_B^2$，并更新滑动平均（$\text{run} \leftarrow (1-m)\,\text{run} + m\,\text{batch}$，$m \approx 0.1$）。推理时使用固定的滑动统计量。忘记调用 `model.eval()` 是经典 bug。
- **弱点**：批次较小（约小于 16）时统计量噪声大，而且每个样本的输出依赖同一批次中的其他样本。它不适合 RNN 和变长序列。
- **为什么有效**：损失曲面更平滑、梯度条件更好，因此可以使用更高的学习率；批次噪声还起到轻微的正则化作用。（“内部协变量偏移”的解释存在争议。）

**层归一化（LN）**在每个样本自己的特征维度上做归一化，因此不依赖批次，训练和推理一致。它是 Transformer 的默认选择（通常是 pre-LN：在注意力/FFN 之前归一化，训练更稳定）。**RMSNorm** 去掉均值减法，只除以均方根（LLaMA 类模型使用）。

| | BatchNorm | LayerNorm |
|---|---|---|
| 归一化的维度 | 批次（及空间）维度，按通道 | 特征维度，按样本 |
| 需要滑动统计量 | 是 | 否 |
| 典型场景 | CNN | Transformer、RNN |

此外，**GroupNorm**（按样本对通道分组）和 **InstanceNorm** 适合小批次的视觉任务。BN 之前的偏置是多余的，因为 $\beta$ 已经取代了它。

## 示例讲解
一个特征在含四个样本的批次上取值 $x = (1, 2, 3, 6)$。均值 $\mu = 3$，方差 $\sigma^2 = (4 + 1 + 0 + 9)/4 = 3.5$，所以 $\sigma = 1.871$（忽略 $\epsilon$）。

$\hat x = (-2, -1, 0, 3)/1.871 = (-1.069, -0.535, 0, 1.604)$，均值为 0，方差为 1。取 $\gamma = 2, \beta = 1$：$y = (-1.138, -0.069, 1, 4.207)$。

LayerNorm 做同样的计算，只是沿着另一个轴：一个样本有四个特征 $(1, 2, 3, 6)$，得到完全相同的 $\hat x$。区别只在于哪些数字共享均值和方差。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个使用 BatchNorm 的模型，对同一输入的预测会随批次中其他样本的不同而变化。最可能的原因是什么？",
  "options": [
    "Dropout 被关闭了",
    "模型仍处于训练模式，BN 使用了批次统计量",
    "使用了 LayerNorm",
    "学习率过高"
  ],
  "explanation": "训练模式下 BN 用当前批次的均值和方差做归一化，因此输出依赖批次构成。评估模式下则使用固定的滑动统计量。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么 Transformer 更倾向使用 LayerNorm 而不是 BatchNorm？",
  "options": [
    "LN 的参数更多",
    "LN 在 GPU 上计算更便宜",
    "LN 不依赖批大小或序列填充，训练和推理行为一致",
    "LN 让残差连接变得不必要"
  ],
  "explanation": "LN 在每个 token 的特征上归一化，因此可以用于批大小为 1 和变长序列，也不需要滑动统计量。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 numpy 编写 `batch_norm(X, gamma, beta, eps=1e-5)`：对 (N, D) 数组的每一列在批次维度（axis 0，有偏方差）上归一化，并应用 `gamma * x_hat + beta`。编写 `layer_norm(X, gamma, beta, eps=1e-5)`：对每一行在其特征维度上归一化。最后编写 `update_running(running, batch_stat, momentum=0.1)` = `(1 - momentum) * running + momentum * batch_stat`。",
  "hints": [
    "BN 使用 `X.mean(axis=0)` 和 `X.var(axis=0)`；LN 使用 `axis=1, keepdims=True`。",
    "np.var 默认使用有偏估计（除以 N），这正是 BN 所用的。"
  ]
}
```

> [!TIP] 面试技巧
> - 说清楚归一化的轴：BN 在批次上取平均（按特征），LN 在特征上取平均（按样本）。
> - 一定要提到 BN 训练与推理的差异（滑动统计量）以及小批次时的失效情形。
> - 说明 Transformer 用 LN 的原因：序列变长、不依赖批次、训练与推理行为一致。
