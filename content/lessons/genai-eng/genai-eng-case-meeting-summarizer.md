---
id: genai-eng-case-meeting-summarizer
title: "Case: Meeting and long-document summarizer"
estimatedMinutes: 13
difficulty: medium
tags: [genai, case-study, summarization, long-context, evaluation]
---

## Why it matters
Summarization looks like the easiest LLM task and is hard to ship: inputs exceed what you want in one prompt, speakers and ASR errors muddy the transcript, and a fluent summary can quietly invent a decision or an owner. Interviewers want to see strategy choice (long context vs map-reduce), structure, and a real evaluation plan.

## Concept
**Clarify**: who reads the output (attendees, absentees, executives), format (bullets, decisions, action items with owner and due date), length, languages, privacy (recordings, consent, retention), latency (live notes vs after the meeting).

**Pipeline for meetings**: audio → ASR with diarization (speaker labels, timestamps) → clean-up (remove filler words, fix names and jargon with a glossary or meeting-invite attendee list) → segment (by topic shift, time window or speaker turns, never mid-sentence) → summarize → extract structured items → verify → deliver.

**Strategies for length**:
- **Long-context single pass**: simplest and the most coherent when the transcript fits comfortably (say < 50-100k tokens). Watch for "lost in the middle": ask for evidence quotes with timestamps.
- **Map-reduce**: summarize each chunk (in parallel), then reduce the partial summaries; add more levels if the summaries exceed the window (hierarchical). Cheap to parallelize and scales to any length, but cross-chunk context is lost: pass a short running "context" or the agenda, and overlap chunks slightly.
- **Refine** (iterative): carry a running summary through chunks. Sequential and slower, but preserves narrative flow; errors compound.
- Query-focused summaries (RAG over the transcript) when users ask specific questions rather than want a general overview.

**Structure beats prose**: output a schema (`decisions[]`, `action_items[] {owner, task, due, source_timestamp}`, `open_questions[]`, `summary`) with null for unknown owners; do not let the model assign owners or dates that were not said.

**Evaluation**: ROUGE and similar overlap metrics correlate weakly with usefulness. Prefer (1) **faithfulness**: split the summary into claims and check each against the transcript (NLI or LLM judge, see the LLM-as-a-judge lesson); (2) **coverage**: share of human-annotated key points present; (3) **action-item F1** against annotated items; (4) human preference for a sample; (5) length and redundancy. Hallucinated decisions and owners are the severity-1 errors, so report them separately.

**Pitfalls**: ASR errors on names and numbers propagating into confident wrong claims, speaker attribution mistakes ("Alice said" when Bob did), recency bias toward the end of the meeting, chunk boundaries splitting a discussion, summaries that restate the agenda not what happened, no consent/retention policy.

## Worked example
Illustrative: a 90-minute meeting at about 150 words/min = 13,500 words, roughly 18,000 tokens. Prices \$3 / \$15 per million tokens.

- **Single pass**: 18k input + 1k output $= 0.054 + 0.015 = 0.069$ dollars and one call, with the best coherence.
- **Map-reduce** with 4,000-token chunks and 400 overlap: stride 3,600, so $\lceil (18000-4000)/3600 \rceil + 1 = 4 + 1 = 5$ chunks. Map: about 21k input (chunks plus 200-token instructions each) and 5 x 300 output = 1.5k; reduce: 1.7k input, 800 output. Cost $= 0.063 + 0.0225 + 0.0051 + 0.012 \approx 0.103$ dollars, 8 calls if the reduce fans in 4 at a time (5 maps + 2 + 1), but the maps run in parallel.
- So for 90 minutes use one pass; for a 10-hour workshop (about 200k tokens) use hierarchical map-reduce, passing the agenda to every map call.
- Quality gate: of 12 extracted action items, the human reference has 10; 9 match, 3 are unsupported (invented owner or date). Precision $= 9/12 = 0.75$, recall $= 9/10 = 0.9$. The 3 unsupported items trigger the stricter rule "owner and due date only if stated, with a timestamped quote".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A summary says 'Dana will deliver the report by Friday', but the transcript only has Dana saying 'maybe I can look at it'. What kind of error is this and what is the best fix?",
  "options": [
    "A ROUGE problem; optimize ROUGE",
    "A faithfulness error (invented commitment); require owners/dates only when explicitly stated, with a source quote, and verify claims against the transcript",
    "A latency problem",
    "A tokenization problem"
  ],
  "answer": 1,
  "explanation": "Unsupported claims are the severe failure; structure, quotes and claim-level verification target them directly."
}
```

```quiz
{
  "id": "q2",
  "question": "When is map-reduce preferable to a single long-context call?",
  "options": [
    "Always, since it is more accurate",
    "When input exceeds the practical window or you need parallelism and bounded per-call cost, accepting some loss of cross-chunk context",
    "Only for audio",
    "Never"
  ],
  "answer": 1,
  "explanation": "Single pass is simpler and more coherent when it fits; map-reduce is for scale."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Plan a hierarchical map-reduce. Implement `plan(total_tokens, chunk, overlap, fan_in)` returning `(n_chunks, total_calls, reduce_levels)`. `n_chunks` is 1 if `total_tokens <= chunk`, else `ceil((total - chunk) / (chunk - overlap)) + 1`. Each chunk is one map call. Then repeatedly merge partial summaries `fan_in` at a time (`ceil(n / fan_in)` reduce calls per level) until one remains; a single chunk needs no reduce. `fan_in` must be >= 2.",
  "starterCode": "import math\n\ndef plan(total_tokens, chunk, overlap, fan_in):\n    pass\n",
  "tests": "assert plan(3000, 4000, 400, 4) == (1, 1, 0)\nassert plan(18000, 4000, 400, 4) == (5, 8, 2)\nassert plan(18000, 4000, 400, 10) == (5, 6, 1)\nassert plan(1000000, 4000, 400, 10) == (278, 310, 3)\nassert plan(4000, 4000, 400, 2) == (1, 1, 0)\nassert plan(4001, 4000, 400, 2) == (2, 3, 1)",
  "solution": "import math\n\ndef plan(total_tokens, chunk, overlap, fan_in):\n    if total_tokens <= chunk:\n        n = 1\n    else:\n        n = math.ceil((total_tokens - chunk) / (chunk - overlap)) + 1\n    n_chunks = n\n    calls = n\n    levels = 0\n    while n > 1:\n        n = math.ceil(n / fan_in)\n        calls += n\n        levels += 1\n    return (n_chunks, calls, levels)",
  "hints": [
    "Save the number of chunks before you start collapsing `n` in the reduce loop.",
    "Each reduce level adds `ceil(n / fan_in)` calls and reduces `n` to that number."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Pack transcript turns into chunks without splitting a turn. `turns` is a list of `(speaker, text)`. Implement `pack_turns(turns, max_words)` returning lists of turn indices: greedily add consecutive turns while the chunk's total word count stays <= `max_words`; start a new chunk otherwise. A turn longer than `max_words` becomes its own chunk. Word count is `len(text.split())`.",
  "starterCode": "def pack_turns(turns, max_words):\n    pass\n",
  "tests": "def mk(counts):\n    return [('A' if i % 2 == 0 else 'B', ' '.join(['w'] * n)) for i, n in enumerate(counts)]\nassert pack_turns(mk([5, 4, 6, 3, 12, 2]), 10) == [[0, 1], [2, 3], [4], [5]]\nassert pack_turns(mk([3, 3, 3]), 100) == [[0, 1, 2]]\nassert pack_turns([], 10) == []\nassert pack_turns(mk([10, 10]), 10) == [[0], [1]]",
  "solution": "def pack_turns(turns, max_words):\n    chunks = []\n    cur = []\n    cur_words = 0\n    for i, (_, text) in enumerate(turns):\n        n = len(text.split())\n        if cur and cur_words + n > max_words:\n            chunks.append(cur)\n            cur, cur_words = [], 0\n        cur.append(i)\n        cur_words += n\n    if cur:\n        chunks.append(cur)\n    return chunks",
  "hints": [
    "Close the current chunk before adding a turn that would overflow it, but only if the chunk is non-empty.",
    "An oversized turn is added to an empty chunk and the next turn then closes it."
  ]
}
```

> [!TIP] Interview tips
> - Ask who reads it and in what format; propose structured output (decisions, action items with owner and timestamp) over free prose.
> - Compare long-context single pass, map-reduce and refine with cost, coherence and parallelism trade-offs.
> - Evaluate faithfulness at claim level, coverage of key points, and action-item F1; ROUGE alone is not enough.
