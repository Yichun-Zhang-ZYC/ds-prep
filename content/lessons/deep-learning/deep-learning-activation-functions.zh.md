---
id: deep-learning-activation-functions
title: 激活函数（ReLU、sigmoid、tanh、GELU）
---

## 为什么重要
激活函数提供了让深度有意义的非线性，其导数决定梯度能否顺利流动。“为什么用 ReLU 而不是 sigmoid？”和“GELU 是什么？”是标准的筛选类问题。

## 概念
| 函数 | 公式 | 值域 | 说明 |
|---|---|---|---|
| Sigmoid | $\sigma(x) = \frac{1}{1+e^{-x}}$ | (0, 1) | $\sigma' = \sigma(1-\sigma) \le 0.25$；会饱和；非零中心。用于二分类输出和门控。 |
| Tanh | $\tanh x = 2\sigma(2x) - 1$ | (−1, 1) | $\tanh' = 1 - \tanh^2 \le 1$；零中心但仍会饱和。 |
| ReLU | $\max(0, x)$ | [0, ∞) | 计算便宜，$x>0$ 时不饱和，输出稀疏；当某单元的输入始终为负时会“神经元死亡”（梯度为 0）。 |
| Leaky ReLU | $\max(\alpha x, x)$ | ℝ | $x<0$ 时有小斜率 $\alpha$（如 0.01），保持梯度存活。 |
| GELU | $x\,\Phi(x)$ | ≈ [−0.17, ∞) | 平滑，在 0 附近非单调；BERT/GPT 类 Transformer 的默认选择。近似：$0.5x(1+\tanh[\sqrt{2/\pi}(x+0.044715x^3)])$。 |
| Softmax | $\frac{e^{z_i}}{\sum_j e^{z_j}}$ | 单纯形 | 多分类输出层。减去 $\max z$ 以保证数值稳定。 |

要点：
- 饱和型激活（sigmoid/tanh）在 $|x|$ 较大时梯度接近 0，导致深层网络的**梯度消失**。
- ReLU 在激活侧的梯度恰好为 1，这使深层网络得以训练；代价是神经元可能死亡。
- GELU/SiLU（Swish）是 ReLU 的平滑近亲：$x\,\Phi(x)$ 用标准正态小于输入的概率对输入加权。现代 Transformer 还使用门控变体（SwiGLU）。
- 隐藏层的选择不会改变输出层的选择：sigmoid/softmax/线性要与任务匹配。

## 示例讲解
在 $x = -2, 0, 2$ 处求值（保留 4 位小数）：

| $x$ | sigmoid | tanh | ReLU | GELU |
|---|---|---|---|---|
| −2 | 0.1192 | −0.9640 | 0 | −0.0455 |
| 0 | 0.5000 | 0 | 0 | 0 |
| 2 | 0.8808 | 0.9640 | 2 | 1.9545 |

GELU(2) $= 2\,\Phi(2) = 2 \times 0.9772 = 1.9545$；GELU(−2) $= -2 \times 0.0228 = -0.0455$，是一个很小的负值，而不是 ReLU 的硬性 0。

$x = 2$ 处的梯度：$\sigma' = 0.8808 \times 0.1192 = 0.105$，$\tanh' = 1 - 0.964^2 = 0.071$，ReLU' $= 1$。在 $x=0$ 处 $\sigma'=0.25$ 达到最大。

$[2, 1, 0]$ 的 softmax：$[0.6652, 0.2447, 0.0900]$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "ReLU 在深度网络隐藏层中大体取代 sigmoid 的主要原因是什么？",
  "options": ["ReLU 的输出是概率", "ReLU 对正输入的梯度为 1，避免了饱和和梯度消失", "ReLU 处处可导", "ReLU 是零中心的"],
  "explanation": "Sigmoid 的导数最大为 0.25，饱和时接近 0；ReLU 在激活时原样传递梯度。ReLU 在 0 处不可导，也不是零中心的。"
}
```

```quiz
{
  "id": "q2",
  "question": "某个 ReLU 单元对每个训练样本的预激活值都是负数，会发生什么？",
  "options": ["它的权重无限增大", "它对所有输入输出 1", "梯度为零，停止学习（ReLU 死亡）", "它变成线性函数"],
  "explanation": "输出和梯度都为零，输入该单元的权重永远不会更新。Leaky ReLU/GELU 可缓解这一问题。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `sigmoid(x)`（对很大的负数 x 数值稳定）、`relu(x)`、`leaky_relu(x, alpha=0.01)`、`gelu(x)`（精确版本，使用 `math.erf`）、`sigmoid_grad(x)` 以及 `softmax(zs)`（输入为列表；减去最大值以保证稳定）。",
  "hints": ["稳定的 sigmoid：x >= 0 时用 1/(1+exp(-x))；否则用 exp(x)/(1+exp(x))。", "精确 GELU：0.5 * x * (1 + erf(x / sqrt(2)))。"]
}
```

> [!TIP] 面试技巧
> - 把每个激活函数和它的梯度联系起来：饱和导致梯度消失；神经元死亡是 ReLU 的弱点。
> - 要能解释 softmax 为何需要减最大值的技巧（避免 exp 溢出）。
> - 对 Transformer，要知道 GELU（以及现代 LLM 中的 SwiGLU）是标准的 FFN 激活函数。
