---
id: dsa-union-find
title: "Union-find (disjoint sets)"
estimatedMinutes: 12
difficulty: medium
tags: [dsa, union-find, disjoint-set, graphs]
---

## Why it matters
Union-find tracks which elements belong to the same group while groups merge over time. It answers "are $a$ and $b$ connected?" in near-constant time and is the cleanest tool for dynamic connectivity, cycle detection in undirected graphs, Kruskal's MST, and "accounts merge" or "number of provinces" style questions. See Graphs for the DFS/BFS alternative.

## Concept
Each set is a tree stored in a `parent` array; the root is the set's representative. Two operations:
- `find(x)`: follow parents to the root.
- `union(a, b)`: attach one root under the other (only if the roots differ).

Two optimizations make it fast:
- **Path compression**: during `find`, point every visited node straight at the root.
- **Union by size (or rank)**: attach the smaller tree under the larger one so trees stay shallow.

With both, each operation costs amortized $O(\alpha(n))$, the inverse Ackermann function, which is at most 4 for any realistic $n$. Treat it as $O(1)$. With only one of them it is $O(\log n)$ amortized; with neither it degrades to $O(n)$ on a chain.

**When to use it vs DFS/BFS.** Static graph, one connectivity question: DFS is fine. Edges arrive over time, or you need many connectivity queries, or you merge groups: union-find. It cannot **split** groups (no deletion); for offline deletions, process in reverse and turn deletions into unions.

**Patterns**
- **Count components**: start with $n$, subtract 1 on every successful union.
- **Cycle detection (undirected)**: if `union(a, b)` finds the same root, the edge closes a cycle (Redundant Connection).
- **Kruskal MST**: sort edges by weight, add an edge when it unites two sets.
- **Group by key**: map strings or emails to ids first (Accounts Merge), then union.
- **Grid problems**: id = `r * cols + c`; union neighbors (Number of Islands II adds land online).

**Pitfalls.** Forgetting to compare **roots**, not the raw nodes. Recursive `find` can hit Python's recursion limit on long chains if you skip union by size; write it iteratively.

## Worked example
$n = 6$ nodes `0..5`, edges in order: `(0,1) (1,2) (3,4) (2,0) (4,5)`. Track components (start at 6) and the root of each set (union by size, ties attach the second root under the first).

```text
edge   roots     action                 sets                    comps
(0,1)  0,1       merge 1 under 0        {0,1} {2} {3} {4} {5}   5
(1,2)  0,2       merge 2 under 0        {0,1,2} {3} {4} {5}     4
(3,4)  3,4       merge 4 under 3        {0,1,2} {3,4} {5}       3
(2,0)  0,0       same root: CYCLE       unchanged               3
(4,5)  3,5       merge 5 under 3        {0,1,2} {3,4,5}         2
```

Answers: **2 components**; the redundant (cycle-closing) edge is `(2,0)`. Total work is about 5 edges times near-constant `find`, instead of re-running a DFS after each edge.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which pair of optimizations gives union-find its amortized near-constant time?",
  "options": [
    "Memoization and sorting",
    "Path compression and union by size/rank",
    "Binary search and hashing",
    "Lazy deletion and rebalancing"
  ],
  "answer": 1,
  "explanation": "Path compression flattens trees during find, and union by size/rank keeps them shallow. Together they give O(alpha(n)) amortized per operation."
}
```

```quiz
{
  "id": "q2",
  "question": "You add edges to an undirected graph one at a time and need to know when the first cycle appears. What does union-find check?",
  "options": [
    "Whether either endpoint was seen before",
    "Whether find(a) == find(b) before uniting",
    "Whether the degree of a node exceeds 2",
    "Whether the edge weight is minimal"
  ],
  "answer": 1,
  "explanation": "If both endpoints already share a root, they are already connected, so the new edge closes a cycle."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a `UnionFind(n)` class with `find(x)` (path compression), `union(a, b)` (union by size; return `True` if two different sets were merged, else `False`), `connected(a, b)`, `size(x)` (size of x's set) and attribute `count` (number of sets). Then implement `count_components(n, edges)` and `redundant_connection(edges)`: given edges of a graph that was a tree plus one extra edge (nodes labeled `1..n`), return the **last** edge in the input whose removal leaves a tree, i.e. the edge that first closes a cycle; return `None` if there is no cycle.",
  "starterCode": "class UnionFind:\n    def __init__(self, n):\n        self.count = n\n\n    def find(self, x):\n        pass\n\n    def union(self, a, b):\n        pass\n\n    def connected(self, a, b):\n        pass\n\n    def size(self, x):\n        pass\n\ndef count_components(n, edges):\n    pass\n\ndef redundant_connection(edges):\n    pass\n\nprint(count_components(6, [(0, 1), (1, 2), (3, 4), (2, 0), (4, 5)]))",
  "tests": "uf = UnionFind(5)\nassert uf.count == 5 and not uf.connected(0, 1)\nassert uf.union(0, 1) is True and uf.union(1, 0) is False\nassert uf.connected(0, 1) and uf.count == 4\nassert uf.size(0) == 2 and uf.size(1) == 2 and uf.size(4) == 1\nuf.union(2, 3); uf.union(1, 3)\nassert uf.size(0) == 4 and uf.connected(0, 2) and not uf.connected(0, 4) and uf.count == 2\nassert uf.union(2, 2) is False\nassert count_components(6, [(0, 1), (1, 2), (3, 4), (2, 0), (4, 5)]) == 2\nassert count_components(0, []) == 0\nassert count_components(4, []) == 4\nassert count_components(3, [(0, 1), (1, 0), (1, 1)]) == 2\nassert redundant_connection([[1, 2], [1, 3], [2, 3]]) == [2, 3]\nassert redundant_connection([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]) == [1, 4]\nassert redundant_connection([[1, 2], [2, 3]]) is None\nassert redundant_connection([]) is None\nbig = UnionFind(50000)\nfor i in range(49999):\n    big.union(i, i + 1)\nassert big.count == 1 and big.size(0) == 50000 and big.connected(0, 49999)\n",
  "solution": "class UnionFind:\n    def __init__(self, n):\n        self.parent = list(range(n))\n        self.sz = [1] * n\n        self.count = n\n\n    def find(self, x):\n        root = x\n        while self.parent[root] != root:\n            root = self.parent[root]\n        while self.parent[x] != root:\n            self.parent[x], x = root, self.parent[x]\n        return root\n\n    def union(self, a, b):\n        ra, rb = self.find(a), self.find(b)\n        if ra == rb:\n            return False\n        if self.sz[ra] < self.sz[rb]:\n            ra, rb = rb, ra\n        self.parent[rb] = ra\n        self.sz[ra] += self.sz[rb]\n        self.count -= 1\n        return True\n\n    def connected(self, a, b):\n        return self.find(a) == self.find(b)\n\n    def size(self, x):\n        return self.sz[self.find(x)]\n\ndef count_components(n, edges):\n    uf = UnionFind(n)\n    for a, b in edges:\n        uf.union(a, b)\n    return uf.count\n\ndef redundant_connection(edges):\n    if not edges:\n        return None\n    uf = UnionFind(max(max(e) for e in edges) + 1)\n    for a, b in edges:\n        if not uf.union(a, b):\n            return [a, b]\n    return None",
  "hints": [
    "`find`: loop to the root, then a second loop pointing every node on the path at the root.",
    "In `union`, compare roots; if equal return False, otherwise attach the smaller under the larger, add sizes and decrement `count`.",
    "`redundant_connection`: size the structure with `max` node label + 1, and return the first edge whose `union` returns False."
  ]
}
```


> [!TIP] Interview tips
> - Name both optimizations and the $O(\alpha(n))$ bound; interviewers expect "effectively constant".
> - Write `find` iteratively to avoid recursion-depth issues on a 100k-node chain.
> - Say the limitation: union-find cannot undo or split sets; for deletions go offline and reverse.
> - Pick DSU over DFS when edges stream in or when you need component sizes and counts as you merge.
