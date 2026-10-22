---
id: nlp-llms-full-fine-tuning-vs-peft
title: Full fine-tuning vs PEFT
estimatedMinutes: 10
difficulty: medium
tags: [nlp, llm, fine-tuning, peft, adapters, memory]
---

## Why it matters
Fine-tuning a 7B+ model fully needs a multi-GPU node, while PEFT can do it on one consumer GPU. "Why PEFT, and when not?" is a standard question for anyone adapting LLMs.

## Concept
**Full fine-tuning** updates every weight. With Adam in mixed precision, memory is about **16 bytes per parameter**: fp16 weights (2) + fp16 gradients (2) + fp32 master weights (4) + Adam moments $m, v$ (8), plus activations. You also store a full model copy per task.

**Parameter-efficient fine-tuning (PEFT)** freezes the base model and trains a tiny number of parameters (often $< 1\%$). Families:
- **Adapters**: small bottleneck modules ($d \to r \to d$ with a nonlinearity and residual) inserted after attention / FFN sublayers. Adds a little inference latency.
- **Prompt / prefix tuning**: learn continuous "soft prompt" vectors prepended to the input (or to every layer's keys/values); weights untouched.
- **LoRA** (next lesson): learn low-rank updates $W + BA$ that can be merged into $W$, with no inference overhead.
- **Selective**: train only some existing weights, e.g. biases (BitFit) or the last layers.

**Why use it**:
- **Memory**: no gradients or optimizer states for the frozen weights (the frozen base can even be quantized, QLoRA).
- **Storage and serving**: a task is a few MB; one base model serves many tasks/tenants by swapping adapters.
- **Less forgetting** and less overfitting on small datasets.

**Trade-offs**: slightly lower quality than full fine-tuning when the task is far from pre-training or data is plentiful (e.g. new language, continued pre-training); extra hyperparameters (rank, which layers). Activation memory is *not* reduced much.

## Worked example
7B model. **Full FT**: $7 \times 10^9 \cdot 16 = 112$ GB, which needs several 80 GB GPUs.

**PEFT** training $0.1\%$ of weights: frozen fp16 base $2 \cdot 7 \times 10^9 \cdot 0.999 \approx 14.0$ GB, plus $16 \cdot 7 \times 10^6 = 0.11$ GB for the trainable part, about **14.1 GB** before activations, so it fits a 24 GB GPU. Saved checkpoint: $7 \times 10^6 \cdot 2$ B $= 14$ MB per task vs 14 GB.

Adapter size: $d = 4096$, bottleneck $r = 64$ gives $2dr + r + d = 528{,}448$ parameters. Two per layer over 32 layers is $33.8$M, about $0.48\%$ of 7B.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does PEFT use far less GPU memory than full fine-tuning?",
  "options": [
    "It uses a smaller batch size automatically",
    "Frozen weights need no gradients or optimizer states, so only the small trainable part pays the ~16 bytes/param cost",
    "It removes activations",
    "It trains in 1-bit precision"
  ],
  "answer": 1,
  "explanation": "Gradients and Adam moments dominate training memory. Frozen weights only need to be stored (and can be quantized); activations are still required."
}
```

```quiz
{
  "id": "q2",
  "question": "You serve 200 customers, each with their own fine-tuned 7B model. What is the best PEFT-based design?",
  "options": [
    "200 full copies of the model",
    "One shared frozen base model plus a small adapter per customer, swapped per request",
    "One model fine-tuned on all customers' data mixed",
    "Prompt every customer's data into the context"
  ],
  "answer": 1,
  "explanation": "Adapters are megabytes, so many tenants share one base in GPU memory. Full copies would need ~14 GB each."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `finetune_memory_gb(n_params, trainable_frac=1.0)`: trainable parameters cost 16 bytes each (weights, grads, master copy, Adam moments); frozen parameters cost 2 bytes (fp16). Return GB (1 GB = 1e9 bytes), ignoring activations. Then write `adapter_params(d_model, bottleneck, n_layers, per_layer=2)`: each adapter has a down projection $d \\to r$ and an up projection $r \\to d$, both with biases.",
  "starterCode": "def finetune_memory_gb(n_params, trainable_frac=1.0):\n    \"\"\"Approximate training memory in GB (1 GB = 1e9 bytes), ignoring activations.\n    Trainable params cost 16 bytes each; frozen params are stored in fp16 (2 bytes).\"\"\"\n    pass\n\ndef adapter_params(d_model, bottleneck, n_layers, per_layer=2):\n    \"\"\"Parameters of bottleneck adapters: down (d->r) + up (r->d), both with bias.\"\"\"\n    pass\n\nprint(finetune_memory_gb(7e9), finetune_memory_gb(7e9, 0.001), adapter_params(4096, 64, 32))",
  "tests": "assert abs(finetune_memory_gb(7e9) - 112) < 1e-9\nassert abs(finetune_memory_gb(7e9, 0.001) - 14.098) < 1e-6\nassert finetune_memory_gb(7e9, 0.001) < finetune_memory_gb(7e9, 0.01) < finetune_memory_gb(7e9)\nassert adapter_params(4096, 64, 1, per_layer=1) == 528448\nassert adapter_params(4096, 64, 32) == 33820672\nassert adapter_params(8, 2, 3, 2) == 6 * (2 * 8 * 2 + 2 + 8)",
  "solution": "def finetune_memory_gb(n_params, trainable_frac=1.0):\n    trainable = n_params * trainable_frac\n    frozen = n_params - trainable\n    return (16 * trainable + 2 * frozen) / 1e9\n\ndef adapter_params(d_model, bottleneck, n_layers, per_layer=2):\n    one = d_model * bottleneck + bottleneck + bottleneck * d_model + d_model\n    return one * per_layer * n_layers",
  "hints": [
    "Split n_params into trainable and frozen parts and cost them separately.",
    "One adapter = d*r + r + r*d + d parameters."
  ]
}
```

> [!TIP] Interview tips
> - Quote the 16 bytes/param rule for full fine-tuning with Adam; it explains why PEFT saves memory.
> - Name the families (adapters, prompt/prefix, LoRA, BitFit) and say which adds inference latency.
> - Give a balanced answer: PEFT is the default for limited data/compute; full fine-tuning when you have lots of data and a big domain shift.
