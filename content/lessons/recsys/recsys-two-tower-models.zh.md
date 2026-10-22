---
id: recsys-two-tower-models
title: "双塔模型"
---

## 为什么重要

双塔（dual encoder）模型是 YouTube、Google Play、Pinterest 以及大多数大型推荐系统的标准召回阶段。面试官会问为什么这样设计架构、如何用 in-batch 负样本训练，以及如何在毫秒内完成线上服务。

## 概念

两个独立的网络把输入映射到同一个 $d$ 维空间：**用户（query）塔** $u = f(\text{用户特征、历史、上下文})$ 和**物品塔** $v = g(\text{物品 id、内容、统计特征})$。相关性分数为点积或余弦，$s(u, v) = u^\top v$。

**为什么是这种形状**：两个塔在最后的点积之前不发生交互，因此**所有物品 embedding 都可以预先计算**并存入近似最近邻（ANN）索引（HNSW、ScaNN、FAISS）。请求时只需运行一次用户塔，并在数百万物品上做次线性的 ANN 查找。为了这种速度牺牲了用户 x 物品这类交叉特征，所以后面还要接一个更重的排序模型。

**训练**：把点击当作正样本，使用带 in-batch 负样本的**采样 softmax**。对一个包含 $B$ 个（用户，物品）对的 batch，logits 为 $S = U V^\top / \tau$（$B \times B$），损失是以对角线为标签的交叉熵：$\mathcal{L} = -\frac1B \sum_b \log \frac{e^{S_{bb}}}{\sum_j e^{S_{bj}}}$。热门物品作为负样本出现得太频繁，因此要做 **logQ 校正**（从 logits 中减去 $\log p_j$）或混入随机负样本。温度 $\tau$ 控制分布的尖锐程度。

**陷阱**：训练-服务特征不一致、物品 embedding 过期（需定期重建索引）、不同版本塔之间的 embedding 漂移、batch 内的假负样本，以及向热门物品坍缩。召回要用满足排序需要的 recall@k 来评估，而不是 NDCG。

## 示例讲解

一个包含两个样本对的 batch，embedding 完全对齐，$U = V = I_2$，$\tau = 1$，logits 为 $\begin{bmatrix}1&0\\0&1\end{bmatrix}$。每一行中对角线的 softmax 概率为 $e/(e+1) = 0.731$，所以损失为 $-\log 0.731 = \log(1+e^{-1}) \approx 0.313$。当 $\tau = 0.5$ 时，logits 变为 2 和 0，损失降到 $\log(1+e^{-2}) \approx 0.127$；较低的温度使 softmax 更尖锐。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "双塔模型在线上服务的关键优势是什么？",
  "options": [
    "能建模用户 x 物品的特征交叉",
    "物品 embedding 可以预先计算并建立 ANN 索引",
    "不需要训练数据",
    "能给出校准的点击概率"
  ],
  "explanation": "点积之前没有任何交互，所以物品向量可离线计算，每次请求只需运行用户塔。"
}
```

```quiz
{
  "id": "q2",
  "question": "使用 in-batch 负样本时，为什么常做 logQ（采样概率）校正？",
  "options": [
    "热门物品作为负样本出现得太频繁，会被不公平地惩罚",
    "加速矩阵乘法",
    "不再需要温度",
    "保证每个 batch 内物品唯一"
  ],
  "explanation": "物品按热度比例被采样，使 softmax 过度惩罚热门物品。减去采样概率的对数可以对 logits 去偏。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "用 numpy 实现 `retrieve(u, V, k)`，返回与用户向量 `u` 点积最高的 `k` 个物品的索引（按分数降序，相同时取较小索引），以及 `in_batch_softmax_loss(U, V, tau)`，计算 logits `U @ V.T / tau` 以对角线为目标的平均交叉熵。",
  "hints": [
    "指数运算前先减去每行最大值，得到数值稳定的 softmax。",
    "第 b 行的目标是第 b 列，因此对 log 概率取 np.diag。"
  ]
}
```

> [!TIP] 面试技巧
> - 解释权衡：以速度和可用 ANN 为代价，放弃交叉特征；再由排序模型对候选重新打分。
> - 了解 in-batch 负样本、logQ 校正、温度和难负样本挖掘。
> - 提到线上服务：离线刷新物品索引、在线用户塔，以及保持各塔版本一致。
