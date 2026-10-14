---
id: probability-beta-gamma
title: Beta 分布与 Gamma 分布
---

## 为什么重要
Beta 和 Gamma 很少以“算出这个概率”的形式出现，它们出现在贝叶斯 A/B 测试、汤普森采样以及速率建模中。面试官想看的是你知道它们用来做什么（以及 Beta-二项共轭更新）。

## 概念
**Beta(α, β)** 定义在 $[0, 1]$ 上，所以用来刻画一个未知的**概率**（比如转化率）：

$$
E[p] = \frac{\alpha}{\alpha + \beta}
$$

可以把 α − 1 理解为先验的成功次数，β − 1 为先验的失败次数。Beta(1, 1) 就是均匀分布。

**Beta-二项更新**：先验为 Beta(α, β)，在 $n$ 次试验中观察到 $s$ 次成功，后验为

$$
\text{Beta}(\alpha + s,\; \beta + n - s)
$$

**Gamma(k, θ)** 定义在 $(0, \infty)$ 上，用来刻画为正且偏态的量（第 $k$ 个泊松事件的等待时间、速率）。均值 $k\theta$，方差 $k\theta^2$。指数分布就是 $k = 1$ 的 Gamma 分布，而 Gamma 是泊松速率的共轭先验。

## 示例讲解
对某个版本的转化率，先验取 Beta(1, 1)。200 名访客中有 40 人转化之后：

$$
\text{posterior} = \text{Beta}(41, 161), \qquad E[p] = \frac{41}{202} \approx 0.203
$$

与原始比率 0.20 相比，后验均值被稍微拉向先验（0.5）；数据越多，后验越集中。比较两个版本的后验（例如通过采样），就能得到“B 胜过 A 的概率”。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "先验为 Beta(2, 8)。在 10 次试验中观察到 3 次成功，后验是什么？",
  "options": ["Beta(5, 15)", "Beta(3, 7)", "Beta(5, 18)", "Beta(2, 8)"],
  "explanation": "成功次数加到 α 上，失败次数加到 β 上：Beta(2 + 3, 8 + 7) = Beta(5, 15)。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `beta_update(alpha, beta, successes, trials)`，返回后验参数 `(alpha, beta)`；再编写 `prob_b_beats_a(a_conv, a_n, b_conv, b_n, draws, seed)`：用 `random.Random(seed).betavariate` 从两个 Beta(1+conv, 1+n−conv) 后验中采样，估计 P(p_B > p_A)。",
  "hints": ["后验：alpha + 成功次数，beta + 失败次数。", "多次从各自的后验中抽取 pa 和 pb，统计 pb > pa 的比例。"]
}
```

> [!TIP] 面试技巧
> - 把 Beta 描述为“关于一个概率的分布”，并给出伪计数的直觉解释。
> - 谈到多臂老虎机时提一下汤普森采样（从每个臂的 Beta 后验中采样，选最大的那个）。
> - 把“B 胜过 A 的概率”（贝叶斯）和 p 值做对比；业务方通常更容易理解前者。
