---
id: genai-eng-llm-as-a-judge
title: "LLM-as-a-judge"
estimatedMinutes: 11
difficulty: medium
tags: [genai, evaluation, llm-judge, bias]
---

## Why it matters
Human review does not scale, and string metrics (BLEU, ROUGE) miss quality in open-ended outputs. Using a strong LLM to grade outputs is now the default for scalable evaluation, but judges have known biases. Interviewers expect you to know the modes, the biases and how to validate a judge.

## Concept
**Modes**:
- **Pointwise** (single answer): score against a rubric, ideally with binary or small-scale criteria (helpful? grounded? follows format?) rather than a vague 1-10.
- **Pairwise**: pick the better of A and B (or tie). More reliable than absolute scores; the basis of arena-style leaderboards.
- **Reference-based**: compare to a gold answer for correctness.

**Known biases**:
- **Position bias**: favors the first (or second) answer.
- **Verbosity bias**: prefers longer, more elaborate answers.
- **Self-preference**: favors outputs from its own model family.
- **Formatting / authority bias** and sycophancy toward confident tones.
- Limited ability to verify facts it cannot check; scores are noisy and drift when the judge model changes.

**Best practices**:
- Write a rubric with clear anchors and examples; ask for brief reasoning *then* a structured verdict (JSON), temperature 0.
- **Swap order** in pairwise comparisons and count a win only if both orderings agree; otherwise tie.
- Use a strong judge from a different family than the candidate; consider a **panel** of judges or majority vote.
- Control length (instruct to ignore it) and judge criteria separately.
- **Validate against humans**: label 100-300 items by hand, then measure judge-human agreement (accuracy, Cohen's $\kappa$, correlation). Aim to approach human-human agreement, and re-check when the prompt or judge version changes.
- Use judges for what they do well (tone, helpfulness, rubric adherence); use code or ground truth for verifiable properties (exact answers, SQL results, JSON validity).

## Worked example
You compare two summarizers on 100 pairs. In the original order the judge picks the first answer 62 times. After swapping, the judge's verdicts agree with the original on only 70 pairs; 30 flip with position, a position-bias signal. Counting only the 70 consistent verdicts, humans agree with the judge on 63: $63/70 = 90\%$. The 30 inconsistent pairs are recorded as ties (and are good candidates for human review).

If A wins 40, B wins 30 among the consistent pairs, the win rate excluding ties is $40/70 = 57\%$. With $n = 70$, the 95% interval is roughly $\pm 12$ points, so say "A slightly better", not "A wins".

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In pairwise judging, the verdict flips when you swap the order of A and B. What does this indicate?",
  "options": [
    "The two answers are identical",
    "Position bias; treat that pair as a tie or send it to human review",
    "The judge is perfectly calibrated",
    "The rubric is too short"
  ],
  "answer": 1,
  "explanation": "A reliable verdict should be invariant to order. Swapping and requiring agreement is the standard mitigation."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is the best way to know whether you can trust your LLM judge?",
  "options": [
    "Check that it gives high scores",
    "Measure agreement with a human-labeled sample, and re-check after judge or prompt changes",
    "Use a smaller model to reduce cost",
    "Ask the judge whether it is accurate"
  ],
  "answer": 1,
  "explanation": "Validate on human labels (agreement or kappa). A judge's self-assessment is not evidence."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "A judge is a function `judge(x, y)` returning `\"first\"`, `\"second\"` or `\"tie\"`. Implement `swap_consistent_verdict(judge, a, b)`: call `judge(a, b)` and `judge(b, a)`, map both to `\"a\"`, `\"b\"` or `\"tie\"`, and return that value if they agree; if they disagree (position bias), return `\"tie\"`. Then implement `agreement(judge_labels, human_labels)` returning the fraction of positions where both lists match (0.0 for empty lists), ignoring positions where the judge label is `None`.",
  "starterCode": "def swap_consistent_verdict(judge, a, b):\n    pass\n\ndef agreement(judge_labels, human_labels):\n    pass\n\nprint(swap_consistent_verdict(lambda x, y: 'first', 'A', 'B'), agreement(['a', 'b'], ['a', 'a']))",
  "tests": "def length_judge(x, y):\n    if len(x) == len(y):\n        return 'tie'\n    return 'first' if len(x) > len(y) else 'second'\nassert swap_consistent_verdict(length_judge, 'long answer', 'short') == 'a'\nassert swap_consistent_verdict(length_judge, 'short', 'long answer') == 'b'\nassert swap_consistent_verdict(length_judge, 'same', 'same') == 'tie'\nbiased = lambda x, y: 'first'\nassert swap_consistent_verdict(biased, 'x', 'y') == 'tie'\nsecond = lambda x, y: 'second'\nassert swap_consistent_verdict(second, 'x', 'y') == 'tie'\nassert abs(agreement(['a', 'b', 'tie', 'a'], ['a', 'b', 'a', 'a']) - 0.75) < 1e-12\nassert agreement([], []) == 0.0\nassert abs(agreement(['a', None, 'b'], ['a', 'b', 'a']) - 0.5) < 1e-12",
  "solution": "def swap_consistent_verdict(judge, a, b):\n    def norm(v, flipped):\n        if v == 'tie':\n            return 'tie'\n        first_wins = (v == 'first')\n        if flipped:\n            return 'b' if first_wins else 'a'\n        return 'a' if first_wins else 'b'\n    v1 = norm(judge(a, b), False)\n    v2 = norm(judge(b, a), True)\n    return v1 if v1 == v2 else 'tie'\n\ndef agreement(judge_labels, human_labels):\n    pairs = [(j, h) for j, h in zip(judge_labels, human_labels) if j is not None]\n    if not pairs:\n        return 0.0\n    return sum(1 for j, h in pairs if j == h) / len(pairs)",
  "hints": [
    "For `judge(b, a)`, `'first'` means b wins and `'second'` means a wins.",
    "For `agreement`, filter pairs with `j is not None` first."
  ]
}
```

> [!TIP] Interview tips
> - Name the biases (position, verbosity, self-preference) and the matching mitigations (swap, length control, different-family judge).
> - Say you validate the judge against human labels and re-validate on changes.
> - Prefer code/ground-truth checks for verifiable facts; use judges for subjective quality.
