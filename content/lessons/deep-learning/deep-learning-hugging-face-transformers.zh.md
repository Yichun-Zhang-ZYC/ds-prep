---
id: deep-learning-hugging-face-transformers
title: "Hugging Face Transformers"
---

## 为什么重要
Hugging Face `transformers` 是使用和微调预训练模型的标准工具包。面试会考察你是否了解 Auto 类、分词器返回什么（`input_ids`、`attention_mask`）、填充和截断如何工作，以及如何用 `Trainer` 或手写循环进行微调。

## 概念
**Pipeline** 是推理的一行式接口：分词器 + 模型 + 后处理。

```python
from transformers import pipeline
clf = pipeline("sentiment-analysis")                 # downloads a default model
clf(["I love this", "Terrible service"])             # [{'label': 'POSITIVE', 'score': ...}, ...]
```

**Auto 类**根据检查点名称或路径加载正确的架构。模型类必须与任务头匹配：`AutoModel`（裸编码器，输出隐藏状态）、`AutoModelForSequenceClassification`、`AutoModelForTokenClassification`、`AutoModelForCausalLM`、`AutoModelForSeq2SeqLM`。

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
name = "distilbert-base-uncased"
tok = AutoTokenizer.from_pretrained(name)
model = AutoModelForSequenceClassification.from_pretrained(name, num_labels=2)
batch = tok(["good movie", "a very long review ..."], padding=True, truncation=True,
            max_length=128, return_tensors="pt")
out = model(**batch, labels=torch.tensor([1, 0]))    # out.loss, out.logits
```

**分词器输出**：`input_ids`（带有 `[CLS]`/`[SEP]` 等特殊 token 的子词 id）、`attention_mask`（1 = 真实 token，0 = 填充，注意力会忽略填充位置），句对任务还有 `token_type_ids`。填充是动态的（填到批内最长序列）以节省计算；`truncation=True` 会截断到 `max_length`。务必使用与检查点匹配的分词器；仅解码器模型通常需要设置 `pad_token = eos_token`，生成时往往还需要左填充。

**用 `Trainer` 微调**：准备好数据（`datasets.Dataset.map(tokenize, batched=True)`）、`DataCollatorWithPadding` 和 `TrainingArguments`。

```python
from transformers import Trainer, TrainingArguments, DataCollatorWithPadding
args = TrainingArguments("out", learning_rate=2e-5, per_device_train_batch_size=16,
                         num_train_epochs=3, weight_decay=0.01, eval_strategy="epoch",
                         warmup_ratio=0.1, fp16=True)
trainer = Trainer(model=model, args=args, train_dataset=train_ds, eval_dataset=val_ds,
                  data_collator=DataCollatorWithPadding(tok), compute_metrics=compute_metrics)
trainer.train()
```

**生成**（`model.generate`）：`max_new_tokens`，默认贪心；`do_sample=True` 配合 `temperature`、`top_k`、`top_p`，或用 `num_beams` 做束搜索。**效率**：`torch_dtype=torch.bfloat16`、`device_map="auto"`、通过 bitsandbytes 做 8/4 bit 加载，以及用 `peft` 库做 LoRA。**Hub**：`push_to_hub`、模型卡，以及固定 `revision` 以保证可复现。

**常见 bug**：推理时忘记 `model.eval()`；分词器与模型不匹配；标签与 `num_labels` 不一致；池化时把填充算进去（均值池化必须使用 mask）；评估时使用了过期的 `max_length` 截断。

## 示例讲解
玩具词表：`[PAD]=0, [UNK]=1, [CLS]=2, [SEP]=3, hello=4, world=5, i=6, love=7, nlp=8`。小写化后对 `["I love NLP", "hello"]` 分词：

- "I love NLP" 得到 `[CLS] i love nlp [SEP]` = `[2, 6, 7, 8, 3]`
- "hello" 得到 `[2, 4, 3]`

填充到最长长度（5）并构建 mask：

| | input_ids | attention_mask |
|---|---|---|
| 1 | 2 6 7 8 3 | 1 1 1 1 1 |
| 2 | 2 4 3 0 0 | 1 1 1 0 0 |

若 `max_length = 4`，第一条序列被截断，但必须保留 `[SEP]`：`[2, 6, 7, 3]`。像 "pizza" 这样的未知词映射为 `[UNK]` = 1。对序列 2 做均值池化时，必须除以 3（mask 之和），而不是 5。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "attention_mask 告诉模型什么？",
  "options": ["语言建模中哪些 token 被遮盖", "哪些位置是真实 token（1），哪些是填充（0）", "某个 token 属于哪个句子", "哪些 token 要丢弃"],
  "explanation": "它防止注意力使用填充位置。掩码语言模型的遮盖是另一套机制。句子归属由 token_type_ids 表示。"
}
```

```quiz
{
  "id": "q2",
  "question": "为什么用数据整理器做动态填充，而不是全部填充到 max_length？",
  "options": ["它会改变模型输出", "浪费的计算更少，因为每个 batch 只填充到其中最长的序列", "attention mask 要工作必须这样做", "它会增加序列长度"],
  "explanation": "开销随序列长度增长，因此按 batch 填充可以避免处理大量填充 token，尤其在文本长度不一时。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "真正的库无法在浏览器中运行，所以用纯 Python 实现从分词器到批处理的思想。`encode(text, vocab, max_length=None)`：转小写，按空白切分，未知词映射为 vocab['[UNK]']，并包上 [CLS] ... [SEP]；若设置了 max_length 且结果更长，则截断单词使总长为 max_length，并保留 [SEP]。`pad_batch(seqs, pad_id=0)` 返回填充到最长序列的 `(input_ids, attention_mask)`。`batch_encode(texts, vocab, max_length=None)` 把它们串起来。",
  "hints": ["在加上 [CLS] 和 [SEP] 之前，先把单词 id 截断到 max_length - 2。", "mask 对每个原始 token 为 1，对每个填充为 0。"]
}
```

> [!TIP] 面试技巧
> - 描述流程：分词器、带有正确任务头的模型、后处理；了解 Auto 类。
> - 解释 `input_ids` 与 `attention_mask`、动态填充，以及为什么池化必须遵守 mask。
> - 微调时给出合理的默认值（学习率约 2e-5、warm-up、2-4 个 epoch），大模型则提到 PEFT/LoRA。
