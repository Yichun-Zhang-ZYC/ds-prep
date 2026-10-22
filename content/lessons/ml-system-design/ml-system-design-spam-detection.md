---
id: ml-system-design-spam-detection
title: "Design: Spam and abuse detection"
estimatedMinutes: 14
difficulty: medium
tags: [ml-system-design, spam, adversarial, classification, naive-bayes]
---

## Why it matters
Spam detection (email, comments, direct messages, reviews, signup abuse) is the canonical adversarial classification problem: attackers adapt, labels are delayed and noisy, and the two error types have very different costs. Compared with *Content moderation* (policy-driven harms) and *Fraud detection* (financial loss), spam is about **volume and economics**: bulk senders chase cheap reach, so you attack their cost structure as well as classify content.

## Concept
**Clarify.** Which surface (inbox email, public comments, DMs, reviews)? Actions: deliver, route to a spam folder, hide, throttle, block the sender, require a CAPTCHA. Cost asymmetry is the key: blocking a legitimate message (false positive) is usually far worse than letting one spam through, so operate at a **very low false-positive rate** (for example 0.01-0.1%) and optimize recall there.

**Layered defense (cheapest first).**
1. **Sender/identity**: authentication (SPF/DKIM/DMARC for email), domain and IP reputation, account age, verified status, signup velocity.
2. **Rate limits and behavior**: messages per minute, recipient fan-out, reply rate, bounce and complaint rates, burst patterns. Throttling and friction raise attackers' cost.
3. **Content model**: text features (TF-IDF, n-grams, character n-grams to survive obfuscation like "fr33"), or a fine-tuned transformer; URL features (domain age, redirect chains, blocklists); image/OCR for text-in-image spam; normalization of Unicode tricks.
4. **Campaign / graph signals**: **near-duplicate clustering** (word shingles with MinHash or SimHash) across many senders; a message cluster that grows suddenly is a campaign, so one confirmed spam label can propagate to the entire cluster. Shared URLs, devices, and payment details link accounts.
5. **Post-delivery**: user reports ("report spam" and "not spam"), retroactive removal when a campaign is later identified.

**Model.** GBDT over dense sender/behavior/URL features plus a text-model score is the strong baseline; a transformer helps for semantic spam and multilingual content. Naive Bayes remains a fast, interpretable first baseline: $\log\frac{P(\text{spam}\mid d)}{P(\text{ham}\mid d)}=\log\frac{P(\text{spam})}{P(\text{ham})}+\sum_{w\in d}\log\frac{P(w\mid\text{spam})}{P(w\mid\text{ham})}$ with Laplace smoothing.

**Labels.** User reports (biased toward annoying spam; people rarely report the moderate-volume stuff), spam-trap addresses/honeypots (clean positives but unrepresentative), reviewer labels, and "not spam" rescues (valuable hard negatives). Labels arrive late, so recent data is under-labeled; train on matured windows and use clustering to propagate labels. There is **selection bias**: blocked messages never get user feedback, so keep a small randomized sample of delivered-but-scored-high mail for audit and evaluation.

**Metrics.** Not accuracy (spam may be 30-90% of raw traffic, and a trivial model looks good). Use **recall at a fixed low FPR**, precision-recall AUC, spam-in-inbox rate, ham-in-spam-folder rate (measured through user "not spam" and audits), time-to-detect a new campaign, and complaint rate. Online: A/B on user-reported spam per user, false-positive escalations, support tickets.

**Adversarial dynamics.** Attackers probe thresholds and craft evasions (obfuscation, image text, link shorteners, "good word" padding). Retrain often (daily or hourly for features such as URL reputation), keep a fast rules/blocklist path, monitor drift in score distributions, red-team with synthetic evasions, avoid exposing the exact reason for rejection, and treat rolling out a new model carefully (shadow mode, canary).

**Serving.** Inline scoring must be fast (tens of ms) with a cheap first-pass model, deeper checks (URL fetching, heavy models) asynchronous; fail open or closed depending on risk (for inbox email, usually fail open to avoid losing mail).

## Worked example
1M messages/day, 30% spam: 300,000 spam, 700,000 ham. Classifier at a threshold with TPR 98% and FPR 0.1%:
- Spam caught: $0.98\times300{,}000=294{,}000$; missed: 6,000.
- Ham blocked: $0.001\times700{,}000=700$ legitimate messages lost per day.
- Precision $=294{,}000/(294{,}000+700)=99.76\%$.

Accuracy would be $(294{,}000+699{,}300)/10^6=99.3\%$, which looks great but hides the 700 lost ham messages and the 6,000 spam in inboxes. Tightening to FPR 0.01% might drop TPR to 95%: 70 ham blocked, 15,000 spam missed. The business decides the trade-off, and tiered handling (spam folder for borderline scores rather than rejection) lowers the cost of false positives.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A spam filter reports 99% accuracy on traffic that is 90% spam. What is the most informative next step?",
  "options": [
    "Ship it",
    "Report recall at a fixed low false-positive rate and the ham-in-spam rate, since accuracy is dominated by the majority class and false positives are costly",
    "Collect more spam and retrain",
    "Switch to MSE"
  ],
  "answer": 1,
  "explanation": "A model that flags everything as spam gets 90% accuracy. Spam systems are judged at a tight FPR operating point because blocking legitimate mail is the expensive error."
}
```

```quiz
{
  "id": "q2",
  "question": "Why add near-duplicate clustering across messages on top of a per-message classifier?",
  "options": [
    "It makes the classifier smaller",
    "Spam arrives in campaigns; a cluster that grows quickly or contains confirmed spam lets you catch variants and propagate labels, which is robust to individual message obfuscation",
    "It replaces user reports",
    "It improves position bias"
  ],
  "answer": 1,
  "explanation": "Campaign-level signals are hard for attackers to hide because they must send volume. Clustering also lets one label cover thousands of messages."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `best_threshold(scores, labels, max_fpr)`. Predict spam when `score >= t`. Considering each distinct score as a candidate `t` in ascending order, return `(t, tpr)` for the first (lowest) `t` whose false-positive rate is at most `max_fpr`. `labels`: 1 = spam, 0 = ham.",
  "starterCode": "def best_threshold(scores, labels, max_fpr):\n    pass\n\nham = [0.1, 0.2, 0.3, 0.4]\nspam = [0.35, 0.6, 0.7, 0.9]\nprint(best_threshold(ham + spam, [0] * 4 + [1] * 4, 0.25))",
  "tests": "ham = [0.1, 0.2, 0.3, 0.4]\nspam = [0.35, 0.6, 0.7, 0.9]\ns = ham + spam\nl = [0] * 4 + [1] * 4\nt, tpr = best_threshold(s, l, 0.25)\nassert t == 0.35 and abs(tpr - 1.0) < 1e-12\nt, tpr = best_threshold(s, l, 0.0)\nassert t == 0.6 and abs(tpr - 0.75) < 1e-12",
  "solution": "def best_threshold(scores, labels, max_fpr):\n    n_ham = sum(1 for y in labels if y == 0)\n    n_spam = sum(1 for y in labels if y == 1)\n    for t in sorted(set(scores)):\n        fp = sum(1 for s, y in zip(scores, labels) if y == 0 and s >= t)\n        tp = sum(1 for s, y in zip(scores, labels) if y == 1 and s >= t)\n        if fp / n_ham <= max_fpr:\n            return t, tp / n_spam\n    return None",
  "hints": [
    "Raising the threshold lowers both FPR and TPR, so scan thresholds from low to high.",
    "Compute FPR as false positives divided by the number of ham messages."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Naive Bayes spam score. `train_nb(docs)`: `docs` is a list of `(tokens, is_spam)`. Return `(prior_log_odds, ratios)` where `prior_log_odds = ln(n_spam_docs / n_ham_docs)` and `ratios[w] = ln(P(w|spam) / P(w|ham))` using token counts with Laplace smoothing: `P(w|c) = (count_c(w) + 1) / (total_tokens_c + V)`, `V` = vocabulary size. `log_odds(tokens, model)` = prior + sum of ratios of the known tokens (ignore unknown ones).",
  "starterCode": "import math\n\ndef train_nb(docs):\n    pass\n\ndef log_odds(tokens, model):\n    pass\n\ndocs = [(['win', 'money'], 1), (['win', 'prize'], 1), (['meeting', 'money'], 0), (['lunch', 'meeting'], 0)]\nm = train_nb(docs)\nprint(log_odds(['win'], m))",
  "tests": "docs = [(['win', 'money'], 1), (['win', 'prize'], 1), (['meeting', 'money'], 0), (['lunch', 'meeting'], 0)]\nm = train_nb(docs)\nassert abs(m[0]) < 1e-12\nassert abs(log_odds(['win'], m) - math.log(3)) < 1e-9\nassert abs(log_odds(['meeting'], m) + math.log(3)) < 1e-9\nassert abs(log_odds(['money'], m)) < 1e-9\nassert abs(log_odds(['win', 'meeting', 'zzz'], m)) < 1e-9",
  "solution": "import math\nfrom collections import Counter\n\ndef train_nb(docs):\n    cs, ch = Counter(), Counter()\n    ns = nh = 0\n    for toks, y in docs:\n        if y:\n            ns += 1\n            cs.update(toks)\n        else:\n            nh += 1\n            ch.update(toks)\n    vocab = set(cs) | set(ch)\n    V = len(vocab)\n    ts, th = sum(cs.values()), sum(ch.values())\n    ratios = {}\n    for w in vocab:\n        ps = (cs[w] + 1) / (ts + V)\n        ph = (ch[w] + 1) / (th + V)\n        ratios[w] = math.log(ps / ph)\n    return math.log(ns / nh), ratios\n\ndef log_odds(tokens, model):\n    prior, ratios = model\n    return prior + sum(ratios[w] for w in tokens if w in ratios)",
  "hints": [
    "Here V = 5 and each class has 4 tokens, so P('win'|spam) = 3/9 and P('win'|ham) = 1/9.",
    "Use collections.Counter per class and sum the counts for the total token count."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Near-duplicate campaigns. Implement `shingles(text, k=2)` (set of word k-grams, lowercase), `jaccard(a, b)` and `cluster(texts, threshold)`: link every pair whose shingle Jaccard similarity is `>= threshold`, then return the connected components as lists of indices, each sorted, and the list of components sorted by first index.",
  "starterCode": "def shingles(text, k=2):\n    pass\n\ndef jaccard(a, b):\n    pass\n\ndef cluster(texts, threshold):\n    pass\n\ntexts = ['win a free prize now', 'win a free prize today', 'meeting at noon tomorrow', 'win a free prize now']\nprint(cluster(texts, 0.5))",
  "tests": "texts = ['win a free prize now', 'win a free prize today', 'meeting at noon tomorrow', 'win a free prize now']\nassert abs(jaccard(shingles(texts[0]), shingles(texts[1])) - 0.6) < 1e-9\nassert cluster(texts, 0.5) == [[0, 1, 3], [2]]\nassert cluster(texts, 0.7) == [[0, 3], [1], [2]]",
  "solution": "def shingles(text, k=2):\n    w = text.lower().split()\n    return {tuple(w[i:i + k]) for i in range(len(w) - k + 1)}\n\ndef jaccard(a, b):\n    if not a and not b:\n        return 1.0\n    return len(a & b) / len(a | b)\n\ndef cluster(texts, threshold):\n    n = len(texts)\n    sh = [shingles(t) for t in texts]\n    parent = list(range(n))\n    def find(x):\n        while parent[x] != x:\n            parent[x] = parent[parent[x]]\n            x = parent[x]\n        return x\n    for i in range(n):\n        for j in range(i + 1, n):\n            if jaccard(sh[i], sh[j]) >= threshold:\n                parent[find(i)] = find(j)\n    groups = {}\n    for i in range(n):\n        groups.setdefault(find(i), []).append(i)\n    return sorted((sorted(g) for g in groups.values()), key=lambda g: g[0])",
  "hints": [
    "Use union-find (or a simple DFS) to merge linked items into components.",
    "Texts 0 and 1 share 3 of 5 distinct bigrams, giving Jaccard 0.6."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a spam detection system for a messaging or email product.' Give a model answer.",
  "answer": "**Clarify**: surface, volume (illustrative: 5B messages/day, 60% spam at the edge), actions (reject at SMTP, spam folder, hide), cost asymmetry: false positives at <= 0.05%.\n\n**Layers**: (1) connection/sender: authentication, IP/domain reputation, signup and send velocity, rate limits; (2) content model: character n-gram + transformer text score and URL features fed with sender/behavior features into a GBDT; (3) campaign detection: MinHash/SimHash near-duplicate clusters and shared URL/device graph, propagating confirmed labels; (4) post-delivery: user reports and retroactive clean-up.\n\n**Actions**: score bands: reject > 0.99 at edge, spam folder 0.8-0.99, deliver otherwise; throttle or CAPTCHA suspicious senders.\n\n**Labels**: reports, honeypots, reviewers, and 'not spam' rescues; matured windows; random audit sample to fix selection bias.\n\n**Metrics**: recall at fixed FPR, ham-in-spam rate, spam-in-inbox rate, time-to-detect campaigns, complaint rate; A/B and shadow mode for new models.\n\n**Adversaries**: frequent retrains, obfuscation normalization, red teaming, rules fast path, no feedback on reasons, drift monitoring.\n\n**Serving**: cheap first-pass model inline, heavy checks async, fail open for inbox mail."
}
```

> [!TIP] Interview tips
> - State the cost asymmetry early and evaluate at a fixed low FPR, not accuracy.
> - Show layers: sender reputation, rate limits, content model, campaign clustering.
> - Mention delayed, biased labels and the random-audit fix for selection bias.
> - Call out adversarial adaptation and how you retrain, monitor and roll out safely.
