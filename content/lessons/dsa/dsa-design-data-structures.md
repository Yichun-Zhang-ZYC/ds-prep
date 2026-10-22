---
id: dsa-design-data-structures
title: "Design problems (LRU cache, min stack, iterators)"
estimatedMinutes: 15
difficulty: hard
tags: [dsa, design, lru-cache, min-stack, iterator]
---

## Why it matters
"Design a data structure" questions test whether you can combine primitives (hash map, doubly linked list, stack, heap) to meet strict time bounds, and whether you write clean class code with edge cases. LRU cache is among the most-asked questions at large tech companies; min stack and iterators are the quick warm-ups.

## Concept
**Method.** (1) Write the API and the required complexity (e.g. `get` and `put` in $O(1)$). (2) Ask which operation each primitive makes cheap and combine them. (3) State the invariants the class maintains. (4) Code, then test boundaries (capacity 1, empty, duplicate keys).

**LRU cache** (`get`, `put` in $O(1)$, evict the least recently used when full).
- A **hash map** gives $O(1)$ key to node lookup but no ordering.
- A **doubly linked list** keeps recency order and can remove a node **in $O(1)$ given the node pointer** (a singly linked list cannot, a plain list needs $O(n)$).
- Combine: `map: key -> node`; list head = most recent, tail = least recent. `get` moves the node to the head. `put` updates and moves, or inserts at the head and, if over capacity, removes the tail node and its map entry. Use **sentinel** head/tail nodes to avoid null checks.
- In Python, `collections.OrderedDict` with `move_to_end` and `popitem(last=False)` does the same; mention it, but be ready to build the list by hand.

**Min stack** (`push`, `pop`, `top`, `get_min` all $O(1)$): store, with each element, the minimum **at that depth** (a tuple `(value, min_so_far)`), or keep a second stack of minima. Popping restores the previous minimum automatically. Same trick gives a max stack.

**Queue using two stacks**: push to `in`; when `out` is empty on pop/peek, pour all of `in` into `out`. Each element moves at most twice, so amortized $O(1)$.

**Iterators** (flatten nested list, BST in-order, zip/peek): keep **lazy state** on an explicit stack instead of materializing everything. `has_next` should do the work of advancing to the next real value, so `next` is trivial and `has_next` can be called repeatedly without side effects. Memory is $O(\text{depth})$, not $O(n)$.

**Others to know**: LFU cache (frequency buckets, $O(1)$), randomized set (list + map, swap-delete for `get_random` in $O(1)$), time-based key-value store (binary search over timestamps), hit counter (queue or buckets).

**Pitfalls.** Forgetting to update the map when evicting. Updating an existing key without refreshing recency. Off-by-one at capacity (evict after insert when `len > capacity`). `has_next` that consumes an element.

## Worked example
**LRU cache, capacity 2.** List shown most recent first.

```text
put(1,1)   [1]
put(2,2)   [2,1]
get(1)=1   [1,2]            1 moved to head
put(3,3)   [3,1]            full: evict tail 2
get(2)=-1  [3,1]            miss
put(4,4)   [4,3]            full: evict tail 1
get(1)=-1  [4,3]            miss
get(3)=3   [3,4]
get(4)=4   [4,3]
```

Every step touches a constant number of pointers: $O(1)$.

**Min stack.** Push -2, 0, -3 storing `(value, min)`: `(-2,-2)`, `(0,-2)`, `(-3,-3)`. `get_min()` = -3. `pop()` removes `(-3,-3)`. `top()` = 0 and `get_min()` = -2 again, with no scanning.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does an LRU cache use a doubly linked list rather than a singly linked list or Python list?",
  "options": [
    "It uses less memory",
    "Removing a node given its pointer is O(1) only if you can reach its predecessor, which a doubly linked list provides",
    "It sorts keys automatically",
    "Python lists cannot hold objects"
  ],
  "answer": 1,
  "explanation": "Moving a node to the head requires unlinking it in O(1); that needs the previous pointer. A list would cost O(n) to remove from the middle."
}
```

```quiz
{
  "id": "q2",
  "question": "In a min stack, why store the running minimum with each element instead of one global min variable?",
  "options": [
    "To save memory",
    "After popping the current minimum, the previous minimum must be recoverable in O(1)",
    "To keep the stack sorted",
    "Because get_min must be O(n)"
  ],
  "answer": 1,
  "explanation": "A single variable cannot be restored after popping the minimum without rescanning; per-element minima make pop restore it automatically."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `LRUCache(capacity)` with `get(key)` (returns -1 if absent) and `put(key, value)`, both $O(1)$, evicting the least recently used key when over capacity. Both `get` and `put` count as a use. Build the doubly linked list yourself. (2) `MinStack` with `push`, `pop`, `top`, `get_min`, all $O(1)$. (3) `NestedIterator(nested)` over an arbitrarily nested list of ints, with `has_next()` and `next()` yielding the integers in order, lazily using a stack (no full flatten up front).",
  "starterCode": "class LRUCache:\n    def __init__(self, capacity):\n        pass\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass\n\nclass MinStack:\n    def __init__(self):\n        pass\n\n    def push(self, val):\n        pass\n\n    def pop(self):\n        pass\n\n    def top(self):\n        pass\n\n    def get_min(self):\n        pass\n\nclass NestedIterator:\n    def __init__(self, nested):\n        pass\n\n    def has_next(self):\n        pass\n\n    def next(self):\n        pass\n\nc = LRUCache(2)\nc.put(1, 1); c.put(2, 2)\nprint(c.get(1))",
  "tests": "c = LRUCache(2)\nc.put(1, 1); c.put(2, 2)\nassert c.get(1) == 1\nc.put(3, 3)\nassert c.get(2) == -1\nc.put(4, 4)\nassert c.get(1) == -1 and c.get(3) == 3 and c.get(4) == 4\nc = LRUCache(1)\nc.put(1, 1); c.put(2, 2)\nassert c.get(1) == -1 and c.get(2) == 2\nc = LRUCache(2)\nc.put(1, 1); c.put(2, 2); c.put(1, 10)\nc.put(3, 3)\nassert c.get(1) == 10 and c.get(2) == -1 and c.get(3) == 3\nc = LRUCache(2)\nassert c.get(5) == -1\nc.put(0, 0)\nassert c.get(0) == 0\nbig = LRUCache(1000)\nfor i in range(5000):\n    big.put(i, i)\nassert big.get(3999) == -1 and big.get(4000) == 4000 and len(big.map) == 1000\nm = MinStack()\nm.push(-2); m.push(0); m.push(-3)\nassert m.get_min() == -3\nassert m.pop() == -3\nassert m.top() == 0 and m.get_min() == -2\nm.push(-2)\nassert m.get_min() == -2\nm.pop(); m.pop()\nassert m.get_min() == -2 and m.top() == -2\nm2 = MinStack()\nm2.push(5); m2.push(5); m2.pop()\nassert m2.get_min() == 5\ndef drain(nested):\n    it = NestedIterator(nested)\n    out = []\n    while it.has_next():\n        out.append(it.next())\n    return out\nassert drain([[1, 1], 2, [1, [1]]]) == [1, 1, 2, 1, 1]\nassert drain([]) == []\nassert drain([[]]) == []\nassert drain([[], [[]], []]) == []\nassert drain([1, [2, [3, [4]]]]) == [1, 2, 3, 4]\nassert drain([[[], 7], [], 8]) == [7, 8]\nit = NestedIterator([[], 5])\nassert it.has_next() and it.has_next() and it.next() == 5 and not it.has_next()\n",
  "solution": "class _Node:\n    def __init__(self, key=0, val=0):\n        self.key = key\n        self.val = val\n        self.prev = None\n        self.next = None\n\nclass LRUCache:\n    def __init__(self, capacity):\n        self.cap = capacity\n        self.map = {}\n        self.head = _Node()\n        self.tail = _Node()\n        self.head.next = self.tail\n        self.tail.prev = self.head\n\n    def _remove(self, node):\n        node.prev.next = node.next\n        node.next.prev = node.prev\n\n    def _add_front(self, node):\n        node.next = self.head.next\n        node.prev = self.head\n        self.head.next.prev = node\n        self.head.next = node\n\n    def get(self, key):\n        node = self.map.get(key)\n        if node is None:\n            return -1\n        self._remove(node)\n        self._add_front(node)\n        return node.val\n\n    def put(self, key, value):\n        node = self.map.get(key)\n        if node is not None:\n            node.val = value\n            self._remove(node)\n            self._add_front(node)\n            return\n        node = _Node(key, value)\n        self.map[key] = node\n        self._add_front(node)\n        if len(self.map) > self.cap:\n            lru = self.tail.prev\n            self._remove(lru)\n            del self.map[lru.key]\n\nclass MinStack:\n    def __init__(self):\n        self.st = []\n\n    def push(self, val):\n        cur = min(val, self.st[-1][1]) if self.st else val\n        self.st.append((val, cur))\n\n    def pop(self):\n        return self.st.pop()[0]\n\n    def top(self):\n        return self.st[-1][0]\n\n    def get_min(self):\n        return self.st[-1][1]\n\nclass NestedIterator:\n    def __init__(self, nested):\n        self.stack = [iter(nested)]\n        self.buf = None\n        self.has_buf = False\n\n    def has_next(self):\n        while not self.has_buf and self.stack:\n            try:\n                item = next(self.stack[-1])\n            except StopIteration:\n                self.stack.pop()\n                continue\n            if isinstance(item, list):\n                self.stack.append(iter(item))\n            else:\n                self.buf = item\n                self.has_buf = True\n        return self.has_buf\n\n    def next(self):\n        if not self.has_next():\n            raise StopIteration\n        self.has_buf = False\n        return self.buf",
  "hints": [
    "LRU: dummy `head` and `tail` nodes; helpers `_remove(node)` and `_add_front(node)`. Store `key` in the node so you can delete the map entry when evicting the tail's predecessor.",
    "MinStack: push `(val, min(val, current_min))`.",
    "NestedIterator: keep a stack of Python iterators. In `has_next`, loop: peek the top iterator, get its next item; if it is an int, remember it and return True; if it is a list, push `iter(list)`; if the iterator is exhausted, pop it."
  ]
}
```


> [!TIP] Interview tips
> - Clarify the API and required complexity first, then name the data structures and why each exists.
> - Use sentinel nodes in the linked list; it removes most edge cases.
> - Mention `OrderedDict` as the production shortcut, but implement the list if asked how it works.
> - Test: capacity 1, updating an existing key (refreshes recency), get on a missing key, and calling `has_next` twice in a row.
