---
id: data-engineering-document-key-value-column-family-graph
title: Document, key-value, column-family, graph databases (Neo4j)
estimatedMinutes: 12
difficulty: medium
tags: [data-engineering, databases, nosql, graph]
---

## Why it matters
"NoSQL" covers very different systems. Interviewers expect you to match each family to the right use case and know its main tradeoffs.

## Concept
| Family | Data model | Examples | Strengths | Typical use |
|---|---|---|---|---|
| **Key-value** | key → opaque value | Redis, DynamoDB, Memcached | Extremely fast lookups by key, simple, scales horizontally; Redis adds TTLs and data structures | Caches, sessions, carts, rate limiting, feature serving |
| **Document** | key → JSON-like document (nested) | MongoDB, Couchbase, Firestore | Flexible schema, nested objects match app objects, secondary indexes | Product catalogs, user profiles, content |
| **Wide-column (column-family)** | row key → many columns grouped in families; sorted by key | Cassandra, HBase, Bigtable, ScyllaDB | Massive write throughput, time-series by partition key, multi-region | IoT, event logs, messaging, time series |
| **Graph** | nodes + relationships with properties | Neo4j, Amazon Neptune, TigerGraph | Fast multi-hop traversals | Social networks, fraud rings, recommendations, knowledge graphs |

Design notes:
- **Key-value / wide-column**: model around queries; choose partition keys that spread load (avoid hot partitions) and support your access pattern. Cassandra queries must include the partition key; denormalize into one table per query.
- **Document**: embed data read together; reference data shared widely. Watch unbounded arrays and cross-document consistency.
- **Graph**: traversals like "friends of friends who bought X" are a few hops instead of many self-joins. Query languages: **Cypher** (Neo4j), Gremlin, GQL. Analytics algorithms: PageRank, community detection, shortest path.
- **Vector databases** (Pinecone, Weaviate, pgvector) are a newer family for similarity search over embeddings.

## Worked example
Fraud detection: accounts, devices, cards and addresses as nodes; "used", "shares_address" as edges. Cypher:
```
MATCH (a:Account {id: $id})-[:USED]->(d:Device)<-[:USED]-(other:Account)
WHERE other.flagged = true
RETURN other.id
```
Finding accounts linked to flagged accounts within 2–3 hops is a real-time query in a graph DB, but expensive recursive joins in SQL.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which database family best fits storing billions of sensor readings per day, queried by device and time range?",
  "options": ["Graph database", "Wide-column store (e.g. Cassandra) with device_id as partition key and time as clustering key", "A single relational table with no partitioning", "In-memory cache only"],
  "answer": 1,
  "explanation": "Wide-column stores handle huge write volumes and range scans within a partition."
}
```

```quiz
{
  "id": "q2",
  "question": "Why are graph databases efficient for 'friends of friends' queries?",
  "options": ["They store data in CSV", "Relationships are stored as direct pointers, so traversing hops doesn't require large joins", "They don't support indexes", "They only run on GPUs"],
  "answer": 1,
  "explanation": "Index-free adjacency makes multi-hop traversal proportional to the neighborhood size."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement graph queries on an undirected edge list. `neighbors(edges)` builds a dict node → set of neighbors. `within_hops(edges, start, k)` returns the sorted list of nodes reachable within k hops (excluding start), using BFS. `friend_recommendations(edges, user)` returns friends-of-friends who are not already friends (and not the user), sorted by number of mutual friends descending, then name.",
  "starterCode": "from collections import deque\n\ndef neighbors(edges):\n    pass\n\ndef within_hops(edges, start, k):\n    pass\n\ndef friend_recommendations(edges, user):\n    pass\n",
  "tests": "edges = [('ana', 'ben'), ('ana', 'cy'), ('ben', 'dee'), ('cy', 'dee'), ('dee', 'eve'), ('cy', 'fay')]\nassert neighbors(edges)['ana'] == {'ben', 'cy'}\nassert within_hops(edges, 'ana', 1) == ['ben', 'cy']\nassert within_hops(edges, 'ana', 2) == ['ben', 'cy', 'dee', 'fay']\nassert within_hops(edges, 'ana', 3) == ['ben', 'cy', 'dee', 'eve', 'fay']\nassert friend_recommendations(edges, 'ana') == ['dee', 'fay']",
  "solution": "from collections import deque\n\ndef neighbors(edges):\n    adj = {}\n    for a, b in edges:\n        adj.setdefault(a, set()).add(b)\n        adj.setdefault(b, set()).add(a)\n    return adj\n\ndef within_hops(edges, start, k):\n    adj = neighbors(edges)\n    dist = {start: 0}\n    q = deque([start])\n    while q:\n        n = q.popleft()\n        if dist[n] == k:\n            continue\n        for m in adj.get(n, ()):\n            if m not in dist:\n                dist[m] = dist[n] + 1\n                q.append(m)\n    return sorted(n for n in dist if n != start)\n\ndef friend_recommendations(edges, user):\n    adj = neighbors(edges)\n    friends = adj.get(user, set())\n    mutual = {}\n    for f in friends:\n        for ff in adj[f]:\n            if ff != user and ff not in friends:\n                mutual[ff] = mutual.get(ff, 0) + 1\n    return sorted(mutual, key=lambda n: (-mutual[n], n))",
  "hints": ["BFS with a distance map; stop expanding at depth k.", "Count how many of the user's friends know each candidate."]
}
```

> [!TIP] Interview tips
> - Map each family to a use case: key-value (cache/sessions), document (flexible entities), wide-column (huge time-series writes), graph (relationships).
> - For wide-column/key-value, talk about partition keys and hot partitions; for documents, embedding vs referencing.
> - Mention Cypher and multi-hop traversals for graph, and vector DBs for embeddings.
