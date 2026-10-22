---
id: ml-system-design-distributed-training
title: Distributed training (data parallel, model parallel)
estimatedMinutes: 12
difficulty: hard
tags: [ml-system-design, distributed-training, fsdp, scaling]
---

## Why it matters
Once a model or dataset outgrows one GPU you must parallelize training. Interviewers ask which strategy fits, where memory goes, and what communication costs.

## Concept
**Data parallelism (DP)**: every GPU holds a full model copy and processes a different shard of the batch; gradients are averaged with **all-reduce** before each step. Effective batch size $= B_{gpu} \times N$ (scale the learning rate, with warmup). Simple and scales well until the model no longer fits or communication dominates. PyTorch DDP overlaps all-reduce with the backward pass. **Ring all-reduce** sends $2\frac{N-1}{N} S$ bytes per GPU for gradient size $S$, almost independent of $N$.

**Where memory goes** (mixed precision + Adam, per parameter): weights 2 B + grads 2 B + fp32 master weights 4 B + Adam $m$ and $v$ 8 B $= 16$ B/param, plus activations. A 7B model needs $\approx 112$ GB before activations.

**Sharded data parallel** (ZeRO / FSDP): shard optimizer states (ZeRO-1), gradients (ZeRO-2) and parameters (ZeRO-3) across GPUs, gathering weights just in time. Memory per GPU $\approx 16P/N$ at full sharding, at the price of extra communication.

**Model parallelism** (when one layer or model does not fit):
- **Tensor parallel**: split each matrix multiply across GPUs (needs fast NVLink, typically within a node).
- **Pipeline parallel**: split layers into stages, feed **micro-batches**; the idle **bubble** fraction is $\frac{p-1}{m+p-1}$ for $p$ stages and $m$ micro-batches.
- Large LLMs combine **3D parallelism** (data + tensor + pipeline), plus activation checkpointing (recompute to save memory) and bf16.

**Choosing**: fits on one GPU $\to$ DDP; optimizer states too big $\to$ FSDP/ZeRO; single layers too big or very large scale $\to$ add tensor/pipeline parallelism. Also: gradient accumulation to simulate large batches, handle stragglers and checkpoint often for failures, and keep data loading from becoming the bottleneck.

## Worked example
A 7B-parameter model: $16 \times 7 = 112$ GB of weights + grads + optimizer state, more than one 80 GB GPU, so plain DDP fails. FSDP over 8 GPUs gives $112/8 = 14$ GB per GPU (plus activations), which fits.
Pipeline with $p = 4$ stages and $m = 16$ micro-batches: bubble $= 3/19 \approx 15.8\%$ idle; using $m = 64$ cuts it to $3/67 \approx 4.5\%$.
Ring all-reduce for 1 GB gradients on 8 GPUs: $2 \times 7/8 \times 1 = 1.75$ GB per GPU per step.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A model's weights fit on one GPU, but training is too slow. Which first step is most appropriate?",
  "options": [
    "Pipeline parallelism",
    "Data parallelism (DDP) across GPUs",
    "Tensor parallelism",
    "Pruning the model"
  ],
  "answer": 1,
  "explanation": "If the model fits, replicate it and split the data; it's the simplest and scales near-linearly."
}
```

```quiz
{
  "id": "q2",
  "question": "What does FSDP/ZeRO-3 shard across GPUs?",
  "options": [
    "Only the training data",
    "Parameters, gradients and optimizer states",
    "Only activations",
    "Only the learning rate"
  ],
  "answer": 1,
  "explanation": "Sharding all three model-state components cuts per-GPU memory roughly by the GPU count, with extra all-gather communication."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `train_memory_gb(params_billion, bytes_per_param=16, shards=1)` (GB per GPU, 1 GB = 1e9 B), `ring_allreduce_gb(size_gb, n_gpus)` = 2(n−1)/n × size, `bubble_fraction(stages, microbatches)` = (p−1)/(m+p−1), and `effective_batch(per_gpu_batch, n_gpus, grad_accum=1)`.",
  "starterCode": "def train_memory_gb(params_billion, bytes_per_param=16, shards=1):\n    pass\n\ndef ring_allreduce_gb(size_gb, n_gpus):\n    pass\n\ndef bubble_fraction(stages, microbatches):\n    pass\n\ndef effective_batch(per_gpu_batch, n_gpus, grad_accum=1):\n    pass\n",
  "tests": "assert abs(train_memory_gb(7) - 112) < 1e-9\nassert abs(train_memory_gb(7, shards=8) - 14) < 1e-9\nassert abs(ring_allreduce_gb(1, 8) - 1.75) < 1e-12\nassert ring_allreduce_gb(1, 1) == 0\nassert abs(bubble_fraction(4, 16) - 3 / 19) < 1e-12\nassert abs(bubble_fraction(4, 64) - 3 / 67) < 1e-12\nassert bubble_fraction(1, 8) == 0\nassert effective_batch(32, 8) == 256\nassert effective_batch(32, 8, 4) == 1024",
  "solution": "def train_memory_gb(params_billion, bytes_per_param=16, shards=1):\n    return params_billion * bytes_per_param / shards\n\ndef ring_allreduce_gb(size_gb, n_gpus):\n    return 2 * (n_gpus - 1) / n_gpus * size_gb\n\ndef bubble_fraction(stages, microbatches):\n    return (stages - 1) / (microbatches + stages - 1)\n\ndef effective_batch(per_gpu_batch, n_gpus, grad_accum=1):\n    return per_gpu_batch * n_gpus * grad_accum",
  "hints": [
    "1B parameters × 16 bytes = 16 GB.",
    "A single stage has no pipeline bubble."
  ]
}
```

> [!TIP] Interview tips
> - Walk the ladder: DDP, then FSDP/ZeRO when memory binds, then tensor/pipeline parallelism at extreme scale.
> - Do the memory math (about 16 bytes per parameter with Adam in mixed precision) to justify sharding.
> - Mention communication (all-reduce, NVLink vs network), pipeline bubbles, activation checkpointing and fault-tolerant checkpoints.
