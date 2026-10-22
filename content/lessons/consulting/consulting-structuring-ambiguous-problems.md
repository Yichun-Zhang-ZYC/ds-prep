---
id: consulting-structuring-ambiguous-problems
title: Structuring ambiguous problems
estimatedMinutes: 12
difficulty: medium
tags: [consulting, issue-tree, mece, hypothesis-driven]
---

## Why it matters
Prompts like "Why did our app's revenue drop?" or "Should we launch in Brazil?" arrive vague on purpose. Interviewers want to see you impose structure, prioritise and stay hypothesis-driven instead of listing every possible cause.

## Concept
**Step 1, define the problem**: restate it as a decision or a measurable question ("Identify what drove the 12% revenue drop in Q3 and what to do about it"). Confirm metric definition, time window, comparison baseline and success criterion.

**Step 2, build an issue tree**: break the question into branches that are **MECE**. Test every split: no overlap, nothing missing. Good splits are arithmetic (revenue = users x conversion x order value), process-based (acquire, activate, retain) or stakeholder-based (customer, company, competitor). Two or three levels is enough.

**Step 3, hypothesis-driven prioritisation**: state the most likely cause first and why; rank branches by (probability x impact) / effort. Do not explore the tree breadth-first.

**Step 4, analyse and iterate**: pick the cut of data that would confirm or kill the hypothesis fastest (for revenue: decompose by segment, channel, time; check whether the drop is broad or concentrated). Update the tree as evidence arrives and drop dead branches out loud.

**Step 5, synthesise**: answer first, then 2-3 supporting points, risks and next steps. Distinguish **what we know, what we assume, what we need to find out**.

## Worked example
Prompt: "Our subscription app's monthly revenue fell from \$200,000 to \$163,800. Why?"

Tree (arithmetic split): revenue = active users x conversion to paid x average revenue per paying user (ARPPU). Data: users 100,000 to 90,000; conversion 4.0% to 3.5%; ARPPU \$50 to \$52. Hypothesis: a drop in users (acquisition) is the main driver.

Sequential attribution: users first: $90{,}000 \cdot 0.04 \cdot 50 = \$180{,}000$ (effect -\$20,000). Then conversion: $90{,}000 \cdot 0.035 \cdot 50 = \$157{,}500$ (effect -\$22,500). Then ARPPU: $90{,}000 \cdot 0.035 \cdot 52 = \$163{,}800$ (effect +\$6,300). Total: $-20{,}000 - 22{,}500 + 6{,}300 = -\$36{,}200$.

The hypothesis is only half right: conversion is the biggest driver, then users, partly offset by price. Next cut: conversion by acquisition channel and platform; a new low-intent paid channel would explain both the user mix change and lower conversion.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which split of 'why did revenue drop?' is MECE?",
  "options": [
    "Marketing, product, bad luck",
    "Existing customers vs new customers",
    "Price, quality, and customer service",
    "Users, conversion, and order value (revenue = product)"
  ],
  "answer": 3,
  "explanation": "Revenue = users x conversion x order value is an exact identity, so the branches cannot overlap or miss anything."
}
```

```quiz
{
  "id": "q2",
  "question": "What does 'hypothesis-driven' mean in a case interview?",
  "options": [
    "Memorise answers before the interview",
    "State a likely answer early and design analyses to confirm or reject it",
    "Explore every branch equally",
    "Wait for the interviewer to give data"
  ],
  "answer": 1,
  "explanation": "You propose the most probable explanation first, then choose the fastest test, rather than exhaustively exploring."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `attribute(before, after)` where each is a tuple `(users, conversion, arppu)`. Compute revenue = users * conversion * arppu and return a dict with `users`, `conversion`, `arppu` effects using sequential substitution in that order (change users first, then conversion, then arppu), plus `total`. Also write `rank_branches(branches)`, where each branch is `(name, probability, impact, effort)`; return names sorted by probability * impact / effort descending (ties by name).",
  "starterCode": "def attribute(before, after):\n    pass\n\ndef rank_branches(branches):\n    pass\n\nprint(attribute((100000, 0.04, 50), (90000, 0.035, 52)))\n",
  "tests": "d = attribute((100000, 0.04, 50), (90000, 0.035, 52))\nassert abs(d['users'] + 20000) < 1e-6\nassert abs(d['conversion'] + 22500) < 1e-6\nassert abs(d['arppu'] - 6300) < 1e-6\nassert abs(d['total'] + 36200) < 1e-6\nassert abs(d['users'] + d['conversion'] + d['arppu'] - d['total']) < 1e-6\nb = [('pricing', 0.2, 100, 2), ('channel mix', 0.5, 80, 2), ('bug', 0.1, 300, 1), ('seasonality', 0.3, 20, 1)]\nassert rank_branches(b) == ['bug', 'channel mix', 'pricing', 'seasonality']\nassert rank_branches([('b', 1, 1, 1), ('a', 1, 1, 1)]) == ['a', 'b']",
  "solution": "def attribute(before, after):\n    u0, c0, a0 = before\n    u1, c1, a1 = after\n    r0 = u0 * c0 * a0\n    r1 = u1 * c0 * a0\n    r2 = u1 * c1 * a0\n    r3 = u1 * c1 * a1\n    return {'users': r1 - r0, 'conversion': r2 - r1, 'arppu': r3 - r2, 'total': r3 - r0}\n\ndef rank_branches(branches):\n    scored = [(-(p * i / e), n) for n, p, i, e in branches]\n    return [n for _, n in sorted(scored)]",
  "hints": [
    "Compute four revenues: r0, then swap in one new factor at a time.",
    "Sort on (-score, name) to get descending score with alphabetical ties."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Our delivery app's order volume dropped 15% last month. Structure your approach.'",
  "answer": "**Clarify**: Drop vs last month, last year, or forecast? All cities or some? Did we change anything (pricing, UI, promos)? Did the metric definition change (e.g. orders vs completed orders)?\n\n**Tree**: Orders = active customers x orders per customer.\n- Active customers = new + returning (reactivated + retained). Check acquisition spend/traffic, install-to-order conversion, churn.\n- Orders per customer = frequency by segment; basket/menu availability; delivery time and fees.\n- Cross-cutting: supply (restaurants, couriers, delivery time), external (weather, holidays, competitor promo), data (tracking bug).\n\n**Hypothesis**: a data or supply issue is most likely because a sudden 15% drop in one month is unusual for demand. Check tracking first (cheap), then delivery time and cancellation rate.\n\n**Analysis plan**: daily orders by city/platform to find a step change and its date; match against releases and promo calendar; funnel conversion at each step.\n\n**Close**: report what is known, assumed and unknown; propose a fix for the confirmed cause and a monitor to catch it earlier."
}
```

> [!TIP] Interview tips
> - Take 30-60 seconds of silence to draft the tree on paper; announce the structure before diving in.
> - Prefer arithmetic or process splits because they are provably MECE; avoid vague buckets like "other factors".
> - Pitfall: a flat list of 10 causes. Rank by likelihood and cost-to-test, and say which one you check first.
