---
id: probability-practice-geometric-probability
title: "Practice: Geometric probability and simulation"
estimatedMinutes: 14
difficulty: hard
tags: [probability, geometric-probability, monte-carlo, simulation, puzzles, practice]
---

## Why it matters

Geometric probability asks you to turn a story (meeting times, broken sticks, random points) into an area, and interviewers often follow with "how would you check that by simulation?". This set pairs exact area arguments with Monte Carlo, including sampling pitfalls. See the geometric probability lesson for the basics.

## Concept

**Recipe**: (1) choose random variables and their joint distribution (uniform on a square, interval or simplex); (2) write the event as inequalities; (3) draw the region and compute area ratio; (4) cross-check with a limiting case or simulation.

**Classics**: *meeting problem*: two people arrive uniformly in $[0, T]$ and each waits $t$; $P(\text{meet}) = 1 - (1 - t/T)^2$. *Buffon's needle*: $P(\text{cross}) = 2L/(\pi d)$ for $L \le d$. *Point closer to the center than the edge of a unit disk*: 1/4 (radius $< 1/2$). *Expected distance between two random points in the unit square*: about 0.5214. *Bertrand's paradox*: chord problem has three answers (1/3, 1/2, 1/4) because "random" was not specified.

**Sampling correctly**: uniform in a disk needs $r = \sqrt U$ (not $U$, which clusters at the center); uniform on a sphere by normalizing a Gaussian vector; uniform on the simplex by sorting uniforms or normalizing exponentials; rejection sampling from a bounding box has acceptance rate equal to area ratio.

**Monte Carlo accuracy**: the estimate of a probability $p$ has standard error $\sqrt{p(1-p)/N}$, so a 95% half-width $h$ needs $N \approx 1.96^2 p(1-p)/h^2$. Error shrinks as $1/\sqrt N$ independent of dimension, which is why MC beats grids in high dimension. Seed your generator for reproducibility; report the CI.

**Variance reduction**: antithetic pairs ($U$, $1-U$), control variates (subtract a correlated quantity with known mean), stratification, importance sampling for rare events (e.g. $P < 10^{-6}$, where naive MC sees almost no hits).

## Worked example

Two friends each arrive at a uniformly random time in a one-hour window and wait 15 minutes. What is the probability they meet, and how many simulation runs do you need to confirm it to $\pm 0.005$?

In the $(x, y)$ square they fail to meet when $|x - y| > 15$: two right triangles with legs 45, total area $45^2 = 2025$ out of $3600$, so $P(\text{fail}) = 0.5625$ and $P(\text{meet}) = 1 - 0.5625 = 7/16 = 0.4375$.

For a 95% interval of half-width 0.005: $N \approx 1.96^2 \cdot 0.4375 \cdot 0.5625 / 0.005^2 = 0.9454 / 0.000025 \approx 37{,}800$ runs. Checking with a fine integer grid (60 minutes, integer arrivals) gives $1620/3600 = 0.45$, slightly higher because the discrete rule "$\le 15$" counts the boundary; the gap vanishes as the grid refines.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "\"What is the probability that a random chord of a circle is longer than the side of the inscribed equilateral triangle?\" has which answer?",
  "options": [
    "1/3 only",
    "1/2 only",
    "1/4 only",
    "It depends on how \"random chord\" is defined: 1/3, 1/2 or 1/4"
  ],
  "answer": 3,
  "explanation": "This is Bertrand's paradox. Random endpoints give 1/3, a random distance along a radius gives 1/2, a uniform midpoint in the disk gives 1/4. The lesson: always specify the sampling mechanism of a geometric probability."
}
```

```quiz
{
  "id": "q2",
  "question": "A Monte Carlo estimate has standard error 0.01 with $N$ samples. How many samples give standard error 0.001?",
  "options": [
    "$10N$",
    "$100N$",
    "$1000N$",
    "$N^2$"
  ],
  "answer": 1,
  "explanation": "The standard error scales as $1/\\sqrt N$, so a 10x smaller error needs 100x more samples. This slow rate is why variance reduction (antithetic variables, control variates, importance sampling) matters."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Two people each arrive at a uniformly random integer minute in `0..m-1` and wait `k` minutes; they meet if $|x - y| \\le k$. Implement `meet_count(m, k)` by brute force over all $m^2$ pairs, `meet_prob(m, k)` returning a `Fraction`, and `meet_prob_continuous(t, T)` $= 1 - (1 - t/T)^2$, the limit as the grid gets fine.",
  "starterCode": "from fractions import Fraction\n\ndef meet_count(m, k):\n    pass\n\ndef meet_prob(m, k):\n    pass\n\ndef meet_prob_continuous(t, T):\n    pass\n",
  "tests": "assert meet_count(3, 0) == 3\nassert meet_count(3, 1) == 7\nassert meet_count(3, 2) == 9\nassert meet_prob(60, 15) == Fraction(1620, 3600)\nassert meet_prob(60, 15) == Fraction(60 * 60 - 44 * 45, 3600)\nassert abs(meet_prob_continuous(15, 60) - 7 / 16) < 1e-12\nassert abs(float(meet_prob(600, 150)) - meet_prob_continuous(150, 600)) < 0.005\nassert meet_prob_continuous(0, 60) == 0 and meet_prob_continuous(60, 60) == 1",
  "solution": "from fractions import Fraction\n\ndef meet_count(m, k):\n    return sum(1 for x in range(m) for y in range(m) if abs(x - y) <= k)\n\ndef meet_prob(m, k):\n    return Fraction(meet_count(m, k), m * m)\n\ndef meet_prob_continuous(t, T):\n    return 1 - (1 - t / T) ** 2",
  "hints": [
    "The failing region is two triangles with legs $T - t$ in the $(x, y)$ square, total area $(1 - t/T)^2$ of the square.",
    "Use the continuous formula as a sanity check on the grid answer."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Monte Carlo basics with a seeded generator (`random.Random(seed)`). Implement `estimate_pi(n, seed)` (fraction of uniform points in the unit square with $x^2 + y^2 \\le 1$, times 4), `buffon(n, L, d, seed)` (needle length $L \\le d$, line spacing $d$: sample the center's distance to the nearest line $y \\sim U(0, d/2)$ and angle $\\theta \\sim U(0, \\pi/2)$; it crosses iff $y \\le (L/2)\\sin\\theta$; return the crossing fraction) and `mc_sample_size(p, half_width, z=1.96)` $= \\lceil z^2 p(1-p)/h^2\\rceil$.",
  "starterCode": "import math\nimport random\n\ndef estimate_pi(n, seed):\n    pass\n\ndef buffon(n, L, d, seed):\n    pass\n\ndef mc_sample_size(p, half_width, z=1.96):\n    pass\n",
  "tests": "assert abs(estimate_pi(20000, 1) - math.pi) < 0.06\nassert estimate_pi(1000, 7) == estimate_pi(1000, 7)\nassert abs(buffon(20000, 1.0, 1.0, 2) - 2 / math.pi) < 0.025\nassert abs(buffon(20000, 0.5, 1.0, 3) - 1 / math.pi) < 0.02\nn = mc_sample_size(0.4375, 0.005)\nassert 37800 <= n <= 37830\nassert mc_sample_size(0.5, 0.01) == 9604\nassert mc_sample_size(0.5, 0.001) == 100 * mc_sample_size(0.5, 0.01)",
  "solution": "import math\nimport random\n\ndef estimate_pi(n, seed):\n    rng = random.Random(seed)\n    inside = 0\n    for _ in range(n):\n        x, y = rng.random(), rng.random()\n        if x * x + y * y <= 1:\n            inside += 1\n    return 4 * inside / n\n\ndef buffon(n, L, d, seed):\n    rng = random.Random(seed)\n    hits = 0\n    for _ in range(n):\n        y = rng.random() * d / 2\n        th = rng.random() * math.pi / 2\n        if y <= (L / 2) * math.sin(th):\n            hits += 1\n    return hits / n\n\ndef mc_sample_size(p, half_width, z=1.96):\n    return math.ceil(z * z * p * (1 - p) / half_width ** 2)",
  "hints": [
    "Buffon's exact crossing probability is $2L/(\\pi d)$ for $L \\le d$.",
    "The standard error of a proportion is $\\sqrt{p(1-p)/n}$; set $z\\cdot\\text{SE} = h$ and solve for $n$."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Sampling on a disk and Bertrand's paradox, seeded (`random.Random(seed)`). (a) `uniform_disk(n, seed)` returns `n` points `(x, y)` uniform in the unit disk (use radius $\\sqrt{u}$, not $u$). (b) `bertrand(method, n, seed)` returns the fraction of random chords longer than $\\sqrt3$ (the side of the inscribed equilateral triangle) for `method` in `'endpoints'` (two uniform points on the circle), `'radius'` (a uniform distance $s \\in [0, 1]$ along a fixed radius is the chord's midpoint distance from the center) and `'midpoint'` (the midpoint is uniform in the disk, chord length $2\\sqrt{1 - |m|^2}$).",
  "starterCode": "import math\nimport random\n\ndef uniform_disk(n, seed):\n    pass\n\ndef bertrand(method, n, seed):\n    pass\n",
  "tests": "pts = uniform_disk(20000, 4)\nassert all(x * x + y * y <= 1 + 1e-12 for x, y in pts)\nmr = sum(math.hypot(x, y) for x, y in pts) / len(pts)\nassert abs(mr - 2 / 3) < 0.01\nassert abs(bertrand('endpoints', 20000, 5) - 1 / 3) < 0.03\nassert abs(bertrand('radius', 20000, 6) - 1 / 2) < 0.03\nassert abs(bertrand('midpoint', 20000, 7) - 1 / 4) < 0.03",
  "solution": "import math\nimport random\n\ndef uniform_disk(n, seed):\n    rng = random.Random(seed)\n    out = []\n    for _ in range(n):\n        r = math.sqrt(rng.random())\n        a = 2 * math.pi * rng.random()\n        out.append((r * math.cos(a), r * math.sin(a)))\n    return out\n\ndef bertrand(method, n, seed):\n    rng = random.Random(seed)\n    side = math.sqrt(3)\n    long_ = 0\n    if method == 'midpoint':\n        for x, y in uniform_disk(n, seed):\n            if 2 * math.sqrt(max(0.0, 1 - (x * x + y * y))) > side:\n                long_ += 1\n    else:\n        for _ in range(n):\n            if method == 'endpoints':\n                a, b = rng.random() * 2 * math.pi, rng.random() * 2 * math.pi\n                length = 2 * abs(math.sin((a - b) / 2))\n            else:\n                s = rng.random()\n                length = 2 * math.sqrt(1 - s * s)\n            if length > side:\n                long_ += 1\n    return long_ / n",
  "hints": [
    "Area grows like $r^2$, so $P(R \\le r) = r^2$ and $R = \\sqrt U$.",
    "A chord at distance $s$ from the center has length $2\\sqrt{1 - s^2}$; it exceeds $\\sqrt3$ iff $s < 1/2$."
  ]
}
```

> [!TIP] Interview tips
> - Draw the unit square or disk first; the area is usually a few triangles. State the joint distribution before computing.
> - Mention Bertrand's paradox when a problem says "random" without a mechanism, and name the sampling method you assume.
> - Pitfall: sampling $r$ uniformly for a disk, or forgetting that simulation error scales as $1/\sqrt N$. Offer a sample size and a confidence interval, not just a point estimate.
