---
id: probability-conditional-probability
title: 条件概率
---

## 为什么重要
“用户点击之后购买的概率是多少？”条件概率是漏斗、A/B 测试和贝叶斯的共同语言。经典的面试陷阱是把 $P(A \mid B)$ 和 $P(B \mid A)$ 搞混。

## 概念
在 $B$ 已经发生的条件下 $A$ 发生的概率：

$$
P(A \mid B) = \frac{P(A \cap B)}{P(B)}, \qquad P(B) > 0
$$

加上条件相当于把样本空间缩小到 $B$，再问 $B$ 中有多少也属于 $A$。变形后得到**乘法法则**：$P(A \cap B) = P(B)\,P(A \mid B)$。

一般来说 $P(A \mid B) \ne P(B \mid A)$。大多数购买者都点过广告（$P(\text{click} \mid \text{buy})$ 很高），但点广告的人很少购买（$P(\text{buy} \mid \text{click})$ 很低）。

## 示例讲解
一个家庭有两个孩子。已知至少有一个是女孩，两个都是女孩的概率是多少？

样本空间为 {GG, GB, BG, BB}。以“至少一个女孩”为条件，去掉 BB：

$$
P(\text{GG} \mid \text{at least one G}) = \frac{1/4}{3/4} = \frac{1}{3}
$$

如果已知的是**老大**是女孩，样本空间就变成 {GG, GB}，答案是 1/2。条件的确切措辞很重要。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "30% 的用户点击了广告，6% 的用户点击并且购买了。P(购买 | 点击) 是多少？",
  "options": ["6%", "18%", "20%", "36%"],
  "explanation": "P(购买 | 点击) = P(购买 ∩ 点击) / P(点击) = 0.06 / 0.30 = 0.20。"
}
```

```quiz
{
  "id": "q2",
  "question": "不放回地抽两张牌。P(第二张是 A | 第一张是 A) 是多少？",
  "options": ["4/52", "3/51", "4/51", "1/13 × 1/13"],
  "explanation": "抽走一张 A 之后，剩下 51 张牌中还有 3 张 A。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "`events` 中每个元组是 `(clicked, bought)`，都是布尔值。编写 `p_buy_given_click(events)`，返回 P(bought | clicked)；如果没人点击，返回 `None`。",
  "hints": ["只保留 clicked 为 True 的行：这就是新的样本空间。", "在这些行中计算购买的比例。"]
}
```

> [!TIP] 面试技巧
> - 计算之前先把条件读出来，写成 $P(\text{目标} \mid \text{已知})$ 的形式。
> - 拿不准时画一个 2×2 的计数表；条件概率就是“行占比”或“列占比”。
> - 注意措辞：“至少一个”和“特定的某一个”答案不同（两个孩子问题）。
