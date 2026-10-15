---
id: ml-xgboost-lightgbm-catboost
title: XGBoost / LightGBM / CatBoost
---

## 为什么重要
在实践中，“梯度提升”指的就是这三个库之一。面试官会问它们为什么又快又准、彼此有什么不同，以及你会先调哪些超参数。

## 概念
三者都是梯度提升决策树，在工程和正则化上做了改进。

**XGBoost**
- 使用损失函数的**二阶**（牛顿法）近似：梯度 $g_i$ 和 Hessian $h_i$。
- 带正则的目标函数：对叶子数 $T$ 和叶子权重的惩罚 $\gamma T + \tfrac{1}{2}\lambda \sum_j w_j^2$。最优叶子权重：$w^* = -\dfrac{\sum g_i}{\sum h_i + \lambda}$。
- 稀疏感知的分裂：为缺失值学习一个默认方向。
- 按层生长树；用直方图模式加速。

**LightGBM**
- **基于直方图**的分裂（对特征分箱）和**按叶子生长**：总是分裂增益最大的叶子。更快，而且往往更准，但在小数据上可能过拟合；用 `num_leaves`、`min_data_in_leaf` 控制。
- GOSS（保留梯度大的行，对梯度小的行采样）和 EFB（捆绑互斥的稀疏特征）用于加速。
- 原生支持类别特征。

**CatBoost**
- 专为**类别特征**设计：**有序目标统计**（在一个随机排列中，只用“更早”的行来编码每一行），以避免目标泄漏。
- **有序提升**以减少预测偏移；**对称（oblivious）树**在每一层使用相同的分裂：推理快，正则化强。
- 默认参数很好；几乎不用调参。

调参顺序（任何库都适用）：学习率 + 树的数量（配合早停）→ 树的大小（`max_depth` / `num_leaves`，`min_child_weight` / `min_data_in_leaf`）→ 子采样（`subsample`、`colsample_bytree`）→ 正则化（`lambda`、`alpha`、`gamma`）。

## 示例讲解
一个叶子包含三行，梯度 $g = [0.4, -0.2, 0.6]$，Hessian $h = [0.24, 0.16, 0.24]$（对数损失）。取 $\lambda = 1$：$w^* = -(0.8)/(0.64 + 1) \approx -0.488$。更大的 $\lambda$ 会把叶子值向 0 收缩。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "LightGBM 的树生长方式与 XGBoost 默认方式的主要区别是什么？",
  "options": ["LightGBM 按层生长；XGBoost 按叶子生长", "LightGBM 按叶子生长（在任意位置分裂最好的叶子），XGBoost 默认按层生长", "LightGBM 不使用树", "它们生长树的方式完全相同"],
  "explanation": "按叶子生长能更快地降低损失，但可能产生很深、不平衡的树，在小数据上过拟合。"
}
```

```quiz
{
  "id": "q2",
  "question": "你有很多高基数的类别特征，而且没什么时间调参。最自然的首选是哪个库？",
  "options": ["XGBoost 加独热编码", "CatBoost", "线性模型", "k-NN"],
  "explanation": "CatBoost 的有序目标统计能原生处理类别特征而不泄漏，而且它的默认参数很强。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `leaf_weight(g, h, lam)`，返回 XGBoost 的最优叶子权重 −Σg / (Σh + λ)；再编写 `split_gain(gL, hL, gR, hR, lam, gamma)`，返回 ½ · [GL²/(HL+λ) + GR²/(HR+λ) − (GL+GR)²/(HL+HR+λ)] − γ，其中 G 和 H 是对应列表的和。",
  "hints": ["先对梯度和 Hessian 列表求和。", "（减去 γ 后）增益为负，说明这个分裂不值得做。"]
}
```

> [!TIP] 面试技巧
> - 各说一个标志性特点：XGBoost = 二阶近似 + 带正则的目标；LightGBM = 直方图 + 按叶子生长；CatBoost = 用于类别特征的有序目标统计。
> - 给出调参顺序，从学习率和早停开始。
> - 提到在表格数据上它们通常胜过深度学习；这是常见的追问。
