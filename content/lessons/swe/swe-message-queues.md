---
id: swe-message-queues
title: Message queues
estimatedMinutes: 12
difficulty: medium
tags: [message-queue, kafka, rabbitmq, sqs, decoupling, idempotency]
---

## Why it matters
Queues decouple producers from consumers, absorb traffic spikes and enable retries, so they show up in almost every system design and ML pipeline (event ingestion, async inference, training triggers). Interviewers probe delivery guarantees, ordering and idempotency.

## Concept
A **message queue** (or broker) sits between a **producer** that sends messages and a **consumer** that processes them later. Benefits: **decoupling** (services deploy and fail independently), **buffering** (spikes queue up instead of overloading consumers), **scaling** (add consumers), and **reliability** (retry failed work).

**Two models**:
- **Work queue / task queue** (SQS, RabbitMQ, Celery): each message goes to one consumer in a group, and is deleted after being acknowledged.
- **Log / pub-sub stream** (Kafka, Kinesis, Pub/Sub): messages are appended to a partitioned, retained log. Many consumer groups read independently at their own **offset** and can replay history.

**Acknowledgements and delivery guarantees**:
- **At-most-once**: ack before processing. No duplicates, but a crash loses the message.
- **At-least-once**: ack after processing. A crash causes redelivery, so duplicates happen. This is the practical default.
- **Exactly-once**: effectively achieved by at-least-once delivery plus an **idempotent consumer** (or transactional writes). True end-to-end exactly-once is rare.

SQS-style queues add a **visibility timeout**: a received message is hidden for $V$ seconds. If not acked in time (consumer crashed or was slow) it becomes visible again. After $N$ failed receives it goes to a **dead-letter queue (DLQ)** for inspection.

**Idempotency**: make processing safe to repeat, for example by keying writes on a message or event id (`INSERT ... ON CONFLICT DO NOTHING`) or storing processed ids.

**Ordering**: a single queue or partition preserves order; across partitions it does not. Use a **partition key** (e.g. `user_id`) so related events stay ordered.

**Backpressure**: if producers outrun consumers, queue depth and lag grow. Monitor **consumer lag**, scale consumers, rate-limit producers, and bound the queue.

```python
# consumer sketch: at-least-once + idempotent handling
def handle(msg, seen, process):
    if msg["id"] in seen:          # duplicate delivery
        return
    process(msg["body"])
    seen.add(msg["id"])            # record, then ack
```

## Worked example
Image uploads trigger feature extraction taking 2 s each, so one consumer handles 0.5 messages/s. Average load is 50/s, so 100 consumers keep up, but a peak of 300/s would need 600. Instead let the queue absorb the spike. During a 60 s spike at 300/s the backlog grows by $(300 - 50)\cdot 60 = 15{,}000$ messages. With only 100 consumers (capacity 50/s equal to normal arrivals) the backlog never drains, so autoscale to 150 consumers (75/s): net drain $75 - 50 = 25$/s, clearing in $15{,}000/25 = 600$ s. With a 30 s visibility timeout and a 2 s job, a crashed worker's message reappears within 30 s.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A consumer acks a message after processing it successfully, but crashes before the ack reaches the broker. What happens?",
  "options": ["The message is lost", "The message is redelivered, so the consumer must be idempotent", "The broker guarantees exactly-once so nothing happens", "The message goes straight to the dead-letter queue"],
  "answer": 1,
  "explanation": "With at-least-once delivery the unacked message is redelivered. Idempotent handling makes the duplicate harmless."
}
```

```quiz
{
  "id": "q2",
  "question": "You need all events of one user processed in order while scaling consumers. What do you do in Kafka?",
  "options": ["Use one partition for the whole topic only", "Use user_id as the partition key", "Randomly assign partitions", "Disable consumer groups"],
  "answer": 1,
  "explanation": "Messages with the same key go to the same partition, which is ordered, while different users spread across partitions for parallelism."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `VisibilityQueue(visibility, clock)` simulating an SQS-style queue. `send(body)` returns an integer id starting at 1. `receive()` returns `(id, body)` for the lowest-id message that is not acked and currently visible, or `None`; it hides that message until `clock() + visibility`. `ack(id)` permanently removes the message. An unacked message becomes receivable again once `clock() >= hidden_until`.",
  "starterCode": "class VisibilityQueue:\n    def __init__(self, visibility, clock):\n        pass\n\n    def send(self, body):\n        pass\n\n    def receive(self):\n        pass\n\n    def ack(self, msg_id):\n        pass\n\nt = [0]\nq = VisibilityQueue(5, lambda: t[0])\nq.send('a')\nprint(q.receive())",
  "tests": "t = [0]\nq = VisibilityQueue(5, lambda: t[0])\nassert q.send('a') == 1\nassert q.send('b') == 2\nassert q.receive() == (1, 'a')\nassert q.receive() == (2, 'b')\nassert q.receive() is None\nq.ack(1)\nt[0] = 4\nassert q.receive() is None\nt[0] = 5\nassert q.receive() == (2, 'b')\nq.ack(2)\nt[0] = 100\nassert q.receive() is None",
  "solution": "class VisibilityQueue:\n    def __init__(self, visibility, clock):\n        self.visibility = visibility\n        self.clock = clock\n        self.msgs = {}\n        self.next_id = 1\n\n    def send(self, body):\n        mid = self.next_id\n        self.next_id += 1\n        self.msgs[mid] = [body, 0]\n        return mid\n\n    def receive(self):\n        now = self.clock()\n        for mid in sorted(self.msgs):\n            body, hidden_until = self.msgs[mid]\n            if now >= hidden_until:\n                self.msgs[mid][1] = now + self.visibility\n                return (mid, body)\n        return None\n\n    def ack(self, msg_id):\n        self.msgs.pop(msg_id, None)",
  "hints": ["Keep a dict id -> [body, hidden_until] with hidden_until = 0 initially.", "ack just deletes the entry; redelivery needs no extra code, only the visibility check."]
}
```

> [!TIP] Interview tips
> - State the guarantee you are designing for: at-least-once plus idempotent consumers is the realistic answer; be skeptical of "exactly-once".
> - Mention a DLQ and retries with exponential backoff for poison messages.
> - Contrast queue vs log: a queue deletes on ack; Kafka retains and lets you replay, which is great for reprocessing after a bug fix.
