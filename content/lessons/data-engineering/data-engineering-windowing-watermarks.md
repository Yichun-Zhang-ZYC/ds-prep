---
id: data-engineering-windowing-watermarks
title: Windowing, watermarks
estimatedMinutes: 14
difficulty: hard
tags: [data-engineering, streaming, event-time, windows]
---

## Why it matters
"Count orders per minute in a stream where events arrive late and out of order" is the canonical streaming question. You need event time vs processing time, window types, and watermarks.

## Concept
**Event time** = when the event happened (in the payload). **Processing time** = when the system sees it. Mobile apps go offline and networks retry, so events arrive late and out of order. Correct analytics use event time.

**Window types**:
- **Tumbling**: fixed, non-overlapping (every 1 minute: [00:00, 00:01), [00:01, 00:02) …). Each event in exactly one window.
- **Sliding / hopping**: fixed size, overlapping (10-minute windows every 1 minute). Each event in several windows.
- **Session**: per key, a window that closes after a gap of inactivity (e.g. 30 minutes). Variable length.
- **Global** with custom triggers.

**Watermark**: the engine's estimate of event-time progress: "I don't expect events older than T anymore." Commonly `max_event_time_seen − allowed_delay`.
- When the watermark passes a window's end, the window is **finalized**: result emitted (append mode) and state dropped.
- Events arriving with event time < watermark are **late**: dropped, or sent to a side output, or (Flink) used to update results within "allowed lateness".
- Tradeoff: a larger delay tolerates more lateness (more complete results) but increases latency and state size; a smaller delay is faster but drops more late data.

**Triggers** decide when results are emitted (on watermark, periodically with early/partial results, on each element).

## Worked example
Tumbling 1-minute windows, watermark = max event time − 2 minutes.
- Events at 10:00:30, 10:01:10, 10:03:05 → max = 10:03:05, watermark = 10:01:05 → window [10:00, 10:01) is finalized (count 1).
- A late event at 10:00:50 arrives now: its window already closed → dropped (or side output).
- An event at 10:01:40 is still accepted: window [10:01, 10:02) stays open until the watermark reaches 10:02.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does a watermark of 'max event time − 5 minutes' let the engine do?",
  "options": ["Process events in processing-time order", "Finalize windows and discard their state once it's unlikely more events for them will arrive", "Guarantee no event is ever late", "Speed up Kafka"],
  "answer": 1,
  "explanation": "Watermarks bound state and decide when windowed results are final."
}
```

```quiz
{
  "id": "q2",
  "question": "Which window type fits 'group a user's clicks into visits separated by 30 minutes of inactivity'?",
  "options": ["Tumbling", "Sliding", "Session", "Global count window"],
  "answer": 2,
  "explanation": "Session windows are defined by inactivity gaps per key."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement event-time tumbling windows with a watermark. Events are `(event_time_seconds, key)` in **arrival order**. `window_counts(events, size, delay)` processes events one by one: track max event time; watermark = max_seen − delay; an event is **late** (dropped) if its window end (window_start + size) ≤ watermark at the time it arrives. Return `(counts, dropped)` where counts maps (window_start, key) → count and dropped is the number of late events. Then write `session_windows(times, gap)` returning a list of (start, end) sessions from sorted timestamps, splitting when the gap between consecutive events is > gap.",
  "starterCode": "def window_counts(events, size, delay):\n    pass\n\ndef session_windows(times, gap):\n    pass\n\nev = [(30, 'a'), (70, 'a'), (185, 'a'), (50, 'a'), (100, 'a')]\nprint(window_counts(ev, 60, 120))",
  "tests": "ev = [(30, 'a'), (70, 'a'), (185, 'a'), (50, 'a'), (100, 'a')]\ncounts, dropped = window_counts(ev, 60, 120)\nassert counts == {(0, 'a'): 1, (60, 'a'): 2, (180, 'a'): 1}\nassert dropped == 1\nc2, d2 = window_counts(ev, 60, 1000)\nassert c2[(0, 'a')] == 2 and d2 == 0\nassert session_windows([0, 10, 20, 100, 110, 500], 30) == [(0, 20), (100, 110), (500, 500)]\nassert session_windows([], 30) == []",
  "solution": "def window_counts(events, size, delay):\n    counts = {}\n    dropped = 0\n    max_seen = float('-inf')\n    for t, key in events:\n        max_seen = max(max_seen, t)\n        watermark = max_seen - delay\n        start = t // size * size\n        if start + size <= watermark:\n            dropped += 1\n            continue\n        counts[(start, key)] = counts.get((start, key), 0) + 1\n    return counts, dropped\n\ndef session_windows(times, gap):\n    sessions = []\n    for t in sorted(times):\n        if sessions and t - sessions[-1][1] <= gap:\n            sessions[-1] = (sessions[-1][0], t)\n        else:\n            sessions.append((t, t))\n    return sessions",
  "hints": ["After the event at 185, the watermark is 65, so window [0, 60) is closed when the event at 50 arrives.", "A session extends while consecutive gaps are ≤ gap."]
}
```

> [!TIP] Interview tips
> - Start with event time vs processing time and why late, out-of-order data happens.
> - Name tumbling, sliding and session windows with a use case each.
> - Explain watermarks as the completeness/latency tradeoff and what happens to late events.
