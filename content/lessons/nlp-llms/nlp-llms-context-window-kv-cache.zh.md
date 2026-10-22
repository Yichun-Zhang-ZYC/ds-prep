---
id: nlp-llms-context-window-kv-cache
title: 上下文窗口与 KV 缓存
---

## 为什么重要
一旦上下文变长，LLM 的服务成本和延迟主要由 KV 缓存而不是权重决定。“一个 32k token 的请求需要多少内存？”是机器学习和推理工程师常见的估算题。

## 概念
**上下文窗口**：模型能够关注的最大 token 数（提示词 + 生成内容）。它受训练长度、位置编码（如 RoPE 外推）和内存限制。预填充阶段的自注意力计算量按 $O(n^2)$ 增长。更长的窗口并不保证模型能*用好*它（“中间丢失”现象）。

**为什么需要 KV 缓存**：生成是自回归的。第 $t$ 个 token 要关注所有之前 token 的键和值，而这些值不会改变。缓存它们之后，每一步只需为**一个** token 计算 $q, k, v$ 并复用存储的 $K, V$，而不必重新计算整个前缀。输出**完全相同**；它是用内存换算力。

**两个阶段**：
- **预填充**：并行处理整个提示词（计算受限）；决定首 token 延迟。
- **解码**：每步生成一个 token，每步都要读取整个缓存（**内存带宽受限**）；决定 token 间延迟。

**缓存大小**：
$$\text{bytes} = 2 \times L \times H_{kv} \times d_{head} \times n_{seq} \times n_{batch} \times b$$
（$2$ 代表 K 和 V，$L$ 为层数，$H_{kv}$ 为 KV 头数，$b$ 为每个元素的字节数。）它随序列长度和批大小**线性**增长，因此决定了一块 GPU 上能同时放下多少请求。

**缩小方法**：
- **MQA / GQA**：让多组查询头共享 K/V（减少 $H_{kv}$）。
- **量化**缓存（INT8 / FP8）。
- **滑动窗口 / 局部注意力**（部分层使用固定大小的缓存）。
- **PagedAttention**（vLLM）避免碎片；**前缀缓存**为相同的提示词复用缓存。

## 示例讲解
采用完整多头注意力的 Llama-2-7B：$L = 32$，$H_{kv} = 32$，$d_{head} = 128$，fp16（$b = 2$）。每个 token：$2 \cdot 32 \cdot 32 \cdot 128 \cdot 2 = 524{,}288$ B $= 0.5$ MiB。4,096 个 token 的序列需要 $2$ GiB；批大小 16 需要 32 GiB，超过了约 13 GiB 的 fp16 权重。

Llama-3-8B 使用 $H_{kv} = 8$ 的 GQA：每个 token $2 \cdot 32 \cdot 8 \cdot 128 \cdot 2 = 131{,}072$ B $= 128$ KiB，小 4 倍。8,192 个 token 的序列需要 1 GiB。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "启用 KV 缓存会改变模型（贪心解码）生成的 token 吗？",
  "options": [
    "会，它用近似注意力来节省内存",
    "不会，它是精确的；只是避免重复计算前缀的键和值",
    "会，它会截断上下文",
    "只有序列超过 4k token 时才会"
  ],
  "explanation": "缓存的 K 和 V 正是本来要重新计算的值。缓存用内存换算力，不会改变输出（浮点噪声除外）。"
}
```

```quiz
{
  "id": "q2",
  "question": "模型从 32 个 KV 头（MHA）改为 8 个 KV 头（GQA），其他条件不变。每个 token 的 KV 缓存内存会怎样？",
  "options": [
    "不变",
    "减少为原来的 1/4",
    "减少为原来的 1/32",
    "增加 4 倍"
  ],
  "explanation": "缓存大小与 KV 头数成正比：8/32 = 1/4。查询头数（以及注意力质量）基本保留。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `kv_cache_bytes(layers, kv_heads, head_dim, seq_len, batch=1, bytes_per_elem=2)`，返回 KV 缓存的字节数。再编写 `max_concurrent_seqs(free_bytes, layers, kv_heads, head_dim, seq_len, bytes_per_elem=2)`，返回空闲内存中能放下的完整长度序列数。",
  "hints": [
    "开头的因子 2 表示同时存储 K 和 V。",
    "序列数用整数除法。"
  ]
}
```

> [!TIP] 面试技巧
> - 把公式大声说出来：2（K、V）x 层数 x KV 头数 x 头维度 x token 数 x 批大小 x 字节数。
> - 说明 KV 缓存给出的是精确输出，并且解码受内存带宽限制（因此有 GQA、量化、批处理）。
> - 区分预填充（计算受限，影响首 token 延迟）与解码（带宽受限，影响 tokens/s）。
