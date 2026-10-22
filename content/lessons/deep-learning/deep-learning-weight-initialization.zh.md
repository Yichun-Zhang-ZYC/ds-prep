---
id: deep-learning-weight-initialization
title: 权重初始化
---

## 为什么重要
糟糕的初始化会让深度网络无法训练：在学习开始之前，信号和梯度就已经缩小为零或爆炸。面试官会问为什么不能用零初始化、Xavier/He 做了什么，以及它们分别该搭配哪种激活函数。

## 概念
**零（或常数）初始化严重破坏对称性**：同一层的所有单元计算出相同的输出并得到相同的梯度，因此永远保持一致。偏置可以为 0，权重则需要随机性。

**目标**：让激活值（前向）和梯度（反向）的方差在各层间大致保持不变。对 $z = \sum_{i=1}^{n_{in}} w_i x_i$，在各项独立且均值为零时：
$$\text{Var}(z) = n_{in}\,\text{Var}(w)\,\text{Var}(x)$$
所以我们希望 $n_{in}\text{Var}(w) \approx 1$。

- **Xavier/Glorot**（tanh、sigmoid、线性）：$\text{Var}(w) = \dfrac{2}{n_{in}+n_{out}}$，在前向（$1/n_{in}$）和反向（$1/n_{out}$）方差之间折中。均匀分布版本：$U[-a, a]$，其中 $a = \sqrt{6/(n_{in}+n_{out})}$。
- **He/Kaiming**（ReLU 系列）：$\text{Var}(w) = \dfrac{2}{n_{in}}$。ReLU 把一半的预激活值置零，二阶矩减半，所以权重需要乘以 2 来补偿。
- **LeCun**：$1/n_{in}$（SELU，也是许多线性层的默认值）。
- 均匀分布 $U[-a,a]$ 的方差为 $a^2/3$，所以要匹配方差而不是范围。

**实践说明**
- 固定的小标准差（如 0.01）在浅层网络中可行，但在深层网络中会消失；标准差过大则会爆炸。
- 归一化层（BatchNorm/LayerNorm）和残差连接使训练对初始化不那么敏感。
- Transformer：使用小标准差（如 0.02），并把残差分支的输出按 $1/\sqrt{2N}$（$N$ 为层数）缩放；把残差分支最后一层零初始化是常用技巧。
- 预训练权重是微调的最佳初始化。

## 示例讲解
一个 $n_{in}=512$、$n_{out}=256$ 的层：
- Xavier：$\text{Var} = 2/768 = 0.0026$，标准差 $= 0.0510$；均匀分布的界 $a = \sqrt{6/768} = 0.0884$。
- He：$\text{Var} = 2/512 = 0.0039$，标准差 $= 0.0625$。

**为什么在深度上很重要。** 令 $m_l = E[h_l^2]$。对 ReLU 层，$m_{l+1} = \tfrac12\, n_{in}\,\text{Var}(w)\, m_l$。取 $n_{in}=512$：

| 标准差 | 每层因子 | 10 层之后 |
|---|---|---|
| 0.01 | $0.5 \cdot 512 \cdot 10^{-4} = 0.0256$ | $\approx 10^{-16}$（消失） |
| 0.0625（He） | $0.5 \cdot 512 \cdot 0.0039 = 1$ | 1（稳定） |
| 0.1 | $0.5 \cdot 512 \cdot 0.01 = 2.56$ | $\approx 1.2\times10^{4}$（爆炸） |

只有 He 初始化能保持信号尺度不变。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么不能把一层的所有权重初始化为相同的值（例如零）？",
  "options": ["损失会变成无穷大", "各单元会计算出相同的输出和梯度，对称性永远无法打破", "梯度会爆炸", "网络会变成线性的"],
  "explanation": "相同的单元得到相同的更新，始终是彼此的副本，所以这一层的行为就像单个单元。"
}
```

```quiz
{
  "id": "q2",
  "question": "哪种初始化是为 ReLU 网络设计的，它的权重方差是多少？",
  "options": ["Xavier，$2/(n_{in}+n_{out})$", "LeCun，$1/n_{out}$", "He，$2/n_{in}$", "Xavier，$1/n_{in}$"],
  "explanation": "ReLU 使激活值的二阶矩减半，所以 He 初始化使用 $2/n_{in}$ 来保持方差不变。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `xavier_std(fan_in, fan_out)`（正态 Glorot 初始化的标准差）、`xavier_uniform_limit(fan_in, fan_out)`、`he_std(fan_in)`，以及 `second_moment(layers, fan_in, std, relu=True, m0=1.0)`：返回经过 `layers` 个相同的层后的 $E[h^2]$，使用 $m \\leftarrow m \\cdot n_{in}\\,\\text{std}^2 \\cdot (0.5 \\text{ if relu else } 1)$。",
  "hints": ["Xavier 方差 = 2/(fan_in + fan_out)；均匀分布的界 = sqrt(6/(fan_in + fan_out))。", "二阶矩每层都乘以相同的因子，所以等于 m0 * factor ** layers。"]
}
```

> [!TIP] 面试技巧
> - 推导 $\text{Var}(z) = n_{in}\text{Var}(w)\text{Var}(x)$ 并令其为 1；一行就能得到 Xavier/He。
> - Xavier 配 tanh/sigmoid，He 配 ReLU；把因子 2 解释为 ReLU 使一半单元置零。
> - 说明归一化和残差连接降低了对初始化的敏感度，但在最初几步中初始化仍然重要。
