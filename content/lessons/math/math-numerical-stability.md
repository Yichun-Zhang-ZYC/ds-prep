---
id: math-numerical-stability
title: Numerical stability (log-sum-exp, softmax, overflow)
estimatedMinutes: 12
difficulty: medium
tags: [math, numerical-stability, softmax, floating-point]
---

## Why it matters

Floating point has finite range and precision. Real models hit this: NaN losses from exp overflow, probabilities that underflow to 0, variance that comes out negative. Interviewers ask how to compute softmax, cross-entropy and variance safely.

## Concept

**Failure modes**. Overflow: $e^{x}$ is $\infty$ in float64 for $x > 709$ and in float32 for $x > 88$; float16 maxes out at 65504. Underflow: tiny values flush to 0, and then $\log 0 = -\infty$. **Catastrophic cancellation**: subtracting two nearly equal large numbers destroys the significant digits, e.g. $E[x^2] - E[x]^2$ on data with a big mean.

**Log-sum-exp**: $\operatorname{LSE}(x) = m + \log\sum_i e^{x_i - m}$ with $m = \max_i x_i$. Then $\text{softmax}(x)_i = e^{x_i - \operatorname{LSE}(x)}$ and $\log\text{softmax}(x)_i = x_i - \operatorname{LSE}(x)$. This is why frameworks fuse softmax and cross-entropy into one op that takes logits.

**Other stable forms**: sigmoid branches on the sign of $z$ so it only exponentiates $-|z|$; binary cross-entropy from logits is $\max(z, 0) - zy + \log(1 + e^{-|z|})$; use `log1p(x)` and `expm1(x)` for small $x$ where $1 + x$ would round away the information; work in log space for products of probabilities (HMMs, naive Bayes, likelihoods).

**Variance**: use Welford's online update, which is stable and also mergeable across shards: $M_2 = M_{2,a} + M_{2,b} + \delta^2 \frac{n_a n_b}{n_a + n_b}$. **Linear algebra**: avoid forming $X^\top X$ (it squares the condition number, $\kappa(X^\top X) = \kappa(X)^2$); solve least squares with QR or SVD. Add $\epsilon$ inside square roots and denominators (Adam, LayerNorm).

**Low precision**: mixed-precision training keeps master weights and reductions in float32, and uses loss scaling in float16 so small gradients don't underflow. bfloat16 has float32's range but only about 3 significant digits.

## Worked example

Take logits $x = (1000, 1001, 1002)$. Naive softmax computes $e^{1002} = \infty$ and returns NaN. Stable: $m = 1002$, shifted values $(-2, -1, 0)$, exponentials $(0.1353, 0.3679, 1)$ with sum $1.5032$.

So $\operatorname{LSE} = 1002 + \ln 1.5032 = 1002.4076$ and softmax $= (0.0900, 0.2447, 0.6652)$. If the true class is the first, the cross-entropy is $\operatorname{LSE} - x_1 = 2.4076$, computed without ever forming a huge number.

Contrast with the variance of $\{10^9+4, 10^9+7, 10^9+13, 10^9+16\}$. The true population variance is 22.5 (deviations $\pm6, \pm3$). The naive formula subtracts two numbers near $10^{18}$ in float64, where adjacent representable values are 128 apart, so the answer is garbage; Welford works on deviations and stays exact.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does the stable softmax subtract $\\max_i x_i$ before exponentiating, and does it change the output?",
  "options": [
    "It speeds up exp; output changes slightly",
    "It prevents overflow; output is mathematically identical because softmax is shift-invariant",
    "It normalizes the logits to unit variance; output changes",
    "It only matters for float16; output is identical"
  ],
  "answer": 1,
  "explanation": "$\\frac{e^{x_i - c}}{\\sum_j e^{x_j - c}} = \\frac{e^{x_i}}{\\sum_j e^{x_j}}$ for any constant $c$. Choosing $c = \\max x$ makes every exponent $\\le 0$, so nothing overflows (the largest term is exactly 1)."
}
```

```quiz
{
  "id": "q2",
  "question": "You compute the log-likelihood of 10,000 independent observations. Which approach is safe?",
  "options": [
    "Multiply the probabilities, then take the log",
    "Sum the individual log-probabilities",
    "Normalize the probabilities first, then multiply",
    "Use float16 for speed"
  ],
  "answer": 1,
  "explanation": "A product of 10,000 numbers below 1 underflows to 0 (float64 bottoms out near $10^{-308}$). Summing logs keeps the values in a comfortable range."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Pure Python (use the `math` module). Implement `logsumexp(xs)` (stable, returns `-inf` for an empty list), `softmax(xs)` and `log_softmax(xs)` so they work for inputs like `[1000, 1001, 1002]` and `[-1000, -1001]`.",
  "starterCode": "import math\n\ndef logsumexp(xs):\n    pass\n\ndef softmax(xs):\n    pass\n\ndef log_softmax(xs):\n    pass\n",
  "tests": "assert abs(logsumexp([1000, 1001, 1002]) - (1002 + math.log(math.exp(-2) + math.exp(-1) + 1))) < 1e-9\nassert abs(logsumexp([-1000, -1000]) - (-1000 + math.log(2))) < 1e-9\nassert logsumexp([]) == -math.inf\np = softmax([1000, 1001, 1002])\nassert abs(sum(p) - 1) < 1e-12\nassert abs(p[2] - 1 / (1 + math.exp(-1) + math.exp(-2))) < 1e-12\nq = softmax([-1000, -1001])\nassert abs(q[0] - 1 / (1 + math.exp(-1))) < 1e-12\nls = log_softmax([1000, 1001, 1002])\nassert all(abs(a - math.log(b)) < 1e-9 for a, b in zip(ls, p))\nassert abs(log_softmax([0.0, 0.0])[0] + math.log(2)) < 1e-12",
  "solution": "import math\n\ndef logsumexp(xs):\n    if not xs:\n        return -math.inf\n    m = max(xs)\n    if m == -math.inf:\n        return -math.inf\n    return m + math.log(sum(math.exp(x - m) for x in xs))\n\ndef softmax(xs):\n    m = max(xs)\n    e = [math.exp(x - m) for x in xs]\n    s = sum(e)\n    return [v / s for v in e]\n\ndef log_softmax(xs):\n    lse = logsumexp(xs)\n    return [x - lse for x in xs]",
  "hints": [
    "Factor out the maximum: $\\log\\sum e^{x_i} = m + \\log\\sum e^{x_i - m}$.",
    "$\\log\\text{softmax}(x)_i = x_i - \\text{logsumexp}(x)$; never compute softmax and then log it."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `sigmoid(z)` and `bce_with_logits(z, y)` (binary cross-entropy for one logit `z` and label `y` in {0, 1}) so neither overflows for $|z|$ up to 1000. Use $\\max(z,0) - zy + \\log(1 + e^{-|z|})$ for the loss, and `math.log1p`.",
  "starterCode": "import math\n\ndef sigmoid(z):\n    pass\n\ndef bce_with_logits(z, y):\n    pass\n",
  "tests": "assert abs(sigmoid(0) - 0.5) < 1e-15\nassert sigmoid(1000) == 1.0 and sigmoid(-1000) == 0.0\nassert abs(sigmoid(2) - 1 / (1 + math.exp(-2))) < 1e-12\nassert abs(sigmoid(-2) - 1 / (1 + math.exp(2))) < 1e-12\nassert abs(bce_with_logits(0, 1) - math.log(2)) < 1e-12\nassert abs(bce_with_logits(2, 1) - math.log1p(math.exp(-2))) < 1e-12\nassert abs(bce_with_logits(2, 0) - (2 + math.log1p(math.exp(-2)))) < 1e-12\nassert abs(bce_with_logits(1000, 0) - 1000) < 1e-9\nassert abs(bce_with_logits(-1000, 1) - 1000) < 1e-9\nassert abs(bce_with_logits(-1000, 0)) < 1e-9",
  "solution": "import math\n\ndef sigmoid(z):\n    if z >= 0:\n        return 1.0 / (1.0 + math.exp(-z))\n    e = math.exp(z)\n    return e / (1.0 + e)\n\ndef bce_with_logits(z, y):\n    return max(z, 0.0) - z * y + math.log1p(math.exp(-abs(z)))",
  "hints": [
    "Branch on the sign of $z$ so you only ever exponentiate a non-positive number.",
    "For $y = 0$ and large positive $z$ the loss is about $z$; for $y = 1$ and large negative $z$ it is about $-z$."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `naive_var(xs)` using $E[x^2] - E[x]^2$ and `welford_var(xs)` (single pass, population variance) using the running updates `delta = x - mean; mean += delta / n; M2 += delta * (x - mean)`. On data with a huge offset the naive one loses precision; also implement `merge(a, b)` that combines two `(n, mean, M2)` summaries.",
  "starterCode": "def naive_var(xs):\n    pass\n\ndef welford_var(xs):\n    pass\n\ndef merge(a, b):\n    pass\n",
  "tests": "xs = [1e9 + 4, 1e9 + 7, 1e9 + 13, 1e9 + 16]\nassert abs(welford_var(xs) - 22.5) < 1e-6\nassert abs(naive_var([1, 2, 3, 4]) - 1.25) < 1e-12\nassert abs(welford_var([1, 2, 3, 4]) - 1.25) < 1e-12\nys = [3.0, 1.0, 4.0, 1.0, 5.0, 9.0, 2.0, 6.0]\ndef summ(v):\n    n = len(v); m = sum(v) / n\n    return (n, m, sum((t - m) ** 2 for t in v))\nn, m, M2 = merge(summ(ys[:3]), summ(ys[3:]))\nn0, m0, M20 = summ(ys)\nassert n == n0 and abs(m - m0) < 1e-12 and abs(M2 - M20) < 1e-9",
  "solution": "def naive_var(xs):\n    n = len(xs)\n    return sum(x * x for x in xs) / n - (sum(xs) / n) ** 2\n\ndef welford_var(xs):\n    n = 0; mean = 0.0; M2 = 0.0\n    for x in xs:\n        n += 1\n        delta = x - mean\n        mean += delta / n\n        M2 += delta * (x - mean)\n    return M2 / n\n\ndef merge(a, b):\n    na, ma, Ma = a\n    nb, mb, Mb = b\n    n = na + nb\n    d = mb - ma\n    return (n, ma + d * nb / n, Ma + Mb + d * d * na * nb / n)",
  "hints": [
    "Population variance is `M2 / n`.",
    "Merge rule: $M2 = M2_a + M2_b + \\delta^2\\, n_a n_b / (n_a + n_b)$ with $\\delta = \\text{mean}_b - \\text{mean}_a$."
  ]
}
```

> [!TIP] Interview tips
> - Say "shift by the max" and "log-sum-exp" immediately; mention that frameworks fuse softmax with cross-entropy (`CrossEntropyLoss` takes logits).
> - Know the ranges: float32 overflows near $e^{88}$, float64 near $e^{709}$, float16 at 65504. Explain loss scaling and why bfloat16 needs no scaling.
> - Pitfall: applying `log(softmax(x))` or `log(sigmoid(z))` as two steps. Use `log_softmax` and `logsigmoid` instead. Also never use $E[x^2]-E[x]^2$ for streaming variance.
