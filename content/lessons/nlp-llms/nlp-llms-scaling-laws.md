---
id: nlp-llms-scaling-laws
title: Scaling laws
estimatedMinutes: 10
difficulty: medium
tags: [nlp, llm, scaling-laws, chinchilla, compute]
---

## Why it matters
Scaling laws tell you how to spend a fixed compute budget: a bigger model or more data? Interviewers use them to test whether you can reason about LLM training cost, why Chinchilla changed the field, and why modern small models are trained far past the "optimal" point.

## Concept
Test loss falls as a **power law** in model size $N$ (parameters), dataset size $D$ (tokens) and compute $C$ (Kaplan et al., 2020). On a log-log plot this is a straight line, so you can fit small runs and extrapolate to big ones.

**Chinchilla loss model** (Hoffmann et al., 2022):
$$L(N, D) = E + \frac{A}{N^{\alpha}} + \frac{B}{D^{\beta}}, \quad \alpha \approx 0.34,\ \beta \approx 0.28$$
$E$ is the irreducible loss (entropy of text); the other two terms are the penalty for a finite model and finite data.

**Compute**: training FLOPs $C \approx 6ND$ (about $2ND$ forward + $4ND$ backward).

**Compute-optimal training**: for a fixed $C$, grow $N$ and $D$ **in equal proportion**, giving roughly $D \approx 20N$ tokens. Earlier models (GPT-3: 175B params, 300B tokens, ~1.7 tokens/param) were **undertrained**. Chinchilla (70B, 1.4T tokens) beat Gopher (280B, 300B tokens) at the same compute.

**Beyond Chinchilla**: compute-optimal minimizes *training* cost for a target loss, but a deployed model is queried billions of times. Teams therefore **over-train smaller models** (Llama 3 8B saw ~15T tokens, about 1,900 tokens/param) to cut inference cost.

Caveats: laws predict pre-training loss, not downstream task accuracy; they assume enough *unique, good* data (repeating data gives diminishing returns); "emergent abilities" appear sharp partly because of discontinuous metrics.

## Worked example
Budget $C = 5.76 \times 10^{23}$ FLOPs. With $D = 20N$: $C = 6N \cdot 20N = 120N^2$, so $N = \sqrt{C/120} = \sqrt{4.8 \times 10^{21}} \approx 6.9 \times 10^{10}$ (70B) and $D = 20N \approx 1.4 \times 10^{12}$ (1.4T tokens). That is exactly Chinchilla. Gopher used $6 \cdot 280\text{B} \cdot 300\text{B} \approx 5.0 \times 10^{23}$ FLOPs, a similar budget spent on a model 4x too large and data 4.6x too small.

Power-law slope: if the reducible loss is 2.0 at $N = 10^8$ and $\alpha = 0.34$, then at $N = 10^9$ it is $2.0 \cdot 10^{-0.34} \approx 0.91$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "For a fixed compute budget, what does the Chinchilla result recommend?",
  "options": [
    "Make the model as large as possible and train on few tokens",
    "Scale parameters and training tokens roughly in proportion (about 20 tokens per parameter)",
    "Train a small model for many epochs on the same data",
    "Spend all compute on data and keep the model size fixed"
  ],
  "answer": 1,
  "explanation": "Both the model-size and data-size terms in the loss must shrink together; the compute-optimal split is roughly $D \\approx 20N$."
}
```

```quiz
{
  "id": "q2",
  "question": "Llama 3 8B was trained on ~15T tokens, far above 20 tokens/parameter. Why is this reasonable?",
  "options": [
    "It is a mistake; Chinchilla says it should not improve",
    "Inference cost dominates lifetime cost, so a smaller, longer-trained model is cheaper to serve at the same quality",
    "More tokens reduce the number of FLOPs",
    "Larger datasets remove the irreducible loss $E$"
  ],
  "answer": 1,
  "explanation": "Compute-optimal only minimizes training cost. A smaller model costs less on every query, so extra training compute is repaid at serving time."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `chinchilla_optimal(C)` returning the compute-optimal `(N, D)` for a FLOP budget `C` (using $C = 6ND$ and $D = 20N$). Then write `fit_power_law(xs, ys)` that fits $y = a\\,x^{-\\alpha}$ by least squares on $\\log y$ vs $\\log x$ and returns `(a, alpha)`.",
  "starterCode": "import math\n\ndef chinchilla_optimal(C):\n    \"\"\"Return (N, D) for compute C using C = 6*N*D and D = 20*N.\"\"\"\n    pass\n\ndef fit_power_law(xs, ys):\n    \"\"\"Fit y = a * x**(-alpha) by least squares in log-log space. Return (a, alpha).\"\"\"\n    pass\n\nprint(chinchilla_optimal(5.76e23))",
  "tests": "N, D = chinchilla_optimal(5.76e23)\nassert abs(N / 6.928e10 - 1) < 1e-3 and abs(D / 20 / N - 1) < 1e-12\nassert abs(6 * N * D / 5.76e23 - 1) < 1e-9\nxs = [1e6, 1e7, 1e8, 1e9]\nys = [3 * x ** -0.1 for x in xs]\na, alpha = fit_power_law(xs, ys)\nassert abs(a - 3) < 1e-6 and abs(alpha - 0.1) < 1e-9",
  "solution": "import math\n\ndef chinchilla_optimal(C):\n    N = math.sqrt(C / 120)\n    return N, 20 * N\n\ndef fit_power_law(xs, ys):\n    lx = [math.log(x) for x in xs]\n    ly = [math.log(y) for y in ys]\n    n = len(xs)\n    mx, my = sum(lx) / n, sum(ly) / n\n    slope = sum((a - mx) * (b - my) for a, b in zip(lx, ly)) / sum((a - mx) ** 2 for a in lx)\n    return math.exp(my - slope * mx), -slope",
  "hints": [
    "Substitute $D = 20N$ into $C = 6ND$ to get $C = 120N^2$.",
    "Taking logs: $\\log y = \\log a - \\alpha \\log x$, a straight line. alpha is minus the slope."
  ]
}
```

> [!TIP] Interview tips
> - Memorize $C \approx 6ND$ and $D \approx 20N$; derive $N = \sqrt{C/120}$ on the whiteboard.
> - Explain why industry over-trains: inference cost scales with $N$ and is paid for the model's whole lifetime.
> - Mention caveats: data quality/repetition, and that loss does not map one-to-one to task accuracy.
