---
id: ml-association-rules
title: 关联规则
---

## 为什么重要
“买了 X 的人也买了 Y”这类分析驱动着交叉销售、门店布局和捆绑定价。面试官期望你能定义支持度、置信度和提升度，并解释为什么只看置信度会误导。

## 概念
对于一组交易（购物篮）上的规则 $X \Rightarrow Y$：

$$
\text{support}(X) = P(X) \qquad \text{confidence}(X \Rightarrow Y) = P(Y \mid X) = \frac{\text{support}(X \cup Y)}{\text{support}(X)}
$$

$$
\text{lift}(X \Rightarrow Y) = \frac{\text{confidence}(X \Rightarrow Y)}{\text{support}(Y)} = \frac{P(X, Y)}{P(X)P(Y)}
$$

- 提升度 > 1：购买 X 让 Y 比基线更可能被购买；= 1：相互独立；< 1：替代品。
- 如果 Y 本来就很热门，高置信度可能毫无意义（例如“任何商品 ⇒ 牛奶”）。

**Apriori 算法**：利用**向下封闭**性质找出所有支持度 ≥ 阈值的项集：频繁项集的每个子集都是频繁的，所以大小为 $k+1$ 的候选只从频繁的 $k$ 项集构建。然后生成通过置信度/提升度阈值的规则。**FP-Growth** 用压缩的前缀树避免生成候选，在大数据上更快。

注意事项：规则是相关关系，不是因果关系；很多规则平凡或冗余；设置最小支持度，避免只来自少数购物篮的规则。

## 示例讲解
1,000 个购物篮：200 个包含面包，150 个包含黄油，100 个两者都有。support(面包, 黄油) = 0.10。confidence(面包 ⇒ 黄油) = 0.10/0.20 = 0.50。lift = 0.50/0.15 ≈ 3.3：买面包的人买黄油的可能性是平均水平的 3.3 倍。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "规则 {薯片} ⇒ {水} 的置信度为 0.6，而 60% 的购物篮都包含水。提升度是多少？",
  "options": ["0.36", "0.6", "1.0", "1.67"],
  "explanation": "lift = 0.6 / 0.6 = 1：买薯片对是否买水没有任何信息量。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "每个购物篮是一个商品集合。编写 `support(baskets, items)`、`confidence(baskets, lhs, rhs)` 和 `lift(baskets, lhs, rhs)`，其中 `items`、`lhs`、`rhs` 都是集合。再编写 `frequent_pairs(baskets, min_support)`，返回支持度 ≥ min_support 的二元组（元组内商品排序）组成的排序列表。",
  "hints": ["`items <= basket` 用于检查子集关系。", "对排序后的商品列表取 combinations，得到的元组本身就是有序的。"]
}
```

> [!TIP] 面试技巧
> - 准确定义支持度、置信度和提升度，并说明为什么提升度优于置信度。
> - 提到 Apriori 的向下封闭剪枝；这是需要知道的那个算法思想。
> - 注意：共同购买不等于因果；用 A/B 测试验证交叉销售的想法。
