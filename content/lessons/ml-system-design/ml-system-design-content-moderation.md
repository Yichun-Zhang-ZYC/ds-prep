---
id: ml-system-design-content-moderation
title: Content moderation
estimatedMinutes: 13
difficulty: medium
tags: [ml-system-design, trust-and-safety, human-in-the-loop, thresholds]
---

## Why it matters
Content moderation is a human-in-the-loop ML system with asymmetric harms, adversaries, shifting policies and huge scale. Interviewers want to see thresholds tied to policy severity, human review capacity and appeals, not just "train a classifier".

## Concept
**Scope and policy first.** Define the harm categories (spam, hate, nudity, violence, self-harm, scams, CSAM) and the **action per category and severity**: remove, demote, age-gate, label, send to review, escalate to law enforcement. Policy is written by trust-and-safety teams and changes; the system must be reconfigurable without retraining from scratch. Modalities: text, image, video, audio, and combos (a meme's text and image mean something together, so use multimodal models).

**Pipeline** (pre-publication for high-severity, post-publication for the rest):
1. **Hash matching** of known-bad media (PhotoDNA-style perceptual hashes, shared industry hash lists): cheap, near-zero false positives.
2. **Rules/blocklists** for obvious patterns and fast emergency response.
3. **ML classifiers** per category, multi-label: fine-tuned text encoders/LLMs, vision models, video sampling plus audio transcripts; user/account and behavioral signals (new account, burst posting, reports).
4. **Routing by score**: very high score auto-actions; the uncertain middle band goes to a **human review queue** prioritized by severity x predicted probability x reach (expected harm); low score is allowed. Reviewers' decisions become new labels; users can **appeal**.
5. **LLMs** can act as policy-conditioned classifiers/labelers for new or long-tail policies; keep humans for ambiguity and measure them against gold sets.

**Labels and data**: user reports (noisy, biased by brigading), reviewer labels (expensive, need consensus, gold audits and policy guidance), active learning on the uncertain band, synthetic/adversarial examples. Class imbalance (<1% violating) means precision/recall and **prevalence** estimation need a **random sample** labeled by humans, since model-flagged samples are biased.

**Metrics**: per-category **precision and recall at the chosen thresholds**, **prevalence of violating views** (the North Star: share of views that are violating, via random sampling), time-to-action, reviewer throughput/agreement, appeal overturn rate (proxy for false positives), and fairness across languages/dialects/groups. Tune thresholds per category by harm severity: high-severity categories accept more false positives to maximize recall; borderline categories use demotion instead of removal.

**Adversaries and drift**: obfuscation (leetspeak, images with text), new slang, coordinated campaigns. Retrain often, red-team, monitor spikes, and keep fast rule and hash paths. Latency: synchronous checks < ~100 ms at upload; heavy video analysis asynchronous.

## Worked example
1M posts/day, 0.5% violating = 5,000 violators. Thresholds: auto-remove if $p\ge0.95$, allow if $p<0.10$, else human review.

Observed split: 3,000 auto-removed (2,970 violators, 30 wrongly removed, precision 99%), 30,000 in review (1,500 violators), 967,000 allowed (530 violators missed). Check: $3{,}000+30{,}000+967{,}000=1{,}000{,}000$ and $2{,}970+1{,}500+530=5{,}000$.

If reviewers are accurate, overall recall $=(2{,}970+1{,}500)/5{,}000=89.4\%$. At 400 items per reviewer per day the queue needs $30{,}000/400=75$ reviewers. Narrowing the band cuts staffing but shifts more violators into the 'allowed' bucket: the knob is review capacity vs missed harm.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why estimate prevalence of violating content from a random sample rather than from model-flagged items?",
  "options": [
    "Random samples are cheaper to label",
    "Flagged items are selected by the model, so they cannot reveal what the model misses; only a random sample gives an unbiased rate",
    "Prevalence does not matter",
    "Flagged items are always correct"
  ],
  "answer": 1,
  "explanation": "Selection by the model biases the estimate. Random sampling with human labels measures the true share and the model's recall."
}
```

```quiz
{
  "id": "q2",
  "question": "For a high-severity category (e.g. child safety) vs a borderline category (e.g. mild spam), how should thresholds differ?",
  "options": [
    "Same threshold for all categories",
    "High-severity: lower threshold (favor recall, send more to review); borderline: higher threshold and softer actions like demotion",
    "High-severity: higher threshold to avoid false positives",
    "Use only human review for borderline categories"
  ],
  "answer": 1,
  "explanation": "Thresholds follow cost of errors: missing severe harm is far worse than a false flag that a reviewer can fix."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `route(p, lo, hi)` returning `'remove'` if `p >= hi`, `'allow'` if `p < lo`, else `'review'`. Then `queue_stats(scores, labels, lo, hi)` returning a dict with keys `remove`, `review`, `allow` (counts), `remove_precision` (fraction of removed items that are violations, 0.0 if none removed) and `recall` (violations in remove + review divided by all violations, assuming reviewers are perfect; 0.0 if no violations). Finally `reviewers_needed(review_count, per_reviewer_per_day)` = ceiling of the ratio.",
  "starterCode": "import math\n\ndef route(p, lo, hi):\n    pass\n\ndef queue_stats(scores, labels, lo, hi):\n    pass\n\ndef reviewers_needed(review_count, per_reviewer_per_day):\n    pass\n\nscores = [0.99, 0.97, 0.6, 0.5, 0.2, 0.01, 0.02, 0.3]\nlabels = [1, 0, 1, 0, 1, 0, 0, 0]\nprint(queue_stats(scores, labels, 0.1, 0.95))",
  "tests": "assert route(0.95, 0.1, 0.95) == 'remove'\nassert route(0.1, 0.1, 0.95) == 'review'\nassert route(0.09, 0.1, 0.95) == 'allow'\nscores = [0.99, 0.97, 0.6, 0.5, 0.2, 0.01, 0.02, 0.3]\nlabels = [1, 0, 1, 0, 1, 0, 0, 0]\ns = queue_stats(scores, labels, 0.1, 0.95)\nassert s['remove'] == 2 and s['review'] == 4 and s['allow'] == 2\nassert abs(s['remove_precision'] - 0.5) < 1e-12 and abs(s['recall'] - 1.0) < 1e-12\ns = queue_stats([0.5, 0.01], [0, 1], 0.1, 0.95)\nassert s['remove_precision'] == 0.0 and s['recall'] == 0.0\nassert queue_stats([0.5], [0], 0.1, 0.95)['recall'] == 0.0\nassert reviewers_needed(30000, 400) == 75 and reviewers_needed(30001, 400) == 76",
  "solution": "import math\n\ndef route(p, lo, hi):\n    if p >= hi:\n        return 'remove'\n    if p < lo:\n        return 'allow'\n    return 'review'\n\ndef queue_stats(scores, labels, lo, hi):\n    counts = {'remove': 0, 'review': 0, 'allow': 0}\n    remove_pos = caught = 0\n    for s, y in zip(scores, labels):\n        r = route(s, lo, hi)\n        counts[r] += 1\n        if r == 'remove':\n            remove_pos += y\n        if r != 'allow':\n            caught += y\n    total_pos = sum(labels)\n    counts['remove_precision'] = remove_pos / counts['remove'] if counts['remove'] else 0.0\n    counts['recall'] = caught / total_pos if total_pos else 0.0\n    return counts\n\ndef reviewers_needed(review_count, per_reviewer_per_day):\n    return math.ceil(review_count / per_reviewer_per_day)",
  "hints": [
    "Count removed violations and caught violations (remove or review) in one pass.",
    "Use integer-safe ceiling: math.ceil(a / b) is fine for these sizes."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a content moderation system for a social platform with images and text posts.' Outline your answer.",
  "answer": "**Clarify**: harm categories and severities, legal duties, volume (10M posts/day), languages, review capacity (500 reviewers), SLA for removal.\n\n**Architecture**: upload -> hash match (known CSAM/terror) -> fast text/image classifiers (synchronous, < 100 ms) -> publish or block; async deeper models (multimodal, video) and report-triggered rescoring -> score router: auto-action / human queue / allow. Queue prioritized by severity x probability x predicted reach.\n\n**Models**: multi-label per category, multilingual text encoder + vision model fused; LLM with policy prompt for rare policies; account/behavior signals.\n\n**Data**: reviewer labels with double-review and gold audits, appeals as feedback, active learning on uncertain items, random-sample audit for unbiased prevalence.\n\n**Metrics**: precision/recall per category and language, prevalence of violating views, time-to-removal for viral content, appeal overturn rate, reviewer wellbeing and agreement.\n\n**Risks**: adversarial evasion, policy drift, bias across dialects, reviewer exposure (blur, rotation, limits), transparency and appeals."
}
```

> [!TIP] Interview tips
> - Tie thresholds to harm severity and reviewer capacity; describe auto-action, review and allow bands.
> - Mention hash matching for known content and multimodal signals for memes.
> - Use random-sample audits to estimate prevalence and recall without selection bias.
> - Cover appeals, fairness across languages, adversarial adaptation and reviewer wellbeing.
