---
id: probability-practice-bayes-and-conditional-puzzles
title: "Practice: Bayes and conditional probability puzzles"
estimatedMinutes: 14
difficulty: medium
tags: [probability, bayes, conditional-probability, puzzles, practice]
---

## Why it matters

Bayes and conditional-probability puzzles are the most common probability screens: boy-girl variants, test positives, prisoners and box problems. They are all the same machine, and the failure mode is always an unclear sample space. This set drills the playbook. See the Bayes, conditional probability and Monty Hall lessons for the basics.

## Concept

**Playbook**: (1) list the elementary equally likely outcomes; (2) write down exactly what you were told, as an event, and **how you learned it** (random child vs. "at least one"; host's rule); (3) restrict to that event and renormalize; (4) sanity-check with a limiting case.

**Odds form** is the fastest way to update: posterior odds = prior odds $\times$ likelihood ratio, with $\text{LR} = P(e\mid H)/P(e\mid \neg H)$. Independent evidence multiplies. A positive from a test with sensitivity $s$ and false-positive rate $f$ has LR $= s/f$.

**Classic traps**:

| Puzzle | Answer | Why |
|---|---|---|
| Two kids, at least one boy | 1/3 | space {BB, BG, GB} |
| Two kids, older is a boy | 1/2 | fixes one coordinate |
| At least one boy born on Tuesday | 13/27 | day info makes "which child" nearly identifiable |
| Bertrand's box: drew gold, other side gold | 2/3 | GG box produces gold twice as often as GS |
| Monty Hall (host knows) | switch wins 2/3 | host's choice is informative |
| Three prisoners: told B is executed | A still 1/3 | A learned nothing about himself |

**Unifying idea**: update the probability of each *hypothesis* (box, door, true state) by the likelihood of the *observation as it was generated*, not just by whether it is consistent. Monty Hall and the Tuesday-boy problem differ from naive answers only because the observation process is not uniform over the hypotheses.

## Worked example

Disease with prevalence 1%; a test has sensitivity 90% and false-positive rate 5%. Compute the posterior after one and after two positive results.

Prior odds $= 1/99$; $\text{LR} = 0.9/0.05 = 18$. After one positive: odds $= 18/99$, so $P = 18/117 = 0.154$. After a second independent positive: odds $= 324/99$, so $P = 324/423 = 0.766$.

Bertrand's box: boxes GG, GS, SS with equal prior $1/3$; you draw one coin at random and it is gold. Likelihoods of gold: $1, \tfrac12, 0$. Posterior $\propto (\tfrac13, \tfrac16, 0)$, i.e. $(2/3, 1/3, 0)$. The other coin is gold exactly when the box is GG, so the answer is $2/3$, not the tempting $1/2$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A family has two children. You learn that the older child is a boy. What is the probability that both are boys?",
  "options": [
    "1/3",
    "1/2",
    "1/4",
    "2/3"
  ],
  "answer": 1,
  "explanation": "Conditioning on a specific child fixes one coordinate; the other child is independent, so 1/2. Contrast with \"at least one is a boy\", where the space is {BB, BG, GB} and the answer is 1/3."
}
```

```quiz
{
  "id": "q2",
  "question": "A test has 90% sensitivity and a 5% false-positive rate. Prevalence is 1%. After two independent positive tests (conditionally independent given status) the posterior is about:",
  "options": [
    "18%",
    "50%",
    "77%",
    "95%"
  ],
  "answer": 2,
  "explanation": "Prior odds 1:99 times $18^2 = 324$ gives odds 324:99, so $P = 324/423 \\approx 0.766$. One positive gives only about 15%."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Odds-form Bayes. Implement `likelihood_ratio(sens, fpr)` (positive-result LR $= \\text{sens}/\\text{fpr}$) and `posterior(prior, lrs)`, which converts the prior probability to odds, multiplies by every likelihood ratio in `lrs` (independent tests) and converts back to a probability.",
  "starterCode": "def likelihood_ratio(sens, fpr):\n    pass\n\ndef posterior(prior, lrs):\n    pass\n",
  "tests": "lr = likelihood_ratio(0.9, 0.05)\nassert abs(lr - 18) < 1e-9\nassert abs(posterior(0.01, [lr]) - 18 / 117) < 1e-12\nassert abs(posterior(0.01, [lr, lr]) - 324 / 423) < 1e-12\nassert abs(posterior(0.3, []) - 0.3) < 1e-12\nassert abs(posterior(0.5, [4]) - 0.8) < 1e-12\nassert abs(posterior(0.5, [4, 0.25]) - 0.5) < 1e-12",
  "solution": "def likelihood_ratio(sens, fpr):\n    return sens / fpr\n\ndef posterior(prior, lrs):\n    odds = prior / (1 - prior)\n    for lr in lrs:\n        odds *= lr\n    return odds / (1 + odds)",
  "hints": [
    "odds $= p/(1-p)$ and $p = \\text{odds}/(1 + \\text{odds})$.",
    "Posterior odds = prior odds $\\times \\prod$ LRs, valid when tests are conditionally independent given the state."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `cond_prob(outcomes, event, given)` that returns the exact `Fraction` $P(\\text{event} \\mid \\text{given})$ over a list of equally likely `outcomes`; `event` and `given` are predicates on an outcome. Then use it on the two-children puzzle: `children()` should return all ordered pairs of `(sex, day)` with sex in `'BG'` and day in `range(7)` (Tuesday is day 1).",
  "starterCode": "from fractions import Fraction\nfrom itertools import product\n\ndef cond_prob(outcomes, event, given):\n    pass\n\ndef children():\n    pass\n",
  "tests": "kids = [(a, b) for a in 'BG' for b in 'BG']\nboth = lambda o: o[0] == 'B' and o[1] == 'B'\nassert cond_prob(kids, both, lambda o: 'B' in o) == Fraction(1, 3)\nassert cond_prob(kids, both, lambda o: o[0] == 'B') == Fraction(1, 2)\nc = children()\nassert len(c) == 196\nboth2 = lambda o: o[0][0] == 'B' and o[1][0] == 'B'\ntue_boy = lambda o: (('B', 1) in o)\nassert cond_prob(c, both2, tue_boy) == Fraction(13, 27)\nassert cond_prob(c, both2, lambda o: o[0][0] == 'B') == Fraction(1, 2)\nassert cond_prob(c, both2, lambda o: 'B' in (o[0][0], o[1][0])) == Fraction(1, 3)",
  "solution": "from fractions import Fraction\nfrom itertools import product\n\ndef cond_prob(outcomes, event, given):\n    g = [o for o in outcomes if given(o)]\n    return Fraction(sum(1 for o in g if event(o)), len(g))\n\ndef children():\n    kid = [(s, d) for s in 'BG' for d in range(7)]\n    return list(product(kid, kid))",
  "hints": [
    "Filter to outcomes satisfying `given`, then count those that also satisfy `event`.",
    "Each child has 14 equally likely (sex, day) states, so 196 ordered pairs."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `bayes_table(prior, likelihood)` where both are dicts over hypotheses (values are `Fraction`s): return the posterior dict $P(h \\mid e) = P(h)P(e \\mid h)/\\sum_{h'} P(h')P(e \\mid h')$. Then model Bertrand's box and Monty Hall with it by writing `bertrand()` and `monty()`, each returning the posterior dict.",
  "starterCode": "from fractions import Fraction\n\ndef bayes_table(prior, likelihood):\n    pass\n\ndef bertrand():\n    # boxes GG, GS, SS; you draw a gold coin\n    pass\n\ndef monty():\n    # you pick door 1, host opens door 3 (a goat)\n    pass\n",
  "tests": "t = bayes_table({'a': Fraction(1, 2), 'b': Fraction(1, 2)}, {'a': Fraction(1, 4), 'b': Fraction(3, 4)})\nassert t == {'a': Fraction(1, 4), 'b': Fraction(3, 4)}\nb = bertrand()\nassert b['GG'] == Fraction(2, 3) and b['GS'] == Fraction(1, 3) and b['SS'] == 0\nm = monty()\nassert m[1] == Fraction(1, 3) and m[2] == Fraction(2, 3) and m[3] == 0",
  "solution": "from fractions import Fraction\n\ndef bayes_table(prior, likelihood):\n    joint = {h: prior[h] * likelihood[h] for h in prior}\n    z = sum(joint.values())\n    return {h: v / z for h, v in joint.items()}\n\ndef bertrand():\n    prior = {'GG': Fraction(1, 3), 'GS': Fraction(1, 3), 'SS': Fraction(1, 3)}\n    like = {'GG': Fraction(1), 'GS': Fraction(1, 2), 'SS': Fraction(0)}\n    return bayes_table(prior, like)\n\ndef monty():\n    prior = {1: Fraction(1, 3), 2: Fraction(1, 3), 3: Fraction(1, 3)}\n    like = {1: Fraction(1, 2), 2: Fraction(1), 3: Fraction(0)}\n    return bayes_table(prior, like)",
  "hints": [
    "Bertrand: the likelihood of drawing gold is the fraction of gold coins in each box.",
    "Monty: if the car is behind door 1 the host picks door 3 with probability 1/2; if behind 2 he must pick 3; if behind 3 he cannot."
  ]
}
```

> [!TIP] Interview tips
> - Say out loud what the sample space is and how the information was revealed. Most wrong answers come from skipping this.
> - Use natural frequencies ("out of 10,000 people") or the odds form to communicate base-rate problems; quote both the one-test and two-test posterior.
> - Pitfall: treating repeated tests as independent when they share a cause (same lab error); conditional independence given the true state is an assumption to state.
