---
id: cloud-devops-gpu-infrastructure-for-ml
title: 机器学习的 GPU 基础设施
---

## 为什么重要
GPU 是机器学习平台中最稀缺也最昂贵的资源。面试官会问如何确定集群规模、为什么训练不能线性扩展、如何在 Kubernetes 上让多个团队共享 GPU，以及如何保持高利用率。白板上通常需要给出粗略的显存和成本估算。模型服务的权衡见模型服务相关课程；本课讲其下的基础设施。

## 概念
**硬件基础**：GPU 有计算单元（张量核心）和高带宽的 **HBM** 显存（A100 40/80 GB、H100 80 GB，更新的型号超过 140 GB）。显存容量决定能放下什么；显存带宽常常限制 LLM 解码；互连决定多 GPU 训练的上限。节点内 GPU 通过 **NVLink/NVSwitch** 通信（数百 GB/s）；跨节点通过 **InfiniBand 或 RoCE**（数十 GB/s）。较小的推理 GPU（L4、L40S、T4 级别）对中等模型来说每小时更便宜。

**训练显存**（混合精度 Adam）：权重 2 B + 梯度 2 B + fp32 主权重 4 B + 两个 Adam 动量 8 B = 约 **16 字节/参数**，外加激活值（随批大小和序列长度增长；可通过激活检查点减少）。因此 7B 模型在计入激活之前就需要约 112 GB。

**横向扩展**：**数据并行**（DDP）复制模型并对梯度做 all-reduce；**FSDP/ZeRO** 把权重、梯度和优化器状态分片到各 GPU；**张量并行**切分层内计算（需要快速 NVLink，所以放在节点内）；**流水线并行**把层切分到不同阶段。效率会随通信、慢节点和每卡批量过小而下降，所以扩展是次线性的。要经常做检查点，因为大型任务一定会遇到故障。

**推理显存**：权重（fp16 为 2 B/参数，int8 为 1 B，4 比特约 0.5 B）加上 **KV 缓存**，后者随批大小和上下文长度增长，往往限制并发。连续批处理、量化和分页 KV 缓存可以提高每块 GPU 的吞吐。

**编排**：在 Kubernetes 上，NVIDIA 设备插件把 `nvidia.com/gpu` 作为整数资源暴露（默认不支持小数请求）。共享 GPU 可用 **MIG**（A100/H100 上的硬件分区，隔离性强）、**时间片**（没有显存隔离）或 MPS。为 GPU 节点使用带污点/容忍的节点池，用**成组调度**（Kueue、Volcano 或 Slurm）确保分布式任务只有在所有 worker 都能放下时才启动，按团队设置配额和优先级，并用带预热池的集群自动伸缩来掩盖节点启动慢的问题。

**利用率与可观测性**：关注 `nvidia-smi` / DCGM 指标（GPU 利用率、显存、SM 占用、功耗、ECC 错误）。利用率低通常是 GPU 被“饿着”：数据加载慢、批量小、CPU 预处理或闲置的 notebook 占着 GPU。回收闲置资源，训练用带检查点的 spot，推理通过压测来合理配置。

**常见陷阱**：只按 FLOPs 估算而忘了显存；一个任务里混用不同代的 GPU；跨慢速链路做张量并行；为很小的开发任务独占整块 GPU；忽视驱动/CUDA/容器版本兼容。

## 示例讲解
示意估算。**用完整 Adam 微调 7B 模型**：仅状态就需要 $7 \times 16 = 112$ GB。一块 80 GB 的 GPU 放不下。用 FSDP 分到 2 块 GPU，每块状态约 56 GB，每块剩约 24 GB 给激活；留 20% 余量时最少需要 $\lceil 112 \times 1.2 / 80 \rceil = 2$ 块 GPU，4 块则批大小更宽裕。替代方案：LoRA 冻结基础权重（fp16 为 14 GB）并只训练小的适配器，一块 GPU 就够。

**用 fp16 部署同一个模型**：权重 14 GB。对于 32 层、隐藏维度 4096、使用完整多头注意力的模型，每个 token 的 KV 缓存为 $2 \times 32 \times 4096 \times 2$ B = 0.5 MB，所以 4,096 个 token 的序列约需 2 GB。在 80 GB 的 GPU 上，(80 - 14) / 2 在计入额外开销之前约可并发 33 个序列。分组查询注意力或量化 KV 缓存可以成倍提高这一数字。

**成本**：以 \$4/小时、2,500 token/秒计，50% 利用率的成本是 \$4 / 450 万 token ≈ 每百万 token \$0.89；90% 利用率时约 \$0.49。利用率与 GPU 价格同样重要。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么即使批量很小，用 Adam 对 7B 参数模型做完整微调也放不进一块 80 GB 的 GPU？",
  "options": [
    "Adam 需要把数据集放进显存",
    "权重、梯度和优化器状态约占 16 字节/参数，约 112 GB",
    "GPU 不能运行 fp16",
    "7B 模型需要 7 块 GPU"
  ],
  "explanation": "混合精度 Adam 在计入激活之前大约需要每参数 16 字节，即约 112 GB。可用 FSDP/ZeRO 分片、用 LoRA，或使用更大显存。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个训练任务显示 GPU 利用率为 25%。首先最应该检查什么？",
  "options": [
    "GPU 是否过热",
    "数据加载和预处理吞吐是否让 GPU 处于饥饿状态",
    "Python 版本",
    "模型层数是否太少"
  ],
  "explanation": "低利用率通常是输入流水线、批量过小或通信瓶颈，而不是 GPU 计算慢。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "估算辅助函数。实现 `training_memory_gb(params_billion, bytes_per_param=16)`（权重、梯度和优化器状态的 GB 数）以及 `min_gpus(mem_gb, gpu_gb, headroom=0.2)`：总显存能覆盖 `mem_gb * (1 + headroom)` 的最少 GPU 数（至少为 1），假设分片完全均匀。",
  "hints": [
    "10 亿参数、每参数 1 字节是 1 GB。",
    "对 mem_gb * (1 + headroom) / gpu_gb 使用 math.ceil。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "服务经济学。实现 `cost_per_million_tokens(gpu_hourly_usd, tokens_per_sec, utilization)` 和 `breakeven_utilization(gpu_hourly_usd, tokens_per_sec, target_usd_per_m)`，后者返回达到每百万 token 目标价格所需的利用率。",
  "hints": [
    "每小时 token 数 = tokens_per_sec * 3600 * utilization。",
    "每百万 token 成本与利用率成反比。"
  ]
}
```

> [!TIP] 面试技巧
- 先讲显存模型：Adam 训练约 16 字节/参数；推理是权重加 KV 缓存。
- 说出并行方式（DDP、FSDP/ZeRO、张量、流水线）及其适用位置（节点内 NVLink，跨节点 InfiniBand）。
- 在 Kubernetes 上提到设备插件、MIG 与时间片、成组调度和配额。
- 先从输入流水线诊断低利用率；把一切落回每个有效 token 或每个 epoch 的成本。
