---
id: genai-eng-query-rewriting
title: Query rewriting
estimatedMinutes: 9
difficulty: medium
tags: [genai, rag, query-rewriting, hyde, multi-query]
---

## Why it matters
Users write vague, conversational, multi-part queries ("what about the pro plan?"), and retrieval only sees that string. Rewriting the query before retrieval is a cheap way to raise recall, and it is a standard follow-up when an interviewer asks "your RAG misses relevant docs, now what?"

## Concept
Common techniques, each fixing a different failure:
- **Conversational condensation**: rewrite a follow-up plus chat history into a standalone question ("What about the pro plan?" becomes "What is the price of the Pro plan?"). Essential for chatbots; without it, pronouns and ellipsis retrieve nothing.
- **Multi-query / query expansion**: have the LLM produce 3-5 paraphrases or sub-aspects, retrieve for each, and merge (dedupe, RRF or round-robin). Raises recall for ambiguous or vocabulary-mismatched queries.
- **HyDE (Hypothetical Document Embeddings)**: ask the LLM to write a hypothetical answer and embed that instead of the question. Answers look more like documents than questions do, so the embedding lands nearer the relevant chunks. Risk: hallucinated details steer retrieval; weak when the model lacks domain knowledge.
- **Step-back prompting**: abstract to a broader question ("Why was the 2021 outage so long?" to "What are common causes of long outages in our system?") to retrieve background principles.
- **Decomposition**: split a multi-hop question into sub-questions answered sequentially or in parallel ("Who is older, the CEO of A or the founder of B?").
- **Routing / metadata extraction**: turn the query into structured filters (`year=2023`, `product=pro`) plus a semantic part (self-query retriever).

**Costs and controls**: each rewrite adds an LLM call (latency 300 ms-1 s) and a failure mode (drift away from user intent). Use a small fast model, a low temperature, keep the original query in the retrieval set, cap the number of rewrites, cache results, and evaluate by recall@k against the no-rewrite baseline.

## Worked example
History: user asked about the Basic plan price (\$10/month); then "and the Pro one? does it include SSO?".

1. Condense: "What is the price of the Pro plan and does it include SSO?"
2. Decompose: (a) "Pro plan price", (b) "Pro plan SSO support".
3. Retrieve top 3 per sub-question: lists `[p1, p2, p3]` and `[s1, p2, s3]`.
4. Round-robin merge with dedupe: `p1, s1, p2, p3, s3` (the duplicate p2 is kept once at its first position). The prompt now covers both aspects, which a single embedding of the joined question would often split poorly.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which technique targets the gap between the style of a short question and the style of document passages?",
  "options": [
    "Decomposition",
    "HyDE",
    "Conversational condensation",
    "Reranking"
  ],
  "answer": 1,
  "explanation": "HyDE embeds a generated hypothetical answer, which looks like a document passage, rather than the question itself."
}
```

```quiz
{
  "id": "q2",
  "question": "A support chatbot retrieves nothing useful for follow-ups like \"and what about the annual one?\". The best first fix is:",
  "options": [
    "A bigger embedding model",
    "Rewriting the follow-up into a standalone query using chat history",
    "Increasing top-k from 5 to 50",
    "Lowering the generation temperature"
  ],
  "answer": 1,
  "explanation": "The retriever cannot resolve the ellipsis. Condensing history plus the follow-up into a standalone question gives it the missing context."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `build_rewrite_prompt(history, question)`: history is a list of `(role, text)` tuples. Return lines joined with newlines: the instruction `Rewrite the follow-up question as a standalone question.`, then one `role: text` line per history item, then `Follow-up: <question>`, then `Standalone question:`. Also implement `round_robin_merge(lists, k)`: take the 1st item of every list, then the 2nd of every list, and so on, skipping ids already seen, and stop once k ids are collected.",
  "starterCode": "def build_rewrite_prompt(history, question):\n    pass\n\ndef round_robin_merge(lists, k):\n    pass\n\nprint(build_rewrite_prompt([('User', 'Basic plan price?'), ('Assistant', '10 per month')], 'and Pro?'))\nprint(round_robin_merge([['a', 'b'], ['b', 'c']], 3))\n",
  "tests": "p = build_rewrite_prompt([('User', 'Basic plan price?'), ('Assistant', '10 per month')], 'and Pro?')\nassert p == 'Rewrite the follow-up question as a standalone question.\\nUser: Basic plan price?\\nAssistant: 10 per month\\nFollow-up: and Pro?\\nStandalone question:'\nassert build_rewrite_prompt([], 'hi') == 'Rewrite the follow-up question as a standalone question.\\nFollow-up: hi\\nStandalone question:'\nassert round_robin_merge([['a', 'b', 'c'], ['b', 'd'], ['e']], 10) == ['a', 'b', 'e', 'd', 'c']\nassert round_robin_merge([['a', 'b', 'c'], ['b', 'd'], ['e']], 3) == ['a', 'b', 'e']\nassert round_robin_merge([], 5) == []\nassert round_robin_merge([['p1', 'p2', 'p3'], ['s1', 'p2', 's3']], 5) == ['p1', 's1', 'p2', 'p3', 's3']",
  "solution": "def build_rewrite_prompt(history, question):\n    lines = ['Rewrite the follow-up question as a standalone question.']\n    for role, text in history:\n        lines.append(role + ': ' + text)\n    lines.append('Follow-up: ' + question)\n    lines.append('Standalone question:')\n    return '\\n'.join(lines)\n\ndef round_robin_merge(lists, k):\n    out, seen = [], set()\n    depth = max((len(l) for l in lists), default=0)\n    for i in range(depth):\n        for l in lists:\n            if i < len(l) and l[i] not in seen:\n                seen.add(l[i])\n                out.append(l[i])\n                if len(out) == k:\n                    return out\n    return out\n",
  "hints": [
    "Build a list of lines and join with '\\n'; the history may be empty.",
    "Loop over positions 0..max length, then over lists; check the length and the seen-set before appending."
  ]
}
```

> [!TIP] Interview tips
> - Name the failure each technique targets: condensation (chat context), multi-query (vocabulary mismatch), HyDE (question vs document gap), decomposition (multi-hop).
> - Mention the trade-off honestly: extra latency, cost and intent drift. Always keep the original query and measure with recall@k and end-to-end answer quality.
> - If asked what to try first for a conversational bot, answer condensation with chat history.
