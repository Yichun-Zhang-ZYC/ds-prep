---
id: nlp-llms-hallucination
title: Hallucination
estimatedMinutes: 10
difficulty: medium
tags: [nlp, llm, hallucination, faithfulness, rag, evaluation]
---

## Why it matters
Hallucination is the top blocker for putting LLMs in production. Interviewers ask why it happens, how you would measure it, and which mitigations actually work, and they look for honesty that it cannot be fully eliminated.

## Concept
**Hallucination**: fluent output that is false or unsupported. Two kinds:
- **Factuality** errors: contradicts the world (wrong date, invented citation).
- **Faithfulness** errors: contradicts or goes beyond the *provided* source (summary adds a claim; RAG answer ignores the context). Also called intrinsic (contradicts source) vs extrinsic (unverifiable additions).

**Why it happens**:
- The objective rewards **plausible continuations**, not truth; the model has no built-in "I don't know".
- Gaps and errors in training data, especially **long-tail facts** (rare names, recent events).
- SFT on facts the model lacks teaches it to answer confidently anyway; preference tuning can reward confident-sounding answers.
- Sampling randomness and **snowballing**: one wrong token conditions the rest.

**Mitigations** (layered, none perfect):
- **Retrieval-augmented generation** with citations, plus prompts such as "answer only from the context, otherwise say you don't know".
- **Tools** (calculators, search, code execution) instead of recall.
- **Lower temperature**, constrained / structured output.
- **Verification**: self-consistency (sample several answers, check agreement), SelfCheckGPT, NLI or QA-based fact checkers, a second "judge" model.
- **Training**: teach abstention, calibrate confidence, reward factuality, data cleaning.

**Measuring**: human evaluation on a sampled set, faithfulness metrics (NLI entailment of each claim against the source), citation precision/recall, benchmarks such as TruthfulQA. LLM-as-judge is cheap but biased; validate it against human labels.

## Worked example
Ask a model "What is the capital of Australia?" five times at $T = 1$: `Canberra, Canberra, Sydney, Canberra, Canberra`. Agreement with the majority is $4/5 = 0.8$, so the answer is probably reliable. Ask about an obscure award winner: `A, B, C, A, D` gives agreement $2/5 = 0.4$, so flag it or abstain.

Caution: consistency is not correctness. A model can be consistently wrong when the error is in its training data, so combine with grounding.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A summarizer adds a claim that appears nowhere in the source article. Which kind of error is this?",
  "options": [
    "Factuality error only",
    "Faithfulness (extrinsic) hallucination",
    "Tokenization error",
    "Exposure bias"
  ],
  "answer": 1,
  "explanation": "Faithfulness is judged against the provided source. A claim absent from the source is an extrinsic hallucination, even if it happens to be true in the world."
}
```

```quiz
{
  "id": "q2",
  "question": "Which change is LEAST likely to reduce hallucination in a Q&A assistant?",
  "options": [
    "Retrieving documents and requiring citations",
    "Allowing the model to answer 'I don't know'",
    "Raising the sampling temperature to 1.5",
    "Verifying answers against a second source or tool"
  ],
  "answer": 2,
  "explanation": "Higher temperature flattens the distribution and makes low-probability (often wrong) tokens more likely. The other options add grounding, abstention or verification."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement two cheap hallucination checks. `consistency(answers, threshold=0.6)` normalizes sampled answers (strip, lowercase) and returns `(majority_answer, agreement, flagged)` where agreement is the majority's share and `flagged` means agreement is below the threshold. `ungrounded_sentences(answer, source, min_overlap=0.5)` returns sentences (split on `.`, stripped, non-empty) whose content-word overlap with the source is below `min_overlap`.",
  "starterCode": "import re\n\nSTOP = {\"the\", \"a\", \"an\", \"is\", \"was\", \"are\", \"of\", \"in\", \"on\", \"at\", \"to\", \"and\", \"it\", \"its\", \"by\", \"for\", \"with\", \"that\"}\n\ndef consistency(answers, threshold=0.6):\n    \"\"\"Normalize answers (strip, lowercase). Return (majority_answer, agreement, flagged).\n    Ties go to the answer that appeared first. flagged = agreement < threshold.\"\"\"\n    pass\n\ndef ungrounded_sentences(answer, source, min_overlap=0.5):\n    \"\"\"Split answer into sentences on '.', and return those where fewer than min_overlap of the\n    content words (lowercase alphanumeric words not in STOP) appear in the source.\"\"\"\n    pass\n\nprint(consistency([\"Canberra\", \"canberra \", \"Sydney\", \"Canberra\", \"Canberra\"]))",
  "tests": "m, a, f = consistency([\"Canberra\", \"canberra \", \"Sydney\", \"Canberra\", \"Canberra\"])\nassert m == \"canberra\" and abs(a - 0.8) < 1e-12 and f is False\nm, a, f = consistency([\"A\", \"B\", \"C\", \"A\", \"D\"])\nassert m == \"a\" and abs(a - 0.4) < 1e-12 and f is True\nassert consistency([\"x\", \"y\"])[0] == \"x\"\nsrc = \"The Eiffel Tower was completed in 1889 and is located in Paris.\"\nans = \"The Eiffel Tower was completed in 1889. It was designed by Gustave Eiffel in 1850.\"\nassert ungrounded_sentences(ans, src) == [\"It was designed by Gustave Eiffel in 1850\"]\nassert ungrounded_sentences(\"The tower is in Paris.\", src) == []",
  "solution": "import re\n\nSTOP = {\"the\", \"a\", \"an\", \"is\", \"was\", \"are\", \"of\", \"in\", \"on\", \"at\", \"to\", \"and\", \"it\", \"its\", \"by\", \"for\", \"with\", \"that\"}\n\ndef consistency(answers, threshold=0.6):\n    norm = [a.strip().lower() for a in answers]\n    counts = {}\n    for a in norm:\n        counts[a] = counts.get(a, 0) + 1\n    best = max(counts.values())\n    majority = next(a for a in norm if counts[a] == best)\n    agreement = best / len(norm)\n    return majority, agreement, agreement < threshold\n\ndef _words(text):\n    return [w for w in re.findall(r\"[a-z0-9]+\", text.lower()) if w not in STOP]\n\ndef ungrounded_sentences(answer, source, min_overlap=0.5):\n    src = set(_words(source))\n    out = []\n    for s in answer.split(\".\"):\n        s = s.strip()\n        words = _words(s)\n        if not words:\n            continue\n        if sum(w in src for w in words) / len(words) < min_overlap:\n            out.append(s)\n    return out",
  "hints": [
    "For ties, scan the normalized list in order and return the first answer whose count equals the max.",
    "Content words = lowercase alphanumeric tokens (`re.findall(r\"[a-z0-9]+\", ...)`) not in STOP."
  ]
}
```

```reveal
{
  "prompt": "Your RAG chatbot still hallucinates. How do you debug it?",
  "answer": "Split the pipeline and find which stage fails, using a labeled sample of failures.\n\n**1. Retrieval failure** (the right passage was not in the top-k): measure recall@k / MRR against gold passages. Fix with better chunking, hybrid BM25 + dense search, query rewriting, a reranker, larger k.\n\n**2. Generation failure** (the right passage was retrieved but the answer ignores or contradicts it): check faithfulness with claim-level NLI. Fix with a stricter prompt (\"answer only from the context; otherwise say you don't know\"), quoting/citation requirements, lower temperature, fewer but more relevant chunks (distractors hurt), or fine-tuning on grounded answers including abstentions.\n\n**3. Knowledge gap** (the corpus simply lacks the answer): the system should abstain; add an \"answerability\" check or a retrieval-score threshold.\n\n**4. Evaluate**: build a regression set, track faithfulness, answer correctness and abstention rate separately, and validate any LLM judge against human labels."
}
```

> [!TIP] Interview tips
> - Separate factuality (vs the world) from faithfulness (vs the given source); the fixes differ.
> - Lead with RAG + citations + abstention, then verification; admit hallucination is reduced, not eliminated.
> - For evaluation, mention claim-level checks and validating any LLM judge against human labels.
