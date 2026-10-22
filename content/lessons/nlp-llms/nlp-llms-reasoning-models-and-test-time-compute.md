---
id: nlp-llms-reasoning-models-and-test-time-compute
title: Reasoning models and test-time compute
estimatedMinutes: 13
difficulty: hard
tags: [nlp, llm, reasoning, test-time-compute, grpo, rlvr, self-consistency]
---

## Why it matters
Since OpenAI o1 and DeepSeek-R1, "reasoning models" that think for thousands of tokens before answering have become a core topic: how they are trained, why spending compute at inference helps, and when it does not. Interviewers expect you to compare sequential and parallel test-time scaling and to explain GRPO (see RLHF and DPO, Decoding strategies and Scaling laws).

## Concept
**What they are**: LLMs trained to produce a long **chain of thought** (CoT) with self-checking, backtracking and exploration before a final answer. Quality improves with more *thinking tokens*, a second scaling axis next to model size and data (**test-time compute scaling**).

**Training recipe (R1-style)**
- **RL with verifiable rewards (RLVR)**: sample reasoning traces on problems with automatic checkers (math answers, unit tests, formal proofs). Reward = correctness (plus a format reward). No human preference labels or learned reward model are needed, which resists reward hacking better than a neural reward model.
- **GRPO** (Group Relative Policy Optimization): for each prompt sample a group of $G$ outputs with rewards $r_1..r_G$; the advantage is $A_i = (r_i - \text{mean}(r)) / \text{std}(r)$. This replaces PPO's learned value network (cheaper); the update keeps a clipped probability-ratio objective and a KL penalty to a reference model. Groups where all rewards are equal give zero advantage and no signal.
- DeepSeek-R1-Zero applied RL directly on a base model and reasoning behaviours (longer CoT, reflection) emerged; R1 added a cold-start SFT, rejection-sampling SFT and a final RL stage for readability and general tasks.
- **Distillation**: SFT of small models on the large model's reasoning traces transfers much of the ability cheaply.

**Test-time scaling methods**
- **Sequential**: longer CoT; control with a *thinking budget* (cap tokens, or append "Wait" to force more thinking: budget forcing).
- **Parallel**: **self-consistency / majority vote** over $N$ sampled answers; **best-of-$N$** ranked by a verifier. An **outcome reward model (ORM)** scores final answers; a **process reward model (PRM)** scores each step and can guide beam or tree search.
- Parallel sampling helps only if correct answers are more frequent than any single wrong one. pass@$N$ (an oracle) grows faster than majority vote, whose gains need a decent per-sample accuracy $p > 0.5$ on the modal answer.

**Trade-offs and pitfalls**
- **Cost and latency**: reasoning tokens are billed and can be 10-50x the visible answer; use them where accuracy matters (math, code, planning) and not for simple lookups or chat.
- **Overthinking**: easy questions get long, sometimes worse, CoT; adaptive effort or routing helps.
- **Verifier limits**: RLVR only works where answers can be checked; best-of-$N$ with an imperfect verifier eventually selects exploits.
- **Faithfulness**: the displayed CoT is not guaranteed to be the real cause of the answer; do not treat it as an explanation.
- Compute-optimal allocation: for easy/medium prompts a smaller model with more samples can beat a larger one, while the hardest prompts still need the bigger model.

## Worked example
**Majority vote**: a model is right with probability $p = 0.6$ on each independent sample and the wrong answers are spread out. With $N = 5$ samples the vote is correct if at least 3 are right:
$P = 0.6^5 + 5 \cdot 0.6^4 \cdot 0.4 + 10 \cdot 0.6^3 \cdot 0.4^2 = 0.0778 + 0.2592 + 0.3456 = 0.683$.
An oracle pass@5 would be $1 - 0.4^5 = 0.990$, which needs a perfect verifier. If $p$ were 0.4 for a binary choice, voting would *hurt*: accuracy $0.317$.

**GRPO advantages**: 4 samples with rewards $[1, 0, 0, 1]$: mean $0.5$, std $0.5$, advantages $[+1, -1, -1, +1]$. With rewards $[1, 1, 1, 1]$ the std is 0 and all advantages are 0 (no learning signal from that prompt).

**Cost**: a direct answer is 500 tokens; a reasoning answer averages 8,000 tokens, 16x the cost. Majority voting 5 reasoning samples is 40,000 tokens, 80x. Decide per task whether the accuracy gain pays for it.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is GRPO's main simplification compared with PPO?",
  "options": ["It uses the mean and std of rewards across a group of samples for the same prompt as the baseline, so no separate value network is needed", "It uses no rewards", "It needs no sampling", "It replaces rewards with human labels"],
  "answer": 0,
  "explanation": "GRPO's advantage $A_i=(r_i-\\text{mean})/\\text{std}$ comes from a within-group comparison, dropping the value model and saving memory and complexity."
}
```

```quiz
{
  "id": "q2",
  "question": "On a binary-choice question the model is right 40% of the time per sample. What does majority voting do as the number of samples grows?",
  "options": ["Accuracy falls, because the wrong answer becomes the majority", "Accuracy rises to 100%", "Accuracy stays the same", "It depends on temperature, not on $p$"],
  "answer": 0,
  "explanation": "Voting amplifies the modal answer. When the correct answer is not the mode ($p<0.5$), voting favours the wrong one, so you need $p>0.5$ or a reliable verifier."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `majority_vote(answers)` (most frequent; ties go to the earliest first occurrence), `best_of_n(cands, scores)` (highest score; ties go to the earliest), `grpo_advantages(rewards, eps=1e-8)` using the population std, `maj_vote_acc(p, n)` (odd `n`, binary choice, independent samples: probability the majority is right) and `pass_n(p, n)`.",
  "starterCode": "import math\n\ndef majority_vote(answers):\n    pass\n\ndef best_of_n(cands, scores):\n    pass\n\ndef grpo_advantages(rewards, eps=1e-8):\n    pass\n\ndef maj_vote_acc(p, n):\n    pass\n\ndef pass_n(p, n):\n    pass\n\nprint(grpo_advantages([1, 0, 0, 1]))",
  "tests": "assert majority_vote([\"a\", \"b\", \"b\", \"a\", \"c\"]) == \"a\"\nassert majority_vote([\"x\", \"y\", \"y\"]) == \"y\"\nassert best_of_n([\"p\", \"q\", \"r\"], [0.2, 0.9, 0.9]) == \"q\"\nadv = grpo_advantages([1, 0, 0, 1])\nassert all(abs(a - b) < 1e-6 for a, b in zip(adv, [1, -1, -1, 1]))\nassert all(abs(a) < 1e-6 for a in grpo_advantages([1, 1, 1, 1]))\nadv2 = grpo_advantages([0.0, 1.0, 2.0])\nassert abs(sum(adv2)) < 1e-9 and adv2[0] < 0 < adv2[2]\nassert abs(maj_vote_acc(0.6, 5) - 0.68256) < 1e-9\nassert abs(maj_vote_acc(0.4, 5) - (1 - 0.68256)) < 1e-9\nassert abs(maj_vote_acc(0.6, 1) - 0.6) < 1e-12\nassert maj_vote_acc(0.6, 15) > maj_vote_acc(0.6, 5)\nassert abs(pass_n(0.6, 5) - 0.98976) < 1e-9",
  "solution": "import math\n\ndef majority_vote(answers):\n    counts = {}\n    first = {}\n    for i, a in enumerate(answers):\n        counts[a] = counts.get(a, 0) + 1\n        first.setdefault(a, i)\n    return min(counts, key=lambda a: (-counts[a], first[a]))\n\ndef best_of_n(cands, scores):\n    best = 0\n    for i, s in enumerate(scores):\n        if s > scores[best]:\n            best = i\n    return cands[best]\n\ndef grpo_advantages(rewards, eps=1e-8):\n    g = len(rewards)\n    mean = sum(rewards) / g\n    std = math.sqrt(sum((r - mean) ** 2 for r in rewards) / g)\n    return [(r - mean) / (std + eps) for r in rewards]\n\ndef maj_vote_acc(p, n):\n    return sum(math.comb(n, k) * p ** k * (1 - p) ** (n - k) for k in range(n // 2 + 1, n + 1))\n\ndef pass_n(p, n):\n    return 1 - (1 - p) ** n",
  "hints": ["Track counts and first-seen index; min over (-count, first_index).", "Use strict > when scanning for the best score so earlier ties win.", "Majority of n (odd) needs at least n//2 + 1 correct samples; use math.comb."]
}
```

> [!TIP] Interview tips
> - Describe both scaling axes: train-time (RLVR elicits long CoT) and test-time (sequential thinking budget vs parallel voting/best-of-N).
> - Write GRPO's group-normalised advantage and explain why identical rewards give no signal.
> - Volunteer the trade-offs: cost, overthinking, verifier limits and unfaithful CoT.
