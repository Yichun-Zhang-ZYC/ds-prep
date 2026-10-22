---
id: ml-system-design-code-completion-assistant
title: "Design: Code completion assistant"
estimatedMinutes: 14
difficulty: medium
tags: [ml-system-design, code-completion, llm-serving, latency]
---

## Why it matters
"Design Copilot-style code completion" combines LLM serving under a hard latency budget, retrieval for context, and unusual product metrics (acceptance, retention of accepted code). Interviewers use it to see whether you reason about the latency-quality trade-off, the context pipeline and measurement beyond offline benchmarks.

## Concept
**Framing**: as a developer types, show inline "ghost text" (a line, a block, or an edit) that Tab accepts. Chat and agentic modes are separate products; see *LLM-powered agent system* for those. The core problem is to produce a *useful* completion in a few hundred milliseconds from a partial file, and to know when to stay quiet.

**Latency budget**: typing cadence means a suggestion arriving after the user types again is wasted. Target p50 around 200-300 ms for single-line completions and p95 under about 1 s. Budget breakdown: network, context assembly, prefill, decode, post-processing. Tactics:
- **Debounce and cancel**: wait ~50-100 ms of idle time, cancel in-flight requests on the next keystroke.
- **Small, fast model** (distilled/quantized, a few billion parameters), short outputs with stop tokens at line or block ends.
- **Prefix KV-cache reuse**: consecutive requests share almost the whole prefix. **Speculative decoding** (a draft model or n-gram lookup from the file) accelerates decode, since completions often copy nearby code.
- **Continuous batching** and regional GPU pools; optimize latency, not throughput.

**Model**: a code LLM trained with **fill-in-the-middle (FIM)**: a document is split into prefix, middle and suffix, and the model learns to generate the middle given both sides, which matches the cursor in the middle of a file. Train on permissively licensed code with deduplication and quality filters; keep secrets and PII out of data.

**Context pipeline** (often a bigger quality lever than model size): the prefix before the cursor and the suffix after it, then imports and enclosing signatures, snippets from recently edited and open files (cheap and highly relevant), and repository retrieval (BM25 or embeddings over symbol-level chunks, optionally LSP/type info). Pack them into a fixed token budget, putting the most relevant material nearest the cursor.

**Gating and post-processing**: a small classifier decides whether to show anything, using features like cursor position, language, recent acceptance and typing speed, so low-value suggestions never appear. After generation: truncate at a syntactic boundary, remove text duplicating the suffix, balance brackets (parse with tree-sitter), and filter secrets, vulnerable patterns and verbatim matches of public code where policy requires it.

**Evaluation**:
- *Offline*: execution-based **pass@k** on function-level benchmarks (unbiased estimator $1-\binom{n-c}{k}/\binom{n}{k}$ from $n$ samples with $c$ passing), plus repo-level evaluation: mask spans in held-out real repositories and score exact match, edit similarity or whether tests still pass. Contamination matters, so use fresh repos.
- *Online*: acceptance rate (accepted / shown), **retained characters** (still in the file minutes later), characters or percent of code written with AI, shown-latency, and developer-level outcomes (task completion time) in controlled experiments. Acceptance alone rewards short, obvious completions and can be gamed, so pair it with retention and a latency guardrail.

**Feedback and privacy**: accept/reject/edit-after-accept events become reranking and preference data. Enterprise customers expect opt-in, no training on their private code by default, and optional on-prem or VPC deployment.

## Worked example
Latency (illustrative). Network 40 ms, context assembly 30 ms, prefill with a cached prefix 80 ms, and a 24-token completion at 10 ms/token decode = 240 ms. Total $40+30+80+240=390$ ms, over the 300 ms target. Speculative decoding with about 2x decode speedup cuts decode to 120 ms: total 270 ms. Pass.

Gating (illustrative). Out of 1,000 trigger events:
- Always show: 1,000 shown at 12% acceptance gives 120 accepted.
- With a gate that shows 40% of events and reaches 30% acceptance on those: $400\times0.30=120$ accepted, with 600 fewer distracting suggestions.

Same number of accepts, far less noise. If 85% of accepted completions are retained and average 40 characters, retained characters $=120\times0.85\times40=4{,}080$, or about 10.2 per shown suggestion in the gated setup.

pass@k: with $n=10$ samples and $c=2$ correct, $\text{pass@3}=1-\binom{8}{3}/\binom{10}{3}=1-56/120=0.533$. The naive $3\times0.2=0.6$ overcounts (it double-counts draws containing both correct samples and can exceed 1 for larger $k$), which is why the combinatorial estimator is used.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can a code-completion model be trained to produce the middle of a file (fill-in-the-middle) instead of only predicting the next tokens?",
  "options": [
    "It makes the model smaller",
    "Developers edit in the middle of files, so the model needs to condition on both the prefix and the suffix after the cursor",
    "It removes the need for context retrieval",
    "It guarantees syntactically valid output"
  ],
  "answer": 1,
  "explanation": "FIM training reorders the document so that the model learns to infill given left and right context, matching the real cursor position."
}
```

```quiz
{
  "id": "q2",
  "question": "A team reports that acceptance rate rose from 22% to 31% after a change. Which additional metric best checks that this is a real improvement?",
  "options": [
    "Number of GPUs used",
    "Retained characters of accepted code and latency, to rule out a shift to short trivial completions",
    "Training loss",
    "Length of the prompt"
  ],
  "answer": 1,
  "explanation": "Acceptance can rise if the model suggests shorter or more obvious text. Retention of accepted code and shown-latency show whether value rose."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `pass_at_k(n, c, k)`, the unbiased pass@k estimator $1-\\binom{n-c}{k}/\\binom{n}{k}$ for $n$ samples of which $c$ are correct (return 1.0 when $n-c<k$). Use `math.comb`.",
  "starterCode": "import math\n\ndef pass_at_k(n, c, k):\n    pass\n\nprint(pass_at_k(10, 2, 3))",
  "tests": "assert abs(pass_at_k(10, 2, 3) - (1 - 56 / 120)) < 1e-12\nassert pass_at_k(10, 0, 3) == 0.0\nassert pass_at_k(10, 8, 3) == 1.0\nassert abs(pass_at_k(10, 2, 1) - 0.2) < 1e-12\nassert pass_at_k(5, 5, 5) == 1.0",
  "solution": "import math\n\ndef pass_at_k(n, c, k):\n    if n - c < k:\n        return 1.0\n    return 1.0 - math.comb(n - c, k) / math.comb(n, k)",
  "hints": [
    "If fewer than k samples are incorrect, any k-subset contains a correct one.",
    "math.comb(n - c, k) / math.comb(n, k) is the probability that all k picks are incorrect."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Write `fit_context(prefix, suffix, snippets, budget, prefix_share=0.6, suffix_share=0.2)`. `prefix`, `suffix` are token lists; `snippets` is a list of `(score, tokens)`. Let `p_cap = int(budget*prefix_share)` and `s_cap = int(budget*suffix_share)`. Keep the **last** `p_cap` prefix tokens and the **first** `s_cap` suffix tokens (an empty list if the cap is 0). Spend the remaining budget on snippets in descending score order (stable for ties): include a whole snippet only if it fits, otherwise skip it and continue. Return `(prefix, suffix, chosen_indices)` where indices refer to the original `snippets` order, sorted ascending.",
  "starterCode": "def fit_context(prefix, suffix, snippets, budget, prefix_share=0.6, suffix_share=0.2):\n    pass\n\nprint(fit_context(list(range(80)), list(range(10)), [(0.9, list(range(25)))], 100)[2])",
  "tests": "pre = list(range(80))\nsuf = list(range(10))\nsn = [(0.9, list(range(25))), (0.8, list(range(10))), (0.7, list(range(5)))]\np, s, ch = fit_context(pre, suf, sn, 100)\nassert p == list(range(20, 80))\nassert s == suf\nassert ch == [0, 2]\np, s, ch = fit_context([1, 2, 3], [4, 5, 6, 7, 8, 9, 10, 11, 12, 13], [], 20)\nassert p == [1, 2, 3] and s == [4, 5, 6, 7]\np, s, ch = fit_context([1, 2, 3], [4, 5], [(0.1, [9]), (0.5, [8])], 0)\nassert p == [] and s == [] and ch == []\np, s, ch = fit_context([1], [2], [(0.5, [7, 7]), (0.5, [8, 8]), (0.9, [9, 9, 9])], 8)\nassert p == [1] and s == [2] and ch == [0, 2]",
  "solution": "def fit_context(prefix, suffix, snippets, budget, prefix_share=0.6, suffix_share=0.2):\n    p_cap = int(budget * prefix_share)\n    s_cap = int(budget * suffix_share)\n    p = prefix[-p_cap:] if p_cap > 0 else []\n    s = suffix[:s_cap]\n    remaining = budget - len(p) - len(s)\n    order = sorted(range(len(snippets)), key=lambda i: -snippets[i][0])\n    chosen = []\n    for i in order:\n        n = len(snippets[i][1])\n        if n <= remaining:\n            chosen.append(i)\n            remaining -= n\n    return p, s, sorted(chosen)",
  "hints": [
    "Careful: lst[-0:] returns the whole list, so special-case a cap of 0.",
    "Sort indices by -score with sorted(); it is stable, then keep those that fit."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Write `completion_metrics(events)` where each event is `(shown, accepted, chars, retained)` booleans/ints. Return a dict with `acceptance` = accepted / shown, `retention` = retained accepted / accepted, and `retained_chars_per_shown` = total chars of accepted-and-retained events / shown. Count only events with `shown=True`; use 0.0 for any ratio with a zero denominator.",
  "starterCode": "def completion_metrics(events):\n    pass\n\nprint(completion_metrics([(True, True, 40, True), (True, False, 30, False)]))",
  "tests": "ev = [(True, True, 40, True), (True, True, 20, False), (True, False, 30, False), (False, False, 50, False), (True, False, 10, False)]\nm = completion_metrics(ev)\nassert abs(m['acceptance'] - 0.5) < 1e-12\nassert abs(m['retention'] - 0.5) < 1e-12\nassert abs(m['retained_chars_per_shown'] - 10.0) < 1e-12\nz = completion_metrics([(False, False, 5, False)])\nassert z == {'acceptance': 0.0, 'retention': 0.0, 'retained_chars_per_shown': 0.0}\nz = completion_metrics([(True, False, 5, False)])\nassert z['acceptance'] == 0.0 and z['retention'] == 0.0",
  "solution": "def completion_metrics(events):\n    shown = [e for e in events if e[0]]\n    n = len(shown)\n    acc = [e for e in shown if e[1]]\n    ret = [e for e in acc if e[3]]\n    return {\n        'acceptance': len(acc) / n if n else 0.0,\n        'retention': len(ret) / len(acc) if acc else 0.0,\n        'retained_chars_per_shown': sum(e[2] for e in ret) / n if n else 0.0,\n    }",
  "hints": [
    "Filter to shown events first.",
    "Retained completions are the accepted ones whose retained flag is true."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design an inline code completion assistant for an IDE.' Outline your answer.",
  "answer": "**Requirements**: p50 < 300 ms for single-line and p95 < 1 s, millions of daily users, multi-language, privacy for private code, objective = developer productivity measured by retained AI-written code with acceptance and latency as supporting metrics.\n\n**Client**: debounce typing, cancel stale requests, assemble context locally (prefix, suffix, open and recently edited files, symbol info), call the service, render ghost text, log events (shown, accepted, edited, dismissed, retained after N minutes).\n\n**Service**: gateway -> gating classifier (should we complete?) -> context retrieval (repo index with BM25/embeddings on symbols, fresh local snippets) -> FIM model on GPUs with prefix KV-cache, continuous batching and speculative decoding -> post-processing (truncate at syntactic boundary, dedupe suffix, syntax check, secret/license/vulnerability filters).\n\n**Training**: continued pretraining with FIM on licensed, deduplicated code; fine-tune on repo-style completion tasks; RL or preference tuning from accepted/rejected suggestions and execution feedback; distill and quantize for serving.\n\n**Evaluation**: offline pass@k on function benchmarks, repo-level masked-span eval on fresh repos; shadow and A/B online with acceptance, retained characters, latency and error guardrails, plus a long-running productivity study.\n\n**Operations**: multi-region GPU capacity planning with cost per accepted completion, graceful degradation to a smaller model under load, model/version rollout with canaries, privacy controls (opt-in telemetry, no training on enterprise code by default)."
}
```

> [!TIP] Interview tips
> - Anchor on the latency budget and list concrete tactics: debounce, cancel, KV-cache, speculative decoding.
> - Mention FIM and the context pipeline; context quality often beats model size.
> - Do not stop at acceptance rate: add retained characters and a latency guardrail.
> - Cover gating (when not to show), licensing/security filters and privacy.
