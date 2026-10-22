---
id: nlp-llms-sentiment-analysis-ner-text-classification
title: Sentiment analysis, NER, text classification
estimatedMinutes: 12
difficulty: medium
tags: [nlp, sentiment, ner, text-classification, sequence-labeling]
---

## Why it matters
Sentiment analysis, named entity recognition (NER) and text classification are the bread-and-butter NLP tasks in industry. Interviews focus on how you frame the task (sequence labeling vs classification), choose a model for the data you have, and evaluate it correctly.

## Concept
**Text classification** maps a document to a label: spam, topic, intent, sentiment. **Sentiment analysis** is classification (positive/negative/neutral) or regression (star rating), sometimes aspect-based ("battery good, screen bad").

Model ladder, in the order you should try them:
1. **TF-IDF + logistic regression / linear SVM / Naive Bayes**: fast, strong baseline, interpretable weights.
2. **Fine-tune a pretrained encoder** (BERT-family): best accuracy with hundreds to thousands of labels.
3. **Zero/few-shot LLM prompting**: no labels needed, good for prototypes and long-tail labels; costlier and slower per call.

Hard cases: negation (`not good`), sarcasm, domain shift (movie reviews vs support tickets), and label noise. Bag of words handles negation poorly unless you add bigrams.

**NER** is **sequence labeling**: every token gets a tag. The **BIO** scheme marks `B-X` (begin entity of type X), `I-X` (inside) and `O` (outside), so adjacent entities stay separate. Models: CRF over hand features (classic), BiLSTM-CRF, or a BERT token classifier. Sub-word tokens inherit the label of their first piece.

**Evaluation**:
- Classification: accuracy only if classes are balanced; otherwise precision, recall, F1 (macro-average if every class matters, micro-average if frequent classes dominate), and a confusion matrix.
- NER: **entity-level** (span-level) precision/recall/F1 with exact match on type and boundaries, not token accuracy; `O` tokens dominate and inflate token accuracy.
- Always split before fitting vectorizers or tuning; for imbalanced data consider class weights and threshold tuning.

## Worked example
Sentence `Barack Obama visited Paris`. Gold tags: `B-PER I-PER O B-LOC`. Prediction: `B-PER O O B-LOC`.

Token accuracy is $3/4 = 75\%$, which looks fine. Entity level: gold spans $\{\text{PER}[0,2), \text{LOC}[3,4)\}$, predicted $\{\text{PER}[0,1), \text{LOC}[3,4)\}$. Only LOC matches exactly: $TP = 1$, precision $= 1/2$, recall $= 1/2$, $F_1 = 0.5$. The partial PER span counts as both a false positive and a false negative.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why is token-level accuracy a poor metric for NER?",
  "options": ["It cannot be computed", "Most tokens are O, so accuracy is high even when entities are missed or have wrong boundaries", "It ignores the O tag", "It needs a CRF"],
  "answer": 1,
  "explanation": "Entities are rare; a model that tags everything O can score 90%+ accuracy. Use exact-match entity-level precision, recall and F1."
}
```

```quiz
{
  "id": "q2",
  "question": "You have 300 labeled support tickets for a 5-way intent classifier and need a first version this week. Best first step?",
  "options": ["Pretrain a transformer from scratch", "TF-IDF + logistic regression baseline (and maybe a fine-tuned small encoder or few-shot LLM for comparison)", "Use a character-level RNN", "Collect 1M labels first"],
  "answer": 1,
  "explanation": "With little data, a linear baseline is fast and hard to beat cheaply; then compare against a pretrained encoder or an LLM prompt."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `bio_to_spans(tags)` that converts a BIO tag list into a set of `(type, start, end_exclusive)` spans. A `B-X` always starts a new span; `I-X` continues the current span only if it has the same type, otherwise it starts a new span. Then write `entity_f1(gold_tags, pred_tags)`: exact-match entity-level F1 (return 0.0 if there are no true positives).",
  "starterCode": "def bio_to_spans(tags):\n    # return a set of (type, start, end_exclusive)\n    pass\n\ndef entity_f1(gold_tags, pred_tags):\n    pass\n\ngold = ['B-PER', 'I-PER', 'O', 'B-LOC']\npred = ['B-PER', 'O', 'O', 'B-LOC']\nprint(bio_to_spans(gold), entity_f1(gold, pred))",
  "tests": "gold = ['B-PER', 'I-PER', 'O', 'B-LOC']\npred = ['B-PER', 'O', 'O', 'B-LOC']\nassert bio_to_spans(gold) == {('PER', 0, 2), ('LOC', 3, 4)}\nassert bio_to_spans(pred) == {('PER', 0, 1), ('LOC', 3, 4)}\nassert bio_to_spans(['B-PER', 'B-PER']) == {('PER', 0, 1), ('PER', 1, 2)}\nassert bio_to_spans(['O', 'I-ORG', 'I-ORG']) == {('ORG', 1, 3)}\nassert bio_to_spans(['B-PER', 'I-LOC']) == {('PER', 0, 1), ('LOC', 1, 2)}\nassert bio_to_spans([]) == set()\nassert abs(entity_f1(gold, pred) - 0.5) < 1e-12\nassert abs(entity_f1(gold, gold) - 1.0) < 1e-12\nassert entity_f1(gold, ['O'] * 4) == 0.0",
  "solution": "def bio_to_spans(tags):\n    spans = set()\n    start, typ = None, None\n    for i, t in enumerate(list(tags) + ['O']):\n        if t == 'O' or t.startswith('B-') or (t.startswith('I-') and t[2:] != typ):\n            if typ is not None:\n                spans.add((typ, start, i))\n                typ = None\n            if t != 'O':\n                start, typ = i, t[2:]\n    return spans\n\ndef entity_f1(gold_tags, pred_tags):\n    g, p = bio_to_spans(gold_tags), bio_to_spans(pred_tags)\n    tp = len(g & p)\n    if tp == 0:\n        return 0.0\n    prec, rec = tp / len(p), tp / len(g)\n    return 2 * prec * rec / (prec + rec)",
  "hints": ["Append a sentinel 'O' to flush the last open span.", "TP = len(gold_spans & pred_spans); precision = TP / len(pred_spans), recall = TP / len(gold_spans)."]
}
```

```reveal
{
  "prompt": "Interview: 'Design a sentiment classifier for product reviews with only 500 labeled examples, deployed behind a 100 ms latency budget.' Outline your answer.",
  "answer": "**Baseline first**: TF-IDF (unigrams + bigrams to catch `not good`) + logistic regression with cross-validation; check macro-F1 and a confusion matrix.\n\n**Improve with transfer learning**: fine-tune a small pretrained encoder (DistilBERT-size) with early stopping, or embed with a sentence encoder and fit logistic regression on top (cheap, low variance with 500 examples). An LLM can pre-label more data, with a human audit of a sample.\n\n**Latency**: a linear model takes well under 1 ms; a distilled encoder is feasible on CPU with quantization or ONNX; avoid calling a large LLM on the hot path.\n\n**Evaluation and risks**: stratified split, class imbalance (weights, threshold tuning), domain shift across product categories, sarcasm and negation, and error analysis on misclassifications. Plan to keep labeling with active learning (label the least confident predictions)."
}
```

> [!TIP] Interview tips
> - Start with a TF-IDF + logistic regression baseline before reaching for transformers; say what accuracy gain would justify the cost.
> - Pitfall: reporting token-level accuracy for NER, or accuracy on imbalanced classes. Use entity-level F1, PR curves and per-class metrics.
> - Mention data issues first: label quality, annotation guidelines, domain shift, and error analysis on misclassified examples.
