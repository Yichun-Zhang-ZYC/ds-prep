---
id: behavioral-negotiation-and-career-narrative
title: "Career narrative and 'why this role?'"
estimatedMinutes: 12
difficulty: medium
tags: [behavioral, career-narrative, motivation, negotiation]
---

## Why it matters
"Walk me through your resume", "Why are you changing jobs?", "Why this role rather than ML engineering or analytics?" and, at the end, "What are your compensation expectations?" are all versions of one question: does your story hang together, and do you know what you want? A coherent narrative makes every other answer more credible, and a prepared negotiation turns a good offer into a better one.

## Concept
See *Tell me about yourself* and *Why this company / role* for the basics. This lesson adds the **through-line** and the transitions.

**Narrative arc (60-90 seconds)**: **past** (what shaped your skills, 1-2 anchor achievements with numbers), **present** (what you do now and what you have outgrown), **future** (what you want next, which is *this role*). Pick a single through-line, for example "I like turning ambiguous business questions into measured decisions", and make every chapter serve it.

**Explain transitions positively and briefly**: a pivot (academia to industry: "I enjoyed the questions but wanted faster feedback loops and bigger impact"), a gap (say what you did, then pivot to readiness), short tenures (the reason, such as a layoff or a change in the company's direction, in one factual sentence), switching function (the common skill across roles). Never criticise a former employer.

**Why this role, not adjacent ones**: contrast with two neighbours. DS versus analyst: more modelling and experimentation, less reporting. DS versus ML engineer: closer to the business question, less to production infrastructure. Say what you *want more of*, then show evidence that you have already been doing it.

**Compensation basics**: let the employer name the first number when possible ("I'd like to understand the full scope and level first"). If pressed, give a researched **range** whose bottom you would accept, anchored to the market for the level and location (Levels.fyi, Glassdoor, recruiter calls), not to your current salary. Negotiate **after** an offer, once they want you; consider **total compensation** (base, bonus, equity, sign-on, level, start date, remote or location, learning budget). A competing offer, stated truthfully, is the strongest leverage. Be warm, specific and collaborative: "I am excited about this role; could we get base to X?" Get it in writing.

**Pitfalls**: a resume recital with no through-line; apologising for a pivot; lying about a competing offer; giving a number too early; accepting on the call; negotiating only base.

## Worked example
**Narrative (academic to product DS, about 55 seconds)**: "I did a PhD in epidemiology where I built models to estimate treatment effects from messy observational data; one project changed a hospital's screening policy, which I found far more motivating than the paper. For the last two years at a health-tech company I have run experiments and causal analyses for the onboarding funnel; one redesign raised activation 4 points and I learned how much I enjoy translating results for product managers. I now want a role where I own the measurement for a product from hypothesis to launch, with the data scale to do real experimentation. That is why this product DS role at a marketplace fits: it is the experimentation and causal work I do best, closer to decisions than a pure ML-engineer role, and with more modelling than an analyst role."

**Check**: one through-line ("turning ambiguous questions into decisions"), the pivot is framed by what I gained, two numbers, and the last sentence answers "why this role".

**Speaking time**: about 130 words at 150 words per minute is roughly 52 seconds, so there is room for one more quantified achievement to reach 60-75 seconds.

**Negotiation** (Illustrative, \$K): Offer A: base 150, 10% bonus, \$200K RSUs over 4 years, \$20K sign-on. Year-1 comp = $150 + 15 + 50 + 20 = 235$. Offer B: base 165, 10% bonus, \$120K RSUs over 4 years, no sign-on: $165 + 16.5 + 30 = 211.5$. A pays more in year 1 and averages $(4 \times 165 + 200 + 20)/4 = 220$ a year versus B's $211.5$.

**Script**: "I'm very excited about A. I have another offer at a similar level with a higher base; if you can bring base to 160 I would be glad to sign this week." Counter A: year 1 = 246 and a 4-year average of 231. Ask for the change in writing; if they cannot move base, ask for a larger sign-on or equity.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "How should you explain a pivot from academia to industry?",
  "options": [
    "Apologise and say academia did not work out",
    "Frame it by what you gained and what you want next, and connect it to the role",
    "Criticise the funding system",
    "Skip it and hope nobody asks"
  ],
  "answer": 1,
  "explanation": "A pivot is a choice. Frame it as moving toward something, with evidence that you already do the new work."
}
```

```quiz
{
  "id": "q2",
  "question": "A recruiter asks for your salary expectation in the first call. What is a good response?",
  "options": [
    "State your current salary",
    "Give a low number to seem easy to hire",
    "Ask about scope and level first, and if pressed give a researched range whose bottom you would accept",
    "Refuse to discuss compensation ever"
  ],
  "answer": 2,
  "explanation": "Delay the number until you know the level, then anchor on the market, not your current pay."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `year_one(base, bonus_pct, equity_total, vest_years, signing)` returning year-1 compensation: `base * (1 + bonus_pct) + equity_total / vest_years + signing`. Write `avg_annual(base, bonus_pct, equity_total, vest_years, signing)` returning the average per year over the vesting period: `base * (1 + bonus_pct) + (equity_total + signing) / vest_years`.",
  "starterCode": "def year_one(base, bonus_pct, equity_total, vest_years, signing):\n    pass\n\ndef avg_annual(base, bonus_pct, equity_total, vest_years, signing):\n    pass\n\nprint(year_one(150, 0.10, 200, 4, 20), avg_annual(150, 0.10, 200, 4, 20))\n",
  "tests": "assert abs(year_one(150, 0.10, 200, 4, 20) - 235) < 1e-9\nassert abs(avg_annual(150, 0.10, 200, 4, 20) - 220) < 1e-9\nassert abs(year_one(165, 0.10, 120, 4, 0) - 211.5) < 1e-9\nassert abs(avg_annual(165, 0.10, 120, 4, 0) - 211.5) < 1e-9\nassert abs(avg_annual(160, 0.10, 200, 4, 20) - 231) < 1e-9",
  "solution": "def year_one(base, bonus_pct, equity_total, vest_years, signing):\n    return base * (1 + bonus_pct) + equity_total / vest_years + signing\n\ndef avg_annual(base, bonus_pct, equity_total, vest_years, signing):\n    return base * (1 + bonus_pct) + (equity_total + signing) / vest_years",
  "hints": [
    "Sign-on is paid once, so spread it over the vesting years when averaging.",
    "Base 150 with 10% bonus is 165 a year; add 50 equity and 20 sign-on for year 1."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `speaking_seconds(text, wpm=150)` returning the estimated seconds to speak `text` (word count / wpm * 60), and `fits(text, limit_seconds, wpm=150)` returning True if the estimate is at most `limit_seconds`. Words are separated by whitespace.",
  "starterCode": "def speaking_seconds(text, wpm=150):\n    pass\n\ndef fits(text, limit_seconds, wpm=150):\n    pass\n\nprint(speaking_seconds('word ' * 190), fits('word ' * 190, 90))\n",
  "tests": "assert abs(speaking_seconds('word ' * 190) - 76) < 1e-9\nassert fits('word ' * 190, 90) is True\nassert fits('word ' * 250, 90) is False\nassert speaking_seconds('') == 0\nassert abs(speaking_seconds('a b c d e', 100) - 3) < 1e-9\nassert fits('word ' * 225, 90) is True",
  "solution": "def speaking_seconds(text, wpm=150):\n    return len(text.split()) / wpm * 60\n\ndef fits(text, limit_seconds, wpm=150):\n    return speaking_seconds(text, wpm) <= limit_seconds + 1e-9",
  "hints": [
    "text.split() handles repeated whitespace and empty strings.",
    "225 words at 150 wpm is exactly 90 seconds, so compare with <= and a tolerance."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `rank_offers(offers, weights)`. `offers` maps a name to a dict of criteria scores (1-5) and `weights` maps criteria to weights. Score = sum of `weight * score`. Return names sorted by score descending (ties alphabetically).",
  "starterCode": "def rank_offers(offers, weights):\n    pass\n\nO = {'A': {'pay': 5, 'growth': 3}, 'B': {'pay': 3, 'growth': 5}}\nprint(rank_offers(O, {'pay': 1, 'growth': 2}))\n",
  "tests": "O = {'A': {'pay': 5, 'growth': 3}, 'B': {'pay': 3, 'growth': 5}}\nassert rank_offers(O, {'pay': 1, 'growth': 2}) == ['B', 'A']\nassert rank_offers(O, {'pay': 2, 'growth': 1}) == ['A', 'B']\nassert rank_offers(O, {'pay': 1, 'growth': 1}) == ['A', 'B']\nassert rank_offers({}, {'pay': 1}) == []",
  "solution": "def rank_offers(offers, weights):\n    scored = []\n    for name, crit in offers.items():\n        s = sum(weights[c] * v for c, v in crit.items() if c in weights)\n        scored.append((-s, name))\n    return [n for _, n in sorted(scored)]",
  "hints": [
    "Compute a weighted sum per offer, then sort by (-score, name).",
    "With equal weights the two offers tie at 8, so alphabetical order decides."
  ]
}
```

> [!TIP] Interview tips
> - Choose one through-line, give past, present and future in 60-90 seconds, and end on why this role.
> - Frame transitions by what you gained; never criticise a former employer.
> - Negotiate after the offer, on total compensation, anchored on market data and a truthful competing offer.
