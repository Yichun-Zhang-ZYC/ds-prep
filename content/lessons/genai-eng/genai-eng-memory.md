---
id: genai-eng-memory
title: "Memory"
estimatedMinutes: 10
difficulty: medium
tags: [genai, agents, memory, context]
---

## Why it matters
LLMs are stateless: every call starts from scratch. Anything an assistant "remembers" is something your code puts back into the prompt. Interviewers ask how you keep long conversations within the context window, how agents remember users across sessions, and what can go wrong.

## Concept
**Short-term memory** is the conversation so far, kept in the context window. **Long-term memory** lives outside the model (vector store, key-value store, SQL) and is retrieved on demand. A common split for long-term memory:
- **Semantic**: facts and preferences ("prefers metric units", "works at Acme").
- **Episodic**: records of past interactions or task runs, useful as few-shot examples.
- **Procedural**: learned instructions or rules, often stored as an updated system prompt.

**Managing short-term history**:
- **Full buffer**: send everything. Simple, but cost and latency grow every turn and eventually overflow.
- **Sliding window**: keep the system prompt plus the last $k$ turns (or last $N$ tokens). Cheap, but forgets early facts.
- **Rolling summary**: when history passes a threshold, have an LLM compress old turns into a short summary and keep recent turns verbatim. Lossy; summaries can drop or distort details.
- **Retrieval memory**: embed each memory and fetch the top-$k$ by relevance (optionally blended with recency and importance, as in the Generative Agents paper).

**Write path**: extract candidate memories after a turn (LLM or rules), dedupe or update instead of appending (resolve contradictions such as a changed address), attach metadata (timestamp, source, user id), and set a TTL. **Read path**: query by the current message, filter by user, inject into the prompt under a clear heading.

**Pitfalls**: stale or conflicting memories, irrelevant recall that distracts the model, PII stored without consent or a deletion path, and **memory poisoning** (a prompt injection that gets written into long-term memory persists across sessions). Facts the model must get exactly right belong in a database, not a summary.

## Worked example
Context window 8,000 tokens; system prompt 500; reserve 1,000 for the reply; each turn averages 300 tokens. History budget $= 8000 - 500 - 1000 = 6500$, so a sliding window holds $\lfloor 6500/300 \rfloor = 21$ turns.

At turn 20 the history is $20 \times 300 = 6000$ tokens. Compress it into a 300-token summary and keep the last 4 turns (1,200 tokens): the prompt history becomes $300 + 1200 = 1500$ tokens, a $(6000 - 1500)/6000 = 75\%$ reduction. Those savings are paid for with one summarization call and some lost detail.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "An assistant must remember a user's dietary restriction mentioned in turn 2 of a 200-turn chat, across sessions. Which design fits best?",
  "options": [
    "A sliding window of the last 10 turns",
    "Extract the fact into a long-term store and retrieve it per request",
    "Increase the temperature",
    "Fine-tune the model on every conversation"
  ],
  "answer": 1,
  "explanation": "Sliding windows forget early facts and do not persist across sessions. Extracting durable facts into an external store and retrieving them is the standard pattern."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the main risk of a rolling summary as the only memory?",
  "options": [
    "It is slower than a full buffer",
    "Details can be dropped or distorted, and errors compound with each re-summarization",
    "It cannot be used with system prompts",
    "It increases the context length"
  ],
  "answer": 1,
  "explanation": "Summaries are lossy. Keep recent turns verbatim and store exact facts (ids, numbers) in structured storage."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `trim_history(messages, budget)`. Each message is a dict with `role` and `content`; its token count is `len(content.split())`. Keep the first message if its role is `system` (always, even if it alone exceeds the budget). Then add the remaining messages from newest to oldest while the running total stays within `budget`, stopping at the first message that does not fit (so the kept history is contiguous). Return the kept messages in chronological order.",
  "starterCode": "def trim_history(messages, budget):\n    pass\n\nmsgs = [\n    {'role': 'system', 'content': 'be nice'},\n    {'role': 'user', 'content': 'a b c'},\n    {'role': 'assistant', 'content': 'd e'},\n    {'role': 'user', 'content': 'f g h i'},\n]\nprint(trim_history(msgs, 9))",
  "tests": "msgs = [\n    {'role': 'system', 'content': 'be nice'},\n    {'role': 'user', 'content': 'a b c'},\n    {'role': 'assistant', 'content': 'd e'},\n    {'role': 'user', 'content': 'f g h i'},\n]\nr = trim_history(msgs, 9)\nassert [m['content'] for m in r] == ['be nice', 'd e', 'f g h i']\nassert trim_history(msgs, 100) == msgs\nassert trim_history(msgs, 1) == [msgs[0]]\nassert [m['content'] for m in trim_history(msgs, 6)] == ['be nice', 'f g h i']\nnos = msgs[1:]\nassert [m['content'] for m in trim_history(nos, 6)] == ['d e', 'f g h i']\nbig = [{'role': 'user', 'content': 'x y z w'}, {'role': 'user', 'content': 'q'}, {'role': 'user', 'content': 'r s t u v'}]\nassert [m['content'] for m in trim_history(big, 5)] == ['r s t u v']\nassert trim_history([], 5) == []",
  "solution": "def trim_history(messages, budget):\n    def tok(m):\n        return len(m['content'].split())\n    kept_head = []\n    rest = messages\n    total = 0\n    if messages and messages[0]['role'] == 'system':\n        kept_head = [messages[0]]\n        rest = messages[1:]\n        total = tok(messages[0])\n    kept = []\n    for m in reversed(rest):\n        if total + tok(m) > budget:\n            break\n        total += tok(m)\n        kept.append(m)\n    return kept_head + kept[::-1]",
  "hints": [
    "Total starts as the system message's tokens (0 if there is none).",
    "Walk the non-system messages in reverse, `break` on the first that would exceed the budget, then reverse the kept list."
  ]
}
```

> [!TIP] Interview tips
> - Say 'stateless model, stateful application' early; memory is a context-assembly problem.
> - Compare window vs summary vs retrieval by cost, recall of old facts, and failure mode.
> - Mention write-path hygiene (dedupe, TTL, deletion/consent) and memory poisoning; it separates demos from production.
