---
id: analytics-bi-communicating-to-non-technical-stakeholders
title: Communicating to non-technical stakeholders
estimatedMinutes: 8
difficulty: easy
tags: [storytelling, communication, stakeholders, uncertainty]
---

## Why it matters
Analysis only matters if the audience acts on it. Behavioral and case interviews for analytics roles routinely ask: "Explain this result to a VP who hates statistics." They are checking whether you lead with the answer and translate jargon into decisions.

## Concept
**Start from the audience**, not the method. Ask: who is this for, what decision do they own, how much time do they have, what do they already believe?

**Principles**
- **Answer first (BLUF / pyramid principle)**: conclusion, then the 2-3 supporting reasons, then details on request. Never narrate your process chronologically.
- **Translate to impact**: say "about 12,000 more orders a month", not "a 3.1% relative lift". Use their units: dollars, customers, hours.
- **One message per slide or chart**, and a title that states it ("Mobile conversion fell 20% after the release"), not "Conversion by platform".
- **Avoid jargon**; if a term is needed, define it with an analogy. "p-value" becomes "how often we would see a gap this big if nothing had really changed".
- **Make uncertainty usable**: give a range and a plain-language confidence ("likely between +0.4 and +3 points; we are fairly sure it is positive") plus what would change the call.
- **Compare, don't dump**: show numbers against a baseline, target or last period. A bare "4.2%" means nothing.
- **Simple visuals**: bars and lines, sorted, labelled directly, one highlight colour. Remove gridlines, legends and 3-D effects.
- **Anticipate the questions**: "Is the data reliable?", "What should we do?", "What does it cost?", "What could go wrong?". Have a backup slide for each.

**Close with an ask**: a decision, an owner and a date. Then listen; if people look confused, the problem is your framing, not their intelligence.

## Worked example
Raw finding: "The A/B test shows treatment lifted conversion by 0.9 pp (95% CI [0.2, 1.6], p = 0.012) via a two-sided z-test."

Rewritten for a VP:

> "Recommendation: ship the new checkout. It should add roughly 1 extra order per 100 visitors, about \$420K a year at current traffic. We ran it on 40,000 shoppers for two weeks; the effect is very unlikely to be luck, and even in the pessimistic case it is positive (+0.2 points). Risk: we only tested on desktop. Decision needed by Friday to hit the holiday freeze."

It leads with the decision, converts points into dollars, gives a range, names a risk and sets a deadline. The statistics go to the appendix.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You present a churn analysis to the CMO in 5 minutes. Which opening is best?",
  "options": [
    "A summary of the data sources and cleaning steps",
    "A description of the model's features and hyperparameters",
    "\"Churn rose from 3% to 4.5% because of the June price change; targeting the 20K affected customers with an offer could save about $600K\"",
    "A table of all 40 metrics with p-values"
  ],
  "answer": 2,
  "explanation": "Lead with the conclusion and its business impact, then support it. Method details belong in the appendix for people who ask."
}
```

```quiz
{
  "id": "q2",
  "question": "A stakeholder asks \"So is it significant?\" about an uncertain result. Which reply is most useful?",
  "options": [
    "\"p = 0.07, so we fail to reject the null.\"",
    "\"It might work, who knows.\"",
    "\"Probably positive: our best guess is +2%, plausible range -0.2% to +4%. I would pilot it in one region before rolling out.\"",
    "\"The result is statistically insignificant, so ignore it.\""
  ],
  "answer": 2,
  "explanation": "Give a best estimate, a range in plain language and a recommended action. That keeps the uncertainty honest and the decision moving."
}
```

## Practice

```reveal
{
  "prompt": "Interview: \"Explain to a non-technical VP why we should not trust last month's 15% jump in sign-ups, which came from a single marketing campaign.\" How do you structure the answer?",
  "answer": "**Lead with the conclusion**: \"I would not bake the 15% into the forecast yet: it looks like a one-off campaign effect, and we cannot yet say it will repeat.\"\n\n**Three reasons in plain words**\n1. *Timing*: the jump started the day the campaign launched and has already faded to +4% in week 4.\n2. *Quality*: those users convert to paid at half the usual rate, so extra sign-ups do not mean extra revenue.\n3. *Noise*: a single month cannot separate the campaign from seasonality; last year's same month was +8%.\n\n**Impact**: planning on +15% would overstate Q3 revenue by about $300K.\n\n**Ask**: forecast on +4-6% as the base case, keep +15% as the upside scenario, and re-check in 4 weeks with a holdout group.\n\n**Backup ready**: cohort chart by sign-up week, paid-conversion by source, last year's seasonality."
}
```

```reveal
{
  "prompt": "Translate for a general audience: \"The 95% confidence interval for the mean order value is [$48, $56].\"",
  "answer": "\"Our best estimate is that the average order is about $52. Given how much orders vary, we are fairly confident the true average is somewhere between $48 and $56.\" Avoid claiming there is a 95% probability the true value is in this particular range; say how sure you are and what the range means for the decision (for example, whether the goal of $50 is realistic)."
}
```

> [!TIP] Interview tips
> - Use a one-sentence structure: "We should X because Y, which is worth Z; the main risk is R." Practise saying it out loud in 30 seconds.
> - Match depth to audience: executives get the decision and impact, partners get trade-offs, analysts get methods. Say that you would adapt.
> - Never hide limitations; state them briefly with how they change the recommendation. Credibility comes from calibrated confidence, not from certainty.
