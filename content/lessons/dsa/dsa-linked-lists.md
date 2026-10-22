---
id: dsa-linked-lists
title: "Linked Lists"
estimatedMinutes: 12
difficulty: medium
tags: [dsa, linked-list, pointers]
---

## Why it matters
Linked-list questions test pointer manipulation under pressure: reverse, merge, find the middle, detect a cycle. They are short to state, easy to get subtly wrong, and appear in a large share of screens.

## Concept
A **singly linked list** is nodes `val -> next -> ... -> None`. Compared with an array: $O(1)$ insert/delete **given the node** (or at the head), but $O(n)$ access by index and no random access. Searching is $O(n)$.

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next
```

Techniques you should have memorized:
- **Dummy (sentinel) head**: `dummy = ListNode(0, head)` removes special cases when the head may change (merge, delete, partition). Return `dummy.next`.
- **Iterative reversal**: three pointers `prev`, `cur`, `nxt`. Save `cur.next`, flip it to `prev`, advance both. $O(n)$ time, $O(1)$ space.
- **Fast & slow pointers**: slow moves 1, fast moves 2. When fast reaches the end, slow is at the **middle**. If the list has a cycle, fast eventually meets slow (**Floyd's cycle detection**). To find the cycle start, reset one pointer to the head and move both at speed 1; they meet at the entry.
- **Merge two sorted lists**: compare heads, append the smaller to a tail pointer; $O(n + m)$ time, $O(1)$ space.
- **n-th from the end**: advance `fast` by $n$, then move both until `fast` ends.

Always think about: empty list, single node, and what happens to the node that `next` used to point to. Draw boxes and arrows; update pointers in an order that doesn't lose references.

## Worked example
**Reverse `1 -> 2 -> 3`** iteratively. `prev = None`, `cur = 1`.

```text
start:    prev=None  cur=1  list: 1 -> 2 -> 3 -> None
step 1:   nxt=2; cur.next=prev     1 -> None
          prev=1; cur=2
step 2:   nxt=3; cur.next=prev     2 -> 1 -> None
          prev=2; cur=3
step 3:   nxt=None; cur.next=prev  3 -> 2 -> 1 -> None
          prev=3; cur=None   (stop)
return prev  =>  3 -> 2 -> 1
```

Each node is touched once: $O(n)$ time, $O(1)$ extra space. The key line is saving `nxt = cur.next` **before** overwriting `cur.next`; otherwise the rest of the list is lost.

Cycle check on `1 -> 2 -> 3 -> 4 -> 2 (back)`: slow/fast positions are (1,1), (2,3), (3,2), (4,4); they meet at node 4, so there is a cycle.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "In Floyd's cycle detection, why is `while fast and fast.next` the loop condition?",
  "options": [
    "To make slow move twice as fast",
    "fast jumps two nodes, so both fast and fast.next must exist to avoid dereferencing None",
    "It checks that the list is sorted",
    "It stops after n steps"
  ],
  "answer": 1,
  "explanation": "fast = fast.next.next requires fast and fast.next to be non-None. Reaching None means there is no cycle."
}
```

```quiz
{
  "id": "q2",
  "question": "What is the space complexity of iterative linked-list reversal?",
  "options": [
    "O(n)",
    "O(log n)",
    "O(1)",
    "O(n^2)"
  ],
  "answer": 2,
  "explanation": "It only re-links existing nodes using three pointers; recursive reversal would use O(n) call stack."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using the provided `ListNode`, implement (1) `reverse_list(head)` returning the new head, (2) `has_cycle(head)` using Floyd's fast/slow pointers in $O(1)$ space, and (3) `merge_two_lists(a, b)` merging two **sorted** lists into one sorted list by splicing nodes (stable: on ties take from `a` first).",
  "starterCode": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head):\n    pass\n\ndef has_cycle(head):\n    pass\n\ndef merge_two_lists(a, b):\n    pass\n",
  "tests": "def build_list(vals):\n    dummy = tail = ListNode()\n    for v in vals:\n        tail.next = ListNode(v)\n        tail = tail.next\n    return dummy.next\n\ndef to_list(head):\n    out = []\n    while head:\n        out.append(head.val)\n        head = head.next\n        assert len(out) < 1000\n    return out\n\nassert to_list(reverse_list(build_list([1, 2, 3, 4, 5]))) == [5, 4, 3, 2, 1]\nassert to_list(reverse_list(build_list([1, 2]))) == [2, 1]\nassert to_list(reverse_list(build_list([7]))) == [7]\nassert reverse_list(None) is None\nassert has_cycle(None) is False\nassert has_cycle(build_list([1])) is False\nassert has_cycle(build_list([1, 2, 3, 4])) is False\nh = build_list([1, 2, 3, 4])\ntail = h\nwhile tail.next:\n    tail = tail.next\ntail.next = h.next\nassert has_cycle(h) is True\ns = build_list([5])\ns.next = s\nassert has_cycle(s) is True\nh2 = build_list([1, 2])\nh2.next.next = h2\nassert has_cycle(h2) is True\nassert to_list(merge_two_lists(build_list([1, 2, 4]), build_list([1, 3, 4]))) == [1, 1, 2, 3, 4, 4]\nassert to_list(merge_two_lists(None, build_list([0]))) == [0]\nassert to_list(merge_two_lists(build_list([1, 2]), None)) == [1, 2]\nassert merge_two_lists(None, None) is None\nassert to_list(merge_two_lists(build_list([5, 6, 7]), build_list([1, 2]))) == [1, 2, 5, 6, 7]\nx, y = build_list([1]), build_list([1])\nm = merge_two_lists(x, y)\nassert m is x and m.next is y\n",
  "solution": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head):\n    prev, cur = None, head\n    while cur:\n        nxt = cur.next\n        cur.next = prev\n        prev = cur\n        cur = nxt\n    return prev\n\ndef has_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow is fast:\n            return True\n    return False\n\ndef merge_two_lists(a, b):\n    dummy = tail = ListNode()\n    while a and b:\n        if a.val <= b.val:\n            tail.next, a = a, a.next\n        else:\n            tail.next, b = b, b.next\n        tail = tail.next\n    tail.next = a or b\n    return dummy.next",
  "hints": [
    "Reverse: inside the loop save nxt = cur.next first, then point cur.next at prev, then advance prev and cur.",
    "Cycle: slow moves 1, fast moves 2; if they are ever the same node there is a cycle; if fast hits None there is not.",
    "Merge: use a dummy head and a tail pointer; when one list runs out, attach the rest of the other."
  ]
}
```

> [!TIP] Interview tips
> - Use a dummy head whenever the head can change; it removes `if head is None` branches.
> - Pitfall: losing the rest of the list by overwriting `next` before saving it. Say the pointer order out loud.
> - Pitfall: null dereference in fast/slow loops: the condition is `while fast and fast.next`.
> - Follow-ups: reverse in groups of k, detect the cycle start, check palindrome in $O(1)$ space (find the middle, reverse the second half, compare).
