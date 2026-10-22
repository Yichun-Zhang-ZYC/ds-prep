---
id: behavioral-explaining-models-to-executives
title: "Explaining models to executives"
estimatedMinutes: 11
difficulty: medium
tags: [behavioral, communication, executives, storytelling]
---

## Why it matters
Executives decide on budgets, launches and risk, not on model internals. Interviewers ask "Explain gradient boosting to a CEO" or "How would you present a churn model to the leadership team?" to test whether you can translate technical work into a decision, a number and a risk, in two minutes, without jargon.

## Concept
**Structure (answer first)**: (1) the **decision** or recommendation; (2) the **impact in business units** (dollars, customers, hours); (3) the **evidence** in one line (how you know it works: backtest, A/B test, comparison with today's process); (4) the **uncertainty and risks** (range, what could go wrong); (5) the **ask** (approve, fund, change a process) and the next step.

**Translate the metrics**: AUC, F1 and RMSE mean nothing to executives. Convert to: lift ("the top 10% of customers contain 40% of churners"), money (expected net value of acting on the model), and error in business terms ("forecasts are typically within 8%, about ±\$2M a quarter").

**Explain the model with one analogy**, not the mathematics: "like a very experienced loan officer who has seen a million files". Offer depth only if asked. If a technique matters (a black box in a regulated setting), say what it means for them: auditability, bias risk, cost to maintain.

**Show uncertainty honestly**: give ranges or scenarios ("base case \$1.2M, downside \$0.5M") instead of one number; explain what would change your mind.

**Handle the hard questions**: "Why should I trust it?" (validated on held-out data, compared with the current process, monitored after launch); "What if it's wrong?" (human review, thresholds, rollback); "What do you need from me?" (name the decision and date).

**Pitfalls**: starting with the method, burying the recommendation, reporting accuracy without a baseline, false precision, defending the model instead of the decision, and talking for ten minutes when you have two.

See *Presenting recommendations* for slide structure.

## Worked example
**Question**: "Present your churn model to the leadership team." (Illustrative numbers.)

**Weak answer**: "I trained a gradient-boosted model with 120 features, AUC 0.81, and tuned hyperparameters with cross-validation..." The audience cannot act on this.

**Strong answer (about 60 seconds)**: "I recommend we send a retention offer to the 10,000 customers the model ranks most likely to leave, about 10% of our 100,000 customers. Of the 5,000 customers who leave each year, this group contains about 2,000, a rate of 20% versus the 5% average, so 4x better than random. At \$10 per offer, a 25% save rate and \$300 of value per saved customer, the campaign nets about \$50,000 per round. Random targeting of the same size would lose about \$62,500. We checked this on last year's data and will confirm with a 4-week test with a holdout group. The main risk is that the 25% save rate is assumed: at 15% the campaign loses about \$10,000, so the test measures exactly that. I need approval for a \$100,000 pilot budget and an owner in marketing."

**Why it works**: it opens with the decision, converts lift to dollars ($10{,}000 \times 20\% = 2{,}000$ caught; $2{,}000 \times 25\% \times \$300 = \$150{,}000$ gain; cost \$100,000), states the evidence and the weakest assumption, and ends with a clear ask.

**If asked "How does the model work?"**: "It looks at customers' usage, support contacts and billing history, and learns which patterns preceded cancellations in the past, like an experienced account manager, but applied to every customer every week."

**If asked "Why not target everyone?"**: "Offers to the other 90,000 customers mostly go to people who would have stayed; the lift is what pays for the offer."

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What should the first 15 seconds of an executive explanation contain?",
  "options": [
    "The model architecture",
    "The recommendation and its business impact",
    "The data cleaning steps",
    "A list of the metrics computed"
  ],
  "answer": 1,
  "explanation": "Answer first: decision and impact. Method comes only if asked."
}
```

```quiz
{
  "id": "q2",
  "question": "An exec asks 'Why should I trust this model?' Which answer is strongest?",
  "options": [
    "'Its AUC is 0.81.'",
    "'It beat the current process by 20% on last year's data, we will confirm with a holdout test, and we monitor it weekly.'",
    "'It is a state-of-the-art algorithm.'",
    "'The team worked hard on it.'"
  ],
  "answer": 1,
  "explanation": "Trust comes from comparison with today's process, independent validation and monitoring, stated in plain terms."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `campaign_net(n, base_rate, lift, frac, contact_cost, save_rate, customer_value)`. You contact the top `frac` of `n` customers. Churn rate in that group is `base_rate * lift`. Return the net value: `saved * customer_value - contacts * contact_cost`, where `saved = churners_in_group * save_rate`. For random targeting use `lift = 1`.",
  "starterCode": "def campaign_net(n, base_rate, lift, frac, contact_cost, save_rate, customer_value):\n    pass\n\nprint(campaign_net(100000, 0.05, 4, 0.10, 10, 0.25, 300))\n",
  "tests": "assert abs(campaign_net(100000, 0.05, 4, 0.10, 10, 0.25, 300) - 50000) < 1e-6\nassert abs(campaign_net(100000, 0.05, 1, 0.10, 10, 0.25, 300) + 62500) < 1e-6\nassert abs(campaign_net(100000, 0.05, 4, 0.10, 10, 0.15, 300) + 10000) < 1e-6\nassert campaign_net(1000, 0.1, 2, 0, 10, 0.5, 100) == 0",
  "solution": "def campaign_net(n, base_rate, lift, frac, contact_cost, save_rate, customer_value):\n    contacts = n * frac\n    churners = contacts * base_rate * lift\n    saved = churners * save_rate\n    return saved * customer_value - contacts * contact_cost",
  "hints": [
    "contacts = 100,000 x 0.10 = 10,000; churners = 10,000 x 0.20 = 2,000.",
    "At a 15% save rate the gain is 2,000 x 0.15 x 300 = 90,000 against a cost of 100,000, a net of -10,000."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `jargon_hits(text, banned)` returning a sorted list of the lower-cased banned terms that appear in `text` as whole words or phrases (case-insensitive, no duplicates). Use it to lint your executive summary before you present.",
  "starterCode": "import re\n\ndef jargon_hits(text, banned):\n    pass\n\nprint(jargon_hits('We tuned the hyperparameters; AUC is 0.81.', ['AUC', 'F1', 'hyperparameters']))\n",
  "tests": "b = ['AUC', 'F1', 'hyperparameter', 'p-value', 'cross validation']\nassert jargon_hits('The AUC is 0.81 and the p-value is small.', b) == ['auc', 'p-value']\nassert jargon_hits('Cross Validation helped; auc improved', b) == ['auc', 'cross validation']\nassert jargon_hits('Customers who leave are 4x easier to find.', b) == []\nassert jargon_hits('Our F1X score', b) == []\nassert jargon_hits('hyperparameters are tuned', b) == []",
  "solution": "import re\n\ndef jargon_hits(text, banned):\n    found = set()\n    for term in banned:\n        pat = r'(?<![A-Za-z0-9])' + re.escape(term.lower()) + r'(?![A-Za-z0-9])'\n        if re.search(pat, text.lower()):\n            found.add(term.lower())\n    return sorted(found)",
  "hints": [
    "Lower-case both text and terms, then search with boundaries so 'F1' does not match 'F1X'.",
    "re.escape handles the hyphen in 'p-value'. Return sorted(set(...))."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Explain a random forest to a non-technical VP in 30 seconds.'",
  "answer": "**Model answer**: \"Imagine asking 500 analysts to estimate which customers will cancel. Each analyst only sees a random slice of the data, so each makes different mistakes. We take a vote. The crowd is more reliable than any single analyst, and that is why the predictions are stable. In our test it identified twice as many at-risk customers as our current rules, which means roughly 1,000 more saves a year. The trade-off is that the vote is harder to explain than a single rule, so we add a plain-language summary of the top drivers for the account teams.\"\n\n**Why it works**: one analogy, no math, a business number, and an honest trade-off (interpretability). Stop after 30 seconds and offer more detail."
}
```

> [!TIP] Interview tips
> - Lead with the decision, convert lift or accuracy into dollars, and state the weakest assumption.
> - Use one analogy and offer depth on request; never open with the algorithm.
> - Pitfall: reporting accuracy with no baseline, or a single number with no range.
