---
id: dsa-heaps-priority-queues
title: Heaps / Priority Queues
estimatedMinutes: 14
difficulty: medium
tags: [dsa, heap, priority-queue, top-k]
---

## Why it matters
Any time a question says "k largest", "kth smallest", "merge k sorted", "running median" or "schedule the next-best task", the answer is a heap. It turns a full $O(n \log n)$ sort into $O(n \log k)$ and works on streams.

## Concept
A **binary heap** is a complete binary tree stored in an array where each parent is $\le$ its children (**min-heap**) or $\ge$ (**max-heap**). Children of index $i$ are $2i+1$ and $2i+2$.

| Operation | Cost |
|---|---|
| peek min | $O(1)$ |
| push / pop | $O(\log n)$ (sift up / sift down) |
| heapify an array | $O(n)$ (not $n \log n$) |
| search / delete arbitrary | $O(n)$ |

**Python**: `heapq` is a **min-heap** on a list: `heappush`, `heappop`, `heapify`, `heapreplace`, `nlargest(k, it)`. For a max-heap push negated values. For tuples, comparison is lexicographic, so `(priority, tiebreak, item)` avoids comparing unorderable items.

**Core patterns**
- **Top-k largest**: keep a **min-heap of size k**; the root is the kth largest. $O(n \log k)$ time, $O(k)$ space, works on streams.
- **Merge k sorted lists**: heap of `(value, list_index, position)`, pop the smallest, push the successor. $O(N \log k)$.
- **Two heaps for a running median**: a max-heap for the lower half and a min-heap for the upper half, sizes differing by at most 1. Add $O(\log n)$, median $O(1)$.
- **Lazy deletion**: instead of removing from the middle, mark an entry stale and skip it when popped.
- **Dijkstra, scheduling, Huffman coding** all rely on a priority queue.

**Rule of thumb**: need the **max/min repeatedly while inserting** use a heap; need sorted order of everything or rank queries use a sort or balanced BST.

## Worked example
Kth largest with $k = 2$ on the stream `[3, 2, 1, 5, 6, 4]`, using a min-heap of size 2:
1. Push 3: heap `[3]`. Push 2: heap `[2, 3]` (size 2 reached).
2. See 1: it is smaller than the root 2, so it cannot be in the top 2. Skip.
3. See 5: larger than the root 2, so replace: pop 2, push 5, heap `[3, 5]`.
4. See 6: replace the root 3, heap `[5, 6]`. See 4: smaller than the root 5, skip.
5. The root is `5`, the 2nd largest. Total work $6 \cdot \log_2 2 = O(n \log k)$, memory 2 elements.

Running median of `[5, 15, 1, 3]`: after 5, low=[5], median 5. After 15, high=[15], median (5+15)/2 = 10. After 1, goes to low: low=[5,1], high=[15], median 5. After 3: low=[5,3,1] has too many, move 5 to high: low=[3,1], high=[5,15], median (3+5)/2 = 4.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the time complexity of building a heap from an unsorted array of n elements with heapify?",
  "options": [
    "O(n log n)",
    "O(n)",
    "O(log n)",
    "O(n^2)"
  ],
  "answer": 1,
  "explanation": "Sifting down from the middle gives $\\sum_h (n/2^{h+1}) \\cdot h = O(n)$; most nodes are near the leaves and move very little."
}
```

```quiz
{
  "id": "q2",
  "question": "To find the k largest of a stream of n numbers using the least memory, which structure do you use?",
  "options": [
    "A max-heap of all n numbers",
    "A sorted list of all n numbers",
    "A min-heap of size k",
    "A hash map of counts"
  ],
  "answer": 2,
  "explanation": "A size-k min-heap keeps the k largest seen so far; its root is the smallest of them, the one to evict first. Time $O(n \\log k)$, memory $O(k)$."
}
```

## Practice

```python-exercise
{"id": "ex1", "prompt": "Implement (1) `top_k_frequent(nums, k)`: the k most frequent values, ordered by frequency descending then value ascending (use a heap, not a full sort), (2) `merge_k_sorted(lists)`: merge k sorted lists into one sorted list using a heap, and (3) a class `MedianFinder` with `add(x)` and `median()` (a float; raise `ValueError` if empty) using two heaps.", "starterCode": "import heapq\n\ndef top_k_frequent(nums, k):\n    pass\n\ndef merge_k_sorted(lists):\n    pass\n\nclass MedianFinder:\n    def __init__(self):\n        pass\n\n    def add(self, x):\n        pass\n\n    def median(self):\n        pass\n\nprint(top_k_frequent([1, 1, 1, 2, 2, 3], 2))\nprint(merge_k_sorted([[1, 4, 7], [2, 5], [3, 6, 8]]))", "tests": "import random\nassert top_k_frequent([1, 1, 1, 2, 2, 3], 2) == [1, 2]\nassert top_k_frequent([4, 4, 5, 5, 6], 2) == [4, 5]\nassert top_k_frequent([7], 1) == [7]\nassert top_k_frequent([], 3) == []\nassert top_k_frequent([3, 1, 2], 5) == [1, 2, 3]\nassert top_k_frequent([1, 2, 3], 0) == []\nassert merge_k_sorted([]) == []\nassert merge_k_sorted([[], []]) == []\nassert merge_k_sorted([[1, 4, 7], [2, 5], [3, 6, 8]]) == [1, 2, 3, 4, 5, 6, 7, 8]\nassert merge_k_sorted([[], [1], []]) == [1]\nassert merge_k_sorted([[1, 1], [1], [0, 1]]) == [0, 1, 1, 1, 1]\nrng = random.Random(1)\nfor _ in range(30):\n    ls = [sorted(rng.randint(-9, 9) for _ in range(rng.randint(0, 6))) for _ in range(rng.randint(0, 5))]\n    assert merge_k_sorted(ls) == sorted(x for l in ls for x in l)\nm = MedianFinder()\ntry:\n    m.median()\n    assert False\nexcept ValueError:\n    pass\nseen = []\nfor x in [5, 15, 1, 3]:\n    m.add(x)\n    seen.append(m.median())\nassert seen == [5.0, 10.0, 5.0, 4.0]\nm = MedianFinder()\nvals = []\nfor _ in range(100):\n    x = rng.randint(-50, 50)\n    vals.append(x)\n    m.add(x)\n    s = sorted(vals)\n    n = len(s)\n    exp = s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2\n    assert abs(m.median() - exp) < 1e-9", "solution": "import heapq\nfrom collections import Counter\n\ndef top_k_frequent(nums, k):\n    counts = Counter(nums)\n    best = heapq.nsmallest(k, counts.items(), key=lambda kv: (-kv[1], kv[0]))\n    return [v for v, _ in best]\n\ndef merge_k_sorted(lists):\n    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]\n    heapq.heapify(heap)\n    out = []\n    while heap:\n        val, i, pos = heapq.heappop(heap)\n        out.append(val)\n        if pos + 1 < len(lists[i]):\n            heapq.heappush(heap, (lists[i][pos + 1], i, pos + 1))\n    return out\n\nclass MedianFinder:\n    def __init__(self):\n        self.low = []   # max-heap via negation\n        self.high = []  # min-heap\n\n    def add(self, x):\n        heapq.heappush(self.low, -x)\n        heapq.heappush(self.high, -heapq.heappop(self.low))\n        if len(self.high) > len(self.low):\n            heapq.heappush(self.low, -heapq.heappop(self.high))\n\n    def median(self):\n        if not self.low:\n            raise ValueError('empty')\n        if len(self.low) > len(self.high):\n            return float(-self.low[0])\n        return (-self.low[0] + self.high[0]) / 2", "hints": ["`heapq.nsmallest(k, counts.items(), key=lambda kv: (-kv[1], kv[0]))` is a heap-based top-k; or push `(-count, value)` tuples.", "For merging, push `(lists[i][0], i, 0)` for each non-empty list; after popping, push the next element from the same list.", "MedianFinder: keep `low` as a max-heap (negate values) and `high` as a min-heap; after each add, rebalance so `len(low) == len(high)` or `len(low) == len(high) + 1`."]}
```

> [!TIP] Interview tips
> - Say "a heap of size k" for top-k: $O(n \log k)$ beats sorting when $k \ll n$.
> - Python only has a min-heap: negate numbers, or use tuples like `(-count, key)`; add an index tiebreaker when items are not comparable.
> - Remember heapify is $O(n)$, and that a heap gives no ordered traversal or fast arbitrary delete.
> - Two-heaps median and merge-k-lists are the standard follow-ups; state the complexity of each.
