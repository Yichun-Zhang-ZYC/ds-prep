---
id: genai-eng-zero-shot-few-shot
title: Zero-shot 与 few-shot
---

## 为什么重要
提示词是引导 LLM 成本最低的手段，“什么时候用 few-shot，什么时候用微调？”是 GenAI 面试的常见问题。了解示例如何改变模型行为（格式、标签空间、语气），能把真正上线过 LLM 功能的人和只聊过天的人区分开。

## 概念
**Zero-shot**：只有指令，没有示例。当任务常见且输出格式容易描述时有效。**Few-shot**（上下文学习）：在提示词中加入 $k$ 组输入/输出示范。模型权重不变，模型从上下文中推断规律。

示例能带来什么：
- **格式控制**：你想要的确切 schema、大小写和标签字符串。
- **标签空间与边界情况策略**：如何处理讽刺、“中性”或超出范围的输入。
- **风格与语气**：展示比描述更容易。

需要注意：
- **敏感性**：示例的顺序、标签平衡和措辞会显著影响准确率。模型倾向于复制多数标签和最后一个示例（近因偏差）。要打乱顺序、平衡类别并测试不同排序。
- **质量胜过数量**：3 到 8 个干净、多样的示例通常就能获得大部分收益；每多一个都会在每次调用中消耗 token。
- **动态选择**：从示例池中检索与查询最相似的 $k$ 个示例（嵌入或关键词相似度），而不是使用固定集合；对特定领域任务往往提升很大。
- **泄漏**：评估时绝不要把测试样本放进示范中。
- 现代指令微调模型的 zero-shot 能力很强；先从 zero-shot 开始，只针对你能说出名字的失败案例添加示例。Few-shot 示例也可以放进 system prompt，并且作为稳定前缀很适合做 prompt caching。

**Few-shot 与微调**：提示词迭代快，不需要训练数据流水线；当你有数千条标注样本、需要更低的单次调用成本或延迟（更短的提示词），或需要提示词无法承载的风格时，微调更有优势。

## 示例讲解
任务：把客服工单分到 `billing`、`bug` 或 `other`。

```text
Classify the ticket as billing, bug, or other. Answer with one word.

Input: I was charged twice this month
Label: billing

Input: The export button crashes the app
Label: bug

Input: Do you have a student discount?
Label: other

Input: My invoice shows the wrong VAT number
Label:
```

Zero-shot 时，模型可能回答“This looks like a billing issue.”。三个示范固定了格式（一个小写单词），并把 `other` 定义为兜底类别。如果你的示例 90% 是 `bug`，模型就会过多预测 `bug`。成本：如果示例增加 60 个 token，每月 100 万次调用，输入价格为每百万 token \$3，则仅示例就是 6000 万 token = 每月 \$180，所以要缓存前缀或精简示例。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "一个 few-shot 分类器过多预测某一个标签。提示词层面最可能的原因和修复方法是什么？",
  "options": [
    "模型权重漂移，需要重新训练",
    "示范不平衡，或最后一个示例造成偏差；平衡类别并打乱顺序",
    "temperature 太低，把它调到 1.5",
    "Few-shot 提示词不能用于分类"
  ],
  "explanation": "多数标签偏差和近因偏差是 few-shot 中众所周知的现象。平衡标签数量、改变顺序，并在留出集上测量。"
}
```

```quiz
{
  "id": "q2",
  "question": "什么时候通常更适合微调而不是 few-shot 提示？",
  "options": [
    "你只有 5 个标注样本",
    "你有数千条标注样本，并且需要更低的单次调用成本或延迟",
    "你想快速迭代措辞",
    "任务每天都在变"
  ],
  "explanation": "有充足数据和高调用量时微调更划算（提示词更短、调用更便宜）。Few-shot 更适合快速迭代和极小的数据集。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `build_prompt(instruction, examples, query)`：用空行（`\\n\\n`）连接指令、每个 `(text, label)` 示例（格式为 `Input: <text>\\nLabel: <label>`），最后是 `Input: <query>\\nLabel:`。再编写 `select_examples(query, pool, k)`，返回文本与查询的 Jaccard 词重叠（小写、按空白切分）最高的 `k` 个示例；平局时按原始顺序。",
  "hints": [
    "Jaccard = |A ∩ B| / |A ∪ B|，基于词集合。",
    "按 (-score, index) 排序，平局时保持原有顺序。"
  ]
}
```

> [!TIP] 面试技巧
> - 默认回答：先用清晰的指令和格式说明做 zero-shot，只针对能命名的失败模式添加 few-shot，在调用量和数据足够时再微调。
> - 提到对顺序/标签平衡的敏感性和动态（检索式）示例选择；这两点都体现真实经验。
> - 示例在每次调用中消耗 token：要量化，并提到前缀缓存。
