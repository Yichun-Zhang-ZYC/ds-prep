---
id: analytics-bi-revenue-arpu-ltv-cac
title: 收入、ARPU、LTV、CAC
---

## 为什么重要
单位经济模型决定增长是否健康。面试官会让你定义这些指标，用几个数字算出 LTV:CAC 和回收期，并解释简单公式在什么情况下失效。

## 概念
**定义**：
- **收入（Revenue）**：已确认的收入。要区分**总额与净额**（扣除退款、折扣后）、订阅业务的 **MRR/ARR**，以及预订额与收入。
- **ARPU**（每用户平均收入）$= \dfrac{\text{收入}}{\text{活跃用户数}}$，按某个周期计算。**ARPPU** 只除以*付费*用户数，所以更高，并且忽略了转化率。
- **CAC**（获客成本）$= \dfrac{\text{销售与营销支出}}{\text{新增客户数}}$。**混合** CAC 包含自然流量客户；**付费** CAC 只用付费投入除以付费获得的客户。
- **LTV**（客户终身价值）：来自一个客户的预期毛利。月流失率 $c$ 恒定时的简单订阅公式：
$$\text{LTV} = \frac{\text{ARPU} \times \text{毛利率}}{c}, \qquad \text{预期生命周期} = \frac{1}{c} \text{ 个月}$$
- **LTV:CAC**：经验法则 $\ge 3$。**CAC 回收期** $= \dfrac{\text{CAC}}{\text{ARPU} \times \text{毛利率}}$ 个月，通常目标是 12 个月以内。

**简单公式何时失效**：
- 流失率并不恒定：早期流失更高，所以要用队列留存曲线并对各月毛利求和，同时做折现。
- 新队列与老队列不同（渠道结构）；用成熟队列算的 LTV 会高估。
- 要用**毛利**而不是收入，否则 LTV 会被夸大。
- 只有老客户的 LTV 是观测到的，其余需要预测。要设定上限周期（例如 3 年）。
- 要细分：按渠道分别计算 LTV 和 CAC；混合数字会掩盖亏损渠道。

## 示例讲解
某订阅应用：ARPU 为每月 \$20，毛利率 70%，月流失率 5%。某月营销花费 \$45,000，获得 500 名客户。

- CAC $= 45{,}000 / 500 = \$90$。
- 每用户每月毛利 $= 20 \times 0.7 = \$14$。
- 预期生命周期 $= 1 / 0.05 = 20$ 个月。
- LTV $= 14 / 0.05 = \$280$。
- LTV:CAC $= 280 / 90 \approx 3.1$，刚好达到常用门槛。
- 回收期 $= 90 / 14 \approx 6.4$ 个月。

如果流失率升到 8%，LTV $= 14 / 0.08 = \$175$，LTV:CAC $\approx 1.9$：流失率上升三个百分点，就几乎使单位经济模型的安全边际减半。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某产品有 10,000 月活用户，其中 1,000 人各付费 $30。ARPU 和 ARPPU 分别是多少？",
  "options": [
    "ARPU $3，ARPPU $30",
    "ARPU $30，ARPPU $3",
    "都是 $30",
    "ARPU $0.3，ARPPU $30"
  ],
  "explanation": "收入是 $30,000。ARPU 除以全部 10,000 名活跃用户（$3）；ARPPU 除以 1,000 名付费用户（$30）。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么用收入（而不是毛利）计算 LTV 会产生误导？",
  "options": [
    "收入总是小于利润",
    "它忽略了服务客户的成本，使 LTV:CAC 看起来比真实情况更好",
    "收入无法预测",
    "它会重复计算已流失的用户"
  ],
  "explanation": "CAC 是从毛利里支付的。LTV 中应使用毛利（收入 × 毛利率，或贡献毛利），才能做同口径比较。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现单位经济模型的辅助函数：`arpu(revenue, active_users)`、`cac(spend, new_customers)`、`ltv(arpu, margin, monthly_churn)` = arpu × margin / churn、`payback_months(cac, arpu, margin)` = cac / (arpu × margin)，以及 `ltv_cac(arpu, margin, churn, cac)`。再编写 `verdict(ratio, payback)`：当 ratio >= 3 且 payback <= 12 时返回 'healthy'，ratio < 1 时返回 'unprofitable'，其余返回 'watch'。",
  "hints": [
    "先判断 `ratio < 1` 的情形，这样它不会落入 'watch'。",
    "LTV 用每用户每月毛利（arpu × margin）除以月流失率。"
  ]
}
```

> [!TIP] 面试技巧
> - 定义每个术语时都说清分子和分母；区分 ARPU 与 ARPPU、混合 CAC 与付费 CAC。
> - LTV 用毛利计算，说明流失率假设；当流失率不恒定时，提到基于队列的 LTV。
> - 同时给出 LTV:CAC（约 3）和回收期（12 个月内）；单看比率会忽略现金回流的时间。
