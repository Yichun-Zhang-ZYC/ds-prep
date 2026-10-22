---
id: genai-eng-case-voice-agent
title: "Case: Voice agent"
estimatedMinutes: 14
difficulty: hard
tags: [genai, case-study, voice, latency, streaming]
---

## Why it matters
A voice agent (phone support, drive-through ordering, a spoken assistant) looks like a chatbot with a microphone, but it is a real-time systems problem. People notice pauses above roughly 1 second and hate being talked over, so the interview question is really "how do you hit a conversational latency budget while keeping the model accurate and safe?" 

## Concept
Two architectures:
- **Cascaded pipeline**: streaming **STT** (speech-to-text) → LLM (with tools) → streaming **TTS** (text-to-speech). Each stage is swappable, you get a text transcript for logging, evals, PII redaction and guardrails, and tool use works as in any agent. Latency is the sum of stages.
- **Speech-to-speech model** (native audio in/out over WebSocket/WebRTC): lower latency and keeps prosody and emotion, but weaker text-level control, harder evals and redaction, and fewer tool/voice choices. Many teams still pick cascaded for regulated or tool-heavy flows.

**Latency budget** (voice-to-voice, time from the user stopping to the first audio):

$$T \approx T_{endpoint} + T_{stt} + T_{ttft} + \frac{n_{first}}{\text{tps}} + T_{tts} + T_{net}$$

Targets (illustrative): under ~800 ms feels natural, 1.5 s feels sluggish. Levers:
- **Stream everything**: run STT while the user speaks, stream LLM tokens, and start TTS at the **first sentence/clause** rather than the full reply ($n_{first}$ small).
- **Endpointing / turn detection**: voice-activity detection (VAD) waits for a silence window (e.g. 300 to 500 ms). Too short cuts users off mid-thought; too long adds dead air. Semantic turn detectors (does the sentence sound finished?) allow shorter windows.
- **Barge-in**: when VAD hears the user during playback, stop TTS immediately, flush the audio buffer, cancel the in-flight LLM call, and record only what was actually *spoken* in the history.
- **Fast models** for the speaking path (small model, prompt caching, short outputs); cover slow tool calls with a filler ("let me check that") or move heavy reasoning to a background step.
- **Region and transport**: WebRTC/WebSocket, colocate STT, LLM and TTS, avoid cold starts.

**Pitfalls**: text written for the eye (lists, URLs, markdown) sounds terrible, so instruct the model to speak in short plain sentences and normalize numbers, dates and spellings before TTS. STT errors on names, emails and digits need read-back confirmation. Echo and background noise cause the agent to hear itself (use echo cancellation). Phone audio is 8 kHz, which hurts accuracy. Guard actions with confirmation (payments, cancellations), keep a human handoff path, and handle recording consent and PII.

## Worked example
Scenario: a pharmacy refill line. Measured baseline (illustrative): endpointing 400 ms, STT final 100 ms, LLM time-to-first-token 300 ms at 50 tokens/s, TTS first byte 120 ms, network 80 ms. The reply is 60 tokens.

1. **No streaming** (wait for the full reply, then synthesize): $400 + 100 + (300 + 60/50 \cdot 1000) + 120 + 80 = 2200$ ms. Callers hear 2.2 s of silence.
2. **Stream and cut at the first sentence** (12 tokens): the LLM part is $300 + 240 = 540$ ms, total $400 + 100 + 540 + 120 + 80 = 1240$ ms.
3. **Faster path**: a smaller model with a cached prompt (TTFT 200 ms, 80 tokens/s), a short first clause (8 tokens), and semantic turn detection with a 250 ms window: $250 + 100 + (200 + 100) + 120 + 80 = 850$ ms.

Accuracy guardrails stay in the loop: the agent reads back the medication name and date of birth ("Is that Sam Rivera, born March 3rd?") because STT mistakes here are costly, and any refill is confirmed before the tool call. Evaluate with recorded calls: word error rate on entities, task completion, interruption/cut-off rate, p50/p95 voice-to-voice latency, and handoff rate.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which change reduces perceived voice-to-voice latency the most for a long reply?",
  "options": [
    "Using a larger LLM for better answers",
    "Streaming LLM tokens and starting TTS at the first sentence",
    "Waiting for the full reply to avoid awkward TTS cut-offs",
    "Raising the VAD silence window to avoid interruptions"
  ],
  "answer": 1,
  "explanation": "Latency to the first audio depends on the first sentence, not the whole reply. A longer silence window only adds dead air."
}
```

```quiz
{
  "id": "q2",
  "question": "The user interrupts the agent mid-sentence. What should the system do?",
  "options": [
    "Finish the sentence, then listen",
    "Ignore it, since STT may be noisy",
    "Stop TTS, flush buffered audio, cancel the LLM stream, and keep only the spoken part in history",
    "Restart the whole conversation"
  ],
  "answer": 2,
  "explanation": "Barge-in needs fast cancellation, and the history must reflect what the user actually heard or the model will refer to things never said."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `turn_latency` using the budget formula: endpoint + STT + LLM TTFT + (first_chunk_tokens / tps) in ms + TTS + network. Compare the three configurations from the worked example.",
  "starterCode": "def turn_latency(endpoint_ms, stt_ms, llm_ttft_ms, first_chunk_tokens, tps, tts_ms, net_ms):\n    \"\"\"Voice-to-voice latency in ms until the user hears the first audio.\"\"\"\n    pass\n",
  "tests": "assert abs(turn_latency(400, 100, 300, 60, 50, 120, 80) - 2200) < 1e-9\nassert abs(turn_latency(400, 100, 300, 12, 50, 120, 80) - 1240) < 1e-9\nassert abs(turn_latency(250, 100, 200, 8, 80, 120, 80) - 850) < 1e-9\n",
  "solution": "def turn_latency(endpoint_ms, stt_ms, llm_ttft_ms, first_chunk_tokens, tps, tts_ms, net_ms):\n    gen_ms = first_chunk_tokens / tps * 1000\n    return endpoint_ms + stt_ms + llm_ttft_ms + gen_ms + tts_ms + net_ms\n",
  "hints": [
    "Convert the generation time to milliseconds by multiplying by 1000.",
    "Streaming only changes `first_chunk_tokens`."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `end_of_turn` for a simple VAD-based endpointer. Frames are 20 ms flags (1 = speech). Declare the turn over once `silence_ms` of continuous silence follows at least some speech; return that frame index, or -1.",
  "starterCode": "def end_of_turn(frames, silence_ms, frame_ms=20):\n    \"\"\"frames: list of 0/1 voice-activity flags. Return the index of the frame at which\n    the turn is declared over (silence_ms of continuous silence AFTER some speech), else -1.\"\"\"\n    pass\n",
  "tests": "assert end_of_turn([0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], 100) == 9\nassert end_of_turn([0] * 10 + [1, 0, 0], 40) == 12\nassert end_of_turn([1, 0, 0, 1, 0, 0, 0], 60) == 6\nassert end_of_turn([1, 0, 0], 100) == -1\nassert end_of_turn([0] * 50, 100) == -1\n",
  "solution": "def end_of_turn(frames, silence_ms, frame_ms=20):\n    need = -(-silence_ms // frame_ms)\n    heard, run = False, 0\n    for i, f in enumerate(frames):\n        if f:\n            heard, run = True, 0\n        elif heard:\n            run += 1\n            if run >= need:\n                return i\n    return -1\n",
  "hints": [
    "Number of frames needed is ceil(silence_ms / frame_ms).",
    "Reset the silence run whenever speech returns; ignore leading silence."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `chunk_sentences`: group streamed tokens into chunks to send to TTS, emitting when the buffer ends in `.`, `!` or `?` and is at least `min_chars` long (so 'Hi.' is not sent alone). Flush the remainder at the end.",
  "starterCode": "def chunk_sentences(tokens, min_chars=10):\n    \"\"\"Group streamed LLM tokens into speakable chunks for TTS.\n    Emit a stripped chunk when the buffer ends in . ! or ? and has >= min_chars characters\n    (after stripping). Flush any remaining text at the end.\"\"\"\n    pass\n",
  "tests": "t = [\"Sure\", \",\", \" I\", \" can\", \" help\", \".\", \" What\", \" is\", \" your\", \" order\", \" number\", \"?\"]\nassert chunk_sentences(t) == [\"Sure, I can help.\", \"What is your order number?\"]\nassert chunk_sentences([\"Hi\", \".\", \" I\", \" can\", \" help\", \" you\", \".\"]) == [\"Hi. I can help you.\"]\nassert chunk_sentences([\"One\", \" moment\", \" please\", \"...\", \" checking\"]) == [\"One moment please...\", \"checking\"]\nassert chunk_sentences([]) == []\n",
  "solution": "def chunk_sentences(tokens, min_chars=10):\n    out, buf = [], \"\"\n    for tok in tokens:\n        buf += tok\n        s = buf.strip()\n        if s and s[-1] in \".!?\" and len(s) >= min_chars:\n            out.append(s)\n            buf = \"\"\n    if buf.strip():\n        out.append(buf.strip())\n    return out\n",
  "hints": [
    "Append each token to a buffer and inspect the stripped buffer.",
    "Remember the final flush for text without terminal punctuation."
  ]
}
```

```reveal
{
  "prompt": "Interview: 'Design a voice agent for a bank's card-support phone line.' Outline your answer.",
  "answer": "**Requirements**: handle card freeze/replace, balance, and dispute intake; target under ~1 s voice-to-voice p50; 24/7; compliance (identity verification, call recording consent, PII); human handoff.\n\n**Architecture**: telephony (SIP/PSTN) → media server with echo cancellation and VAD → streaming STT (tuned for digits, names) → orchestrator (state machine for the call flow + LLM for language understanding) → tools (card service, auth) → streaming TTS → back to the caller. Cascaded rather than speech-to-speech, because we need transcripts, redaction and deterministic guardrails.\n\n**Latency**: stream at every hop, first-sentence TTS, small fast model with cached prompt for the talk path, filler phrase for slow tools, semantic endpointing, colocated services. Track p50/p95 per stage.\n\n**Safety**: identity verification before any account data (enforced in code, not the prompt); read-back and explicit confirmation for freeze/replace; the LLM never sees full card numbers (tokenize/redact in the transcript); prompt-injection resistance because callers can say anything; rate limits and fraud signals; escalate to a human on repeated STT failures, anger, or out-of-scope requests.\n\n**Evals and ops**: replay recorded calls with simulated callers; metrics: task completion, entity WER, barge-in handling, wrong-action rate (must be about zero), handoff rate, latency percentiles, CSAT. Shadow mode first, then ramp by intent. Cost: STT and TTS are billed per audio minute, plus LLM tokens, so cost per call is roughly minutes times (STT + TTS + LLM per minute).\n\n**Tradeoffs**: speech-to-speech models for naturalness vs cascaded for control; shorter endpointing for speed vs cutting people off."
}
```

> [!TIP] Interview tips
> - Always write the latency budget as a sum of stages and say which one you would cut first (usually: streaming + first-sentence TTS, then endpointing).
> - Mention barge-in, endpointing and echo explicitly; they separate voice experience from chat experience.
> - Put safety-critical logic (auth, confirmations) in code, and say you evaluate on real call audio, not just text.
