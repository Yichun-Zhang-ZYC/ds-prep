---
id: genai-eng-rag-metrics
title: "RAG metrics (faithfulness, relevance, context recall)"
estimatedMinutes: 11
difficulty: medium
tags: [genai, rag, evaluation, ragas, faithfulness]
---

## Why it matters
A bad RAG answer can come from retrieval (the right chunk was never fetched) or generation (the model ignored or invented context). Separating the two is how you debug it. Interviewers expect you to define the standard metrics and use them to locate the fault.

## Concept
Evaluate the two stages separately, plus the end result.

**Retrieval metrics**:
- **Context recall**: what fraction of the information in the ground-truth answer is supported by the retrieved context? (Classic IR version: recall@k over labeled relevant chunks.) Low recall means retrieval, chunking or the query needs work.
- **Context precision**: are the relevant chunks ranked near the top, and how much of the context is noise? One common definition: mean of precision@$i$ at each rank $i$ holding a relevant chunk, $\frac{1}{R}\sum_{i:\,rel_i=1} \text{precision@}i$. Also see MRR and nDCG for ranking quality.

**Generation metrics**:
- **Faithfulness (groundedness)**: fraction of claims in the answer that are supported by the retrieved context: $\frac{\#\text{supported claims}}{\#\text{claims}}$. Implemented by decomposing the answer into atomic claims, then checking each against the context with an NLI model or LLM judge. Measures hallucination relative to context, not truth.
- **Answer relevance**: does the answer address the question (not too much off-topic or incomplete)? RAGAS estimates it by generating questions from the answer and comparing to the original.
- **Answer correctness**: compare to the ground-truth answer (needs labels).

**Diagnosis**:
- Low context recall: fix retrieval (chunking, embeddings, hybrid search, rewriting, higher $k$).
- High recall, low faithfulness: generation problem (prompt, model, "answer only from context", citations).
- High faithfulness, low correctness: the context itself was wrong or incomplete.
- Low precision with good recall: add reranking, lower $k$.

**Caveats**: LLM-judged metrics are noisy and need validation against human labels; evaluate "no answer" behavior separately (should abstain when context lacks the answer); track latency and cost too.

## Worked example
A question with a ground truth that has 4 facts. The retriever returns 5 chunks. Relevance flags by rank: $[1,0,1,0,0]$; the retrieved chunks cover 3 of the 4 facts.

- Context recall $= 3/4 = 0.75$.
- Context precision: precision@1 $= 1/1$; precision@3 $= 2/3$; average over the 2 relevant ranks $= (1 + 0.667)/2 = 0.833$.
- The generated answer makes 5 claims; 4 are supported by the context, so faithfulness $= 4/5 = 0.8$. The unsupported claim is a hallucination to inspect.

Diagnosis: recall 0.75 means a fact is missing from the context (retrieval), while the faithfulness gap is a separate generation problem.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Context recall is low but faithfulness is high. Where should you look first?",
  "options": [
    "The generation prompt",
    "Retrieval, chunking or query formulation",
    "The temperature",
    "The judge model"
  ],
  "answer": 1,
  "explanation": "The model is faithful to what it sees; it simply is not seeing the needed facts, so improve retrieval."
}
```

```quiz
{
  "id": "q2",
  "question": "What does faithfulness measure?",
  "options": [
    "Whether the answer is true in the real world",
    "Whether the answer's claims are supported by the retrieved context",
    "Whether the retrieved chunks are ranked well",
    "Whether the answer is short"
  ],
  "answer": 1,
  "explanation": "Faithfulness is groundedness in the provided context. An answer can be faithful to wrong context, or true but ungrounded."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement three metrics. `context_recall(truth_facts, contexts)`: fraction of `truth_facts` (strings) that appear as a case-insensitive substring in at least one context string (0.0 if there are no facts). `faithfulness(claims, contexts)`: the same support check for answer claims (0.0 if no claims). `context_precision(relevance)`: `relevance` is a list of 0/1 flags by rank; return the mean of precision@i over ranks where the flag is 1, or 0.0 if there are none.",
  "starterCode": "def context_recall(truth_facts, contexts):\n    pass\n\ndef faithfulness(claims, contexts):\n    pass\n\ndef context_precision(relevance):\n    pass\n\nprint(context_precision([1, 0, 1, 0, 0]))",
  "tests": "ctx = ['The Eiffel Tower is in Paris.', 'It was completed in 1889.']\nassert abs(context_recall(['eiffel tower is in paris', 'completed in 1889', 'is 330 m tall'], ctx) - 2 / 3) < 1e-12\nassert context_recall([], ctx) == 0.0\nassert context_recall(['x'], []) == 0.0\nassert abs(faithfulness(['completed in 1889', 'designed by Gustave Eiffel', 'in Paris', 'is red', 'is tall'], ctx) - 0.4) < 1e-12\nassert faithfulness([], ctx) == 0.0\nassert abs(context_precision([1, 0, 1, 0, 0]) - (1 + 2 / 3) / 2) < 1e-12\nassert context_precision([0, 0, 0]) == 0.0\nassert context_precision([1, 1, 1]) == 1.0\nassert abs(context_precision([0, 0, 1]) - 1 / 3) < 1e-12",
  "solution": "def _supported(items, contexts):\n    low = [c.lower() for c in contexts]\n    if not items:\n        return 0.0\n    return sum(1 for it in items if any(it.lower() in c for c in low)) / len(items)\n\ndef context_recall(truth_facts, contexts):\n    return _supported(truth_facts, contexts)\n\ndef faithfulness(claims, contexts):\n    return _supported(claims, contexts)\n\ndef context_precision(relevance):\n    count = 0\n    total = 0.0\n    for i, r in enumerate(relevance, 1):\n        if r:\n            count += 1\n            total += count / i\n    return total / count if count else 0.0",
  "hints": [
    "Lowercase each context once and test `fact.lower() in ctx`.",
    "Keep a running count of relevant items; at each relevant rank i (1-based) add `count / i`."
  ]
}
```

> [!TIP] Interview tips
> - Separate retrieval metrics (recall, precision) from generation metrics (faithfulness, answer relevance) to localize the fault.
> - Define faithfulness as supported claims over total claims, and say it measures groundedness, not truth.
> - Mention validating LLM-judged metrics and evaluating abstention.
