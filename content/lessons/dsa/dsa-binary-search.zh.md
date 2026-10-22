---
id: dsa-binary-search
title: "二分查找"
---

## 为什么重要
只要一次比较就能排除一半候选，二分查找就能把 $O(n)$ 变成 $O(\log n)$。面试官用它来考察你对边界的细致处理，而且它还可以推广到远不止有序数组的“对答案二分”问题。

## 概念
在**有序**数组上，把中间元素与目标比较，并丢弃不可能包含目标的那一半。$n = 10^9$ 只需大约 30 次比较。时间 $O(\log n)$，空间 $O(1)$（迭代实现）。

最可靠的模板是**下界**：第一个值 $\ge$ target 的下标（即插入位置，等同于 `bisect_left`）：

```python
lo, hi = 0, len(a)          # search in [lo, hi)
while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < target:
        lo = mid + 1
    else:
        hi = mid
return lo                   # a[lo] >= target, or lo == len(a)
```

- **是否存在？**检查 `lo < len(a) and a[lo] == target`。
- **第一次和最后一次出现**：对整数用 `lower_bound(t)` 和 `lower_bound(t + 1) - 1`（或 `bisect_right`）。
- **对答案二分**：如果谓词 `ok(x)` 是单调的（False...False True...True），就对满足 `ok(x)` 的最小 `x` 做二分。例子：最小运载能力、平方根、爱吃香蕉的珂珂。
- **旋转有序数组**：在每个 `mid` 处，总有一半是有序的；判断目标是否位于有序的那一半。

陷阱：向下取整的中点配合 `lo = mid` 导致死循环，`hi` 的差一错误（始终使用半开区间 `[lo, hi)`），以及重复元素。在定宽整数的语言中，用 `lo + (hi - lo) // 2` 避免溢出（Python 中不是问题）。

输入必须相对于你所问的问题是单调的；如果没有排序，要先排序（$O(n \log n)$）或使用其他方法。

## 示例讲解
**在旋转有序数组中搜索**：`nums = [4, 5, 6, 7, 0, 1, 2]`，`target = 0`。使用闭区间 `[lo, hi]`。每一步通过比较 `nums[lo]` 与 `nums[mid]` 来判断哪一半是有序的。

```text
lo=0 hi=6 mid=3 (7)  left half [4..7] is sorted (4 <= 7)
                     target 0 not in [4, 7) -> go right: lo=4
lo=4 hi=6 mid=5 (1)  left half [0..1] is sorted (0 <= 1)
                     target 0 in [0, 1)     -> go left:  hi=4
lo=4 hi=4 mid=4 (0)  found, return 4
```

7 个元素只探测 3 次，$O(\log n)$。普通下界的合理性检查：`a = [1, 3, 5, 7]`，target 为 4：`lo=0 hi=4`，mid=2（5 >= 4）所以 `hi=2`；mid=1（3 < 4）所以 `lo=2`；停止，返回 2，即插入位置。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在半开区间 [lo, hi) 和下界逻辑下，当 a[mid] < target 时，哪个更新是正确的？",
  "options": [
    "hi = mid",
    "hi = mid - 1",
    "lo = mid",
    "lo = mid + 1"
  ],
  "explanation": "a[mid] 太小，所以答案严格在右侧：lo = mid + 1。使用 lo = mid 可能死循环。"
}
```

```quiz
{
  "id": "q2",
  "question": "下面哪个问题可以用对答案二分求解？",
  "options": [
    "在无序数组中找最大元素",
    "使所有包裹在 D 天内送达的最小运载能力（可行性随运载能力单调）",
    "统计链表节点数",
    "反转字符串"
  ],
  "explanation": "Feasible(capacity) 随着运载能力增大从 False 变为 True，所以可以在运载能力的范围上二分，找出最小的可行值。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 (1) `lower_bound(a, target)`：在有序列表中返回第一个满足 `a[i] >= target` 的下标（没有则返回 `len(a)`）。(2) `search_range(nums, target)`：在有序整数列表中返回 `target` 的 `[first, last]` 下标，没有则返回 `[-1, -1]`；要求 $O(\\log n)$。(3) `search_rotated(nums, target)`：在由**互不相同**整数组成的旋转有序列表中返回 `target` 的下标，没有则返回 -1，要求 $O(\\log n)$。不要使用 `bisect` 模块。",
  "hints": [
    "lower_bound：在半开区间 [0, len(a)) 中搜索；如果 a[mid] < target 就让 lo = mid + 1，否则 hi = mid。",
    "search_range：对整数，最后一个下标等于 lower_bound(target + 1) - 1；先检查 target 是否真的存在。",
    "旋转数组：如果 nums[lo] <= nums[mid]，左半部分是有序的；判断 target 是否在其中，否则搜索另一半。"
  ]
}
```

> [!TIP] 面试技巧
> - 选定一种模板（半开区间 `[lo, hi)` 的下界）并坚持使用；混用不同约定是出 bug 的主要来源。
> - 说出不变式：“答案始终在 `[lo, hi]` 内”，并说明每个分支都会缩小范围。
> - 当题目说“满足可行条件的最小 X”时，要识别出这是对答案二分，并先定义单调的谓词。
> - 在 Python 中可以提到 `bisect.bisect_left/right`，但要准备好手写循环。
