---
id: probability-practice-dice-cards-and-coins
title: "Practice: Dice, cards and coins"
estimatedMinutes: 14
difficulty: medium
tags: [probability, dice, cards, coins, puzzles, practice]
---

## Why it matters

Dice, cards and coins are the standard vocabulary of probability interviews: expected waiting times, counting hands, sums of dice, fair-from-biased coins. This set goes beyond the toolkit in the dice, coin and card lesson into patterns and exact counting.

## Concept

**Toolkit recap**: complement for "at least one"; symmetry; counting (choose ranks, then suits); independence for sequential rolls; first-step analysis for waiting times; linearity of expectation (no independence needed).

**Waiting times**: expected flips to see a run of $r$ heads is $2^{r+1} - 2$ ($r = 2$: 6). For a general pattern, $E = \sum 2^k$ over every $k$ where the length-$k$ prefix equals the length-$k$ suffix (the pattern's autocorrelation). So HH takes 6 but HT takes 4, despite both having probability 1/4 at any position. For a die run of $r$ sixes, $E = \sum_{k=1}^r 6^k$.

**Counting hands**: choose the rank pattern first, then suits. Total 5-card hands: $\binom{52}{5} = 2{,}598{,}960$. Full house: $13\binom43\cdot 12\binom42 = 3744$. Two pair: $\binom{13}{2}\binom42^2\cdot 44 = 123{,}552$. Always check that categories are disjoint.

**Penney's game**: for 3-flip patterns the second player can always pick a pattern that beats the first (non-transitive), e.g. against HHH choose THH (wins 7/8).

**Fair from biased** (von Neumann): flip twice; HT $\to$ H, TH $\to$ T, otherwise repeat. Both outcomes have probability $p(1-p)$, so the output is fair for any $p$, using on average $1/(2p(1-p))$ pairs. **Sum of dice**: compute by convolution (DP); for two dice $P(S=s) = (6 - |s - 7|)/36$.

## Worked example

Expected flips of a fair coin until HH versus HT.

Let $a$ be the expectation from scratch and $b$ after a first H. For HH: $a = 1 + \tfrac12 b + \tfrac12 a$ and $b = 1 + \tfrac12\cdot 0 + \tfrac12 a$. From the first, $a = 2 + b$; substituting $b = 1 + a/2$ gives $a = 3 + a/2$, so $a = 6$.

For HT: after an H, a T finishes; another H leaves us still in the "just saw H" state, so $b = 1 + \tfrac12\cdot 0 + \tfrac12 b$, i.e. $b = 2$, and $a = 2 + b = 4$. HH is slower because a failure (T after H) sends you all the way back to scratch, whereas for HT a failure keeps you at H. The autocorrelation formula agrees: HH gives $2 + 4$, HT gives $4$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You roll a fair die repeatedly. What is the expected number of rolls until you see two 6s in a row?",
  "options": [
    "12",
    "36",
    "42",
    "72"
  ],
  "answer": 2,
  "explanation": "For a run of $r$ successes, $E = \\sum_{k=1}^r (1/p)^k$. With $p = 1/6$ and $r = 2$: $6 + 36 = 42$."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is more likely: at least one 6 in 4 rolls of one die, or at least one double-six in 24 rolls of two dice?",
  "options": [
    "Double-six in 24 rolls",
    "At least one 6 in 4 rolls (about 51.8% vs 49.1%)",
    "They are equal",
    "Cannot tell without simulation"
  ],
  "answer": 1,
  "explanation": "$1 - (5/6)^4 \\approx 0.5177$ versus $1 - (35/36)^{24} \\approx 0.4914$. This is the de Mere problem: 24 rolls is not enough, you need 25."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `dice_sum_dist(n, sides=6)` returning a dict `{sum: Fraction}` for the sum of `n` fair dice, built by dynamic programming (convolve one die at a time). Then write `prob_sum_at_least(n, k, sides=6)`.",
  "starterCode": "from fractions import Fraction\n\ndef dice_sum_dist(n, sides=6):\n    pass\n\ndef prob_sum_at_least(n, k, sides=6):\n    pass\n",
  "tests": "d = dice_sum_dist(2)\nassert d[7] == Fraction(1, 6) and d[2] == Fraction(1, 36) and len(d) == 11\nd3 = dice_sum_dist(3)\nassert d3[10] == Fraction(1, 8) and d3[9] == Fraction(25, 216)\nassert sum(d3.values()) == 1\nassert prob_sum_at_least(2, 10) == Fraction(1, 6)\nassert prob_sum_at_least(3, 3) == 1\nassert prob_sum_at_least(1, 7) == 0\nassert dice_sum_dist(0) == {0: Fraction(1)}",
  "solution": "from fractions import Fraction\n\ndef dice_sum_dist(n, sides=6):\n    dist = {0: Fraction(1)}\n    for _ in range(n):\n        new = {}\n        for s, p in dist.items():\n            for f in range(1, sides + 1):\n                new[s + f] = new.get(s + f, 0) + p / sides\n        dist = new\n    return dist\n\ndef prob_sum_at_least(n, k, sides=6):\n    return sum((p for s, p in dice_sum_dist(n, sides).items() if s >= k), Fraction(0))",
  "hints": [
    "Start with `{0: 1}` and, for each die, add each face value with probability `p / sides`.",
    "Use `Fraction` so equality checks are exact."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Use `math.comb` to count 5-card poker hands from a 52-card deck. Implement `hand_counts()` returning a dict with the number of hands for `'four_kind'`, `'full_house'`, `'three_kind'`, `'two_pair'`, `'one_pair'` (exactly that category, e.g. `'one_pair'` means exactly one pair and three distinct other ranks) and `'flush_any'` (any 5 cards of one suit, including straight flushes). Also `prob(count)` giving the probability as a Fraction of all hands.",
  "starterCode": "from fractions import Fraction\nfrom math import comb\n\ndef hand_counts():\n    pass\n\ndef prob(count):\n    pass\n",
  "tests": "h = hand_counts()\nassert h['four_kind'] == 624\nassert h['full_house'] == 3744\nassert h['three_kind'] == 54912\nassert h['two_pair'] == 123552\nassert h['one_pair'] == 1098240\nassert h['flush_any'] == 5148\nassert prob(624) == Fraction(624, 2598960)\nassert comb(52, 5) == 2598960",
  "solution": "from fractions import Fraction\nfrom math import comb\n\ndef hand_counts():\n    return {\n        'four_kind': 13 * 48,\n        'full_house': 13 * comb(4, 3) * 12 * comb(4, 2),\n        'three_kind': 13 * comb(4, 3) * comb(12, 2) * 4 ** 2,\n        'two_pair': comb(13, 2) * comb(4, 2) ** 2 * 44,\n        'one_pair': 13 * comb(4, 2) * comb(12, 3) * 4 ** 3,\n        'flush_any': 4 * comb(13, 5),\n    }\n\ndef prob(count):\n    return Fraction(count, comb(52, 5))",
  "hints": [
    "Choose ranks first, then suits. Two pair: choose 2 ranks, 2 suits for each, then the fifth card from the other 11 ranks (44 cards).",
    "One pair: pair rank, 2 of its 4 suits, 3 other distinct ranks out of 12, any suit for each (4 each)."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Coin patterns. (a) `expected_flips(pattern)` for a string of `'H'`/`'T'`: the expected number of fair flips until the pattern first appears equals $\\sum 2^k$ over all $k$ such that the first $k$ characters equal the last $k$ characters (including $k = $ the full length). (b) `von_neumann(bits)`: read the 0/1 list in non-overlapping pairs; for a pair `(a, b)` with `a != b` output `a`, otherwise discard. This turns a biased coin into a fair one.",
  "starterCode": "def expected_flips(pattern):\n    pass\n\ndef von_neumann(bits):\n    pass\n",
  "tests": "assert expected_flips('HH') == 6\nassert expected_flips('HT') == 4\nassert expected_flips('HHH') == 14\nassert expected_flips('HTH') == 10\nassert expected_flips('HHT') == 8\nassert expected_flips('H') == 2\nassert von_neumann([1, 0, 0, 0, 1, 1, 0, 1]) == [1, 0]\nassert von_neumann([1, 1, 0, 0]) == []\nassert von_neumann([1, 0, 1]) == [1]",
  "solution": "def expected_flips(pattern):\n    n = len(pattern)\n    return sum(2 ** k for k in range(1, n + 1) if pattern[:k] == pattern[n - k:])\n\ndef von_neumann(bits):\n    out = []\n    for i in range(0, len(bits) - 1, 2):\n        a, b = bits[i], bits[i + 1]\n        if a != b:\n            out.append(a)\n    return out",
  "hints": [
    "`pattern[:k] == pattern[len - k:]` tests whether prefix and suffix of length `k` match.",
    "For `HH`: $k = 1$ and $k = 2$ both match, giving $2 + 4 = 6$."
  ]
}
```

> [!TIP] Interview tips
> - Name the method before computing: complement, symmetry, counting, first-step, or linearity. Then do a quick sanity bound.
> - The HH vs HT (6 vs 4) result is a favorite follow-up; know the first-step derivation and the autocorrelation shortcut.
> - Pitfall: ordered vs. unordered counting in card hands, and double counting overlapping categories (e.g. a full house also contains a pair).
