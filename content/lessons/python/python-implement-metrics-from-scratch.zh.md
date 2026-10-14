---
id: python-implement-metrics-from-scratch
title: 从零实现评估指标
---

## 为什么重要
“不用 sklearn 实现精确率和召回率”是 DS 和 MLE 编程面试中常见的热身题。它考查你是否掌握定义，以及能否写出干净、向量化、能处理边界情况的代码。

## 概念
对于二分类标签（1 = 正类）：

| | 预测为 1 | 预测为 0 |
|---|---|---|
| **实际为 1** | TP | FN |
| **实际为 0** | FP | TN |

$$
\text{precision} = \frac{TP}{TP + FP} \qquad \text{recall} = \frac{TP}{TP + FN} \qquad F_1 = \frac{2PR}{P + R}
$$

边界情况：如果模型一个正类都没预测，精确率就是 $0/0$。sklearn 默认返回 0，你也应该这样做，但要把这一点说出来。

## 示例讲解

```python
import numpy as np

y_true = np.array([1, 0, 1, 1, 0])
y_pred = np.array([1, 1, 1, 0, 0])

tp = np.sum((y_true == 1) & (y_pred == 1))  # 2
fp = np.sum((y_true == 0) & (y_pred == 1))  # 1
fn = np.sum((y_true == 1) & (y_pred == 0))  # 1
print(tp / (tp + fp), tp / (tp + fn))       # 0.667 0.667
```

## 检验理解

```quiz
{
  "id": "q1",
  "question": "某垃圾邮件过滤器标记了 10 封邮件，其中 8 封是垃圾邮件。垃圾邮件总共有 40 封。精确率和召回率分别是多少？",
  "options": ["精确率 0.8，召回率 0.2", "精确率 0.2，召回率 0.8", "精确率 0.8，召回率 0.8", "精确率 0.25，召回率 0.8"],
  "explanation": "精确率 = 8 / 10 封被标记的 = 0.8。召回率 = 8 / 40 封真实垃圾邮件 = 0.2。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `precision_recall_f1(y_true, y_pred)`，返回元组 `(precision, recall, f1)`。输入是由 0/1 组成的列表或数组。任何分母为 0 的指标都返回 0.0。",
  "hints": ["用布尔掩码统计 TP、FP 和 FN。", "每个除法都用条件表达式保护。"]
}
```

> [!TIP] 面试技巧
> - 先澄清标签约定（“1 是正类吗？”）和除以 0 时的处理方式。
> - 用布尔掩码做向量化，而不是用 Python 循环；并说明复杂度是 O(n)。
> - 常见追问：“推广到多分类。”写代码之前先讲清楚宏平均和微平均。
