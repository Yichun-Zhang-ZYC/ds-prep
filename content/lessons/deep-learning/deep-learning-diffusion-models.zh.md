---
id: deep-learning-diffusion-models
title: "扩散模型"
---

## 为什么重要
扩散模型驱动着现代图像、音频和视频生成（Stable Diffusion、DALL-E、Sora 类系统）。面试官会考察前向/反向过程、网络被训练去预测什么，以及与 GAN、VAE 的权衡（质量和稳定性 vs 采样速度）。

## 概念
**前向过程**（固定，无需学习）：用方差调度 $\beta_t$ 在 $T$ 步内逐渐加入高斯噪声：

$$q(x_t \mid x_{t-1}) = \mathcal N\big(\sqrt{1-\beta_t}\,x_{t-1},\ \beta_t I\big)$$

令 $\alpha_t = 1 - \beta_t$，$\bar\alpha_t = \prod_{s \le t} \alpha_s$，任意一步都可以闭式采样：

$$x_t = \sqrt{\bar\alpha_t}\,x_0 + \sqrt{1 - \bar\alpha_t}\,\epsilon,\qquad \epsilon \sim \mathcal N(0, I)$$

当 $t \to T$ 时，$\bar\alpha_t \to 0$，$x_T \approx \mathcal N(0, I)$。

**反向过程**（学习得到）：由网络（U-Net，或越来越多地使用 Transformer / DiT）逐步去噪。在 DDPM 中，网络被训练去预测噪声 $\epsilon_\theta(x_t, t)$，使用简单损失

$$L = \mathbb E_{x_0, t, \epsilon}\big[\|\epsilon - \epsilon_\theta(x_t, t)\|^2\big]$$

训练就是：随机选一个 $t$，给图像加噪，回归该噪声。这是 ELBO 的一种重加权形式，非常稳定（没有对抗者）。等价的参数化：预测 $x_0$ 或速度 $v$。

**采样**：从 $x_T \sim \mathcal N(0, I)$ 出发迭代

$$x_{t-1} = \frac{1}{\sqrt{\alpha_t}}\Big(x_t - \frac{\beta_t}{\sqrt{1-\bar\alpha_t}}\,\epsilon_\theta(x_t, t)\Big) + \sigma_t z$$

其中 $z$ 为新采样的噪声（最后一步不加）。弱点是速度：需要几百到 1000 次网络调用。**DDIM** 使用确定性的非马尔可夫更新来跳步（20-50 步）；蒸馏和一致性模型可降到 1-4 步。

**条件化与效率**：**classifier-free guidance** 训练时随机丢弃条件，采样时外推，$\hat\epsilon = \epsilon_u + w(\epsilon_c - \epsilon_u)$，以多样性换保真度。**潜在扩散**（Stable Diffusion）在 VAE 的隐空间里做扩散，计算量降低一个数量级；文本通过交叉注意力输入。

**与其他模型对比**：训练稳定，模式覆盖和质量出色，但与 GAN（快速、清晰、不稳定）相比，采样慢且没有直接似然。

## 示例讲解
调度 $\beta = [0.1, 0.2, 0.3]$，则 $\alpha = [0.9, 0.8, 0.7]$，$\bar\alpha = [0.9,\ 0.72,\ 0.504]$。

用 $\epsilon = 1$ 把标量 $x_0 = 2$ 加噪到 $t = 3$：
$x_3 = \sqrt{0.504}\cdot 2 + \sqrt{0.496}\cdot 1 = 0.7099 \cdot 2 + 0.7043 = 2.1241$。

若网络完美预测 $\epsilon$，则可恢复 $x_0 = (x_t - \sqrt{1-\bar\alpha_t}\,\epsilon)/\sqrt{\bar\alpha_t} = (2.1241 - 0.7043)/0.7099 = 2$。取 $\epsilon_\theta = 1$ 做一步反向采样，均值为 $(2.1241 - \tfrac{0.3}{0.7043})/\sqrt{0.7} = 2.0297$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 DDPM 中，网络通常被训练去预测什么？",
  "options": ["直接预测下一张图像 x_{t-1}", "生成 x_t 时所加的噪声 epsilon", "真/假概率", "隐变量的均值和方差"],
  "explanation": "简单损失是从 (x_t, t) 回归噪声 epsilon；去噪均值由它推出。"
}
```

```quiz
{
  "id": "q2",
  "question": "相比 GAN，扩散模型的主要缺点是什么？",
  "options": ["对抗训练不稳定", "样本多样性差", "采样慢，需要多次网络评估", "无法以文本为条件"],
  "explanation": "采样是迭代的。DDIM、蒸馏和一致性模型可以减少步数。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `alpha_bars(betas)`（1 - beta 的累积乘积，返回列表）、`q_sample(x0, abar, eps)` = sqrt(abar) * x0 + sqrt(1 - abar) * eps、`predict_x0(xt, abar, eps_pred)`（反解 q_sample），以及 `ddpm_mean(xt, beta, abar, eps_pred)` = (xt - beta / sqrt(1 - abar) * eps_pred) / sqrt(1 - beta)。",
  "hints": ["abar_t 是 (1 - beta_s) 的累积乘积。", "predict_x0 就是把 q_sample 对 x0 求解。"]
}
```

> [!TIP] 面试技巧
> - 说出闭式前向步 $x_t = \sqrt{\bar\alpha_t}x_0 + \sqrt{1-\bar\alpha_t}\epsilon$，并指出训练就是噪声回归。
> - 解释为什么采样慢，并提出 DDIM、蒸馏和潜在扩散作为解决办法。
> - 提到 classifier-free guidance 是以多样性换取提示词保真度的标准做法。
