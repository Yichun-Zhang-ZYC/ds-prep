---
id: genai-eng-zero-shot-few-shot
title: Zero-shot, few-shot
estimatedMinutes: 9
difficulty: easy
tags: [genai, prompting, few-shot]
---

## Why it matters
Prompting is the cheapest lever for steering an LLM, and "when do you use few-shot vs fine-tuning?" is a standard GenAI interview question. Knowing how examples change behaviour (format, label space, tone) separates people who have shipped LLM features from people who have only chatted with one.

## Concept
**Zero-shot**: only an instruction, no examples. Works when the task is common and the output format is easy to describe. **Few-shot** (in-context learning): add $k$ input/output demonstrations to the prompt. The weights never change; the model infers the pattern from the context.

What examples buy you:
- **Format control**: the exact schema, casing and label strings you want back.
- **Label space and edge-case policy**: how to treat sarcasm, "neutral", or out-of-scope inputs.
- **Style and tone**: easier to show than to describe.

What to watch for:
- **Sensitivity**: order, label balance and wording of examples can swing accuracy. The model tends to copy the majority label and the last example (recency bias). Shuffle, balance classes, and test orderings.
- **Quality over quantity**: 3 to 8 clean, diverse examples usually capture most of the gain; each extra one costs tokens on every call.
- **Dynamic selection**: retrieve the $k$ most similar examples to the query (embedding or keyword similarity) from a pool instead of a fixed set; this is often a large boost for domain-specific tasks.
- **Leakage**: never put test items in the demonstrations when you evaluate.
- Modern instruction-tuned models are strong zero-shot; start there, add examples only for failures you can name. Few-shot examples also fit in a system prompt and are good targets for prompt caching because they are a stable prefix.

**Few-shot vs fine-tuning**: prompting is fast to iterate and needs no training data pipeline; fine-tuning wins when you have thousands of labelled examples, need lower per-call cost or latency (shorter prompts), or need a style prompting cannot hold.

## Worked example
Task: route support tickets to `billing`, `bug` or `other`.

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

Zero-shot, a model may answer "This looks like a billing issue." The three demonstrations fix the format (one lowercase word) and define `other` as the catch-all. If 90% of your examples were `bug`, expect the model to over-predict `bug`. Cost: if the examples add 60 tokens and you make 1M calls a month at \$3 per 1M input tokens, that is 60M tokens = \$180 per month for the examples alone, which is why you cache the prefix or trim examples.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A few-shot classifier over-predicts one label. What is the most likely prompt-level cause and fix?",
  "options": [
    "The model weights drifted; retrain",
    "Demonstrations are imbalanced or the last example biases the output; balance classes and shuffle order",
    "Temperature is too low; raise it to 1.5",
    "Few-shot prompts cannot be used for classification"
  ],
  "answer": 1,
  "explanation": "Majority-label and recency bias are well-known few-shot effects. Balance label counts, vary the order and measure on a held-out set."
}
```

```quiz
{
  "id": "q2",
  "question": "When is fine-tuning usually preferred over few-shot prompting?",
  "options": [
    "You have 5 labelled examples",
    "You have thousands of labelled examples and need lower per-call cost or latency",
    "You want to iterate on wording quickly",
    "The task changes every day"
  ],
  "answer": 1,
  "explanation": "Fine-tuning pays off with plentiful data and high volume (shorter prompts, cheaper calls). Few-shot is better for fast iteration and tiny datasets."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `build_prompt(instruction, examples, query)` that joins the instruction, each `(text, label)` example formatted as `Input: <text>\\nLabel: <label>`, and finally `Input: <query>\\nLabel:` with blank lines (`\\n\\n`) between parts. Then write `select_examples(query, pool, k)` that returns the `k` pool items whose text has the highest Jaccard word overlap (lowercase, whitespace split) with the query; break ties by original pool order.",
  "starterCode": "def build_prompt(instruction, examples, query):\n    pass\n\ndef select_examples(query, pool, k):\n    pass\n",
  "tests": "p = build_prompt(\"Classify sentiment.\", [(\"great film\", \"pos\"), (\"bad plot\", \"neg\")], \"fun ride\")\nassert p == \"Classify sentiment.\\n\\nInput: great film\\nLabel: pos\\n\\nInput: bad plot\\nLabel: neg\\n\\nInput: fun ride\\nLabel:\"\nassert build_prompt(\"Classify.\", [], \"x\") == \"Classify.\\n\\nInput: x\\nLabel:\"\npool = [(\"great film\", \"pos\"), (\"awful movie\", \"neg\"), (\"terrible plot\", \"neg\")]\nassert select_examples(\"great movie\", pool, 1) == [(\"great film\", \"pos\")]\nassert select_examples(\"great movie\", pool, 2) == [(\"great film\", \"pos\"), (\"awful movie\", \"neg\")]\nassert select_examples(\"terrible plot\", pool, 1) == [(\"terrible plot\", \"neg\")]\nassert select_examples(\"x\", [], 3) == []",
  "solution": "def build_prompt(instruction, examples, query):\n    parts = [instruction]\n    for text, label in examples:\n        parts.append(\"Input: \" + text + \"\\nLabel: \" + label)\n    parts.append(\"Input: \" + query + \"\\nLabel:\")\n    return \"\\n\\n\".join(parts)\n\ndef select_examples(query, pool, k):\n    q = set(query.lower().split())\n    scored = []\n    for i, (text, label) in enumerate(pool):\n        t = set(text.lower().split())\n        union = q | t\n        score = len(q & t) / len(union) if union else 0.0\n        scored.append((-score, i))\n    scored.sort()\n    return [pool[i] for _, i in scored[:k]]",
  "hints": [
    "Jaccard = |A ∩ B| / |A ∪ B| over word sets.",
    "Sort by (-score, index) so ties keep pool order."
  ]
}
```

> [!TIP] Interview tips
> - Default answer: start zero-shot with a clear instruction and format spec, add few-shot only for failure modes you can name, fine-tune when volume and data justify it.
> - Mention order/label-balance sensitivity and dynamic (retrieved) example selection; both signal real experience.
> - Examples cost tokens on every call: quantify it and mention prefix caching.
