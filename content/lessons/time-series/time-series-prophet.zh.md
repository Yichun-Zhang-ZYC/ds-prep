---
id: time-series-prophet
title: "Prophet"
---

## 为什么重要
Prophet 是一个流行的开源预测工具，适用于业务序列（带节假日的日数据、强季节性、有缺失值）。面试官会问它如何工作、何时适用，以及与 ARIMA 或提升树相比的弱点。

## 概念
Prophet 拟合一个可分解的加性模型：$y(t) = g(t) + s(t) + h(t) + \varepsilon_t$。
- **趋势** $g(t)$：分段线性，或带容量 $C$ 的**逻辑增长**（用于饱和序列）。斜率在**变点**处改变（默认 25 个，位于历史前 80% 内）：$g(t) = (k + \mathbf a(t)^\top \boldsymbol\delta)\, t + (m + \mathbf a(t)^\top \boldsymbol\gamma)$。对斜率变化 $\boldsymbol\delta$ 使用稀疏的 Laplace 先验（`changepoint_prior_scale`）来控制灵活度：太高会过拟合，太低会欠拟合。
- **季节性** $s(t)$：傅里叶级数 $\sum_{k=1}^K \left(a_k \cos\frac{2\pi k t}{P} + b_k \sin\frac{2\pi k t}{P}\right)$，年周期 $P = 365.25$（$K=10$），周周期 $P=7$（$K=3$）。$K$ 越大越能拟合尖锐模式，也越容易过拟合。波动随水平缩放时使用 `seasonality_mode='multiplicative'`。
- **节假日/事件** $h(t)$：指示变量列，可在日期前后设置窗口。
- 可以添加**额外回归量**（其未来值必须已知）。

**拟合**：贝叶斯模型，通过 MAP（Stan L-BFGS）拟合，计算便宜，对缺失值和异常值稳健，不需要等间隔或平稳性。不确定性区间来自模拟未来的趋势变点加观测噪声。

**优点**：成分可解释、处理节假日、支持趋势断点、容忍缺口、便于结合领域知识调参。**缺点**：本质上是对时间做回归，没有自回归项，因此抓不住短期动量；经常输给调好的 ETS/ARIMA/GBM 基准；趋势外推很激进；序列多时需要拟合很多次。务必用滚动起点回测做**交叉验证**。

## 示例讲解
日订单量：趋势斜率为每天 $+2$，在第 50 天有一个变点，增长放缓 $0.8$/天（新斜率 $1.2$）。周模式：$2\sin(2\pi t/7) + \cos(2\pi t/7)$，因此周振幅为 $\sqrt{2^2+1^2} \approx 2.24$ 单。在第 60 天，趋势贡献为 $1 + 2\cdot60 - 0.8\cdot(60-50) = 113$。再加上第 60 天一次性的节假日效应 $-6$，预测为 $113 + \text{季节项} - 6$。如果第 200 天的预测高得不合理，可以用逻辑增长设置上限，或降低 `changepoint_prior_scale`。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "Prophet 的 changepoint_prior_scale 控制什么？",
  "options": [
    "傅里叶项的数量",
    "趋势的灵活度，即斜率变化可以多大",
    "预测期长度",
    "节假日窗口大小"
  ],
  "explanation": "它设定斜率变化的 Laplace 先验的尺度：越大趋势越灵活（有过拟合风险），越小趋势越僵硬。"
}
```

```quiz
{
  "id": "q2",
  "question": "与 ARIMA/ETS 相比，Prophet 已知的弱点是？",
  "options": [
    "无法处理节假日",
    "需要平稳性",
    "没有自回归项，抓不住短期动量",
    "无法给出区间"
  ],
  "explanation": "Prophet 是对时间的回归（趋势、季节性、事件）；除非添加回归量，否则它不建模近期残差的自相关。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "Prophet 是一种加性回归：带变点的分段线性趋势加傅里叶季节项。实现 `design_matrix(t, changepoints, period, K)`，列为 `[1, t, 每个变点 s 对应的 max(0, t - s), 对 k = 1..K 的 sin(2πkt/period)、cos(2πkt/period)]`（`t` 为 numpy 数组），以及 `fit_predict(t, y, changepoints, period, K, t_new)`：对 `(t, y)` 做普通最小二乘拟合并在 `t_new` 处预测。",
  "hints": [
    "每个变点增加一列铰链函数 max(0, t - s)；其系数就是 s 处斜率的变化量。",
    "用 np.column_stack 拼接各列，再用 lstsq；预测时在 t_new 处构造相同的设计矩阵。"
  ]
}
```

> [!TIP] 面试技巧
> - 把它描述为对时间的广义加性回归（趋势 + 傅里叶季节项 + 节假日），而不是自回归模型。
> - 说出调参旋钮：变点先验尺度、季节先验和傅里叶阶数、季节模式、节假日、逻辑增长的上下限。
> - 坦诚说明局限：用滚动起点交叉验证与季节性朴素、ETS/ARIMA 做基准对比；序列很多且相关时考虑全局 ML 模型。
