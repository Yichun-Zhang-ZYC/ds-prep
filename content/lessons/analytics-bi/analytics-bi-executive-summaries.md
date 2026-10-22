---
id: analytics-bi-executive-summaries
title: Executive summaries
estimatedMinutes: 8
difficulty: easy
tags: [storytelling, executive-summary, writing, recommendations]
---

## Why it matters
Executives read the first paragraph and decide whether to read the rest. Analytics interviews often ask you to summarise an analysis in a few sentences, or to critique a rambling summary. A strong summary shows you can prioritise.

## Concept
An **executive summary** is a standalone, one-page (or shorter) answer that lets a busy reader decide and act without opening the full report.

**Structure (answer first)**
1. **Headline / bottom line**: the recommendation or key finding in one sentence, with the main number.
2. **Context**: why we looked (the business question, trigger, scope) in 1-2 lines.
3. **Key findings**: 3 at most, each with a number and a comparison (vs last period, target, control).
4. **Impact**: what it is worth in revenue, cost, customers or risk, with a range.
5. **Recommendation and next steps**: the decision requested, owner, timeline, cost.
6. **Risks, caveats and confidence**: data gaps, assumptions, what would change the conclusion.

**Writing rules**
- Aim for 100-200 words; write it **last** so it matches the final analysis.
- One idea per sentence, active voice, concrete verbs ("raise", "pause", "approve"), no hedging filler.
- Quantify everything; prefer absolute and relative change together ("+1.2 pts, +18%").
- Rank by importance, not by the order you discovered things.
- Put method and extra charts in an appendix and link to it.
- Test: could someone read only this and make the right decision? Would they be surprised by anything later?

Common failures: starting with methodology, burying the recommendation, listing every metric, vague claims ("engagement improved"), and no ask.

## Worked example
Weak draft: "We pulled data from three systems and analysed trends in customer behaviour over Q2. There were many interesting patterns, including differences by region and channel. Churn is something we should keep an eye on."

Rewritten:

> **Recommendation: pause the Q3 discount on the Basic plan.** Basic-plan churn rose from 3.0% to 4.5% a month after the June discount ended, costing about \$180K in recurring revenue (est. range \$140-220K). Three drivers: (1) 70% of the extra churn is customers acquired through the discount; (2) their 30-day activity was 40% below full-price customers; (3) retention on other plans was flat. Extending a smaller 10% offer to at-risk users should recover about half of the loss for \$25K. **Decision needed by 15 July.** Caveat: based on 6 weeks of data and no holdout; we will validate with a 4-week test.

The rewrite has a headline, a quantified impact, ranked reasons, an ask with a date, and an honest caveat, in about 90 words.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which element should come first in an executive summary?",
  "options": [
    "Data sources and methodology",
    "The bottom-line recommendation or key finding",
    "A list of all metrics analysed",
    "Acknowledgements and project background"
  ],
  "answer": 1,
  "explanation": "Executives may read only the first lines, so lead with the conclusion and the number that matters. Methods and background go below or in an appendix."
}
```

```quiz
{
  "id": "q2",
  "question": "Which finding statement is best suited for a summary?",
  "options": [
    "\"Engagement improved significantly.\"",
    "\"Weekly active users rose 8% (from 1.25M to 1.35M), driven by the new onboarding flow.\"",
    "\"We observed several interesting trends in user behaviour.\"",
    "\"The p-value for the difference was 0.03.\""
  ],
  "answer": 1,
  "explanation": "A good finding is specific, quantified, comparative and tied to a cause or action. Vague wording and bare statistics do not support a decision."
}
```

## Practice

```reveal
{
  "prompt": "Rewrite this as a 60-80 word executive summary: \"We analysed 12 weeks of support data. Ticket volume is up and response times are longer. Most tickets are about billing. Some customers are unhappy. The team is stretched. We looked at several options.\" Assume you also found: tickets +35% (4,000 to 5,400/week), median first response 6h to 14h (target 4h), 55% of the increase is billing-invoice confusion after the new invoice layout, CSAT fell 4.5 to 3.9, and two options: fix the invoice template (2 weeks, $15K) or hire 3 agents ($45K per quarter).",
  "answer": "**Recommendation: fix the invoice template now (2 weeks, $15K), and delay hiring.**\n\nWeekly tickets rose 35% (4,000 to 5,400) and median first response slipped from 6h to 14h against a 4h target; CSAT fell from 4.5 to 3.9. Invoice confusion after the new layout explains 55% of the increase. Hiring three agents costs $45K per quarter and treats the symptom, not the cause. Expect the template fix to remove about 800 tickets a week. **Approval needed this week.** Risk: the other 45% of growth is unexplained; we will re-check volume in 4 weeks.\n\nWhy it works: headline recommendation first, numbers with comparisons, cause ranked by share, cost of options, a dated ask and one honest caveat. Check: $0.55 \\times 1{,}400 = 770 \\approx 800$ tickets/week."
}
```

```reveal
{
  "prompt": "Interview: \"You have 2 minutes with the CEO in an elevator. How do you give your analysis of why subscriber growth slowed?\" Outline the structure.",
  "answer": "Use headline, evidence, ask: (1) one-sentence answer with the number (\"Growth slowed from 6% to 3% a month, almost entirely because paid acquisition got 40% more expensive\"); (2) two supporting facts with comparisons (CAC $38 to $53, organic and referral flat); (3) the recommendation and cost (\"shift $200K to referral incentives; pilot in two markets\"); (4) one risk and the date you will report back. Stop and let the CEO ask. Do not describe methodology unless asked."
}
```

> [!TIP] Interview tips
> - Practise the one-sentence version first ("We should X because Y, worth Z"); the paragraph is just that sentence expanded.
> - Be ready to defend each number: say where it came from, the comparison, and the uncertainty range. Use a range when the estimate is soft.
> - Always include the ask (decision, owner, date) and one caveat. A summary without a recommendation is a status report.
