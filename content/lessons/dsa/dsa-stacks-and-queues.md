---
id: dsa-stacks-and-queues
title: "Stacks & Queues"
estimatedMinutes: 12
difficulty: medium
tags: [dsa, stack, queue, monotonic-stack]
---

## Why it matters
Stacks model "most recent first" (nesting, undo, DFS) and queues model "oldest first" (BFS, scheduling). Matching brackets and the monotonic stack ("next greater element") are two of the most repeated interview patterns.

## Concept
**Stack (LIFO)**: `push`, `pop`, `peek` all $O(1)$. In Python use a `list` (`append`/`pop`). **Queue (FIFO)**: use `collections.deque` (`append`/`popleft`, both $O(1)$); `list.pop(0)` is $O(n)$ and a classic mistake.

Where they show up:
- **Matching / nesting**: push openers, pop on closers and check they match. Valid at the end only if the stack is empty.
- **Expression evaluation**, undo, browser history, iterative DFS (explicit stack replaces recursion).
- **Queue**: BFS (level-order traversal, shortest path in unweighted graphs), task scheduling, sliding window with a `deque`.
- **Monotonic stack**: keep the stack in increasing (or decreasing) order. When a new element breaks the order, pop and resolve the popped elements: *next greater/smaller element*, daily temperatures, largest rectangle in a histogram. Each element is pushed and popped once, so $O(n)$.
- **Min stack**: store `(value, current_min)` pairs to get `get_min` in $O(1)$.
- **Queue from two stacks**: push onto `in`; when `out` is empty, move everything from `in` to `out` (reversing the order). Each element moves at most once, so `pop` is $O(1)$ amortized.

Space is $O(n)$ for the structure itself. In a monotonic stack store **indices** rather than values so that you can compute distances.

## Worked example
**Daily temperatures**: for each day, how many days until a warmer one (0 if none)? Input `[73, 74, 75, 71, 69, 72, 76, 73]`. Keep a stack of indices whose temperatures are decreasing; a warmer day resolves everything colder on the stack.

```text
i=0 (73): stack []        -> push 0              stack [0]
i=1 (74): 74>73 pop 0     -> ans[0]=1-0=1        stack [1]
i=2 (75): 75>74 pop 1     -> ans[1]=1            stack [2]
i=3 (71): 71<75 no pop    -> push                stack [2,3]
i=4 (69): 69<71 no pop    -> push                stack [2,3,4]
i=5 (72): pop 4 (69)      -> ans[4]=1
          pop 3 (71)      -> ans[3]=2
          72<75 stop      -> push                stack [2,5]
i=6 (76): pop 5 (72)      -> ans[5]=1
          pop 2 (75)      -> ans[2]=4            stack [6]
i=7 (73): push                                   stack [6,7]
```

Leftover indices 6 and 7 never found a warmer day, so they stay 0. Result `[1, 1, 4, 2, 1, 1, 0, 0]`, $O(n)$ time and space even though there is a `while` inside the `for`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which structure and operation gives O(1) removal from the front in Python?",
  "options": [
    "list.pop(0)",
    "list.remove(x)",
    "collections.deque.popleft()",
    "list.insert(0, x)"
  ],
  "answer": 2,
  "explanation": "deque is a doubly-ended structure with O(1) operations at both ends; list.pop(0) shifts all elements and is O(n)."
}
```

```quiz
{
  "id": "q2",
  "question": "In the daily-temperatures algorithm, what is the time complexity?",
  "options": [
    "O(n^2) because of the nested loop",
    "O(n log n)",
    "O(n) because each index is pushed and popped at most once",
    "O(1)"
  ],
  "answer": 2,
  "explanation": "The inner while loop pops elements that were each pushed exactly once, so total pops <= n across the whole run."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `is_valid(s)`: True if a string of `()[]{}` brackets is balanced and correctly nested. (2) `daily_temperatures(temps)`: for each day the number of days until a warmer temperature (0 if none), in $O(n)$. (3) class `MyQueue` using only two Python lists as stacks, with `push(x)`, `pop()`, `peek()`, `empty()`.",
  "starterCode": "def is_valid(s):\n    pass\n\ndef daily_temperatures(temps):\n    pass\n\nclass MyQueue:\n    def __init__(self):\n        pass\n    def push(self, x):\n        pass\n    def pop(self):\n        pass\n    def peek(self):\n        pass\n    def empty(self):\n        pass\n\nprint(is_valid(\"([]){}\"), daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))",
  "tests": "assert is_valid(\"()\") is True\nassert is_valid(\"()[]{}\") is True\nassert is_valid(\"([{}])\") is True\nassert is_valid(\"(]\") is False\nassert is_valid(\"([)]\") is False\nassert is_valid(\"((\") is False\nassert is_valid(\"))\") is False\nassert is_valid(\"\") is True\nassert is_valid(\"{[]}\") is True\nassert daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]\nassert daily_temperatures([30, 40, 50, 60]) == [1, 1, 1, 0]\nassert daily_temperatures([60, 50, 40]) == [0, 0, 0]\nassert daily_temperatures([50, 50, 50]) == [0, 0, 0]\nassert daily_temperatures([]) == []\nassert daily_temperatures([5]) == [0]\nq = MyQueue()\nassert q.empty()\nq.push(1); q.push(2); q.push(3)\nassert q.peek() == 1\nassert q.pop() == 1\nq.push(4)\nassert q.pop() == 2\nassert q.pop() == 3\nassert not q.empty()\nassert q.peek() == 4\nassert q.pop() == 4\nassert q.empty()\n",
  "solution": "def is_valid(s):\n    pairs = {')': '(', ']': '[', '}': '{'}\n    stack = []\n    for ch in s:\n        if ch in pairs:\n            if not stack or stack.pop() != pairs[ch]:\n                return False\n        else:\n            stack.append(ch)\n    return not stack\n\ndef daily_temperatures(temps):\n    ans = [0] * len(temps)\n    stack = []\n    for i, t in enumerate(temps):\n        while stack and temps[stack[-1]] < t:\n            j = stack.pop()\n            ans[j] = i - j\n        stack.append(i)\n    return ans\n\nclass MyQueue:\n    def __init__(self):\n        self.inp = []\n        self.out = []\n    def _move(self):\n        if not self.out:\n            while self.inp:\n                self.out.append(self.inp.pop())\n    def push(self, x):\n        self.inp.append(x)\n    def pop(self):\n        self._move()\n        return self.out.pop()\n    def peek(self):\n        self._move()\n        return self.out[-1]\n    def empty(self):\n        return not self.inp and not self.out",
  "hints": [
    "Brackets: map each closer to its opener; on a closer, the stack must be non-empty and its top must match.",
    "Daily temperatures: keep a stack of indices; while the current temperature is higher than the one at the top, pop and set ans[popped] = i - popped.",
    "MyQueue: only refill the output stack when it is empty; otherwise you break the FIFO order."
  ]
}
```

> [!TIP] Interview tips
> - Say the invariant of the monotonic stack out loud ("the stack is always decreasing in temperature"); it shows you understand why it is correct.
> - Pitfall: using `list.pop(0)` as a queue; use `deque` and mention the $O(1)$ `popleft`.
> - Pitfall: for bracket matching, forgetting to check an empty stack on a closer, and to check emptiness at the end (`"(("`).
> - Typical follow-ups: implement a queue with two stacks, a min stack, or a stack with max in $O(1)$.
