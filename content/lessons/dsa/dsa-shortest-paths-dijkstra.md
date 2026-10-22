---
id: dsa-shortest-paths-dijkstra
title: "Shortest paths (Dijkstra)"
estimatedMinutes: 14
difficulty: hard
tags: [dsa, dijkstra, shortest-path, heap, graphs]
---

## Why it matters
Weighted shortest path is one of the most common "hard-medium" graph questions: network delay, cheapest route, minimum-effort grid path. BFS only works when every edge costs the same; once weights appear, Dijkstra is the expected tool, and interviewers probe the invariant and the negative-edge limitation. See Graphs and Heaps for the building blocks.

## Concept
**Dijkstra's algorithm** finds the shortest distance from a source to every node in a graph with **non-negative** edge weights.

**Invariant.** When a node is popped from the min-heap with distance $d$, $d$ is final: any other route must leave the "settled" set through an edge, and since weights are $\ge 0$ it cannot end up shorter. Negative edges break this (a later negative edge could shorten an already-settled node).

**Algorithm**
1. `dist[src] = 0`, all others $\infty$; heap holds `(0, src)`.
2. Pop `(d, u)`. If `d > dist[u]`, it is **stale**; skip it (lazy deletion, since `heapq` has no decrease-key).
3. For each edge `(u, v, w)`: if `d + w < dist[v]`, set `dist[v] = d + w`, push `(dist[v], v)`, and optionally record `parent[v] = u`.

**Complexity**: $O((V + E) \log V)$ with a binary heap (each edge causes at most one push). Space $O(V + E)$. Path reconstruction: follow `parent` back from the target.

**Choosing the algorithm**

| Situation | Use |
|---|---|
| unweighted / equal weights | BFS, $O(V+E)$ |
| weights only 0 or 1 | 0-1 BFS with a deque |
| non-negative weights | Dijkstra |
| negative edges, or "at most $k$ edges" | Bellman-Ford, $O(VE)$ |
| DAG | topological order relaxation, $O(V+E)$ |
| all pairs, small $V$ | Floyd-Warshall, $O(V^3)$ |

**Variants**: minimize the **max** edge on a path (min effort) by using `max(d, w)` instead of `d + w`; shortest path in a grid with node costs; multi-source (push all sources at distance 0); state-augmented nodes `(node, stops_left)`.

**Pitfalls.** Forgetting the stale check (still correct but slower), using it with negative weights, treating unreachable nodes (`inf`) as a valid answer, and building an adjacency list for directed vs undirected incorrectly.

## Worked example
Directed graph, source `A`. Edges: `A->B 4`, `A->C 1`, `C->B 2`, `B->D 1`, `C->D 5`, `D->E 3`.

```text
pop (0,A)  relax B=4, C=1                   dist A0 B4 C1
pop (1,C)  relax B=min(4,1+2)=3, D=1+5=6    dist A0 B3 C1 D6
pop (3,B)  relax D=min(6,3+1)=4             dist A0 B3 C1 D4
pop (4,B)  stale (4 > 3): skip
pop (4,D)  relax E=4+3=7                    dist ... D4 E7
pop (6,D)  stale: skip
pop (7,E)  done
```

Final distances: **A0, B3, C1, D4, E7**. Shortest path to `E` via parents: `A -> C -> B -> D -> E` with cost $1+2+1+3 = 7$. The direct-looking route `A -> B` (4) was worse than going through `C` (3), which BFS-by-edge-count would have missed.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does Dijkstra fail with negative edge weights?",
  "options": [
    "The heap cannot store negative numbers",
    "A node's popped distance may not be final, since a later negative edge can still shorten it",
    "It runs in exponential time",
    "It only works on trees"
  ],
  "answer": 1,
  "explanation": "The correctness invariant (popped distance is final) relies on every path extension being non-decreasing."
}
```

```quiz
{
  "id": "q2",
  "question": "A graph has V nodes and E edges, non-negative weights, and you use heapq with lazy deletion. What is the time complexity?",
  "options": [
    "O(V + E)",
    "O(V^2) always",
    "O((V + E) log V)",
    "O(V * E)"
  ],
  "answer": 2,
  "explanation": "Each edge relaxation pushes at most once (O(E) pushes), each push/pop costs O(log) so the total is O((V+E) log V)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `dijkstra(n, edges, src)`: nodes `0..n-1`, `edges` are directed `(u, v, w)` with `w >= 0`; return a list of distances (`float('inf')` if unreachable). (2) `shortest_path(n, edges, src, dst)`: return `(distance, path_as_list)`; `(float('inf'), [])` if unreachable; the path for `src == dst` is `[src]`. (3) `network_delay_time(times, n, k)`: nodes are `1..n`, `times` are directed `(u, v, w)`; return the time for a signal from `k` to reach all nodes, or -1. (4) `min_effort_path(heights)`: grid, move in 4 directions from top-left to bottom-right; effort of a path is the maximum absolute height difference between consecutive cells; return the minimum possible effort.",
  "starterCode": "import heapq\n\ndef dijkstra(n, edges, src):\n    pass\n\ndef shortest_path(n, edges, src, dst):\n    pass\n\ndef network_delay_time(times, n, k):\n    pass\n\ndef min_effort_path(heights):\n    pass\n\nE = [(0, 1, 4), (0, 2, 1), (2, 1, 2), (1, 3, 1), (2, 3, 5), (3, 4, 3)]\nprint(dijkstra(5, E, 0))",
  "tests": "INF = float(\"inf\")\nE = [(0, 1, 4), (0, 2, 1), (2, 1, 2), (1, 3, 1), (2, 3, 5), (3, 4, 3)]\nassert dijkstra(5, E, 0) == [0, 3, 1, 4, 7]\nassert dijkstra(5, E, 3) == [INF, INF, INF, 0, 3]\nassert dijkstra(1, [], 0) == [0]\nassert dijkstra(3, [(0, 1, 0), (1, 2, 0)], 0) == [0, 0, 0]\nassert dijkstra(2, [(0, 1, 5), (0, 1, 2), (0, 0, 1)], 0) == [0, 2]\nassert shortest_path(5, E, 0, 4) == (7, [0, 2, 1, 3, 4])\nassert shortest_path(5, E, 0, 0) == (0, [0])\nassert shortest_path(5, E, 4, 0) == (INF, [])\nassert network_delay_time([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2) == 2\nassert network_delay_time([[1, 2, 1]], 2, 1) == 1\nassert network_delay_time([[1, 2, 1]], 2, 2) == -1\nassert network_delay_time([], 1, 1) == 0\nassert min_effort_path([[1, 2, 2], [3, 8, 2], [5, 3, 5]]) == 2\nassert min_effort_path([[1, 2, 3], [3, 8, 4], [5, 3, 5]]) == 1\nassert min_effort_path([[7]]) == 0\nassert min_effort_path([[1, 10, 6, 7, 9, 10, 4, 9]]) == 9\nn = 2000\nchain = [(i, i + 1, 1) for i in range(n - 1)] + [(0, n - 1, n * 2)]\nassert dijkstra(n, chain, 0)[-1] == n - 1\n",
  "solution": "import heapq\n\ndef dijkstra(n, edges, src):\n    adj = [[] for _ in range(n)]\n    for u, v, w in edges:\n        adj[u].append((v, w))\n    dist = [float(\"inf\")] * n\n    dist[src] = 0\n    heap = [(0, src)]\n    while heap:\n        d, u = heapq.heappop(heap)\n        if d > dist[u]:\n            continue\n        for v, w in adj[u]:\n            nd = d + w\n            if nd < dist[v]:\n                dist[v] = nd\n                heapq.heappush(heap, (nd, v))\n    return dist\n\ndef shortest_path(n, edges, src, dst):\n    adj = [[] for _ in range(n)]\n    for u, v, w in edges:\n        adj[u].append((v, w))\n    dist = [float(\"inf\")] * n\n    parent = [-1] * n\n    dist[src] = 0\n    heap = [(0, src)]\n    while heap:\n        d, u = heapq.heappop(heap)\n        if d > dist[u]:\n            continue\n        for v, w in adj[u]:\n            nd = d + w\n            if nd < dist[v]:\n                dist[v] = nd\n                parent[v] = u\n                heapq.heappush(heap, (nd, v))\n    if dist[dst] == float(\"inf\"):\n        return (float(\"inf\"), [])\n    path = [dst]\n    while path[-1] != src:\n        path.append(parent[path[-1]])\n    return (dist[dst], path[::-1])\n\ndef network_delay_time(times, n, k):\n    edges = [(u - 1, v - 1, w) for u, v, w in times]\n    dist = dijkstra(n, edges, k - 1)\n    worst = max(dist)\n    return -1 if worst == float(\"inf\") else worst\n\ndef min_effort_path(heights):\n    R = len(heights)\n    C = len(heights[0]) if R else 0\n    if R == 0 or C == 0:\n        return 0\n    best = [[float(\"inf\")] * C for _ in range(R)]\n    best[0][0] = 0\n    heap = [(0, 0, 0)]\n    while heap:\n        d, r, c = heapq.heappop(heap)\n        if d > best[r][c]:\n            continue\n        if (r, c) == (R - 1, C - 1):\n            return d\n        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):\n            nr, nc = r + dr, c + dc\n            if 0 <= nr < R and 0 <= nc < C:\n                nd = max(d, abs(heights[r][c] - heights[nr][nc]))\n                if nd < best[nr][nc]:\n                    best[nr][nc] = nd\n                    heapq.heappush(heap, (nd, nr, nc))\n    return 0",
  "hints": [
    "Build `adj[u].append((v, w))`; heap entries are `(dist, node)`.",
    "Skip stale pops with `if d > dist[u]: continue`.",
    "For paths store `parent[v] = u` whenever you improve `dist[v]`, then walk back from `dst` and reverse.",
    "min_effort_path: same loop on grid cells, but the new cost is `max(d, abs(h[r][c] - h[nr][nc]))`."
  ]
}
```


> [!TIP] Interview tips
> - State the invariant and the non-negative-weight requirement before coding; that is the follow-up trap.
> - Mention lazy deletion and why `heapq` needs it (no decrease-key).
> - If asked about negatives, name Bellman-Ford ($O(VE)$) and negative-cycle detection; for DAGs, topological relaxation.
> - Always handle unreachable nodes explicitly (`inf` or -1) and the `src == dst` case.
