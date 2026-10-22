---
id: nlp-llms-llm-evaluation-benchmarks
title: "LLM evaluation: benchmarks and their pitfalls"
estimatedMinutes: 13
difficulty: medium
tags: [nlp, llm, evaluation, benchmarks, pass-at-k, llm-as-judge, elo]
---

## Why it matters
Every model launch cites benchmark numbers, and every ML team has to decide whether a model is actually better for their task. Interviewers want to see that you know what the standard benchmarks measure, how metrics like pass@k and Elo are computed, and why scores are easy to inflate or misread (see Hallucination and When to fine-tune vs prompt vs RAG).

## Concept
**Benchmark families**
- **Knowledge / reasoning (multiple choice)**: MMLU (57 subjects; now close to saturated at the top, so MMLU-Pro and GPQA are harder), ARC, HellaSwag.
- **Math**: GSM8K (grade-school word problems, saturated), MATH, AIME-style sets. Scored by exact match on the final answer.
- **Code**: HumanEval and MBPP (function synthesis, unit tests; saturated), LiveCodeBench (fresh problems), SWE-bench Verified (resolve real GitHub issues in a repo).
- **Instruction following**: IFEval (verifiable constraints).
- **Open-ended / chat**: MT-Bench, AlpacaEval, Arena-Hard (LLM-as-judge) and Chatbot Arena (human pairwise votes ranked with Bradley-Terry / Elo).
- Harnesses such as `lm-evaluation-harness` and HELM standardise prompts and scoring.

**Key metrics**
- **pass@k**: probability that at least one of $k$ samples is correct. With $n$ samples of which $c$ are correct, the unbiased estimator is $1 - \binom{n-c}{k} / \binom{n}{k}$. Never estimate it as $1-(1-c/n)^k$ with small $n$ (biased).
- **Elo / Bradley-Terry**: $P(A \text{ beats } B) = 1/(1 + 10^{(R_B - R_A)/400})$; update $R_A \leftarrow R_A + K\,(S - E_A)$.
- **Confidence intervals**: for accuracy $\hat p$ on $n$ items, standard error $\sqrt{\hat p(1-\hat p)/n}$. A 1-point gain on a 500-question benchmark is usually noise. Compare models with a **paired** test on the same questions.

**Pitfalls**
- **Contamination**: test items leak into pre-training data (n-gram overlap checks, canary strings, fresh or private held-out sets, dynamic benchmarks).
- **Saturation and Goodhart**: once a benchmark is optimised, scores stop tracking real ability.
- **Prompt and format sensitivity**: few-shot count, answer extraction, option order and chat template can move scores by several points. Report the exact setup.
- **LLM-as-judge biases**: position bias, verbosity bias, self-preference. Mitigate by swapping order, length-controlled win rates, rubrics, and calibrating against human labels.
- **Benchmark does not equal your task**: build a small task-specific eval set from real traffic, with versioned prompts and regression tests.
- Report variance across seeds and sampling settings; compare at equal inference compute (reasoning models can win by thinking longer).

## Worked example
**pass@k**: a model solves a problem in $c = 3$ of $n = 10$ samples. pass@1 $= 0.3$. pass@5 $= 1 - \binom{7}{5}/\binom{10}{5} = 1 - 21/252 = 0.917$.

**Elo**: A (1000) beats B (1200). Expected win probability for A is $1/(1 + 10^{200/400}) = 0.240$. With $K = 32$, A gains $32 \times (1 - 0.240) = 24.3$ points and B loses the same. An upset moves ratings much more than an expected result.

**Is the gain real?** Model B scores 82% vs model A's 81% on $n = 1000$ questions. The standard error of one accuracy is $\sqrt{0.8 \cdot 0.2/1000} = 1.26$ points, so a 95% interval is about $\pm 2.5$ points. The 1-point difference is within noise unless a paired test on per-question results shows otherwise.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "When estimating pass@k from $n$ samples with $c$ correct, why use $1 - \\binom{n-c}{k}/\\binom{n}{k}$ rather than $1-(1-c/n)^k$?",
  "options": ["The first is unbiased; the second treats draws as with replacement and is biased for small $n$", "The first is faster to compute", "The second only works for $k=1$", "They are always mathematically identical"],
  "answer": 0,
  "explanation": "Drawing $k$ of the $n$ samples without replacement, all wrong has probability $\\binom{n-c}{k}/\\binom{n}{k}$. Plugging $c/n$ in as a success rate is a with-replacement approximation and is biased."
}
```

```quiz
{
  "id": "q2",
  "question": "A model scores unusually high on a public benchmark but is mediocre on your similar internal task. What should you suspect first?",
  "options": ["Benchmark contamination (test items leaked into training data) or over-optimisation for the benchmark", "Tokenizer size", "Batch size", "GPU model"],
  "answer": 0,
  "explanation": "Widely used public benchmarks can end up in training corpora or be tuned for. Use a private, task-specific fresh eval set and check n-gram overlap."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `pass_at_k(n, c, k)` (unbiased estimator; 1.0 if `n - c < k`), `elo_expected(ra, rb)`, `elo_update(ra, rb, score, K=32)` returning the new ratings of A and B (`score` is A's result: 1, 0.5 or 0), and `acc_halfwidth(p, n, z=1.96)`, the normal-approximation confidence half-width of an accuracy.",
  "starterCode": "import math\n\ndef pass_at_k(n, c, k):\n    pass\n\ndef elo_expected(ra, rb):\n    pass\n\ndef elo_update(ra, rb, score, K=32):\n    pass\n\ndef acc_halfwidth(p, n, z=1.96):\n    pass\n\nprint(pass_at_k(10, 3, 5))",
  "tests": "import math\nassert abs(pass_at_k(10, 3, 1) - 0.3) < 1e-12\nassert abs(pass_at_k(10, 3, 5) - (1 - 21 / 252)) < 1e-12\nassert pass_at_k(10, 0, 5) == 0.0\nassert pass_at_k(10, 8, 5) == 1.0\nassert pass_at_k(5, 5, 3) == 1.0\nassert abs(elo_expected(1000, 1200) - 0.2402530733520421) < 1e-12\nassert abs(elo_expected(1500, 1500) - 0.5) < 1e-12\na, b = elo_update(1000, 1200, 1)\nassert abs(a - (1000 + 32 * (1 - 0.2402530733520421))) < 1e-9\nassert abs((a - 1000) + (b - 1200)) < 1e-9\na2, b2 = elo_update(1500, 1500, 0.5)\nassert abs(a2 - 1500) < 1e-12 and abs(b2 - 1500) < 1e-12\nassert abs(acc_halfwidth(0.8, 1000) - 1.96 * math.sqrt(0.16 / 1000)) < 1e-12\nassert acc_halfwidth(0.8, 4000) < acc_halfwidth(0.8, 1000)",
  "solution": "import math\n\ndef pass_at_k(n, c, k):\n    if n - c < k:\n        return 1.0\n    return 1.0 - math.comb(n - c, k) / math.comb(n, k)\n\ndef elo_expected(ra, rb):\n    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400))\n\ndef elo_update(ra, rb, score, K=32):\n    ea = elo_expected(ra, rb)\n    delta = K * (score - ea)\n    return ra + delta, rb - delta\n\ndef acc_halfwidth(p, n, z=1.96):\n    return z * math.sqrt(p * (1 - p) / n)",
  "hints": ["math.comb(n - c, k) / math.comb(n, k) is the probability that all k drawn samples are wrong.", "B's expected score is 1 - E_A, so B's change is the negative of A's change.", "half-width = z * sqrt(p(1-p)/n)."]
}
```

> [!TIP] Interview tips
> - Do not just quote scores: say what the benchmark measures, whether it is saturated and whether it may be contaminated.
> - Be able to compute pass@k, an Elo update and the standard error of an accuracy, and explain why small gaps can be noise.
> - For LLM judges mention position, verbosity and self-preference bias with mitigations, and stress building a task-specific eval set.
