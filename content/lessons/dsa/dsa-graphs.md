---
id: dsa-graphs
title: Graphs (BFS, DFS, topological sort)
estimatedMinutes: 15
difficulty: medium
tags: [dsa, graphs, bfs, dfs, topological-sort]
---

## Why it matters
Grids, dependencies, social networks, word ladders and course schedules are all graphs in disguise. Interviewers want you to pick BFS vs DFS correctly, track visited nodes, detect cycles, and give the complexity as $O(V + E)$.

## Concept
**Representation**: an **adjacency list** (`dict[node] -> list[neighbors]`) uses $O(V + E)$ space and is the default; an adjacency matrix uses $O(V^2)$ and suits dense graphs. A grid is an implicit graph: neighbors are the 4 (or 8) adjacent cells.

**BFS** (queue): explores in layers by edge count. It finds the **shortest path in an unweighted graph**. Mark nodes visited **when enqueuing**, otherwise they get queued many times. Time $O(V + E)$, space $O(V)$.

**DFS** (recursion or stack): goes deep first. Use it for connected components, flood fill, path existence, cycle detection and topological order. Time $O(V + E)$, space $O(V)$ (call stack depth up to $V$, so prefer an explicit stack for big inputs in Python).

**Connected components / islands**: loop over all nodes, start a BFS/DFS from each unvisited one, and count the starts.

**Cycle detection**: undirected graph, a visited neighbor that is not your parent; directed graph, DFS with three colors (unvisited / on the current path / done), or Kahn's algorithm leaving nodes unprocessed.

**Topological sort** (a DAG only): an ordering where each edge $u \to v$ has $u$ before $v$.
- **Kahn's algorithm**: compute in-degrees, queue all nodes with in-degree 0, repeatedly pop a node, append it to the order and decrement its neighbors' in-degrees. If the order has fewer than $V$ nodes, there is a cycle. $O(V + E)$.
- **DFS**: append a node after all its descendants, then reverse.

**Weighted shortest paths**: Dijkstra (non-negative weights, heap, $O((V+E)\log V)$), Bellman-Ford (negative edges, $O(VE)$). Plain BFS is wrong with weights.

## Worked example
Course schedule with 4 courses and prerequisites `[(0,1), (0,2), (1,3), (2,3)]` (meaning `0` must come before `1`, and so on). Kahn's algorithm:
1. In-degrees: `0:0, 1:1, 2:1, 3:2`. Queue `[0]`.
2. Pop 0, order `[0]`. Decrement 1 and 2 to 0: queue `[1, 2]`.
3. Pop 1, order `[0,1]`. Decrement 3 to 1. Pop 2, order `[0,1,2]`. Decrement 3 to 0: queue `[3]`.
4. Pop 3, order `[0,1,2,3]`. All 4 nodes processed, so no cycle.

Add the edge `(3, 0)`: now node 0 has in-degree 1, nothing starts with in-degree 0, the order stays empty, and `0 < 4` signals a cycle.

Islands in `[[1,1,0],[0,1,0],[0,0,1]]`: start at (0,0), flood (0,1), (1,1): component 1. Cell (2,2) is unvisited land: component 2. Answer **2**, cost $O(R \cdot C)$ since each cell is visited once.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "You need the minimum number of moves between two cells in an unweighted grid maze. Which algorithm?",
  "options": [
    "DFS",
    "BFS",
    "Dijkstra is the only option",
    "Topological sort"
  ],
  "answer": 1,
  "explanation": "BFS expands by distance layers, so the first time it reaches the target is the shortest path in edges."
}
```

```quiz
{
  "id": "q2",
  "question": "Kahn's algorithm finishes having output fewer than V nodes. What does that mean?",
  "options": [
    "The graph is disconnected",
    "The graph is undirected",
    "The graph has a cycle",
    "There are duplicate edges"
  ],
  "answer": 2,
  "explanation": "Nodes on a cycle never reach in-degree 0, so they are never queued; a valid topological order exists only for a DAG."
}
```

## Practice

```python-exercise
{"id": "ex1", "prompt": "Implement (1) `num_islands(grid)`: count 4-connected groups of `1` in a grid of 0/1 ints (do not mutate the input), (2) `topo_order(n, edges)`: nodes are `0..n-1`, edge `(u, v)` means `u` before `v`; return a list, and when several nodes are ready pick the **smallest** first; return `[]` if there is a cycle, and (3) `shortest_path(graph, src, dst)`: BFS on an adjacency-list dict, returning the number of edges or `-1` if unreachable (`src == dst` gives 0). Use iterative code.", "starterCode": "def num_islands(grid):\n    pass\n\ndef topo_order(n, edges):\n    pass\n\ndef shortest_path(graph, src, dst):\n    pass\n\nprint(num_islands([[1, 1, 0], [0, 1, 0], [0, 0, 1]]))\nprint(topo_order(4, [(0, 1), (0, 2), (1, 3), (2, 3)]))\nprint(shortest_path({'a': ['b', 'c'], 'b': ['d'], 'c': ['d']}, 'a', 'd'))", "tests": "assert num_islands([]) == 0\nassert num_islands([[]]) == 0\nassert num_islands([[0, 0], [0, 0]]) == 0\nassert num_islands([[1]]) == 1\nassert num_islands([[1, 1, 0], [0, 1, 0], [0, 0, 1]]) == 2\nassert num_islands([[1, 0, 1], [0, 1, 0], [1, 0, 1]]) == 5\nassert num_islands([[1, 1, 1], [1, 0, 1], [1, 1, 1]]) == 1\ng = [[1, 0], [0, 1]]\nnum_islands(g)\nassert g == [[1, 0], [0, 1]]\nbig = [[1] * 60 for _ in range(60)]\nassert num_islands(big) == 1\nassert topo_order(0, []) == []\nassert topo_order(1, []) == [0]\nassert topo_order(3, []) == [0, 1, 2]\nassert topo_order(4, [(0, 1), (0, 2), (1, 3), (2, 3)]) == [0, 1, 2, 3]\nassert topo_order(4, [(3, 0), (0, 1), (0, 2), (1, 3), (2, 3)]) == []\nassert topo_order(2, [(0, 0)]) == []\nassert topo_order(3, [(2, 1), (1, 0)]) == [2, 1, 0]\nassert topo_order(4, [(3, 1), (2, 1)]) == [0, 2, 3, 1]\nassert topo_order(3, [(0, 1), (0, 1)]) == [0, 1, 2]\ngr = {'a': ['b', 'c'], 'b': ['d'], 'c': ['d'], 'd': [], 'x': ['y']}\nassert shortest_path(gr, 'a', 'd') == 2\nassert shortest_path(gr, 'a', 'a') == 0\nassert shortest_path(gr, 'a', 'y') == -1\nassert shortest_path(gr, 'd', 'a') == -1\nassert shortest_path({}, 1, 2) == -1\nassert shortest_path({1: [2], 2: [1, 3], 3: [1]}, 1, 3) == 2\nassert shortest_path({1: [2], 2: [3], 3: [4], 4: [1]}, 1, 4) == 3\nassert shortest_path({1: [1, 2], 2: [1]}, 1, 2) == 1", "solution": "import heapq\nfrom collections import deque\n\ndef num_islands(grid):\n    if not grid or not grid[0]:\n        return 0\n    rows, cols = len(grid), len(grid[0])\n    seen = set()\n    count = 0\n    for r in range(rows):\n        for c in range(cols):\n            if grid[r][c] == 1 and (r, c) not in seen:\n                count += 1\n                seen.add((r, c))\n                stack = [(r, c)]\n                while stack:\n                    x, y = stack.pop()\n                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):\n                        if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == 1 and (nx, ny) not in seen:\n                            seen.add((nx, ny))\n                            stack.append((nx, ny))\n    return count\n\ndef topo_order(n, edges):\n    adj = [[] for _ in range(n)]\n    indeg = [0] * n\n    for u, v in edges:\n        adj[u].append(v)\n        indeg[v] += 1\n    ready = [i for i in range(n) if indeg[i] == 0]\n    heapq.heapify(ready)\n    order = []\n    while ready:\n        u = heapq.heappop(ready)\n        order.append(u)\n        for v in adj[u]:\n            indeg[v] -= 1\n            if indeg[v] == 0:\n                heapq.heappush(ready, v)\n    return order if len(order) == n else []\n\ndef shortest_path(graph, src, dst):\n    if src == dst:\n        return 0\n    seen = {src}\n    q = deque([(src, 0)])\n    while q:\n        node, d = q.popleft()\n        for nb in graph.get(node, []):\n            if nb == dst:\n                return d + 1\n            if nb not in seen:\n                seen.add(nb)\n                q.append((nb, d + 1))\n    return -1", "hints": ["Islands: keep a `seen` set (or a copy of the grid) and run an explicit-stack DFS from every unvisited land cell.", "Kahn with a min-heap of ready nodes gives the smallest-first order; compare `len(order)` with `n` to detect cycles.", "BFS: queue of `(node, dist)`; mark visited when enqueuing; use `graph.get(node, [])` for missing keys."]}
```

> [!TIP] Interview tips
> - Say "BFS for shortest path in unweighted graphs, DFS for exhaustive exploration and cycle checks" and give $O(V + E)$.
> - Clarify directed vs undirected, duplicate edges and disconnected graphs before coding.
> - Mark visited on enqueue, not on dequeue, or BFS can blow up; on grids avoid recursion depth issues with an explicit stack.
> - If the interviewer adds weights, switch to Dijkstra (heap); if they add negative edges, Bellman-Ford.
