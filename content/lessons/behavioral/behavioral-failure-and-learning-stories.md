---
id: behavioral-failure-and-learning-stories
title: "Failure and learning stories"
estimatedMinutes: 11
difficulty: medium
tags: [behavioral, failure, story-bank, follow-up]
---

## Why it matters
The basic failure answer (see *Failure and learning*) is only the start. Strong candidates arrive with a **story bank**: five or six well-rehearsed stories that cover many question types, and answers that survive the follow-up probes ("What would you do differently?", "How do you know it's fixed?"). Weak ones improvise and run out of material by round three.

## Concept
**Four failure archetypes** (have at least one story for each of three of them):
1. **Technical or analytical error**: leakage, a wrong join, an unvalidated assumption. Learning: tests, checks, review.
2. **Communication or expectation miss**: the stakeholder wanted something else, or misread your result. Learning: align on definitions and success metrics early.
3. **Prioritisation or scope failure**: over-engineering, missed deadline, wrong project. Learning: baselines first, timeboxes, saying no.
4. **Collaboration or people failure**: a strained relationship, unclear ownership, feedback you ignored. Learning: earlier, more direct conversations.

**Build the bank**: for each story write one line each for Situation, Task, Action, Result, **Learning** and **Evidence of applying it later**, with 2-3 numbers. Tag each with the themes it can answer: failure, conflict, ambiguity, deadline, influence, leadership, teamwork. Check coverage: every theme should have at least two candidate stories, and no single story should carry more than three themes in one interview loop.

**Reuse with a different emphasis**: the same project can answer "failure" (the mistake), "conflict" (the argument about the fix) or "leadership" (how you organised the recovery). Keep facts identical; change the spotlight.

**Prepare for probes**: "What was the cost?" (give a number), "Who else was affected and what did you tell them?", "What would you do differently *today*?" (a specific habit, not "communicate more"), "How do you know it's fixed?" (a check that fires automatically), "Was it really your fault?" (own your part, state context briefly).

**Quality bar**: stakes are real but recoverable; your decision mattered; no blame; the learning changed a process, and you can name the next time it mattered.

**Pitfalls**: a "failure" that is a disguised success; a story from 10 years ago with no recent evidence; hiding the cost; a lesson that is only a feeling ("I learned to be more careful").

## Worked example
**Story bank (excerpt)**

| Story | Archetype | Themes it can answer |
|---|---|---|
| Leaky forecast backtest | Technical | failure, ownership |
| Dashboard metric mismatch | Communication | failure, conflict, influence |
| Over-built recommender | Prioritisation | failure, deadline, ambiguity |
| Unowned data pipeline | Collaboration | leadership, conflict, teamwork |

**Story: dashboard metric mismatch** (illustrative)

**Situation and cost**: "I built a weekly retention dashboard. Product used it to claim 'retention is up 6 points' in a board deck. Two days later finance showed a 2-point *drop* using their definition. Both were arithmetically correct; the board lost confidence in all of our numbers for a month."

**Ownership**: "I never confirmed the definition of an 'active user' with finance. I assumed the product team's definition was shared."

**Response**: "Within 24 hours I wrote a one-page reconciliation of the two definitions with the exact difference (finance excludes free-trial users, 11% of the base), sent it to both teams and the board's chief of staff, and proposed we retire one."

**Systemic fix**: "I created a metric dictionary with owners, definitions and SQL, and made every dashboard link to it. New metrics now need sign-off from the two consuming teams."

**Evidence**: "Six months later a new churn metric had a definition conflict, caught in the review, before any slide used it."

**Probe: 'What would you do differently today?'** "Before building, I would write the definition on one line and have both owners reply 'agreed' in the ticket. It takes 10 minutes."

**Probe: 'Was it really your fault?'** "The org had no shared definition, which is context, not an excuse. I was the one who published the number without checking."

**Time split**: about 25% failure, 25% response, 50% fix and evidence.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which learning statement is strongest?",
  "options": [
    "'I learned to be more careful.'",
    "'I now require two owners to sign off a metric definition in a shared dictionary, and it caught a conflict last quarter.'",
    "'I learned that communication is important.'",
    "'It was a team failure, so nothing changed for me.'"
  ],
  "answer": 1,
  "explanation": "A strong lesson is a concrete, checkable change with later evidence of use."
}
```

```quiz
{
  "id": "q2",
  "question": "An interviewer asks 'How do you know it is fixed?' What do you give?",
  "options": [
    "'I believe it is.'",
    "An automatic check or monitor that would fire if it recurred, and an example of it catching something",
    "'Nobody complained.'",
    "'I asked my manager.'"
  ],
  "answer": 1,
  "explanation": "Evidence beats assurance: a mechanism that fires automatically, ideally with a real catch."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`stories` maps a story name to a set of themes it can answer. Write `uncovered(stories, themes, min_stories=1)` returning the sorted list of themes covered by fewer than `min_stories` stories.",
  "starterCode": "def uncovered(stories, themes, min_stories=1):\n    pass\n\nS = {'leak': {'failure', 'ownership'}, 'metric': {'failure', 'conflict'}}\nprint(uncovered(S, ['failure', 'conflict', 'deadline']))\n",
  "tests": "S = {'leak': {'failure', 'ownership'}, 'metric': {'failure', 'conflict'}, 'pipeline': {'leadership', 'conflict'}}\nT = ['failure', 'conflict', 'deadline', 'leadership']\nassert uncovered(S, T) == ['deadline']\nassert uncovered(S, T, 2) == ['deadline', 'leadership']\nassert uncovered({}, ['a', 'b']) == ['a', 'b']\nassert uncovered(S, []) == []",
  "solution": "def uncovered(stories, themes, min_stories=1):\n    out = []\n    for t in themes:\n        n = sum(1 for s in stories.values() if t in s)\n        if n < min_stories:\n            out.append(t)\n    return sorted(out)",
  "hints": [
    "Count, for each theme, how many stories contain it.",
    "Return sorted(out) so the result is deterministic."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `smallest_bank(stories, themes)`: greedily pick the story covering the most still-uncovered themes (ties broken alphabetically by name) until all coverable themes are covered or no story adds coverage. Return the picked names in order.",
  "starterCode": "def smallest_bank(stories, themes):\n    pass\n\nS = {'a': {'x', 'y'}, 'b': {'y', 'z', 'w'}, 'c': {'x'}}\nprint(smallest_bank(S, ['x', 'y', 'z', 'w']))\n",
  "tests": "S = {'a': {'x', 'y'}, 'b': {'y', 'z', 'w'}, 'c': {'x'}}\nassert smallest_bank(S, ['x', 'y', 'z', 'w']) == ['b', 'a']\nassert smallest_bank(S, ['x', 'q']) == ['a']\nassert smallest_bank(S, ['q']) == []\nassert smallest_bank({'m': {'t'}, 'n': {'t'}}, ['t']) == ['m']",
  "solution": "def smallest_bank(stories, themes):\n    remaining = set(themes)\n    picked = []\n    while remaining:\n        best, gain = None, 0\n        for name in sorted(stories):\n            g = len(stories[name] & remaining)\n            if g > gain:\n                best, gain = name, g\n        if best is None:\n            break\n        picked.append(best)\n        remaining -= stories[best]\n    return picked",
  "hints": [
    "Iterate names in sorted order and use a strict > comparison, so the first best story wins ties.",
    "Stop when the best gain is zero."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `answer_balance(sec_failure, sec_response, sec_learning)` returning `(shares, ok)`. `shares` is a tuple of the three parts as fractions of the total time. `ok` is True when the failure part is at most 30% and the learning part is at least 40%.",
  "starterCode": "def answer_balance(sec_failure, sec_response, sec_learning):\n    pass\n\nprint(answer_balance(30, 30, 60))\n",
  "tests": "s, ok = answer_balance(30, 30, 60)\nassert abs(s[0] - 0.25) < 1e-12 and abs(s[1] - 0.25) < 1e-12 and abs(s[2] - 0.5) < 1e-12 and ok is True\ns, ok = answer_balance(60, 30, 30)\nassert ok is False\ns, ok = answer_balance(20, 40, 40)\nassert ok is True and abs(s[2] - 0.4) < 1e-12\nassert answer_balance(40, 20, 40)[1] is False",
  "solution": "def answer_balance(sec_failure, sec_response, sec_learning):\n    total = sec_failure + sec_response + sec_learning\n    shares = (sec_failure / total, sec_response / total, sec_learning / total)\n    ok = shares[0] <= 0.30 + 1e-9 and shares[2] >= 0.40 - 1e-9\n    return shares, ok",
  "hints": [
    "Divide each part by the total, then compare the first and last share to the thresholds.",
    "Use a small tolerance for float comparisons at exactly 30% or 40%."
  ]
}
```

> [!TIP] Interview tips
> - Build a story bank of 5-6 stories tagged by theme and check coverage; reuse one story with different emphasis.
> - Prepare probe answers: cost in numbers, what you would do differently today, and the automatic check that proves it is fixed.
> - Pitfall: a vague lesson ('be more careful') with no later evidence of applying it.
