---
id: genai-eng-token-cost-and-latency
title: Token cost & latency
estimatedMinutes: 12
difficulty: medium
tags: [genai, llm-api, cost, latency]
---

## Why it matters
"What will this feature cost at 1M requests a day, and how do you make it faster?" is a core GenAI system-design question. Strong answers do the arithmetic from tokens, know that output tokens dominate both price and latency, and list concrete levers.

## Concept
**Cost** is per token, quoted per 1M tokens, with separate rates for input and output (output is typically several times pricier, often 3 to 5x):

$$\text{cost} = \frac{n_{in} \cdot p_{in} + n_{out} \cdot p_{out}}{10^6}$$

Hidden token sources: system prompt and few-shot examples (resent every call), chat history, retrieved RAG chunks, tool definitions and results, and **reasoning tokens** (billed as output). Tokenizers differ by model; a token is roughly 4 English characters or 0.75 words, and non-English text and code often use more tokens per word. Count with the provider's tokenizer, not word counts.

**Latency** splits into two phases:
- **Time to first token (TTFT)**: network, queueing, and **prefill**, which processes the whole prompt in parallel; grows with input length.
- **Decode**: tokens generated one at a time at a rate of tokens/sec (inter-token latency), so $\text{total} \approx \text{TTFT} + n_{out}/\text{tps}$.

Output length is the main driver of end-to-end time, so cap it and ask for concise output. Streaming does not reduce total time, but makes TTFT the user-perceived latency.

**Levers**:
- Shorter prompts (prune examples, trim history, retrieve fewer chunks, compress tool outputs).
- **Prompt caching**: cached input prefix is billed at a steep discount (often around 10% of the base input price, with possible write premium) and lowers TTFT; needs a stable prefix and a time-to-live.
- **Model routing**: cheap small model for easy requests, large model for hard ones; distillation or fine-tuning a small model.
- **Batch APIs**: asynchronous jobs at about half price for offline workloads.
- Limit `max_tokens`, use structured output instead of prose, parallelize independent calls, and use speculative decoding or quantization when self-hosting.
- **Semantic/exact response caching** for repeated queries (see caching lesson).

## Worked example
Prices (illustrative): input \$3 and output \$15 per 1M tokens. A request has 2,000 input and 500 output tokens.
- Cost: 2000 × 3 / 10^6 = \$0.006 in, 500 × 15 / 10^6 = \$0.0075 out, total \$0.0135.
- At 100,000 requests/day: 0.0135 × 100,000 × 30 = \$40,500 per month. Output is 56% of the bill with only 20% of the tokens.
- Cache 1,500 of the input tokens at \$0.30 per 1M: 500 × 3 + 1500 × 0.3 = 1950, plus 7500 for output = 9450 (in millionths of a dollar), so \$0.00945 per request, a 30% saving, and a monthly bill of \$28,350.
- Latency at TTFT 0.4 s and 50 tokens/s: 0.4 + 500/50 = 10.4 s. Cutting output to 250 tokens gives 5.4 s and saves another \$0.00375 per request.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which change most reduces both cost and end-to-end latency for a chatty assistant?",
  "options": [
    "Switch to a larger model",
    "Ask for concise answers and cap output tokens",
    "Add more few-shot examples",
    "Increase temperature"
  ],
  "answer": 1,
  "explanation": "Output tokens are the most expensive and are generated sequentially, so shorter outputs reduce both price and decode time."
}
```

```quiz
{
  "id": "q2",
  "question": "Prompt caching helps most when:",
  "options": [
    "Every request has a completely different prompt",
    "A long, identical prefix (system prompt, tools, documents) repeats across requests",
    "Outputs are very long",
    "You use temperature 0"
  ],
  "answer": 1,
  "explanation": "Caching applies to a stable prefix. Put static content first and variable content last."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write the cost model. `request_cost(in_tok, out_tok, in_price, out_price, cached_tok=0, cached_price=None)` prices are per 1M tokens; `cached_tok` of the input tokens are billed at `cached_price` (default: same as `in_price`) and the rest at `in_price`. `latency(ttft, out_tok, tokens_per_sec)` returns seconds. `monthly_cost(requests_per_day, cost_per_request, days=30)` returns the total.",
  "starterCode": "def request_cost(in_tok, out_tok, in_price, out_price, cached_tok=0, cached_price=None):\n    pass\n\ndef latency(ttft, out_tok, tokens_per_sec):\n    pass\n\ndef monthly_cost(requests_per_day, cost_per_request, days=30):\n    pass\n",
  "tests": "assert abs(request_cost(2000, 500, 3, 15) - 0.0135) < 1e-12\nassert abs(request_cost(2000, 500, 3, 15, cached_tok=1500, cached_price=0.3) - 0.00945) < 1e-12\nassert abs(request_cost(1000, 0, 2, 8, cached_tok=400) - 0.002) < 1e-12\nassert abs(latency(0.4, 500, 50) - 10.4) < 1e-12\nassert latency(0.5, 0, 50) == 0.5\nassert abs(monthly_cost(100000, 0.0135) - 40500) < 1e-6\nassert abs(monthly_cost(10, 1.0, days=7) - 70) < 1e-12",
  "solution": "def request_cost(in_tok, out_tok, in_price, out_price, cached_tok=0, cached_price=None):\n    if cached_price is None:\n        cached_price = in_price\n    fresh = in_tok - cached_tok\n    return (fresh * in_price + cached_tok * cached_price + out_tok * out_price) / 1e6\n\ndef latency(ttft, out_tok, tokens_per_sec):\n    return ttft + out_tok / tokens_per_sec\n\ndef monthly_cost(requests_per_day, cost_per_request, days=30):\n    return requests_per_day * cost_per_request * days",
  "hints": [
    "`cached_tok` is a subset of `in_tok`, so fresh tokens are `in_tok - cached_tok`.",
    "Divide by 1e6 once at the end."
  ]
}
```

> [!TIP] Interview tips
> - Always compute: tokens in and out times price times volume; call out that output tokens and reasoning tokens dominate.
> - Separate TTFT (prefill, input length) from decode (output length); say streaming improves perceived latency only.
> - List levers in order: shorter prompts, caching, routing to smaller models, batching, response caching.
