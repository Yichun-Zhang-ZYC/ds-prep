---
id: genai-eng-graphrag-knowledge-graphs
title: GraphRAG / knowledge graphs
estimatedMinutes: 11
difficulty: hard
tags: [genai, rag, graphrag, knowledge-graph, multi-hop]
---

## Why it matters
Vanilla vector RAG retrieves isolated chunks, so it struggles with multi-hop questions ("which suppliers of the company we acquired are in the EU?") and global questions ("what are the main themes across these 10,000 documents?"). GraphRAG adds explicit structure, and interviewers ask when that extra complexity pays off.

## Concept
**Knowledge graph (KG)**: entities as nodes and relations as typed edges, stored as triples `(head, relation, tail)` in a graph database (Neo4j, Neptune) or even in tables. Queried with Cypher/SPARQL or by traversal.

**Two GraphRAG flavors**:
- **KG-augmented retrieval (local)**: link query entities to graph nodes, traverse $k$ hops, and feed the neighborhood (triples, plus the source text of those nodes) to the LLM. Answers multi-hop, relational questions that no single chunk contains.
- **Microsoft-style GraphRAG (global)**: an LLM extracts entities and relationships from every chunk, builds a graph, runs community detection (Leiden) to form hierarchical clusters, and pre-writes a **community summary** for each. Global questions are answered map-reduce style over summaries. Indexing is expensive (many LLM calls per chunk) but enables corpus-level "sensemaking" that top-$k$ chunks cannot.

**Building the graph**: LLM or NER-based extraction with a fixed schema (entity types, relation types), entity resolution/deduplication ("IBM" = "International Business Machines"), and provenance links from each edge back to its source chunk for citations. Extraction errors compound, so schema constraints and sampling-based QA matter.

**Trade-offs vs vector RAG**: higher indexing cost and latency, schema and maintenance burden, stale graphs when data changes (incremental updates are hard), extraction noise. Benefits: multi-hop reasoning, explainable paths, aggregation and global questions. Typical hybrid: vector search to find seed entities/chunks, graph expansion for context, rerank, then generate.

**Use it when** relationships are the point (org charts, supply chains, biomedical, fraud, codebases) or when questions are corpus-wide. **Skip it** for single-document lookup and FAQ-style questions where plain hybrid RAG works.

## Worked example
Triples: (Alice, works_at, Acme), (Acme, acquired, Beta), (Beta, located_in, Paris), (Bob, works_at, Beta).

Question: "In which city is the company acquired by Alice's employer based?" Vector search on the question finds chunks about Alice or Acme, but no chunk states Beta's city together with Alice. Graph path: Alice - Acme - Beta - Paris is 3 hops, so a 3-hop expansion from "Alice" reaches {Acme, Beta, Bob, Paris}. Handing those triples to the LLM answers "Paris" with a traceable path. Hop count matters: the 2-hop neighborhood is {Acme, Beta} and does not contain Paris, while deeper expansion grows fast (fan-out), so cap hops at 2-3 and prune by relation type.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which question is the strongest case for community-summary (global) GraphRAG over top-k vector RAG?",
  "options": [
    "What is the refund window for annual plans?",
    "What are the main themes across all 5,000 incident reports?",
    "Who wrote the onboarding guide?",
    "Translate this paragraph into French"
  ],
  "answer": 1,
  "explanation": "Global sensemaking needs information aggregated over the whole corpus. Top-k chunks see only a sliver; precomputed community summaries can be map-reduced."
}
```

```quiz
{
  "id": "q2",
  "question": "Which is a real drawback of building a knowledge graph with LLM extraction?",
  "options": [
    "Graphs cannot store text provenance",
    "Extraction errors and duplicate entities (needing entity resolution) degrade answers, and updates are hard",
    "Graph traversal cannot be bounded",
    "It cannot be combined with vector search"
  ],
  "answer": 1,
  "explanation": "Noisy extraction, entity resolution and incremental updates are the main costs. Provenance links are standard practice, and graph and vector search are commonly combined."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Triples are `(head, relation, tail)`; treat edges as undirected for traversal. Implement `k_hop(triples, start, hops)` returning a sorted list of nodes within `hops` edges of `start` (excluding `start`), and `find_path(triples, src, dst)` returning the shortest path as a list of nodes via BFS (visit neighbors in sorted order; `[src]` if src == dst; `None` if unreachable).",
  "starterCode": "from collections import deque\n\ndef k_hop(triples, start, hops):\n    pass\n\ndef find_path(triples, src, dst):\n    pass\n",
  "tests": "T = [('Alice', 'works_at', 'Acme'), ('Acme', 'acquired', 'Beta'), ('Beta', 'located_in', 'Paris'), ('Bob', 'works_at', 'Beta')]\nassert k_hop(T, 'Alice', 0) == []\nassert k_hop(T, 'Alice', 1) == ['Acme']\nassert k_hop(T, 'Alice', 2) == ['Acme', 'Beta']\nassert k_hop(T, 'Alice', 3) == ['Acme', 'Beta', 'Bob', 'Paris']\nassert k_hop(T, 'Nobody', 2) == []\nassert find_path(T, 'Alice', 'Paris') == ['Alice', 'Acme', 'Beta', 'Paris']\nassert find_path(T, 'Bob', 'Acme') == ['Bob', 'Beta', 'Acme']\nassert find_path(T, 'Alice', 'Alice') == ['Alice']\nassert find_path(T, 'Alice', 'Zed') is None",
  "solution": "from collections import deque\n\ndef _adj(triples):\n    adj = {}\n    for h, _, t in triples:\n        adj.setdefault(h, set()).add(t)\n        adj.setdefault(t, set()).add(h)\n    return adj\n\ndef k_hop(triples, start, hops):\n    adj = _adj(triples)\n    seen = {start}\n    frontier = [start]\n    for _ in range(hops):\n        nxt = []\n        for n in frontier:\n            for m in adj.get(n, ()):\n                if m not in seen:\n                    seen.add(m)\n                    nxt.append(m)\n        frontier = nxt\n    return sorted(seen - {start})\n\ndef find_path(triples, src, dst):\n    if src == dst:\n        return [src]\n    adj = _adj(triples)\n    prev = {src: None}\n    q = deque([src])\n    while q:\n        n = q.popleft()\n        for m in sorted(adj.get(n, ())):\n            if m not in prev:\n                prev[m] = n\n                if m == dst:\n                    path = [m]\n                    while prev[path[-1]] is not None:\n                        path.append(prev[path[-1]])\n                    return path[::-1]\n                q.append(m)\n    return None\n",
  "hints": [
    "Build an adjacency dict first, adding each edge in both directions.",
    "For find_path, record each node's predecessor in BFS and walk back from dst."
  ]
}
```

> [!TIP] Interview tips
> - Lead with the failure of chunk-based RAG: multi-hop and global questions. Then say what the graph adds and what it costs (extraction, entity resolution, updates).
> - Know both modes: local graph traversal for relational questions, community summaries for corpus-wide questions.
> - Be skeptical: propose a baseline (hybrid RAG + query decomposition) and justify the graph only if evals show multi-hop failures.
