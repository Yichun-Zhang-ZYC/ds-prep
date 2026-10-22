---
id: nlp-llms-flash-attention-and-efficient-attention
title: "FlashAttention 与高效注意力"
---

## 为什么重要
注意力是 Transformer 中随序列长度扩展最差的部分，“如果 FLOPs 相同，FlashAttention 为什么更快？”是资深岗位的热门问题。它考察你是否理解 GPU 内存层级，而不只是渐近复杂度（基础见“自注意力与多头注意力”和“上下文窗口与 KV cache”）。

## 概念
**瓶颈是内存访问量，而不是 FLOPs。**标准注意力会在 GPU 高带宽内存（HBM）中物化 $S = QK^\top / \sqrt{d}$ 和 $P = \text{softmax}(S)$（各为 $n \times n$），并多次读写。HBM 容量大但速度慢；片上 SRAM 很小（A100 全片约 20 MB），但速度快约一个数量级。注意力是**受内存限制**的。

**FlashAttention**（Dao 等）是精确的、感知 IO 的 kernel：
- **分块（tiling）**：把 $Q$ 的一块和 $K, V$ 的各块依次加载进 SRAM 循环计算，从不把 $n \times n$ 矩阵写回 HBM。
- **在线 softmax**：为每行维护运行最大值 $m$、归一化项 $\ell$ 和输出累加器 $o$。对新的一块分数 $s$：$m' = \max(m, \max s)$，$\ell' = \ell\,e^{m-m'} + \sum e^{s-m'}$，$o' = o\,e^{m-m'} + \sum e^{s-m'} v$；最后输出 $o/\ell$。数值稳定且结果精确。
- **反向传播时重算**：只保存输出和 log-sum-exp（大小 $O(n)$），重算注意力分块而不是保存 $P$。
- 结果：内存从 $O(n^2)$ 降到 $O(n)$；HBM 读写量从 $\Theta(n^2)$ 降到 $\Theta(n^2 d^2 / M)$（$M$ 为 SRAM 大小）；FLOPs 不变，仍为 $O(n^2 d)$；实际墙钟时间通常加速 2-4 倍，使长上下文成为可能。
- **FlashAttention-2** 改进了工作划分和沿序列长度的并行；**FlashAttention-3** 面向 Hopper（异步、FP8）。**FlashDecoding** 针对 batch-1 解码沿 KV 长度并行。PyTorch 的 `scaled_dot_product_attention` 会自动调用这些 kernel。

**减少计算量本身**（通常是近似或结构上的改变）：
- **MQA / GQA / MLA**：跨头共享或压缩 K/V，缩小 KV cache 并降低解码带宽。
- **稀疏 / 滑动窗口**注意力（Longformer、Mistral）：每个 token 只关注局部窗口（加上全局 token）：$O(nw)$。
- **线性注意力 / 状态空间模型**（Mamba）：用递归替代 softmax，$O(n)$ 时间、常数状态；精确回忆能力较弱，因此常与注意力混合使用。
- **PagedAttention**（vLLM）解决 KV cache 碎片问题；它是内存管理器，而不是另一种注意力公式。

**常见陷阱**：FlashAttention 不会减少二次的 FLOPs，所以超长上下文仍然耗费算力；它需要受支持的数据类型、头维度和硬件；任意自定义掩码或偏置可能回退到较慢的 kernel。

## 示例讲解
单个头的注意力分数矩阵内存，$n = 32{,}768$，fp16（2 字节）：$32768^2 \times 2 = 2^{31}$ B $= 2$ GiB。32 个头则一层就需 $64$ GiB，远超单卡显存，所以标准注意力必须分块否则会 OOM。FlashAttention 从不存储它，每个头只保留 $O(n)$ 的统计量。

用分数 $[1, 3, 2]$、值 $[10, 20, 30]$、块大小 2 验证在线 softmax。
- 第 1 块 $(1, 3)$：$m = 3$，$\ell = e^{-2} + 1 = 1.1353$，$o = 10 e^{-2} + 20 = 21.353$。
- 第 2 块 $(2)$：$m' = 3$（不变），$\ell = 1.1353 + e^{-1} = 1.5032$，$o = 21.353 + 30 e^{-1} = 32.390$。
- 结果 $o/\ell = 21.547$。

直接 softmax 的权重为 $(0.090, 0.665, 0.245)$，$0.9 + 13.30 + 7.34 = 21.547$。结果一致，而且从未把整行保存在内存里。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么 FlashAttention 在 FLOPs 不变的情况下仍然更快？",
  "options": ["它减少了对 HBM 的读写，通过分块把 $n \\times n$ 的分数矩阵留在 SRAM 中", "它把注意力近似为线性复杂度", "它丢弃了得分较低的 token", "它使用更低精度的 softmax 来避免指数运算"],
  "explanation": "注意力受内存带宽限制。FlashAttention 是精确的，FLOPs 仍为 $O(n^2 d)$，节省的是 HBM 访问和 $O(n^2)$ 的中间存储。"
}
```

```quiz
{
  "id": "q2",
  "question": "在线 softmax 在处理新的一块分数时，为什么要把旧的累加器乘以 $e^{m-m'}$？",
  "options": ["因为最大值从 $m$ 变成了 $m'$，需要把之前的指数项重新基准化到新的最大值", "为了丢弃旧的块", "为了加入 dropout", "为了把 softmax 变成 sigmoid"],
  "explanation": "旧项是以 $e^{s-m}$ 存储的；新的基准是 $m'$，所以要乘以 $e^{m-m'}$ 才能得到 $e^{s-m'}$。这样既保证数值稳定又保证精确。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `softmax_avg(scores, values)`（直接计算 softmax 加权平均，先减去最大值）、`online_softmax_avg(scores, values, block)`（每次只处理 `block` 个元素，维护 $m, \\ell, o$，不得保存整行）、以及 `attn_matrix_gib(n, heads, bytes_per=2)`（返回 $n \\times n$ 分数矩阵的 GiB 数）。",
  "hints": ["初始化 m = -inf，l = 0，o = 0。处理新块时先算 m' = max(m, max(块))，再把 l 和 o 乘以 exp(m - m')（m 为 -inf 时用 0）。", "对块中每个元素：w = exp(x - m')，l += w，o += w * v。", "GiB = n*n*heads*bytes_per / 2**30。"]
}
```

> [!TIP] 面试技巧
> - 开场就说：注意力受内存限制；FlashAttention 精确、IO 感知，FLOPs 不变，内存从 $O(n^2)$ 降到 $O(n)$。
> - 能默写在线 softmax 的 $(m, \ell, o)$ 更新式，并说明反向传播用重算换内存。
> - 区分：FlashAttention（kernel 层面精确）、GQA/MLA（缩小 KV cache）、滑动窗口/线性注意力（改变算法，近似）、PagedAttention（内存管理）。
