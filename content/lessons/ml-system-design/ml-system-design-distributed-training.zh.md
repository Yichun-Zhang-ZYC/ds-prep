---
id: ml-system-design-distributed-training
title: 分布式训练（数据并行、模型并行）
---

## 为什么重要
当模型或数据集超出单个 GPU 的承载能力时，就必须并行化训练。面试官会问哪种策略合适、显存花在哪里、通信开销多大。

## 概念
**数据并行（DP）**：每个 GPU 持有完整的模型副本，处理批次的不同分片；每步更新前用 **all-reduce** 对梯度取平均。有效批大小 $= B_{gpu} \times N$（需配合 warmup 缩放学习率）。简单，扩展性好，直到模型放不下或通信成为主导。PyTorch DDP 会把 all-reduce 与反向传播重叠。对大小为 $S$ 的梯度，**ring all-reduce** 每个 GPU 发送 $2\frac{N-1}{N} S$ 字节，几乎与 $N$ 无关。

**显存去哪了**（混合精度 + Adam，每个参数）：权重 2 B + 梯度 2 B + fp32 主权重 4 B + Adam 的 $m$ 和 $v$ 共 8 B $= 16$ B/参数，外加激活值。7B 模型在计入激活之前就需要 $\approx 112$ GB。

**分片数据并行**（ZeRO / FSDP）：把优化器状态（ZeRO-1）、梯度（ZeRO-2）和参数（ZeRO-3）分片到各 GPU，需要时再即时聚合权重。完全分片时每个 GPU 显存 $\approx 16P/N$，代价是额外的通信。

**模型并行**（单层或整个模型放不下时）：
- **张量并行**：把每个矩阵乘法拆分到多个 GPU 上（需要快速的 NVLink，通常在单节点内）。
- **流水线并行**：把层划分为多个阶段，输入**微批次（micro-batch）**；对于 $p$ 个阶段和 $m$ 个微批次，空闲的**气泡**比例为 $\frac{p-1}{m+p-1}$。
- 大型 LLM 会组合**3D 并行**（数据 + 张量 + 流水线），并配合激活检查点（重算以节省显存）和 bf16。

**如何选择**：单 GPU 放得下 $\to$ DDP；优化器状态太大 $\to$ FSDP/ZeRO；单层太大或规模极大 $\to$ 加上张量/流水线并行。此外：用梯度累积模拟大批次，处理慢节点（straggler），频繁做检查点以应对故障，并避免数据加载成为瓶颈。

## 示例讲解
一个 70 亿参数的模型：权重 + 梯度 + 优化器状态共 $16 \times 7 = 112$ GB，超过单个 80 GB GPU，所以普通 DDP 会失败。用 FSDP 分到 8 个 GPU 上，每个 GPU $112/8 = 14$ GB（外加激活），就放得下。
流水线 $p = 4$ 个阶段、$m = 16$ 个微批次：气泡 $= 3/19 \approx 15.8\%$ 空闲；用 $m = 64$ 可降到 $3/67 \approx 4.5\%$。
8 个 GPU 上对 1 GB 梯度做 ring all-reduce：每步每个 GPU $2 \times 7/8 \times 1 = 1.75$ GB。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "模型权重可以放进单个 GPU，但训练太慢。最合适的第一步是什么？",
  "options": [
    "流水线并行",
    "跨 GPU 的数据并行（DDP）",
    "张量并行",
    "对模型剪枝"
  ],
  "explanation": "如果模型放得下，就复制模型并切分数据；这最简单，且近似线性扩展。"
}
```

```quiz
{
  "id": "q2",
  "question": "FSDP/ZeRO-3 把什么分片到各个 GPU？",
  "options": [
    "只有训练数据",
    "参数、梯度和优化器状态",
    "只有激活值",
    "只有学习率"
  ],
  "explanation": "对这三类模型状态分片，可使每个 GPU 的显存大致降为 GPU 数分之一，代价是额外的 all-gather 通信。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `train_memory_gb(params_billion, bytes_per_param=16, shards=1)`（每个 GPU 的 GB 数，1 GB = 1e9 B）、`ring_allreduce_gb(size_gb, n_gpus)` = 2(n−1)/n × size、`bubble_fraction(stages, microbatches)` = (p−1)/(m+p−1)，以及 `effective_batch(per_gpu_batch, n_gpus, grad_accum=1)`。",
  "hints": [
    "10 亿参数 × 16 字节 = 16 GB。",
    "只有一个阶段时没有流水线气泡。"
  ]
}
```

> [!TIP] 面试技巧
> - 按阶梯回答：先 DDP，显存受限时用 FSDP/ZeRO，极大规模再加张量/流水线并行。
> - 做显存计算（混合精度 + Adam 约每参数 16 字节）来论证为何需要分片。
> - 提到通信（all-reduce、NVLink 与网络）、流水线气泡、激活检查点和容错检查点。
