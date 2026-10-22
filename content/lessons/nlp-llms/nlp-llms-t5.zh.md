---
id: nlp-llms-t5
title: T5（编码器-解码器）
---

## 为什么重要
T5 是经典的编码器-解码器 Transformer，常用来比较不同架构。面试官会问：它与 BERT 和 GPT 有何不同、什么是 span corruption，以及什么时候 seq2seq 模型是正确选择。

## 概念
**文本到文本的框架**：每个任务都是字符串进、字符串出，通过前缀选择任务：`translate English to German: ...`、`summarize: ...`、`cola sentence: ...`。一个模型、一个损失（对目标 token 的交叉熵）、一种解码流程。

**架构**
- **编码器**：对输入做双向自注意力，只运行一次。
- **解码器**：对已生成 token 做因果自注意力，外加**交叉注意力**，其中查询来自解码器，键/值来自编码器输出。
- T5 使用相对位置偏置、无偏置的 pre-layer-norm，以及 32k 的 SentencePiece 词表。规模从 6000 万（small）到 110 亿。

**预训练：span corruption（去噪）**
- 以连续片段（平均长度 3）的形式丢弃约 15% 的 token，并把每个片段替换为唯一的哨兵 token `<extra_id_k>`。
- 目标是哨兵加被丢弃的 token，最后以一个终止哨兵结束。目标很短，因此比重建整个输入更省算力。
- 在 C4（清洗过的 Common Crawl）上预训练；论文通过消融实验比较了目标、架构和数据。

**如何选择模型家族**
- **编码器-解码器**：翻译、摘要、输入输出明显不同的结构化输出；编码器双向读取输入，交叉注意力可直接访问输入。
- **仅解码器**：通用对话和上下文学习；更简单，扩展性好。
- **仅编码器**：分类、检索、序列标注。
- **变体**：mT5（多语言）、Flan-T5（指令微调）、UL2（混合去噪目标）、ByT5（字节级）。
- **成本说明**：每个 token 只经过编码器或只经过解码器，所以拥有 $2P$ 参数的编码器-解码器与拥有 $P$ 参数的仅解码器模型每个 token 的 FLOPs 大致相同。

## 示例讲解
输入句子：`Thank you for inviting me to your party last week`。破坏第 2-3 个 token（`for inviting`）和第 8 个 token（`last`）：

- 编码器输入：`Thank you <X0> me to your party <X1> week`
- 解码器目标：`<X0> for inviting <X1> last <X2>`

编码器看到 8 个 token，解码器生成 6 个，而不是重建全部 10 个。交叉注意力让解码器每一步都能查看所有编码器位置。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 T5 解码器中，交叉注意力的键和值来自哪里？",
  "options": [
    "解码器的上一层",
    "编码器的最终输出",
    "输入嵌入",
    "目标 token"
  ],
  "explanation": "交叉注意力的查询来自解码器；键和值来自编码器输出，使解码器能访问整个输入。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么 T5 的 span corruption 目标只包含被丢弃的片段，而不是完整句子？",
  "options": [
    "解码器是双向的",
    "更短的目标使预训练更便宜，同时仍迫使模型恢复缺失内容",
    "哨兵不能重复",
    "编码器被冻结"
  ],
  "explanation": "预测约 15% 的 token 所需的解码步数远少于重新生成整个输入，但仍能学到语言理解能力。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `span_corrupt(tokens, spans)`，其中 `spans` 是有序且互不重叠的 `(start, end)` 对（end 不含）。返回 `(inputs, targets)`：`inputs` 中每个片段被替换为哨兵 `<extra_id_k>`（k 为片段序号）；`targets` 对每个片段依次为其哨兵加上被丢弃的 token，最后再加一个终止哨兵 `<extra_id_n>`（n 为片段数）。",
  "hints": [
    "遍历片段时记录上一个片段的结束位置；把片段之间的 token 复制到 inputs 中。",
    "循环结束后，把最后的终止哨兵追加到 targets。"
  ]
}
```

> [!TIP] 面试技巧
> - 用注意力模式对比三类模型：双向（BERT）、因果（GPT）、双向编码器加带交叉注意力的因果解码器（T5）。
> - 解释 span corruption，以及为什么有哨兵 token 和很短的目标。
> - 提到文本到文本：新任务只需要一个前缀，不需要新的输出头。

