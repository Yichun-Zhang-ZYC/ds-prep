---
id: behavioral-questions-to-ask-interviewers
title: "Questions to ask the interviewer"
estimatedMinutes: 10
difficulty: easy
tags: [behavioral, questions, evaluation, interview]
---

## Why it matters
The basic question categories are covered in *Questions to ask the interviewer*. This lesson goes one level deeper: choosing questions as **tests of hypotheses** about the job, matching them to each interviewer and round, and knowing what a good or worrying answer sounds like. You are also deciding whether to accept an offer, so the quality of your information matters.

## Concept
**Start from hypotheses**: before the interview write the 3-4 things you most need to know (e.g. "Does DS influence decisions or only report?", "Is the data trustworthy?", "Will I grow?"). Each question should test one of them.

**Question ladder** (open → specific → follow-up): "How do analyses turn into decisions here?" → "Can you give a recent example where the data changed a plan?" → "What happened when it contradicted someone's view?" Specific examples are harder to answer with polish.

**Match the interviewer**: hiring manager (success in 90 days, priorities, how performance is judged, team gaps); peer (a typical week, code review, on-call, what they would change, how disagreement works); cross-functional partner (what they want from DS, where it falls short); senior leader (strategy, how much DS is invested in, what would make the team a failure next year).

**Match the round**: early rounds (scope, team, process); later rounds (expectations, risks, growth); with the recruiter (process, timeline, level, compensation range).

**Questions that surface risk** (ask politely): "What would make someone in this role struggle?", "Why is the position open and how long has it been open?", "What was the last project that was cancelled and why?", "How are data quality problems prioritised?", "How much of the time is ad-hoc requests versus planned work?"

**Listen-fors**: green: concrete examples, named metrics, candour about problems, clear ownership. Red: vague "everything", blame of other teams, no way to describe success, a long list of recent departures, "we are a family". Take notes; use the follow-up.

**Etiquette**: 3-5 questions per interview, written down, no questions answered on the website, no first-round compensation or perks (ask the recruiter), end with "Is there anything about my background that gives you pause?" if the rapport is good.

## Worked example
**Scenario**: the final-round loop for a product data scientist role. Hypotheses: (H1) DS influences roadmap decisions; (H2) data is reliable; (H3) there is a path to senior.

**Question plan**

| Interviewer | Question | Hypothesis | Good sounds like | Worrying sounds like |
|---|---|---|---|---|
| Hiring manager | "What does success look like at 90 days and at 12 months?" | H1, H3 | Specific deliverables and a metric, plus how it is reviewed | "Just get up to speed", no metric |
| Hiring manager | "Tell me about a decision the team changed last quarter because of an analysis." | H1 | A named decision with a number | "We mostly support requests" |
| Peer DS | "How much time goes to data cleaning versus analysis, and what is being done about it?" | H2 | A rough split (for example 30/70), a plan, an owner | "Data is a mess, but that's startups" |
| Product partner | "What do you wish DS did differently?" | H1 | Honest, specific, solvable feedback | "Nothing, they are great" (no candour) or open hostility |
| Senior leader | "Where do you want the DS team to be in two years?" | H3 | Clear strategy, headcount, scope growth | Vague or inconsistent with the hiring manager |

**Follow-up in action**: the peer says "we spend about 60% on cleaning". Follow up: "What is the biggest cause, and is there a project to fix it?" If the answer is "we have a data-quality initiative with two engineers and a dashboard", H2 is plausible; if "no one owns it", it is a risk to price into your decision.

**After the loop**: write down each answer against the hypotheses; cross-check across interviewers (inconsistency about priorities is itself information); then decide what to verify with the recruiter or via a reference call before accepting.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the best reason to prepare questions around hypotheses about the role?",
  "options": [
    "It makes the interview shorter",
    "Each question tests something you need to know to decide, and answers can be compared across interviewers",
    "Interviewers prefer scripted questions",
    "It avoids having to listen"
  ],
  "answer": 1,
  "explanation": "Hypothesis-driven questions turn the conversation into evidence for your decision."
}
```

```quiz
{
  "id": "q2",
  "question": "Which answer to 'How does disagreement get resolved?' is the biggest red flag?",
  "options": [
    "'We write short docs and the decision owner decides after hearing everyone.'",
    "'We rarely disagree; everyone just does what leadership wants.'",
    "'It depends on the stakes; for big ones we escalate to the director.'",
    "'Experiments settle most product disagreements.'"
  ],
  "answer": 1,
  "explanation": "No visible disagreement process suggests hierarchy over evidence, a poor setting for a data scientist."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "`bank` is a list of `(text, audiences, priority)` where `audiences` is a set of interviewer types. Write `select_questions(bank, audience, k)` returning the texts of the `k` highest-priority questions suitable for `audience` (sorted by priority descending, ties by text alphabetically).",
  "starterCode": "def select_questions(bank, audience, k):\n    pass\n\nB = [('90 day success?', {'manager'}, 5), ('On-call load?', {'peer'}, 4)]\nprint(select_questions(B, 'manager', 3))\n",
  "tests": "B = [('90 day success?', {'manager'}, 5), ('On-call load?', {'peer'}, 4), ('Strategy?', {'leader', 'manager'}, 3), ('Typical week?', {'peer', 'manager'}, 4), ('Decision changed?', {'manager', 'peer'}, 5)]\nassert select_questions(B, 'manager', 3) == ['90 day success?', 'Decision changed?', 'Typical week?']\nassert select_questions(B, 'peer', 2) == ['Decision changed?', 'On-call load?']\nassert select_questions(B, 'leader', 5) == ['Strategy?']\nassert select_questions(B, 'recruiter', 2) == []",
  "solution": "def select_questions(bank, audience, k):\n    pool = [(-p, t) for t, a, p in bank if audience in a]\n    return [t for _, t in sorted(pool)[:k]]",
  "hints": [
    "Filter by audience first, then sort by (-priority, text).",
    "Slice the first k after sorting."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `red_flag_score(answer, flags)` where `flags` is a dict `{phrase: weight}`. Return the sum of weights of the phrases that appear in `answer` (case-insensitive substring match, each phrase counted once). Use it to rate interview answers: higher means more worrying.",
  "starterCode": "def red_flag_score(answer, flags):\n    pass\n\nF = {'we are a family': 2, 'no one owns': 3, 'startup': 1}\nprint(red_flag_score('Data? No one owns it, but that is a startup thing.', F))\n",
  "tests": "F = {'we are a family': 2, 'no one owns': 3, 'startup': 1}\nassert red_flag_score('Data? No one owns it, but that is a startup thing.', F) == 4\nassert red_flag_score('Clear owner and a metric.', F) == 0\nassert red_flag_score('WE ARE A FAMILY. startup startup', F) == 3\nassert red_flag_score('', F) == 0",
  "solution": "def red_flag_score(answer, flags):\n    text = answer.lower()\n    return sum(w for phrase, w in flags.items() if phrase.lower() in text)",
  "hints": [
    "Lower-case the answer and each phrase before testing containment.",
    "Iterate over the dict so each phrase is counted at most once."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Do you have any questions for us?' Give a model closing sequence for the last 5 minutes with a hiring manager.",
  "answer": "**Question 1 (role and success)**: \"What would a great first six months look like for this role, and how would you tell? ... What was the main thing your last hire in this seat did well?\"\n\n**Question 2 (evidence of influence)**: \"Could you share a recent example where analysis changed a decision? ... What happened when the result was unwelcome?\"\n\n**Question 3 (risk)**: \"What is the hardest part of this role that candidates usually underestimate?\"\n\n**Closing**: \"Based on what we discussed, is there anything about my background that gives you pause? I would like to address it.\" Then thank them and confirm next steps and timeline.\n\n**Notes**: pick the 3 that fit what you heard; write the answers down; never ask something the job post answers."
}
```

> [!TIP] Interview tips
> - Prepare questions as tests of 3-4 hypotheses about the job and tailor them to each interviewer.
> - Ask for concrete examples and follow up; cross-check answers across interviewers.
> - Pitfall: questions answered on the website, early compensation questions, or asking nothing.
