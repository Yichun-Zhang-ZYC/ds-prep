---
id: deep-learning-loss-functions
title: 损失函数
---

## 为什么重要
损失函数定义了网络优化的目标。面试官会问：分类为什么用交叉熵而不是 MSE，何时用 Huber/MAE，以及如何稳定地计算 softmax 交叉熵。

## 概念
**回归**
- **MSE** $\frac1n\sum (\hat y - y)^2$：高斯噪声下的极大似然，对离群点惩罚很重，预测条件均值。
- **MAE** $\frac1n\sum |\hat y - y|$：拉普拉斯分布的极大似然，鲁棒，预测条件中位数；梯度大小恒定，在 0 处不可导。
- **Huber**：当 $|r|\le\delta$ 时为二次，超出后为线性：$\delta(|r| - \delta/2)$。兼具 MSE 在 0 附近的平滑性和 MAE 在尾部的鲁棒性。

**分类**
- **二元交叉熵（BCE）**：$-[y\log p + (1-y)\log(1-p)]$，其中 $p = \sigma(z)$。对 logit 的梯度为 $p - y$。
- **类别交叉熵**：$-\log p_{\text{true}}$，其中 $p = \text{softmax}(z)$；对 logits 的梯度为 $p - \text{onehot}$。
- 交叉熵是标签的负对数似然，是适当评分规则，并使逻辑回归保持凸优化问题。
- **为什么分类不用 MSE**：sigmoid 输出配 MSE 时，梯度为 $(p-y)\,p(1-p)$，当模型*自信地预测错误*时会消失。而 BCE 的 $p - y$ 不会。
- **数值稳定性**：用 log-sum-exp 从 logits 直接计算，$\log\sum e^{z_j} = m + \log\sum e^{z_j - m}$（$m=\max z$），不要朴素地计算 $\log(\text{softmax}(z))$（`BCEWithLogitsLoss`、`CrossEntropyLoss` 就是这样做的）。

**值得一提的变体**：标签平滑（软目标，抑制过度自信）、focal loss $-(1-p_t)^\gamma\log p_t$（降低易分样本权重，应对类别不平衡）、类别权重、合页损失（SVM）、对比/三元组损失（嵌入）、KL 散度（蒸馏、VAE）。

## 示例讲解
Logits $z = [2, 1, 0]$，真实类别为 0。

Softmax：$e^z = [7.389, 2.718, 1]$，和 $= 11.107$，所以 $p = [0.6652, 0.2447, 0.0900]$。

交叉熵损失 $= -\ln 0.6652 = 0.4076$。对 logits 的梯度 $= p - \text{onehot} = [-0.3348,\ 0.2447,\ 0.0900]$（和为 0）。

**自信地预测错误时 MSE 与 BCE 的对比**：$y=1$，logit $z=-4$，所以 $p = \sigma(-4) = 0.0180$。
- BCE 对 $z$ 的梯度：$p - y = -0.982$。
- MSE（$\tfrac12(p-y)^2$）的梯度：$(p-y)\,p(1-p) = -0.982 \times 0.0180 \times 0.982 = -0.0173$。

恰恰在模型最需要修正的时候，MSE 的梯度小了约 57 倍。

$\delta=1$ 的 Huber：残差 0.5 时为 $0.5\cdot0.25 = 0.125$；残差 3 时为 $1\cdot(3 - 0.5) = 2.5$（MSE 则为 4.5）。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 sigmoid 分类器偏好交叉熵而不是 MSE？",
  "options": ["MSE 无法对概率计算", "交叉熵计算更快", "sigmoid 在错误预测上饱和时 MSE 的梯度会消失，而交叉熵给出 $p-y$", "交叉熵没有超参数"],
  "explanation": "使用 MSE 时梯度带有因子 $p(1-p)$，对自信的错误来说它接近 0；交叉熵把它抵消掉了。"
}
```

```quiz
{
  "id": "q2",
  "question": "回归目标中偶尔出现巨大的离群值。哪个损失是最合理的起点？",
  "options": ["MSE", "Huber", "合页损失", "交叉熵"],
  "explanation": "Huber 在 0 附近是二次的（优化平滑），对大残差则是线性的，限制了离群点的影响。MSE 则被离群点主导。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "（纯 Python）实现 `mse(y, yhat)`、`huber(y, yhat, delta=1.0)`（平均 Huber 损失）、`bce(y, p, eps=1e-12)`（平均二元交叉熵，把 p 截断到 [eps, 1-eps]）、使用 log-sum-exp 技巧的单样本 `cross_entropy_from_logits(logits, target)`，以及返回对 logits 梯度的 `softmax_ce_grad(logits, target)`。",
  "hints": ["log-sum-exp：m = max(logits)；lse = m + log(sum(exp(z - m)))。损失 = lse - logits[target]。", "梯度 = softmax(logits) 并在 target 下标处减 1。"]
}
```

> [!TIP] 面试技巧
> - 讲清概率视角：MSE = 高斯极大似然，MAE = 拉普拉斯极大似然，交叉熵 = 伯努利/类别分布极大似然。
> - 要知道 softmax/sigmoid + 交叉熵的简洁梯度 $p - y$，以及 MSE 为何不适合分类。
> - 提到数值稳定性（log-sum-exp、从 logits 计算损失）和不平衡处理方法（类别权重、focal loss）。
