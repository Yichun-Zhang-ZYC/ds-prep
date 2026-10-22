---
id: math-derivatives-chain-rule
title: 导数与链式法则
---

## 为什么重要
训练神经网络就是反复求导，反向传播不过是把链式法则应用在计算图上。面试官常要求你手推 sigmoid 或逻辑损失的梯度，并解释深层网络中梯度为什么会消失。

## 概念
**导数** $f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$ 是瞬时变化率：即切线的斜率，也是最佳线性近似 $f(x+h) \approx f(x) + f'(x)h$。

**求导法则**：和 $(f+g)' = f' + g'$；积 $(fg)' = f'g + fg'$；商 $(f/g)' = (f'g - fg')/g^2$；幂 $(x^n)' = n x^{n-1}$。

**链式法则**：对 $y = f(g(x))$，$\dfrac{dy}{dx} = f'(g(x))\,g'(x)$。在链 $x \to u \to v \to L$ 中，梯度是各局部导数的乘积：$\frac{dL}{dx} = \frac{dL}{dv}\frac{dv}{du}\frac{du}{dx}$。反向传播从输出向后计算这个乘积，并复用每个中间结果。

**必须熟记的导数**：
- $(e^x)' = e^x$，$(\ln x)' = 1/x$
- $\sigma(z) = \frac{1}{1+e^{-z}}$ 满足 $\sigma' = \sigma(1-\sigma) \le 0.25$
- $\tanh' = 1 - \tanh^2$，$\text{ReLU}'(x) = \mathbb 1[x > 0]$
- 逻辑损失 $L = -[y\ln \sigma(z) + (1-y)\ln(1-\sigma(z))]$ 的导数很简洁：$\frac{dL}{dz} = \sigma(z) - y$。

**梯度消失 / 爆炸**：深层链条会把许多局部导数连乘。sigmoid 的因子最大为 0.25，所以 10 层会把信号缩小到 $\le 0.25^{10} \approx 10^{-6}$。因子持续大于 1 则会爆炸。ReLU、残差连接、归一化和梯度裁剪是标准的解决办法。

**合理性检验**：中心差分 $\frac{f(x+h) - f(x-h)}{2h}$ 的误差为 $O(h^2)$，是标准的梯度检查方法。

## 示例讲解
单个 sigmoid 单元的平方损失：$L = (\sigma(wx + b) - y)^2$，其中 $w = 0.5,\ x = 2,\ b = 0.1,\ y = 1$。

前向：$z = 1.1$，$a = \sigma(1.1) \approx 0.7503$。反向，每一步一个局部导数：
- $\frac{dL}{da} = 2(a - y) = -0.4995$
- $\frac{da}{dz} = a(1-a) \approx 0.1874$
- $\frac{dL}{dz} = -0.4995 \times 0.1874 \approx -0.0936$
- $\frac{dL}{dw} = \frac{dL}{dz} \cdot x \approx -0.1872$，$\frac{dL}{db} = \frac{dL}{dz} \approx -0.0936$

负号表示增大 $w$ 会降低损失，因为该单元对标签 1 预测偏低。注意即使预测很差，梯度也很小：$\sigma'$ 只有 0.187，这是轻度饱和效应，交叉熵损失可以避免它。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "$\\sigma(z)$ 在 $z = 0$ 处的导数是多少？它对深层 sigmoid 网络有何意义？",
  "options": [
    "1，所以梯度得以保持",
    "0.25（最大值），所以堆叠多层 sigmoid 至少会让梯度按几何级数缩小",
    "0.5，所以梯度只减半一次",
    "0，所以该单元无法学习"
  ],
  "explanation": "$\\sigma'(0) = 0.5 \\times 0.5 = 0.25$ 是 $\\sigma'$ 的峰值。每一层最多把反向信号乘以 0.25（再乘权重），这就导致梯度消失。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于 $L = \\ln(1 + e^{-wx})$，关于 $w$ 的导数，下列哪个表达式正确？",
  "options": [
    "$-x\\,\\sigma(-wx)$",
    "$x\\,\\sigma(wx)$",
    "$-x\\,e^{-wx}$",
    "$\\dfrac{1}{1 + e^{-wx}}$"
  ],
  "explanation": "链式法则：$\\frac{dL}{dw} = \\frac{1}{1+e^{-wx}} \\cdot e^{-wx} \\cdot (-x) = -x \\cdot \\frac{e^{-wx}}{1+e^{-wx}} = -x\\,\\sigma(-wx)$。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `num_deriv(f, x, h=1e-5)`（中心差分）、`sigmoid(z)`，以及 `loss_grad(w, b, x, y)`，用链式法则（不要用数值微分）返回 $L = (\\sigma(wx+b) - y)^2$ 的 `(dL/dw, dL/db)`。",
  "hints": [
    "中心差分：(f(x+h) - f(x-h)) / (2h)。",
    "dL/dz = 2(a - y) * a(1 - a)；然后 dL/dw = dL/dz * x，dL/db = dL/dz。"
  ]
}
```

> [!TIP] 面试技巧
> - 要能从头推导逻辑损失的梯度 $\sigma(z) - y$，这是经典的白板题。
> - 把反向传播解释为“链式法则 + 缓存前向值”，并把梯度消失与 $\sigma' \le 0.25$ 联系起来。
> - 提到用中心差分（误差 $O(h^2)$）做梯度检查，作为调试手段。
