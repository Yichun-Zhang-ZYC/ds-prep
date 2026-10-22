---
id: time-series-ar-ma-arma-arima-sarima
title: "AR、MA、ARMA、ARIMA、SARIMA"
---

## 为什么重要
ARIMA 是经典的统计预测模型，也是 DS 面试的常客：$p, d, q$ 分别是什么意思、如何选择，以及预测和预测区间的行为如何。

## 概念
**AR($p$)**：对过去的值做回归，$y_t = c + \phi_1 y_{t-1} + \dots + \phi_p y_{t-p} + \varepsilon_t$。当 $1 - \phi_1 z - \dots - \phi_p z^p$ 的根都在单位圆外时平稳；对 AR(1) 即 $|\phi| < 1$，均值为 $c/(1-\phi)$。

**MA($q$)**：对过去的冲击做回归，$y_t = \mu + \varepsilon_t + \theta_1 \varepsilon_{t-1} + \dots + \theta_q \varepsilon_{t-q}$。总是平稳的。一次冲击只影响之后的 $q$ 期。（它不是移动平均平滑器。）

**ARMA($p,q$)** 把两者结合：$\phi(B) y_t = c + \theta(B)\varepsilon_t$。**ARIMA($p,d,q$)** 对做过 $d$ 次差分的序列拟合 ARMA。

**SARIMA** $(p,d,q)(P,D,Q)_m$ 加入季节 AR/MA 项以及周期为 $m$ 的季节差分，例如月度数据的 $(1,1,1)(0,1,1)_{12}$（“航空模型”）。

**工作流程**（Box-Jenkins）：(1) 使序列平稳（变换、差分）；(2) 读 ACF/PACF 得到候选的 $p, q$（或用 AIC/BIC 搜索，如 auto-ARIMA）；(3) 用极大似然估计；(4) 检查残差是否为白噪声（Ljung-Box、ACF）；(5) 预测并做样本外验证。

**预测行为**：平稳 ARMA 的长期预测收敛到均值。$d=1$ 时变为水平线或类似漂移，带常数项的 $d=1$ 模型则沿线性漂移。**预测区间**随步长变宽（平稳模型有上界，随机游走则按 $\sqrt h$ 增长）。AR($p$) 的预测是递归的：用预测值代替未知的未来值。

**局限**：线性、单变量、方差恒定（波动率用 GARCH）、需要足够的历史数据，外部回归量只能通过 ARIMAX/SARIMAX 处理。

## 示例讲解
AR(2)：$y_t = 1 + 0.5 y_{t-1} + 0.2 y_{t-2}$，最近的值为 $y_{T-1} = 4$，$y_T = 6$。一步：$1 + 0.5\cdot6 + 0.2\cdot4 = 4.8$。两步：$1 + 0.5\cdot4.8 + 0.2\cdot6 = 4.6$。长期均值：$1/(1 - 0.5 - 0.2) = 3.33$，预测值逐渐逼近它。对 $\phi = 0.5$ 的 ARIMA(1,1,0)，最后两个水平为 $100, 104$：最后的差分为 $4$，预测差分为 $2, 1, \dots$（无常数项），所以水平预测为 $106, 107, \dots$，并趋于平缓。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "差分后序列的 ACF 在滞后 1 之后截尾，PACF 缓慢衰减。最合理的 ARIMA 阶数是？",
  "options": [
    "ARIMA(1,1,0)",
    "ARIMA(0,1,1)",
    "ARIMA(1,0,1)",
    "ARIMA(0,0,0)"
  ],
  "explanation": "ACF 在滞后 q 处截尾意味着差分序列是 MA(q)，即 ARIMA(0,1,1)。"
}
```

```quiz
{
  "id": "q2",
  "question": "对平稳 ARMA 模型，长期点预测会收敛到什么？",
  "options": [
    "最后一个观测值",
    "零",
    "过程的无条件均值",
    "线性趋势"
  ],
  "explanation": "冲击的影响会衰减，所以预测回归到过程均值（AR 的情形是 c / (1 - phi 之和)）。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `fit_ar(y, p)`：带截距的最小二乘 AR(p)（`y_t = c + phi_1 y_{t-1} + ... + phi_p y_{t-p}`）；返回 `(c, phis)`，其中 `phis` 是列表 `[phi_1..phi_p]`。实现 `forecast_ar(y, c, phis, h)`：把预测值反馈回去的递归 h 步预测。再实现 `arima_d1_forecast(y, p, h)`：ARIMA(p,1,0) 预测 = 先做一次差分，拟合 AR(p)，预测差分，再积分还原为水平值。",
  "hints": [
    "X 的第 t 行是 [1, y[t-1], ..., y[t-p]]，目标是 y[t]，t = p..n-1。使用 np.linalg.lstsq。",
    "递归中 hist[-1] 是滞后 1，hist[-2] 是滞后 2，依此类推；把每个预测值追加到 hist。"
  ]
}
```

> [!TIP] 面试技巧
> - 要能说清：$d$ 来自平稳性检验，$p$ 来自 PACF，$q$ 来自 ACF，然后用 AIC 和残差诊断验证。
> - 提到 AIC 不能在不同 $d$ 的模型之间比较（数据不同），所以用样本外误差比较。
> - 知道何时不用 ARIMA：序列很多、非线性模式、丰富的协变量、多重季节性。改用 ETS、ML 或全局模型。
