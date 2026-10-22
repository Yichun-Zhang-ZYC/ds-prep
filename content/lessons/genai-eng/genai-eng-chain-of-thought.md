---
id: genai-eng-chain-of-thought
title: Chain-of-thought
estimatedMinutes: 9
difficulty: medium
tags: [genai, prompting, reasoning]
---

## Why it matters
"Think step by step" is the most famous prompting trick, and interviewers want to know why it works, when it does not, and how it trades tokens and latency for accuracy. It is also the conceptual basis for reasoning models and agents.

## Concept
**Chain-of-thought (CoT)** prompting makes the model write intermediate reasoning before the final answer. An autoregressive model does a fixed amount of computation per token, so extra reasoning tokens give it more computation and a scratchpad for multi-step problems (arithmetic, logic, planning).

Variants:
- **Zero-shot CoT**: append "Let's think step by step" (or "Reason first, then give `Answer: ...`").
- **Few-shot CoT**: demonstrations that include worked reasoning, not just answers.
- **Self-consistency**: sample $n$ reasoning paths with temperature $> 0$, extract each final answer, take the **majority vote**. Cost grows linearly in $n$; accuracy gains are real on math and logic benchmarks.
- **Plan-then-solve / decomposition**, and tree/graph search over thoughts, for harder problems.
- **Reasoning models** (o-series, Claude with extended thinking, DeepSeek-R1) are trained with reinforcement learning to produce long internal reasoning. You usually do not need to ask them to think step by step; give the goal and a token or effort budget instead.

Practical points:
- **Separate reasoning from the answer** with a fixed marker (`Answer: ...`) or structured fields so you can parse it. Put the reasoning field before the answer field in a JSON schema; if the answer comes first, reasoning cannot help it.
- **Cost and latency**: reasoning tokens are billed as output tokens, which are the expensive ones, and delay the first useful token.
- **Not always helpful**: easy lookups and some pattern-matching tasks do not improve and can get worse; a model's written rationale is not guaranteed to be a faithful account of its computation.
- Do not show raw chain-of-thought to end users by default; it can be wrong, long, or leak instructions.

## Worked example
Question: pens cost \$2 each, or 3 for \$5. What is the cheapest price for 7 pens?

Direct answer (often wrong): "\$14". With CoT: "3 for \$5 is cheaper than 3 singles (\$6). 7 = 3 + 3 + 1, so 2 bundles = \$10 plus 1 pen = \$2. Answer: 12".

Self-consistency with 5 samples gives final answers 12, 12, 14, 12, 14. Majority vote returns 12 with confidence 3/5 = 0.6. The vote share is a rough confidence signal: low agreement can trigger escalation to a bigger model or a human. Cost: 5 samples of about 150 output tokens each is about 5x the output cost of a single sample.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can chain-of-thought improve accuracy on multi-step problems?",
  "options": [
    "It increases the model's parameter count",
    "Intermediate tokens give extra computation and a scratchpad before committing to an answer",
    "It lowers the temperature",
    "It makes the output shorter"
  ],
  "answer": 1,
  "explanation": "A transformer spends a fixed compute per token; reasoning tokens let it decompose the problem and condition the answer on intermediate results."
}
```

```quiz
{
  "id": "q2",
  "question": "In a JSON output schema used with CoT, where should the `reasoning` field go?",
  "options": [
    "After `answer`, so the answer is concise",
    "Before `answer`, so the answer is generated conditioned on the reasoning",
    "It does not matter",
    "In a separate request always"
  ],
  "answer": 1,
  "explanation": "Generation is left to right. If `answer` comes first, the reasoning is only a post-hoc justification and cannot improve the answer."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate parsing CoT outputs. `extract_answer(text)` returns the number after the **last** occurrence of `answer is` or `answer:` (case-insensitive; allow an optional `$`, a leading minus, thousands commas and decimals), as a string with commas removed, or `None` if there is no match. `majority_vote(answers)` ignores `None`s and returns `(winner, share)` where share = winner count / number of non-None answers; ties go to the answer that appears first; if there are no valid answers return `(None, 0.0)`.",
  "starterCode": "import re\nfrom collections import Counter\n\ndef extract_answer(text):\n    pass\n\ndef majority_vote(answers):\n    pass\n",
  "tests": "assert extract_answer(\"7 pens: 6 cost 10, 1 costs 2. Answer: 12\") == \"12\"\nassert extract_answer(\"The answer is 1,250.\") == \"1250\"\nassert extract_answer(\"Answer: 7. Wait, recheck. Answer: 8\") == \"8\"\nassert extract_answer(\"answer: -3.5\") == \"-3.5\"\nassert extract_answer(\"I am not sure.\") is None\nassert majority_vote([\"42\", \"42\", \"36\", \"42\", \"36\"]) == (\"42\", 0.6)\nassert majority_vote([\"a\", \"b\", \"b\", \"a\"]) == (\"a\", 0.5)\nassert majority_vote([None, \"5\", None]) == (\"5\", 1.0)\nassert majority_vote([None]) == (None, 0.0)",
  "solution": "import re\nfrom collections import Counter\n\ndef extract_answer(text):\n    matches = re.findall(r\"answer\\s*(?:is|:)\\s*\\$?(-?[\\d,]*\\.?\\d+)\", text, flags=re.I)\n    if not matches:\n        return None\n    return matches[-1].replace(\",\", \"\")\n\ndef majority_vote(answers):\n    valid = [a for a in answers if a is not None]\n    if not valid:\n        return (None, 0.0)\n    counts = Counter(valid)\n    best = max(counts.values())\n    for a in valid:\n        if counts[a] == best:\n            return (a, best / len(valid))",
  "hints": [
    "`re.findall` with a capture group returns all matches; take the last.",
    "To break ties by first appearance, iterate the answers in order and return the first whose count equals the max."
  ]
}
```

> [!TIP] Interview tips
> - Explain the mechanism (more tokens means more compute and a scratchpad) and the cost (output tokens, latency).
> - Mention self-consistency for accuracy and reasoning models as the modern replacement for hand-written "think step by step".
> - Pitfall: reasoning before answer in structured output; also do not trust the rationale as a faithful explanation.
