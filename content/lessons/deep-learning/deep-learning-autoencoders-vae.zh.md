---
id: deep-learning-autoencoders-vae
title: "自编码器与 VAE"
---

## 为什么重要
自编码器用于压缩数据和学习表示；VAE 则把这一思想变成真正的生成模型。面试官会问 VAE 的损失意味着什么、为什么需要重参数化技巧，以及 VAE 与普通自编码器和 GAN 有何不同。

## 概念
**自编码器（AE）**：编码器 $z = f(x)$ 把输入压过瓶颈，解码器 $\hat x = g(z)$ 重建输入，用重建损失（MSE 或交叉熵）训练。使用 MSE 的线性 AE 学到的子空间与 PCA 相同。变体：**去噪**（破坏输入，重建干净输入）、**稀疏**（对 $z$ 加 L1 惩罚）、**欠完备**（小的 $z$）。用途：降维、预训练、异常检测（重建误差高 = 异常）。普通 AE 的隐空间有空洞，随机采样 $z$ 会得到无意义的结果。

**VAE**：编码器输出一个分布 $q_\phi(z \mid x) = \mathcal N(\mu, \text{diag}(\sigma^2))$，先验为 $p(z) = \mathcal N(0, I)$。训练最大化 **ELBO**：

$$\log p(x) \ge \mathbb E_{q(z|x)}[\log p_\theta(x \mid z)] - D_{KL}\big(q_\phi(z \mid x)\,\|\,p(z)\big)$$

第一项是重建；KL 项把隐空间正则化到先验附近，使得采样 $z \sim \mathcal N(0, I)$ 并解码能得到合理的数据。$\log p(x)$ 与 ELBO 之间的差距是 $D_{KL}(q(z|x)\,\|\,p(z|x))$。

对角高斯的**闭式 KL**（编码器通常预测 $\log\sigma^2$ 以保证稳定）：

$$D_{KL} = -\tfrac12 \sum_j \big(1 + \log\sigma_j^2 - \mu_j^2 - \sigma_j^2\big)$$

**重参数化技巧**：对 $z$ 的采样关于 $\mu,\sigma$ 不可导。改写为 $z = \mu + \sigma \odot \epsilon$，其中 $\epsilon \sim \mathcal N(0, I)$；随机性变成了输入，梯度就能经过 $\mu$ 和 $\sigma$ 传播。

**常见问题与变体**：样本模糊（高斯似然会对多个模式取平均）；**后验坍塌**（解码器忽略 $z$，KL 趋于 0，在强自回归解码器下尤其常见）；**$\beta$-VAE** 用 $\beta > 1$ 加权 KL，得到更解耦但更模糊的隐变量；KL 退火可缓解坍塌。VAE 与 GAN 对比：VAE 训练稳定、有显式似然下界并带编码器，但样本更模糊。

## 示例讲解
隐维度为 2，$\mu = [1, 0]$，$\log\sigma^2 = [0, 0]$（即 $\sigma = 1$）：

- 第 1 维：$-\tfrac12(1 + 0 - 1 - 1) = 0.5$
- 第 2 维：$-\tfrac12(1 + 0 - 0 - 1) = 0$
- $D_{KL} = 0.5$：只有偏移的均值被惩罚。

再看一维情形，$\mu = 0$，$\sigma = 2$（$\log\sigma^2 = \ln 4 \approx 1.386$）：$-\tfrac12(1 + 1.386 - 0 - 4) = 0.807$。取 $\epsilon = 0.5$ 采样得 $z = 0 + 2 \cdot 0.5 = 1$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么需要重参数化技巧？",
  "options": ["让 KL 项有闭式解", "让梯度能穿过随机采样步骤传到编码器", "让解码器变成确定性的", "增加隐变量维度"],
  "explanation": "把 z 写成 mu + sigma * eps 后，随机性移到了 eps 中，z 就成为 mu 和 sigma 的可导函数。"
}
```

```quiz
{
  "id": "q2",
  "question": "某 VAE 的 KL 项接近 0，且样本忽略隐变量编码。这种现象叫什么？",
  "options": ["模式坍塌", "后验坍塌", "梯度消失", "过拟合"],
  "explanation": "解码器忽略 z，编码器直接输出先验。解决办法：KL 退火、削弱解码器、free bits。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `kl_diag_gaussian(mu, logvar)`（N(mu, diag(exp(logvar))) 相对 N(0, I) 的 KL，对各维求和）、返回逐元素 `mu + exp(0.5 * logvar) * eps` 列表的 `reparameterize(mu, logvar, eps)`，以及 `neg_elbo(recon, kl, beta=1.0)` = recon + beta * kl。",
  "hints": ["sigma = exp(0.5 * logvar)，所以 sigma^2 = exp(logvar)。", "当且仅当 mu = 0 且 logvar = 0 时 KL 为零。"]
}
```

> [!TIP] 面试技巧
> - 把损失表述为重建 + KL，并说明每一项对隐空间的作用。
> - 用一句话解释重参数化：把随机性移到 $\epsilon$ 中，反向传播才能进行。
> - 与 GAN 对比（更清晰但不稳定、没有编码器），并提到后验坍塌和 $\beta$-VAE。
