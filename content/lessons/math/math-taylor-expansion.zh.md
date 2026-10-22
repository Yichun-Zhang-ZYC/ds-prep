---
id: math-taylor-expansion
title: 泰勒展开
---

## 为什么重要
泰勒展开是理解大部分优化方法的视角：梯度下降使用损失的一阶模型，牛顿法使用二阶模型。它也为 $\log(1+x) \approx x$、$e^x \approx 1 + x$ 等近似提供依据，这些近似常出现在概率、数值稳定性和损失分析中。

## 概念
对于在点 $a$ 附近光滑的函数：
$$f(x) = \sum_{k=0}^{n} \frac{f^{(k)}(a)}{k!}(x - a)^k + R_n(x)$$
余项为 $R_n = O\big((x-a)^{n+1}\big)$，所以近似在 $a$ 附近很准，离得远则变差。当 $a = 0$ 时称为麦克劳林级数。

**需要记住的级数（在 0 附近）**：
- $e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$
- $\ln(1+x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \cdots$，$|x| < 1$
- $\frac{1}{1-x} = 1 + x + x^2 + \cdots$，$|x| < 1$
- $\sin x = x - \frac{x^3}{3!} + \cdots$，$\ \cos x = 1 - \frac{x^2}{2!} + \cdots$
- 在 0 附近 $\sigma(x) \approx \frac12 + \frac x4$

**多元形式**：$f(x + \delta) \approx f(x) + \nabla f^\top \delta + \tfrac12 \delta^\top H \delta$。

**在机器学习中的应用**：
- **梯度下降**最小化一阶模型加上邻近惩罚项 $\frac{1}{2\eta}\|\delta\|^2$，得到 $\delta = -\eta\nabla f$。下降引理：若 $f$ 为 $L$-光滑（海森矩阵 $\preceq L I$）且 $\eta \le 1/L$，则每一步都会降低损失。
- **牛顿法**最小化二阶模型：$\delta = -H^{-1}\nabla f$。
- **小量近似**：$\log(1 + x) \approx x$（对数收益率、为数值稳定使用 `log1p`），$(1+x)^n \approx 1 + nx$，以及用于 $g(X)$ 方差的 delta 方法：$\text{Var}\,g(X) \approx g'(\mu)^2\,\sigma^2$。
- **损失曲面分析**：极小值附近的曲率解释了对学习率和扰动的敏感性（平坦极小值 vs 尖锐极小值）。

## 示例讲解
用 $x = 0.1$ 近似 $\ln(1.1)$（真实值 $0.095310$）：
- 一阶：$x = 0.1$，误差 $4.7 \times 10^{-3}$
- 二阶：$x - x^2/2 = 0.095$，误差 $3.1 \times 10^{-4}$
- 三阶：$0.095 + x^3/3 = 0.095333$，误差 $2.3 \times 10^{-5}$

这里每多一项，误差大约缩小到原来的 $x \approx 0.1$ 倍。

二次损失模型：$f(x, y) = x^2 + 3y^2$ 在 $(1, 1)$ 处有 $\nabla f = (2, 6)$，$H = \text{diag}(2, 6)$。对步长 $\delta = (-0.1, -0.1)$：预测变化 $= \nabla f^\top\delta + \tfrac12\delta^\top H\delta = -0.8 + \tfrac12(0.02 + 0.06) = -0.76$。真实变化为 $f(0.9, 0.9) - f(1, 1) = 3.24 - 4 = -0.76$，因为 $f$ 是二次函数所以完全吻合。仅用一阶模型预测为 $-0.8$，由于忽略曲率而高估了下降量。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "最小化一阶泰勒模型加上 $\\frac{1}{2\\eta}\\|\\delta\\|^2$，得到下列哪种更新步长？",
  "options": [
    "$\\delta = -H^{-1}\\nabla f$",
    "$\\delta = -\\eta\\nabla f$",
    "$\\delta = -\\eta\\,\\text{sign}(H)$",
    "$\\delta = -\\eta f$"
  ],
  "explanation": "最小化 $\\nabla f^\\top\\delta + \\frac{1}{2\\eta}\\|\\delta\\|^2$ 得 $\\nabla f + \\delta/\\eta = 0$，即 $\\delta = -\\eta\\nabla f$。若去掉惩罚项并使用二阶模型，得到的则是牛顿步长。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于小的 $x$，$\\ln(1+x)$ 的二阶近似是什么？",
  "options": [
    "$x + x^2/2$",
    "$x - x^2/2$",
    "$x - x^2$",
    "$1 + x$"
  ],
  "explanation": "$f(0) = 0$，$f'(0) = 1$，$f''(0) = -1$，所以 $f(x) \\approx x - x^2/2$。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `taylor_poly(derivs, a, x)`，返回 $\\sum_k \\text{derivs}[k]\\,(x-a)^k / k!$（`derivs[k]` 是在 `a` 处的 $k$ 阶导数）；实现 `quad_change(g, H, delta)`，返回二阶预测变化 $g\\cdot\\delta + \\tfrac12\\delta^\\top H\\delta$；以及 `newton_1d(df, d2f, x0, steps)`，重复执行 `x -= df(x)/d2f(x)` 并返回最终的 `x`。",
  "hints": [
    "每一项是 derivs[k] * (x - a)**k / k!，可用 math.factorial。",
    "numpy 写法：g @ delta + 0.5 * delta @ H @ delta。",
    "对 f(x) = x - ln x，牛顿迭代为 x_{t+1} = 2x_t - x_t^2，从 0.5 出发收敛到 1。"
  ]
}
```

> [!TIP] 面试技巧
> - 说出“梯度下降 = 一阶泰勒模型，牛顿法 = 二阶模型”，把泰勒展开和优化联系起来。
> - 记住小 $x$ 时 $\ln(1+x) \approx x$、$e^x \approx 1 + x$，并提到为了数值稳定使用 `log1p` / `expm1`。
> - 强调近似只是局部的：步长必须足够小，才能让余项可以忽略。
