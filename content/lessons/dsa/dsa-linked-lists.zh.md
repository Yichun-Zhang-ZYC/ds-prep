---
id: dsa-linked-lists
title: "链表"
---

## 为什么重要
链表题考察高压下的指针操作能力：反转、合并、找中点、检测环。题目描述很短，但很容易在细节上出错，在大量筛选面试中出现。

## 概念
**单链表**由节点 `val -> next -> ... -> None` 构成。与数组相比：**已知节点**（或在头部）时插入/删除是 $O(1)$，但按下标访问是 $O(n)$，不支持随机访问。查找是 $O(n)$。

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next
```

应当熟记的技巧：
- **哑头节点（哨兵）**：`dummy = ListNode(0, head)`，在头节点可能变化时（合并、删除、划分）消除特殊情况。返回 `dummy.next`。
- **迭代反转**：三个指针 `prev`、`cur`、`nxt`。保存 `cur.next`，把它指向 `prev`，然后两者前进。时间 $O(n)$，空间 $O(1)$。
- **快慢指针**：slow 每次走 1 步，fast 每次走 2 步。fast 走到末尾时，slow 在**中点**。如果链表有环，fast 最终会与 slow 相遇（**Floyd 判圈算法**）。要找到环的入口，把一个指针重置到头节点，然后两个指针都以速度 1 前进，它们会在入口相遇。
- **合并两个有序链表**：比较两个头节点，把较小者接到尾指针后面；时间 $O(n + m)$，空间 $O(1)$。
- **倒数第 n 个节点**：先让 `fast` 前进 $n$ 步，然后两者同时前进直到 `fast` 结束。

始终要考虑：空链表、单个节点，以及 `next` 原先指向的节点会怎样。画出方框和箭头；按不会丢失引用的顺序更新指针。

## 示例讲解
**迭代反转 `1 -> 2 -> 3`**。`prev = None`，`cur = 1`。

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

每个节点只处理一次：时间 $O(n)$，额外空间 $O(1)$。关键的一行是在覆盖 `cur.next` **之前**先保存 `nxt = cur.next`；否则链表的其余部分就丢了。

对 `1 -> 2 -> 3 -> 4 -> 2 (back)` 做环检测：slow/fast 的位置依次是 (1,1)、(2,3)、(3,2)、(4,4)；它们在节点 4 相遇，所以存在环。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在 Floyd 判圈算法中，为什么循环条件是 `while fast and fast.next`？",
  "options": [
    "为了让 slow 的速度是两倍",
    "fast 一次跳两个节点，所以 fast 和 fast.next 都必须存在，以避免对 None 解引用",
    "用来检查链表是否有序",
    "n 步之后停止"
  ],
  "explanation": "fast = fast.next.next 要求 fast 和 fast.next 都不是 None。走到 None 意味着没有环。"
}
```

```quiz
{
  "id": "q2",
  "question": "迭代式链表反转的空间复杂度是多少？",
  "options": [
    "O(n)",
    "O(log n)",
    "O(1)",
    "O(n^2)"
  ],
  "explanation": "它只用三个指针重新连接已有节点；递归式反转则需要 O(n) 的调用栈。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "使用给定的 `ListNode`，实现 (1) `reverse_list(head)`，返回新的头节点；(2) `has_cycle(head)`，用 Floyd 快慢指针，空间 $O(1)$；(3) `merge_two_lists(a, b)`，通过拼接节点把两个**有序**链表合并成一个有序链表（稳定：相等时先取 `a` 的节点）。",
  "hints": [
    "反转：在循环内先保存 nxt = cur.next，再让 cur.next 指向 prev，然后推进 prev 和 cur。",
    "判环：slow 走 1 步，fast 走 2 步；如果它们曾是同一个节点就有环；如果 fast 走到 None 就没有环。",
    "合并：用哑头节点和尾指针；当一个链表用完时，把另一个链表的剩余部分接上。"
  ]
}
```

> [!TIP] 面试技巧
> - 只要头节点可能变化，就用哑头节点；它能去掉 `if head is None` 的分支。
> - 陷阱：先覆盖 `next` 再保存，导致丢失链表的其余部分。把指针更新顺序大声说出来。
> - 陷阱：快慢指针循环中的空指针解引用：循环条件是 `while fast and fast.next`。
> - 常见追问：每 k 个一组反转、找到环的入口、用 $O(1)$ 空间判断回文（找中点，反转后半部分，再比较）。
