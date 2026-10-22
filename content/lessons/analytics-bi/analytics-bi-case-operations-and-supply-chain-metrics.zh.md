---
id: analytics-bi-case-operations-and-supply-chain-metrics
title: "案例：运营与供应链指标"
---

## 为什么重要
运营类案例（“配送延迟、库存积压，我们该衡量什么？”）常见于零售、平台和物流公司。它们考察你能否选出精确的服务、成本和预测指标，并看到缺货与库存过剩之间的权衡。

## 概念
**服务指标**：
- **准时率**：按承诺日期送达的订单数 / 订单数。**足量率**：所有行和数量都满足的订单数 / 订单数。
- **OTIF** = 既准时又足量的订单数 / 订单数。除非两者独立，否则它不等于准时率 × 足量率；必须按订单计算。
- **满足率（fill rate）**：发货件数 / 订货件数。**缺货率**：库存为零的需求（或时间）占比。

**库存与成本**：
- **库存周转率** = COGS / 平均库存。**库存天数（DIO）** = 365 / 周转率。
- **持有成本**（资金、仓储、损耗、过时）与**缺货成本**（丢单、加急、流失）之间的权衡。
- **现金转换周期** = DIO + DSO − DPO。

**流程与产能**：**周期时间**、**吞吐量**和在制品通过 Little 定律联系：$L = \lambda W$。**利用率**接近 100% 时队列会激增，所以要留出余量。

**预测质量**：
- **WAPE** = $\sum |A_t - F_t| / \sum A_t$（对零值稳健，按量加权）。间歇性需求避免使用 MAPE。
- **偏差（bias）** = $\sum (F_t - A_t) / \sum A_t$。为正表示预测偏高（库存过剩），为负表示偏低（缺货）。

**补货逻辑**：设日需求均值为 $\mu$、标准差为 $\sigma$，提前期 $L$ 天（固定）：

$$SS = z\,\sigma\sqrt{L},\qquad ROP = \mu L + SS$$

其中 $z$ 由目标周期服务水平决定（95% 对应 $z \approx 1.645$）。提前期波动会进一步增加安全库存；需求波动越大、提前期越长，所需库存越多。

**常见陷阱**：对所有 SKU 求平均会掩盖问题商品（用 ABC 分析分层）；指标层级选错（行 vs 订单）；改善一个指标而牺牲另一个（靠超量备货提高满足率）；忽略缺货时需求被截断。

## 示例讲解
某区域仓库回顾上个月（示意数据）。共发出 1,000 单：920 单准时，950 单足量，890 单既准时又足量。

- 准时率 92%，足量率 95%，**OTIF 89%**。直接 92% × 95% = 87.4% 是错的，因为迟到和缺货的订单有重叠。其中迟到但齐全的有 60 单，准时但缺货的有 30 单，迟到且缺货的有 20 单。
- COGS 为 \$12M，平均库存 \$2M，则周转率 = 6.0，DIO = 365 / 6 ≈ 61 天。

某热销 SKU 的日均需求为 200 件，$\sigma = 40$ 件/天，供应商提前期 9 天。按 95% 周期服务水平：

- $SS = 1.645 \times 40 \times \sqrt{9} = 1.645 \times 120 \approx 197$ 件。
- $ROP = 200 \times 9 + 197 = 1{,}997$ 件。

4 周预测复盘：实际 100、120、80、100，预测 110、130、90、110。WAPE = (10 + 10 + 10 + 10) / 400 = 10%，偏差 = +40/400 = **+10%**。所有误差方向一致：预测系统性偏高，这解释了库存堆积。在增加安全库存之前，先修正偏差。

行动：按测得的偏差下调预测，重新计算补货点，按 ABC 类别跟踪 OTIF 和 DIO，并检查库存下降是否导致缺货上升。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "200 单中 160 单准时，180 单足量。OTIF 的最小可能值是多少？",
  "options": [
    "72%（0.8 x 0.9）",
    "70%（140 单）",
    "80%",
    "90%"
  ],
  "explanation": "最坏情况下 40 单迟到与 20 单缺货互不重叠：200 − 40 − 20 = 140 单既准时又足量，即 70%。最好情况是 160（80%）。乘积 72% 假设两者独立。"
}
```

```quiz
{
  "id": "q2",
  "question": "预测偏差为 +12%，WAPE 为 15%。最好的第一步是什么？",
  "options": [
    "提高安全库存以覆盖误差",
    "先修正系统性的过高预测，再根据剩余波动重新计算安全库存",
    "改用 MAPE",
    "忽略偏差，只看 WAPE"
  ],
  "explanation": "大部分误差是有方向的、可修正的。为已知偏差多备库存只会让库存膨胀。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `service_metrics(orders)`。每个订单是带有 `promised`、`delivered`（天数）以及 `ordered_units`、`shipped_units` 的字典。`delivered <= promised` 为准时，`shipped_units >= ordered_units` 为足量。返回包含 `on_time`、`in_full`、`otif`（订单占比）和 `fill_rate`（总发货 / 总订货，每单发货量以订货量为上限）的字典。",
  "hints": [
    "OTIF 要求同一订单同时满足两个条件，而不是两个比率相乘。",
    "用 `min(shipped, ordered)` 限制发货量，避免超发掩盖缺口。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "实现 `wape(actual, forecast)` = Σ|A − F| / ΣA 和 `bias(actual, forecast)` = Σ(F − A) / ΣA。再实现 `inventory_days(cogs, avg_inventory)` = 365 / (cogs / avg_inventory)。",
  "hints": [
    "WAPE 用绝对误差；偏差用带符号误差，误差可能互相抵消。",
    "第二个测试中误差相互抵消：WAPE 为 50%，偏差为 0%。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "实现 `reorder_point(mean_daily, sd_daily, lead_days, service)`。用 `statistics.NormalDist().inv_cdf(service)` 求 z。返回 `(safety_stock, reorder_point)`，其中 `safety_stock = z * sd_daily * sqrt(lead_days)`，`reorder_point = mean_daily * lead_days + safety_stock`。再实现 `expected_holding_saving(old_ss, new_ss, unit_cost, holding_rate)` = (old_ss − new_ss) × unit_cost × holding_rate（年度持有成本节省）。",
  "hints": [
    "安全库存随提前期的平方根增长，而非线性增长。",
    "服务水平越高，z 越大，安全库存越多。"
  ]
}
```

> [!TIP] 面试技巧
> - 精确定义每个指标（按订单还是按件、分母是什么），并说明 OTIF 必须按订单计算。
> - 把库存看作权衡：持有成本对缺货成本，安全库存与服务水平、需求和提前期波动挂钩。
> - 区分预测偏差（可修正、有方向）与预测噪声（需要缓冲），并在求平均之前先按 ABC 分类分层。
