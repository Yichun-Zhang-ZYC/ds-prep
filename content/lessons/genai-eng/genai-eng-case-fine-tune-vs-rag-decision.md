---
id: genai-eng-case-fine-tune-vs-rag-decision
title: "Case: Fine-tune vs RAG decision"
estimatedMinutes: 13
difficulty: medium
tags: [genai, case-study, fine-tuning, rag, decision]
---

## Why it matters
"Should we fine-tune a model on our data or build RAG?" is one of the most common GenAI interview questions, and the textbook answer ("RAG for knowledge, fine-tuning for behavior") is the starting point, not the end. Strong candidates diagnose the failure first, price the options, and know they can be combined (see Embedding models, Reranking, Prompt versioning).

## Concept
**What each one changes**
- **RAG** gives the model *knowledge at inference time*: fresh, private, large or frequently changing facts, with citations, per-user access control (filter at retrieval), and easy deletion or updates (edit the index). Costs: retrieval latency, longer prompts, and the quality is capped by retrieval.
- **Fine-tuning** (SFT, preference tuning, LoRA/adapters) changes *behavior*: output format and schema adherence, tone and style, domain jargon, a narrow skill, tool-call habits, refusal policy; and it can **distill** a big model into a small, cheap, fast one. It is a poor and unreliable way to inject specific facts (the model may still hallucinate them, they go stale, you cannot cite or delete them), and it requires data, training, evals, hosting, and re-training when the base model changes.
- **Prompting / few-shot / structured output** is the cheapest first step and often sufficient.

**Decision procedure**
1. Build an eval set and a baseline with a strong prompt (and RAG if knowledge is needed).
2. **Diagnose failures**: wrong because the facts were not available (knowledge gap, so retrieval/RAG), wrong although the right context was given (reasoning or instruction-following gap), wrong format or tone (behavior gap), or too slow/expensive (efficiency gap). RAG-specific split: retrieval miss vs generation error, see RAG metrics.
3. Pick the cheapest lever for the dominant bucket: retrieval fixes (chunking, hybrid search, reranking, query rewriting) for misses; prompting or fine-tuning for format and generation errors; distillation for cost.
4. **Combine** when both gaps exist: RAG supplies facts, a fine-tuned (often small) model handles format, tone and how to use context (teaching it to cite and to say "not found").
5. Consider **long context** (stuff the whole corpus) for small, static corpora, at higher cost per call, and caching to soften it.

**Rules of thumb**: knowledge that changes weekly or is access-controlled, or needing citations means RAG; strict output schema or consistent voice at very high volume means fine-tune; more than a few thousand quality examples and a stable task makes fine-tuning viable; no labeled data means start with prompting and RAG. Also weigh data privacy, vendor fine-tuning limits, and maintenance (re-tune after each base-model upgrade).

## Worked example
Scenario: an HR-policy assistant. Policies (5,000 documents) change weekly; answers must cite the clause; replies must follow a fixed JSON schema plus a formal tone. Today: a large model with a long prompt (1,200 tokens of instructions and few-shot examples).

1. **Baseline eval** on 300 questions, then error analysis of 200 failed answers: 120 retrieval misses (60%), 80 generation errors with the right context present (40%), of which 30 are schema/tone violations. So 60% of the pain is retrieval, not the model: fix chunking (clause-level), add hybrid search and a reranker first.
2. After retrieval work, generation errors dominate. Fine-tuning candidates are the schema and tone failures plus the cost of the long prompt. Facts stay in RAG (they change weekly, so baking them in would go stale).
3. **Economics (illustrative)**: the fine-tuned small model removes the 1,200-token instructions and few-shot block and runs on a cheaper model: cost per request falls from \$0.0060 to \$0.0015, saving \$0.0045. One-off cost (labeling 3,000 examples, training, evals) is \$12,000. Break-even $= 12{,}000 / 0.0045 \approx 2{,}666{,}667$ requests. At 100k requests/day that is about 27 days; at 5k/day it is 18 months, so the answer flips to "stay with prompting".
4. Decision: RAG for knowledge and citations now; fine-tune the small model for schema, tone and cost only if volume and the eval set justify the break-even, and re-evaluate after each base-model upgrade.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Company policies change weekly and answers must cite the source clause. Which approach is the best primary solution?",
  "options": [
    "Fine-tune the model every week on the new documents",
    "RAG over the policy index with citations",
    "Put every policy in the prompt for every request, no retrieval",
    "Train a model from scratch"
  ],
  "answer": 1,
  "explanation": "RAG keeps knowledge fresh, citable and updatable by editing the index. Fine-tuning facts goes stale and cannot cite."
}
```

```quiz
{
  "id": "q2",
  "question": "In error analysis, 60% of wrong answers had retrieved context that did not contain the answer. What should you invest in first?",
  "options": [
    "Fine-tune the generator",
    "Improve retrieval: chunking, hybrid search, reranking, query rewriting",
    "Switch to a bigger generation model",
    "Add more few-shot examples"
  ],
  "answer": 1,
  "explanation": "The generator never saw the facts, so changing it cannot fix the dominant failure; fix retrieval first."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `break_even_requests(fixed_cost, cost_before, cost_after)`: the number of requests (rounded up) after which per-request savings repay a one-off fine-tuning cost; None if there is no saving.",
  "starterCode": "import math\n\ndef break_even_requests(fixed_cost, cost_before, cost_after):\n    \"\"\"Requests needed for per-request savings to repay a one-off cost.\n    Return None when there is no saving.\"\"\"\n    pass\n",
  "tests": "assert break_even_requests(12000, 0.0060, 0.0015) == 2666667\nassert break_even_requests(1000, 0.01, 0.005) == 200000\nassert break_even_requests(1000, 0.01, 0.01) is None\nassert break_even_requests(1000, 0.01, 0.02) is None\nassert break_even_requests(0, 0.01, 0.005) == 0\n",
  "solution": "import math\n\ndef break_even_requests(fixed_cost, cost_before, cost_after):\n    saving = cost_before - cost_after\n    if saving <= 1e-12:\n        return None\n    return math.ceil(fixed_cost / saving - 1e-9)\n",
  "hints": [
    "Saving per request = before - after.",
    "Use `math.ceil`; guard against a zero or negative saving."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `diagnose`: classify evaluation records into ok, retrieval_miss and generation_error, and return the counts. This tells you whether to work on retrieval or on the generator.",
  "starterCode": "def diagnose(records):\n    \"\"\"records: list of dicts with bool keys \"retrieved_has_answer\" and \"correct\".\n    Classify each: \"ok\" if correct; \"retrieval_miss\" if wrong and the retrieved context lacked\n    the answer; \"generation_error\" if wrong although the context had the answer.\n    Return a dict with the three counts (all keys present).\"\"\"\n    pass\n",
  "tests": "recs = ([{\"retrieved_has_answer\": True, \"correct\": True}] * 70\n        + [{\"retrieved_has_answer\": False, \"correct\": False}] * 18\n        + [{\"retrieved_has_answer\": True, \"correct\": False}] * 12)\nassert diagnose(recs) == {\"ok\": 70, \"retrieval_miss\": 18, \"generation_error\": 12}\nassert diagnose([]) == {\"ok\": 0, \"retrieval_miss\": 0, \"generation_error\": 0}\nassert diagnose([{\"retrieved_has_answer\": False, \"correct\": True}]) == {\"ok\": 1, \"retrieval_miss\": 0, \"generation_error\": 0}\n",
  "solution": "def diagnose(records):\n    out = {\"ok\": 0, \"retrieval_miss\": 0, \"generation_error\": 0}\n    for r in records:\n        if r[\"correct\"]:\n            out[\"ok\"] += 1\n        elif not r[\"retrieved_has_answer\"]:\n            out[\"retrieval_miss\"] += 1\n        else:\n            out[\"generation_error\"] += 1\n    return out\n",
  "hints": [
    "A correct answer is ok regardless of retrieval.",
    "Wrong with missing context is retrieval; wrong with the answer present is generation."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `recommend` encoding the rule of thumb: RAG for fresh/private knowledge or citations; for a behavior gap fine-tune only at high volume, else prompting; default to prompting.",
  "starterCode": "def recommend(needs_fresh_knowledge, needs_citations, behavior_gap, high_volume):\n    \"\"\"Return a sorted list drawn from [\"fine_tune\", \"prompting\", \"rag\"].\n    - rag if knowledge changes often / is private OR citations are required.\n    - a behavior gap (format, tone, skill): fine_tune if volume is high, else prompting.\n    - if nothing else applies, return [\"prompting\"].\"\"\"\n    pass\n",
  "tests": "assert recommend(True, True, False, False) == [\"rag\"]\nassert recommend(False, False, True, True) == [\"fine_tune\"]\nassert recommend(False, False, True, False) == [\"prompting\"]\nassert recommend(True, False, True, True) == [\"fine_tune\", \"rag\"]\nassert recommend(False, True, False, True) == [\"rag\"]\nassert recommend(False, False, False, False) == [\"prompting\"]\n",
  "solution": "def recommend(needs_fresh_knowledge, needs_citations, behavior_gap, high_volume):\n    out = set()\n    if needs_fresh_knowledge or needs_citations:\n        out.add(\"rag\")\n    if behavior_gap:\n        out.add(\"fine_tune\" if high_volume else \"prompting\")\n    if not out:\n        out.add(\"prompting\")\n    return sorted(out)\n",
  "hints": [
    "Build a set and return it sorted.",
    "Both rag and fine_tune can apply at once."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'We have 50k internal support tickets and a knowledge base. Should we fine-tune an LLM, use RAG, or both?'",
  "answer": "**Clarify**: what does the assistant do (answer questions, draft replies, classify), how often does the knowledge change, is citation required, request volume, latency and cost targets, data sensitivity, and what quality bar and eval data exist.\n\n**Start with an eval and a baseline**: 200 to 300 real tickets with reference answers or rubrics; baseline = strong prompt + RAG over the knowledge base (hybrid search, reranking). Diagnose failures into retrieval miss, generation error, format/tone, and cost/latency.\n\n**Likely answer**: RAG for the knowledge base because articles change and answers must be traceable. The 50k historical tickets are valuable as (a) RAG content after cleaning and PII removal, (b) an eval set, and (c) training data to fine-tune a smaller model for reply style, structured fields and triage labels, only if the baseline shows a behavior or cost gap that prompting cannot close.\n\n**If fine-tuning**: curate and de-duplicate examples, remove PII, hold out a test split, start with LoRA/SFT on a small model, include examples that use retrieved context (and \"I do not know\" cases) so the model learns to ground its answers, compare against the prompted baseline on the eval set, and compute break-even from the one-off cost and per-request savings.\n\n**Operate**: re-run evals on every base-model change, version datasets and adapters, monitor drift, and keep the RAG index fresh independently of the model.\n\n**Tradeoffs to state**: fine-tuning cannot reliably add or update facts; RAG adds latency and retrieval failure modes; combining them costs more engineering but is common in production; long-context stuffing is an option for small static corpora."
}
```

> [!TIP] Interview tips
> - Diagnose first: retrieval miss vs generation error vs format vs cost; the bucket decides the lever.
> - Say RAG is for knowledge, fine-tuning is for behavior and efficiency, and that they combine; also mention prompting as the cheapest baseline.
> - Quantify the break-even with fixed cost divided by per-request saving, and note it depends on volume and base-model churn.
