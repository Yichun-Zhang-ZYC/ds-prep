---
id: probability-practice-order-statistics-and-uniform
title: "Practice: Order statistics and uniform variables"
estimatedMinutes: 13
difficulty: medium
tags: [probability, order-statistics, uniform, beta, puzzles, practice]
---

## Why it matters

Order statistics and uniform variables appear as "expected max of $n$ draws", "probability the broken stick forms a triangle", "German tank" estimation and many auction/min-max puzzles. One formula (the Beta distribution of the $k$-th order statistic) solves most of them.

## Concept

**Setup**: $U_1, \dots, U_n$ iid $U(0,1)$, sorted as $U_{(1)} \le \dots \le U_{(n)}$. The CDF of the max is $x^n$; of the min, $1 - (1-x)^n$. In general $U_{(k)} \le x$ iff at least $k$ points are in $[0, x]$, so $P(U_{(k)} \le x) = \sum_{j \ge k}\binom nj x^j(1-x)^{n-j}$.

**Distribution**: $U_{(k)} \sim \text{Beta}(k, n-k+1)$ with density $\frac{n!}{(k-1)!(n-k)!}x^{k-1}(1-x)^{n-k}$, mean $\frac{k}{n+1}$, variance $\frac{k(n-k+1)}{(n+1)^2(n+2)}$. Quick memory: $n$ points cut $[0,1]$ into $n+1$ exchangeable pieces of mean length $1/(n+1)$, so the $k$-th point is at $k/(n+1)$ on average. Expected range $= (n-1)/(n+1)$.

**Other uniform facts**: $P(X < Y) = 1/2$ for iid draws, $P(X_1 \text{ is the max}) = 1/n$ for any iid continuous draws (symmetry). $X + Y$ of two $U(0,1)$ is triangular on $[0, 2]$; $E|X - Y| = 1/3$. The min of independent exponentials is exponential with summed rates.

**Estimation**: for $U(0, \theta)$ the MLE is the sample max (biased low); the unbiased fix is $\frac{n+1}{n}\max$. The discrete German tank version is $m(1 + 1/n) - 1$.

**Broken stick**: choose two uniform cuts $x, y$; a triangle forms iff every piece is $< 1/2$. By symmetry, compute the region in the unit square or use the complement (a piece $> 1/2$ occurs with probability $3 \times 1/4$, disjointly). Always say "two cuts" vs. "break, then break the longer piece" because the answers differ.

## Worked example

Draw 3 iid $U(0,1)$ values. Find the mean and variance of the median, and $P(\text{max} < 0.9)$ for 10 draws.

The median is $U_{(2)} \sim \text{Beta}(2, 2)$ (density $6x(1-x)$). Mean $= 2/4 = 1/2$. Variance $= \frac{2\cdot 2}{16\cdot 5} = \frac{1}{20} = 0.05$, so the SD is about 0.224, much tighter than the 0.289 of a single draw.

For 10 draws, $P(\max < 0.9) = 0.9^{10} = 0.3487$, and $E[\max] = 10/11 \approx 0.909$. Note the expectation exceeds 0.9 even though the max is below 0.9 only 35% of the time: the upper tail is thin but long. Tank check: if you see maximum serial number 60 among 4 captured tanks, the estimate is $60 \cdot 1.25 - 1 = 74$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Four independent $U(0,1)$ values are drawn. What is the expected maximum?",
  "options": [
    "1/2",
    "3/4",
    "4/5",
    "5/6"
  ],
  "answer": 2,
  "explanation": "$P(\\max \\le x) = x^n$, so $E[\\max] = \\int_0^1 (1 - x^n)\\,dx = n/(n+1) = 4/5$. By symmetry $E[\\min] = 1/(n+1)$."
}
```

```quiz
{
  "id": "q2",
  "question": "A stick is broken at two uniformly random points. What is the probability the three pieces form a triangle?",
  "options": [
    "1/2",
    "1/3",
    "1/4",
    "1/8"
  ],
  "answer": 2,
  "explanation": "A triangle needs every piece below 1/2. In the $(x, y)$ unit square, the favorable region is the union of two triangles (each of area 1/8), so the probability is 1/4. The complement: some piece exceeds 1/2, three disjoint events each of probability 1/4, total 3/4."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "For $n$ iid $U(0,1)$ variables, the $k$-th smallest is $\\text{Beta}(k, n-k+1)$. Implement exact `Fraction` functions `mean_kth(n, k)` $= k/(n+1)$, `var_kth(n, k)` $= \\frac{k(n-k+1)}{(n+1)^2(n+2)}$, `mean_range(n)` (expected max minus min) and `german_tank(m, n)` returning the unbiased estimate $m(1 + 1/n) - 1$ of the largest serial number from the sample maximum `m` of `n` observed tanks (the discrete-uniform version).",
  "starterCode": "from fractions import Fraction\n\ndef mean_kth(n, k):\n    pass\n\ndef var_kth(n, k):\n    pass\n\ndef mean_range(n):\n    pass\n\ndef german_tank(m, n):\n    pass\n",
  "tests": "assert mean_kth(3, 2) == Fraction(1, 2)\nassert mean_kth(10, 10) == Fraction(10, 11)\nassert mean_kth(10, 1) == Fraction(1, 11)\nassert var_kth(3, 2) == Fraction(1, 20)\nassert var_kth(1, 1) == Fraction(1, 12)\nassert mean_range(2) == Fraction(1, 3)\nassert mean_range(5) == Fraction(2, 3)\nassert german_tank(60, 4) == Fraction(74)\nassert german_tank(10, 1) == Fraction(19)",
  "solution": "from fractions import Fraction\n\ndef mean_kth(n, k):\n    return Fraction(k, n + 1)\n\ndef var_kth(n, k):\n    return Fraction(k * (n - k + 1), (n + 1) ** 2 * (n + 2))\n\ndef mean_range(n):\n    return mean_kth(n, n) - mean_kth(n, 1)\n\ndef german_tank(m, n):\n    return m * (1 + Fraction(1, n)) - 1",
  "hints": [
    "The $n+1$ spacings of $n$ uniform points are exchangeable, so each has mean $1/(n+1)$ and the $k$-th point sits at $k$ spacings.",
    "Check $n = 1$: $\\text{Var} = 1 \\cdot 1/(4 \\cdot 3) = 1/12$, the variance of $U(0,1)$."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Pure Python with exact arithmetic. Implement `prob_kth_le(n, k, x)`: the probability that the $k$-th smallest of $n$ iid $U(0,1)$ is at most `x` (a `Fraction`), i.e. that at least $k$ of the $n$ points fall in $[0, x]$, using the binomial sum. Then `prob_median_in(n, a, b)` for odd `n`: the probability that the median lies in $(a, b]$.",
  "starterCode": "from fractions import Fraction\nfrom math import comb\n\ndef prob_kth_le(n, k, x):\n    pass\n\ndef prob_median_in(n, a, b):\n    pass\n",
  "tests": "h = Fraction(1, 2)\nassert prob_kth_le(3, 2, h) == h\nassert prob_kth_le(10, 10, Fraction(9, 10)) == Fraction(9, 10) ** 10\nassert prob_kth_le(10, 1, Fraction(1, 10)) == 1 - Fraction(9, 10) ** 10\nassert prob_kth_le(5, 3, 0) == 0 and prob_kth_le(5, 3, 1) == 1\nassert prob_median_in(3, 0, 1) == 1\nassert prob_median_in(3, 0, h) == h\nassert prob_median_in(5, Fraction(1, 4), Fraction(3, 4)) == prob_kth_le(5, 3, Fraction(3, 4)) - prob_kth_le(5, 3, Fraction(1, 4))\nassert prob_median_in(3, Fraction(1, 4), Fraction(3, 4)) == Fraction(11, 16)",
  "solution": "from fractions import Fraction\nfrom math import comb\n\ndef prob_kth_le(n, k, x):\n    x = Fraction(x)\n    return sum((comb(n, j) * x ** j * (1 - x) ** (n - j) for j in range(k, n + 1)), Fraction(0))\n\ndef prob_median_in(n, a, b):\n    k = (n + 1) // 2\n    return prob_kth_le(n, k, b) - prob_kth_le(n, k, a)",
  "hints": [
    "The $k$-th order statistic is $\\le x$ exactly when at least $k$ of the points are $\\le x$; the count is $\\text{Binomial}(n, x)$.",
    "Median of odd $n$ is the $k = (n+1)/2$-th smallest."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Geometric puzzles by exact enumeration on a grid (no randomness). (a) `triangle_fraction(m)`: break a stick of integer length `m` at two distinct integer cut points $a < b$ in $1..m-1$; return the fraction of such pairs where the pieces $a$, $b - a$, $m - b$ all have length strictly less than $m/2$ (i.e. can form a triangle). It approaches 1/4. (b) `mean_abs_diff(m)`: the exact `Fraction` $E|X - Y|$ for $X, Y$ independent and uniform on $\\{1, \\dots, m\\}$, by brute force; it equals $(m^2-1)/(3m)$.",
  "starterCode": "from fractions import Fraction\n\ndef triangle_fraction(m):\n    pass\n\ndef mean_abs_diff(m):\n    pass\n",
  "tests": "assert abs(triangle_fraction(100) - 1176 / 4851) < 1e-12\nassert abs(triangle_fraction(200) - 0.25) < 0.01\nassert triangle_fraction(4) == Fraction(0)\nfor m in (1, 2, 5, 10):\n    assert mean_abs_diff(m) == Fraction(m * m - 1, 3 * m)\nassert abs(float(mean_abs_diff(100)) / 100 - 1 / 3) < 0.005",
  "solution": "from fractions import Fraction\n\ndef triangle_fraction(m):\n    good = total = 0\n    for a in range(1, m):\n        for b in range(a + 1, m):\n            total += 1\n            if 2 * a < m and 2 * (b - a) < m and 2 * (m - b) < m:\n                good += 1\n    return Fraction(good, total)\n\ndef mean_abs_diff(m):\n    s = sum(abs(x - y) for x in range(1, m + 1) for y in range(1, m + 1))\n    return Fraction(s, m * m)",
  "hints": [
    "Compare doubled lengths to `m` to stay in integers: `2 * piece < m`.",
    "For `m = 4` the only way to avoid a piece of length at least 2 is impossible with three positive integer pieces summing to 4, so the fraction is 0."
  ]
}
```

> [!TIP] Interview tips
> - Open with "the $k$-th order statistic is $\text{Beta}(k, n-k+1)$, mean $k/(n+1)$"; most questions reduce to that or to $P(\max\le x) = x^n$.
> - For geometric uniform puzzles, draw the unit square (or simplex) and compute areas. Be explicit about the sampling model for the broken stick.
> - Pitfall: confusing the CDF of the max ($x^n$) with the density; and quoting the sample max as an unbiased estimate of the upper bound.
