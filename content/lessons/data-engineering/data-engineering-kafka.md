---
id: data-engineering-kafka
title: Kafka (topics, partitions, consumer groups)
estimatedMinutes: 14
difficulty: medium
tags: [data-engineering, streaming, kafka]
---

## Why it matters
Apache Kafka is the backbone of most event-driven architectures. Interviewers expect you to explain topics, partitions, offsets, consumer groups, ordering guarantees and how to size partitions.

## Concept
- **Topic**: a named stream of records (e.g. `orders`). Records are key/value with a timestamp.
- **Partition**: a topic is split into ordered, append-only logs. Each record in a partition has an increasing **offset**. **Ordering is guaranteed only within a partition.**
- **Producer** chooses the partition: by default `hash(key) % num_partitions`, so all events with the same key (e.g. user_id) go to the same partition, in order. No key → spread round-robin/sticky.
- **Brokers** store partitions; each partition has a **leader** and **replicas** (replication factor, often 3). `acks=all` + `min.insync.replicas=2` gives durability.
- **Retention**: records are kept for a time/size limit (or compacted by key), regardless of whether they were consumed. Consumers can **replay** from older offsets.
- **Consumer group**: consumers sharing a `group.id` split the partitions; **each partition is consumed by exactly one consumer in the group**. Max useful parallelism = number of partitions. Different groups each get the full stream (fan-out).
- **Offsets / commits**: consumers commit the offset they've processed. Commit after processing → at-least-once (possible duplicates on crash). Commit before → at-most-once (possible loss).
- **Rebalancing**: when consumers join/leave, partitions are reassigned (brief pause).
- **Consumer lag** = latest offset − committed offset: the key health metric.
- Ecosystem: Schema Registry (Avro/Protobuf), Kafka Connect (sources/sinks, e.g. Debezium CDC), Kafka Streams/ksqlDB, managed services (Confluent, MSK); alternatives: Kinesis, Pub/Sub, Redpanda, Pulsar.

## Worked example
Topic `payments` with 12 partitions, key = `account_id`. A fraud consumer group with 4 instances gets 3 partitions each; scaling to 12 instances gives 1 each; a 13th instance would sit idle. All payments of one account stay in order because they share a partition. A separate analytics consumer group reads the same topic independently.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A topic has 8 partitions. You run 10 consumers in one consumer group. What happens?",
  "options": ["Each consumer reads every partition", "8 consumers each get one partition; 2 sit idle", "Kafka creates 2 more partitions", "Messages are split evenly across all 10"],
  "answer": 1,
  "explanation": "Within a group, a partition is assigned to at most one consumer."
}
```

```quiz
{
  "id": "q2",
  "question": "How do you guarantee events for the same user are processed in order?",
  "options": ["Use one consumer group per user", "Use user_id as the message key so they land in the same partition", "Set retention to infinite", "Use acks=0"],
  "answer": 1,
  "explanation": "Ordering holds within a partition, and key hashing maps a key to one partition."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `partition_for(key, n_partitions)` using `zlib.crc32(key.encode()) % n_partitions`. Write `assign(partitions, consumers)` returning a dict consumer → list of partitions using round-robin over sorted consumers (partition i goes to consumers[i % len(consumers)]); consumers with nothing get an empty list. Write `lag(latest_offsets, committed_offsets)` returning total lag across partitions (dicts partition → offset; missing commits count as 0).",
  "starterCode": "import zlib\n\ndef partition_for(key, n_partitions):\n    pass\n\ndef assign(partitions, consumers):\n    pass\n\ndef lag(latest_offsets, committed_offsets):\n    pass\n",
  "tests": "import zlib\nassert partition_for('acct-1', 12) == zlib.crc32(b'acct-1') % 12\nassert partition_for('acct-1', 12) == partition_for('acct-1', 12)\na = assign(list(range(8)), ['c3', 'c1', 'c2'])\nassert a == {'c1': [0, 3, 6], 'c2': [1, 4, 7], 'c3': [2, 5]}\nb = assign([0, 1], ['a', 'b', 'c'])\nassert b == {'a': [0], 'b': [1], 'c': []}\nassert lag({0: 100, 1: 50}, {0: 90}) == 60",
  "solution": "import zlib\n\ndef partition_for(key, n_partitions):\n    return zlib.crc32(key.encode()) % n_partitions\n\ndef assign(partitions, consumers):\n    cs = sorted(consumers)\n    out = {c: [] for c in cs}\n    for i, p in enumerate(partitions):\n        out[cs[i % len(cs)]].append(p)\n    return out\n\ndef lag(latest_offsets, committed_offsets):\n    return sum(latest - committed_offsets.get(p, 0) for p, latest in latest_offsets.items())",
  "hints": ["Same key → same hash → same partition.", "Lag per partition = latest − committed."]
}
```

> [!TIP] Interview tips
> - Explain topic → partitions → offsets, and that ordering is per partition (choose keys accordingly).
> - Consumer groups: one consumer per partition per group; partitions cap parallelism; groups give fan-out.
> - Mention replication/acks for durability, retention and replay, consumer lag monitoring, and commit timing vs delivery semantics.
