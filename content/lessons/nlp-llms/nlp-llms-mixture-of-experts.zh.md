---
id: nlp-llms-mixture-of-experts
title: "混合专家模型（MoE）"
---

## 为什么重要
Mixtral、DeepSeek-V3 以及许多前沿模型都是稀疏的混合专家（MoE）：参数量远大于每个 token 实际使用的参数量。面试官会问路由如何工作、为什么要负载均衡，以及为什么 MoE 节省计算而不节省内存（背景见“缩放定律”和“推理服务”）。

## 概念
**思想**：把 Transformer 块中的稠密前馈网络（FFN）替换为 $E$ 个并行的 FFN **专家**和一个小型**路由器**。每个 token 只发送给 top-$k$ 个专家，因此每个 token 的计算量取决于**激活**参数量，而模型容量取决于**总**参数量。注意力层仍是稠密的。

**路由器**：logits $h = W_r x$；取 top-$k$ 个专家，用所选 logits 上的 softmax 为它们的输出加权：$y = \sum_{i \in \text{top-}k} g_i\, \text{FFN}_i(x)$。Mixtral 用 $E = 8$、$k = 2$；Switch Transformer 用 $k = 1$；DeepSeekMoE 使用许多**细粒度**专家（如 64-256 个）外加几个始终开启的**共享专家**，用来存放通用知识。

**负载均衡**：如果不加干预，路由器会塌缩到少数几个偏爱的专家上（强者愈强），浪费容量。
- **辅助损失**（Switch）：$\mathcal{L}_{aux} = \alpha E \sum_{i=1}^{E} f_i P_i$，其中 $f_i$ 是路由到专家 $i$ 的 token 比例，$P_i$ 是它的平均路由概率。两者都均匀（$1/E$）时最小，值为 $\alpha$。
- **容量因子**：每个专家每批最多处理 $C = \text{cf} \cdot T/E$ 个 token；溢出的 token 被丢弃（只走残差连接）。无丢弃（dropless）的实现可避免这一点。
- **无辅助损失均衡**（DeepSeek-V3）：给每个专家的路由分数加偏置，根据近期负载上下调整，避免辅助损失的梯度干扰。
- 有些系统还会加**路由器 z-loss**，让 logits 保持较小以稳定训练。

**系统层面**：专家分布在多块 GPU 上（**专家并行**），通过 all-to-all 通信分发和汇总 token，这可能主导每步耗时。推理时**所有专家都必须驻留内存**，尽管每个 token 只运行 $k$ 个，所以 MoE 节省 FLOPs 和大批量下的延迟，但不节省内存。小批量时，不同 token 命中不同专家，仍要读取大量权重。

**权衡**：相同训练 FLOPs 和相同激活参数下质量高于稠密模型；但更难训练（不稳定、均衡）、更难微调（过拟合、路由漂移）、更难部署（内存、通信）。

## 示例讲解
类似 Mixtral-8x7B 的数字：$d = 4096$，FFN 宽度 14336，SwiGLU（3 个权重矩阵），32 层，8 个专家，$k = 2$。

一个专家 FFN：$3 \times 4096 \times 14336 = 176.2$M 参数。所有层的所有专家：$176.2\text{M} \times 8 \times 32 = 45.1$B。注意力、嵌入和路由器再加约 1.6B，**总计约 46.7B**。

每个 token 只运行 8 个专家中的 2 个：$176.2\text{M} \times 2 \times 32 = 11.3$B，再加 1.6B 共享部分，**激活约 12.9B**。计算量相当于 13B 稠密模型，但仍需要 46.7B 的内存（fp16 约 93 GB）。

均衡损失示例：4 个 token，$E = 2$，top-1 分配 $[0, 0, 0, 1]$，平均路由概率 $P = [0.7, 0.3]$：$f = [0.75, 0.25]$，所以 $\mathcal{L} = 2(0.75 \cdot 0.7 + 0.25 \cdot 0.3) = 1.2$（以 $\alpha$ 为单位）。完全均衡的路由器得到 1.0。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个总参数 46.7B、激活参数 12.9B 的 MoE 模型，相比同等质量的稠密模型，部署时最主要的代价是什么？",
  "options": ["所有专家都必须驻留内存，所以需要容纳 46.7B 参数的显存", "它每个 token 的 FLOPs 比 46.7B 的稠密模型更多", "它不能使用 KV cache", "它只能用 CPU 运行"],
  "explanation": "MoE 每个 token 的计算量跟随激活参数，但权重内存跟随总参数，而且专家并行还需要 all-to-all 通信。"
}
```

```quiz
{
  "id": "q2",
  "question": "没有负载均衡机制时，MoE 路由器通常会出现什么问题？",
  "options": ["塌缩到少数几个专家，其余专家几乎得不到训练，浪费容量", "所有专家学到完全相同的函数且梯度为零", "路由器的输出总和不为 1", "注意力层停止工作"],
  "explanation": "早期表现略好的专家得到更多 token，因而训练得更好，又得到更多 token，形成正反馈。辅助损失、容量因子或偏置调整用来打破这一点。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `top_k_route(logits, k)`，返回 `(专家下标列表, 权重列表)`，按 logits 降序，权重为所选 logits 上的 softmax；`load_balance_loss(probs, assign, E)`，返回 $E \\sum_i f_i P_i$（`probs` 是每个 token 的路由概率列表，`assign` 是每个 token 的 top-1 专家）；以及 `moe_params(shared_b, expert_b, n_experts, top_k)`，返回 `(总参数, 激活参数)`（单位 B）。",
  "hints": ["对 logits 按下标排序并取前 k 个；softmax 时先减去所选 logits 的最大值。", "f_i = 被分配到专家 i 的 token 数 / T；P_i = 所有 token 在专家 i 上的概率的平均值。", "总参数 = 共享 + n_experts*expert；激活参数 = 共享 + top_k*expert。"]
}
```

> [!TIP] 面试技巧
> - 区分总参数与激活参数：MoE 的 FLOPs 和延迟看激活参数，内存看总参数。
> - 说明负载均衡：辅助损失 $\alpha E \sum f_i P_i$、容量因子和丢弃、DeepSeek 的无辅助损失偏置、共享专家。
> - 提到系统成本：专家并行的 all-to-all 通信，以及微调和小批量推理时的困难。
