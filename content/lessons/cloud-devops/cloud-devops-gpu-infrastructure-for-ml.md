---
id: cloud-devops-gpu-infrastructure-for-ml
title: GPU infrastructure for ML workloads
estimatedMinutes: 13
difficulty: hard
tags: [gpu, kubernetes, training, inference, cost]
---

## Why it matters
GPUs are the scarcest and most expensive resource in an ML platform. Interviewers ask how you size a cluster, why training does not scale linearly, how to share GPUs between teams on Kubernetes, and how to keep utilisation high. A rough memory and cost model is often expected on a whiteboard. For serving trade-offs see the model-serving lessons; this one covers the infrastructure underneath.

## Concept
**Hardware basics**: a GPU has compute (tensor cores) and **HBM** memory with high bandwidth (A100 40/80 GB, H100 80 GB, newer parts 140+ GB). Memory capacity decides what fits; memory bandwidth often bounds LLM decoding; interconnect bounds multi-GPU training. Within a node GPUs talk over **NVLink/NVSwitch** (hundreds of GB/s); across nodes over **InfiniBand or RoCE** (tens of GB/s). Smaller inference GPUs (L4, L40S, T4-class) are cheaper per hour for modest models.

**Training memory** (mixed-precision Adam): weights 2 B + gradients 2 B + fp32 master weights 4 B + two Adam moments 8 B = about **16 bytes/param**, plus activations (grow with batch and sequence length; reduced by activation checkpointing). So a 7B model needs about 112 GB before activations.

**Scaling out**: **data parallel** (DDP) replicates the model and all-reduces gradients; **FSDP/ZeRO** shards weights, gradients and optimiser state across GPUs; **tensor parallel** splits layers (needs fast NVLink, so keep it inside a node); **pipeline parallel** splits layers across stages. Efficiency falls with communication, stragglers and small per-GPU batches, so scaling is sub-linear. Checkpoint often, because large jobs will see failures.

**Inference memory**: weights (2 B/param in fp16, 1 B in int8, about 0.5 B in 4-bit) plus the **KV cache**, which grows with batch size and context length and often limits concurrency. Batching (continuous batching), quantisation and paged KV caches raise throughput per GPU.

**Orchestration**: on Kubernetes the NVIDIA device plugin exposes `nvidia.com/gpu` as an integer resource (no fractional requests by default). Share GPUs with **MIG** (hardware partitions on A100/H100, strong isolation), **time-slicing** (no memory isolation) or MPS. Use node pools with taints/tolerations for GPU nodes, **gang scheduling** (Kueue, Volcano or Slurm) so a distributed job starts only when all workers fit, quotas and priorities per team, and cluster autoscaling with warm pools to hide slow node startup.

**Utilisation and observability**: watch `nvidia-smi` / DCGM metrics (GPU util, memory, SM occupancy, power, ECC errors). Low utilisation usually means a starved GPU: slow data loading, small batches, CPU preprocessing, or idle notebooks holding GPUs. Reclaim idle allocations, use spot with checkpointing for training, and right-size inference with load tests.

**Pitfalls**: sizing by FLOPs and forgetting memory; mixing GPU generations in one job; tensor parallel across slow links; reserving whole GPUs for tiny dev workloads; ignoring driver/CUDA/container version compatibility.

## Worked example
Illustrative sizing. **Fine-tune a 7B model with full Adam**: $7 \times 16 = 112$ GB for states alone. One 80 GB GPU cannot hold it. With FSDP across 2 GPUs the states are about 56 GB each, leaving about 24 GB for activations per GPU; with 20% headroom the minimum is $\lceil 112 \times 1.2 / 80 \rceil = 2$ GPUs, and 4 gives comfortable batch sizes. Alternative: LoRA keeps base weights frozen (14 GB in fp16) and trains small adapters, so one GPU works.

**Serve the same model in fp16**: weights 14 GB. For a 32-layer, 4096-hidden model with full multi-head attention, the KV cache per token is $2 \times 32 \times 4096 \times 2$ B = 0.5 MB, so a 4,096-token sequence needs about 2 GB. On an 80 GB GPU, (80 - 14) / 2 gives roughly 33 concurrent sequences before overhead. Grouped-query attention or quantised KV caches multiply that.

**Cost**: at \$4/h and 2,500 tokens/s, 50% utilisation costs \$4 / 4.5M tokens = about \$0.89 per 1M tokens; at 90% it is about \$0.49. Utilisation matters as much as the GPU price.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does a 7B-parameter full fine-tune with Adam not fit on one 80 GB GPU even with a tiny batch?",
  "options": [
    "Adam needs the dataset in GPU memory",
    "Weights, gradients and optimizer states take about 16 bytes/param, around 112 GB",
    "GPUs cannot run fp16",
    "7B models need 7 GPUs"
  ],
  "answer": 1,
  "explanation": "Mixed-precision Adam needs roughly 16 bytes per parameter before activations, so about 112 GB. Shard with FSDP/ZeRO, use LoRA, or use more memory."
}
```

```quiz
{
  "id": "q2",
  "question": "A training job shows 25% GPU utilisation. What is the most likely first thing to check?",
  "options": [
    "Whether the GPU is overheating",
    "Data loading and preprocessing throughput starving the GPU",
    "The Python version",
    "Whether the model has too few layers"
  ],
  "answer": 1,
  "explanation": "Low utilisation is usually an input pipeline, small batch or communication bottleneck, not slow GPU compute."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Sizing helper. Implement `training_memory_gb(params_billion, bytes_per_param=16)` (GB for weights, gradients and optimizer state) and `min_gpus(mem_gb, gpu_gb, headroom=0.2)`: the smallest GPU count (at least 1) whose total memory covers `mem_gb * (1 + headroom)`, assuming perfect sharding.",
  "starterCode": "import math\n\ndef training_memory_gb(params_billion, bytes_per_param=16):\n    \"\"\"GB for weights + gradients + optimizer state (no activations).\n    Mixed-precision Adam is about 16 bytes/param.\"\"\"\n    pass\n\ndef min_gpus(mem_gb, gpu_gb, headroom=0.2):\n    \"\"\"Smallest GPU count whose total memory covers mem_gb * (1 + headroom)\n    (headroom is for activations and fragmentation; assume perfect sharding).\"\"\"\n    pass\n\nprint(training_memory_gb(7), min_gpus(112, 80))",
  "tests": "import math\nassert abs(training_memory_gb(7) - 112) < 1e-9\nassert abs(training_memory_gb(1.5, 2) - 3.0) < 1e-9\nassert min_gpus(112, 80) == 2\nassert min_gpus(30, 80) == 1\nassert min_gpus(560, 80) == 9\nassert min_gpus(64, 80, headroom=0.25) == 1",
  "solution": "import math\n\ndef training_memory_gb(params_billion, bytes_per_param=16):\n    return params_billion * bytes_per_param\n\ndef min_gpus(mem_gb, gpu_gb, headroom=0.2):\n    return max(1, math.ceil(round(mem_gb * (1 + headroom) / gpu_gb, 9)))",
  "hints": [
    "1 billion params at 1 byte is 1 GB.",
    "Use math.ceil on mem_gb * (1 + headroom) / gpu_gb."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Serving economics. Implement `cost_per_million_tokens(gpu_hourly_usd, tokens_per_sec, utilization)` and `breakeven_utilization(gpu_hourly_usd, tokens_per_sec, target_usd_per_m)`, the utilisation needed to reach a target price per 1M tokens.",
  "starterCode": "def cost_per_million_tokens(gpu_hourly_usd, tokens_per_sec, utilization):\n    \"\"\"Serving cost in USD per 1M generated tokens for one GPU.\n    utilization is the fraction of time the GPU is doing useful work (0-1].\"\"\"\n    pass\n\ndef breakeven_utilization(gpu_hourly_usd, tokens_per_sec, target_usd_per_m):\n    \"\"\"Utilization needed to hit target_usd_per_m dollars per 1M tokens.\"\"\"\n    pass\n\nprint(cost_per_million_tokens(4.0, 2500, 0.5))",
  "tests": "assert abs(cost_per_million_tokens(4.0, 2500, 0.5) - 4.0 / 4.5) < 1e-9\nassert abs(cost_per_million_tokens(4.0, 2500, 1.0) - 4.0 / 9.0) < 1e-9\nassert abs(breakeven_utilization(4.0, 2500, 0.5) - (4.0 / 9.0) / 0.5) < 1e-9\nu = breakeven_utilization(4.0, 2500, 1.0)\nassert abs(cost_per_million_tokens(4.0, 2500, u) - 1.0) < 1e-9",
  "solution": "def cost_per_million_tokens(gpu_hourly_usd, tokens_per_sec, utilization):\n    tokens_per_hour = tokens_per_sec * 3600 * utilization\n    return gpu_hourly_usd / tokens_per_hour * 1e6\n\ndef breakeven_utilization(gpu_hourly_usd, tokens_per_sec, target_usd_per_m):\n    full = cost_per_million_tokens(gpu_hourly_usd, tokens_per_sec, 1.0)\n    return full / target_usd_per_m",
  "hints": [
    "Tokens per hour = tokens_per_sec * 3600 * utilization.",
    "Cost per 1M tokens is inversely proportional to utilisation."
  ]
}
```

> [!TIP] Interview tips
- Start with the memory model: 16 bytes/param for Adam training, weights plus KV cache for inference.
- Name the parallelism options (DDP, FSDP/ZeRO, tensor, pipeline) and where each belongs (NVLink in node, InfiniBand across).
- On Kubernetes mention device plugin, MIG vs time-slicing, gang scheduling and quotas.
- Diagnose low utilisation from the input pipeline first; tie everything back to cost per useful token or per epoch.
