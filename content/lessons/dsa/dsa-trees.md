---
id: dsa-trees
title: Trees (BST, traversal)
estimatedMinutes: 15
difficulty: medium
tags: [dsa, trees, bst, traversal, recursion]
---

## Why it matters
Binary trees are the most common recursion practice in interviews: traversals, depth, validating a BST, lowest common ancestor. They test whether you can define a recursive subproblem and state its cost in terms of $n$ and the height $h$.

## Concept
A **binary tree** node has `val`, `left`, `right`. Height $h$ ranges from $\log_2 n$ (balanced) to $n$ (a chain). Recursion uses $O(h)$ stack space.

**Depth-first traversals** (all $O(n)$ time, $O(h)$ space):
- **Pre-order**: node, left, right (copy a tree, serialize).
- **In-order**: left, node, right. On a BST this yields values in **sorted order**.
- **Post-order**: left, right, node (compute from children: height, delete, subtree sums).

**Breadth-first (level-order)**: a queue (`collections.deque`); process one level at a time with `for _ in range(len(queue))`. $O(n)$ time, $O(w)$ space for max width $w$.

**Iterative in-order** with an explicit stack: push the left spine, pop, visit, move to the right child. Useful when recursion depth could overflow.

**Binary search tree (BST)**: every node's left subtree has values $<$ node and right subtree $>$ node (for **all** descendants, not just the children). Search, insert and delete cost $O(h)$: $O(\log n)$ if balanced, $O(n)$ if skewed. Self-balancing trees (AVL, red-black) keep $h = O(\log n)$.

**Common patterns**
- **Validate a BST**: pass `(lo, hi)` bounds down; checking only parent vs child is wrong.
- **Height / diameter / path sums**: post-order, combine children's answers; update a global best for paths that bend at a node.
- **Lowest common ancestor**: in a BST walk down by comparing values; in a general tree return the node when both sides report a hit.
- **Tree recursion template**: base case `None`, solve left and right, combine.

## Worked example
Validate the tree built from level order `[5, 1, 4, None, None, 3, 6]` (5 is the root, left child 1, right child 4, and 4 has children 3 and 6).

The local check "left < parent < right" passes at every node, but the tree is **not** a BST. Trace with bounds `(lo, hi)`:
1. Root 5 with `(-inf, +inf)`: ok. Go left with `(-inf, 5)`, right with `(5, +inf)`.
2. Node 1 in `(-inf, 5)`: ok. Node 4 in `(5, +inf)`: $4 \le 5$, **fails**.

So the answer is `False` after visiting only 3 nodes, with $O(n)$ worst-case time.

In-order of the valid BST `[4, 2, 6, 1, 3, 5, 7]` is `1 2 3 4 5 6 7` (sorted). Level order is `[[4], [2, 6], [1, 3, 5, 7]]`, and the height is 3.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which traversal of a BST visits the keys in ascending order?",
  "options": [
    "Pre-order",
    "Post-order",
    "In-order",
    "Level-order"
  ],
  "answer": 2,
  "explanation": "In-order visits left subtree, node, right subtree; by the BST property that is ascending."
}
```

```quiz
{
  "id": "q2",
  "question": "A tree has n nodes and height h. What is the space used by a recursive DFS (excluding output)?",
  "options": [
    "O(1)",
    "O(h)",
    "O(n) always",
    "O(log n) always"
  ],
  "answer": 1,
  "explanation": "The call stack holds one frame per level on the current root-to-node path: $O(h)$, which is $O(n)$ for a chain and $O(\\log n)$ for a balanced tree."
}
```

## Practice

```python-exercise
{"id": "ex1", "prompt": "Nodes are `TreeNode(val, left, right)`, and `build(level_order_list)` (both provided in the setup) creates a tree from a level-order list with `None` for missing children. Implement `inorder(root)` **iteratively** (no recursion), `level_order(root)` returning a list of levels, `max_depth(root)`, and `is_valid_bst(root)` (strict: duplicates are invalid). An empty tree has depth 0 and is a valid BST.", "starterCode": "def inorder(root):\n    pass\n\ndef level_order(root):\n    pass\n\ndef max_depth(root):\n    pass\n\ndef is_valid_bst(root):\n    pass\n\nt = build([4, 2, 6, 1, 3, 5, 7])\nprint(inorder(t), level_order(t), max_depth(t), is_valid_bst(t))", "tests": "t = build([4, 2, 6, 1, 3, 5, 7])\nassert inorder(t) == [1, 2, 3, 4, 5, 6, 7]\nassert level_order(t) == [[4], [2, 6], [1, 3, 5, 7]]\nassert max_depth(t) == 3\nassert is_valid_bst(t)\nassert inorder(None) == [] and level_order(None) == [] and max_depth(None) == 0 and is_valid_bst(None)\none = build([9])\nassert inorder(one) == [9] and level_order(one) == [[9]] and max_depth(one) == 1 and is_valid_bst(one)\nbad = build([5, 1, 4, None, None, 3, 6])\nassert not is_valid_bst(bad)\nassert level_order(bad) == [[5], [1, 4], [3, 6]]\nassert not is_valid_bst(build([2, 2, 2]))\nassert not is_valid_bst(build([2, 2]))\nassert not is_valid_bst(build([2, None, 2]))\nassert is_valid_bst(build([2, 1, 3]))\nassert not is_valid_bst(build([10, 5, 15, None, None, 6, 20]))\nassert is_valid_bst(build([-2147483648]))\n# skewed chain of 3000 nodes: iterative code must not hit the recursion limit\nroot = TreeNode(0)\ncur = root\nfor v in range(1, 3000):\n    cur.right = TreeNode(v)\n    cur = cur.right\nassert max_depth(root) == 3000\nassert is_valid_bst(root)\nassert inorder(root) == list(range(3000))\nassert len(level_order(root)) == 3000\nsk = build([3, 2, None, 1])\nassert inorder(sk) == [1, 2, 3] and max_depth(sk) == 3 and level_order(sk) == [[3], [2], [1]]", "solution": "from collections import deque\n\ndef inorder(root):\n    out, stack, cur = [], [], root\n    while cur or stack:\n        while cur:\n            stack.append(cur)\n            cur = cur.left\n        cur = stack.pop()\n        out.append(cur.val)\n        cur = cur.right\n    return out\n\ndef level_order(root):\n    if root is None:\n        return []\n    res, q = [], deque([root])\n    while q:\n        level = []\n        for _ in range(len(q)):\n            node = q.popleft()\n            level.append(node.val)\n            if node.left:\n                q.append(node.left)\n            if node.right:\n                q.append(node.right)\n        res.append(level)\n    return res\n\ndef max_depth(root):\n    if root is None:\n        return 0\n    depth, q = 0, deque([root])\n    while q:\n        depth += 1\n        for _ in range(len(q)):\n            node = q.popleft()\n            if node.left:\n                q.append(node.left)\n            if node.right:\n                q.append(node.right)\n    return depth\n\ndef is_valid_bst(root):\n    stack = [(root, float('-inf'), float('inf'))]\n    while stack:\n        node, lo, hi = stack.pop()\n        if node is None:\n            continue\n        if not lo < node.val < hi:\n            return False\n        stack.append((node.left, lo, node.val))\n        stack.append((node.right, node.val, hi))\n    return True", "setup": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef build(vals):\n    if not vals or vals[0] is None:\n        return None\n    root = TreeNode(vals[0])\n    queue = [root]\n    i = 1\n    for node in queue:\n        if i < len(vals) and vals[i] is not None:\n            node.left = TreeNode(vals[i])\n            queue.append(node.left)\n        i += 1\n        if i < len(vals) and vals[i] is not None:\n            node.right = TreeNode(vals[i])\n            queue.append(node.right)\n        i += 1\n    return root", "hints": ["Iterative in-order: `while cur or stack:` push left spine, pop, visit, then `cur = node.right`.", "Level order: for each level, `size = len(queue)` then pop that many nodes.", "Validate with bounds: `ok(node, lo, hi)` requires `lo < node.val < hi`; left gets `hi = node.val`, right gets `lo = node.val`."]}
```

> [!TIP] Interview tips
> - Define the recursive subproblem out loud ("height of a node = 1 + max of children") before coding.
> - Most BST bugs are the child-only comparison; use bounds or an in-order traversal that must be strictly increasing.
> - State complexity as $O(n)$ time and $O(h)$ space, noting $h$ is $n$ in the worst case; offer the iterative version if depth could exceed Python's recursion limit.
> - Know BFS vs DFS use: shortest depth or per-level output is BFS; subtree aggregation is post-order DFS.
