---
id: statistics-sampling-bias-selection-bias-survivorship-bias
title: Sampling bias, selection bias, survivorship bias
estimatedMinutes: 10
difficulty: easy
tags: [statistics, bias, data-quality, causal]
---

## Why it matters
More data doesn't fix a biased sample. Interviewers love "what's wrong with this analysis?" questions where the answer is a bias in who got into the data.

## Concept
| Bias | What happens | Classic example |
|---|---|---|
| Sampling bias | the sampling method over- or under-represents groups | phone survey reaches only people who answer unknown numbers |
| Selection bias | who ends up in the data depends on the outcome or a related factor | analyzing only users who opened the survey email |
| Survivorship bias | only the "survivors" are observed | studying successful startups to learn what makes startups succeed |
| Non-response bias | people who reply differ from people who don't | satisfaction surveys over-represent very happy and very angry users |

The common thread: the sample isn't a random draw from the population you want to describe, so even huge samples give the wrong answer.

## Worked example
"Users who use feature X retain 30% better, so feature X drives retention." Possible problems:

- Selection: engaged users are both more likely to discover X **and** to retain. Engagement confounds the comparison.
- Survivorship: if X is only visible after day 7, everyone who uses it has already survived the first week.

Fixes: compare against similar users (matching on prior engagement), use a fixed observation window that starts before exposure, or run an A/B test on X.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In WWII, analysts studied bullet holes on returning planes and proposed armoring the most-hit areas. Why was that wrong?",
  "options": ["The sample was too small", "Planes hit in other areas didn't return, so the holes show where planes can survive damage", "The holes were counted twice", "Armor makes planes slower"],
  "answer": 1,
  "explanation": "Classic survivorship bias: the missing planes carried the important information. Armor the areas without holes."
}
```

```reveal
{
  "prompt": "A product manager says: \"Our in-app survey shows 85% of users love the new design.\" What questions do you ask?",
  "answer": "Who saw and answered the survey? In-app surveys only reach active users (survivorship). Users who left after the redesign can't answer. Response rates matter too: if 5% responded, non-response bias is likely.\n\nAlso check the question wording and whether the survey was shown at a biased moment (e.g. right after a successful action).\n\nBetter evidence: behavioral metrics (retention, task success) compared against a control group, ideally an A/B test of the redesign."
}
```

> [!TIP] Interview tips
> - Always ask "how did these rows get into the data?" before trusting a comparison.
> - Name the bias precisely; interviewers reward the vocabulary.
> - Propose a fix: random sampling, reweighting, a pre-exposure observation window, or an experiment.
