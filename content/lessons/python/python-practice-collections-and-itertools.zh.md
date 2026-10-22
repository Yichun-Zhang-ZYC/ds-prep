---
id: python-practice-collections-and-itertools
title: "练习：collections 与 itertools 配方"
---

## 为什么重要

许多“实现 X”的面试题归结为一个标准库工具：`Counter` 统计频率、`defaultdict` 分组、`deque` 做队列和窗口、`heapq` 求 top-k、`itertools` 做组合与连续段。选对工具，并了解它的并列处理与复杂度，就是加分项。

## 概念

**何时用哪个工具**：

| 需求 | 工具 | 说明 |
| --- | --- | --- |
| 频率、top-k | `Counter`、`most_common(k)` | 并列时按首次出现顺序输出；要得到确定的答案请按 `(-count, key)` 排序 |
| 按键分组 | `defaultdict(list)` | 读取不存在的键会*创建*它；用 `.get` 或 `in` 来判断 |
| 队列 / BFS / 窗口 | `deque` | `append`/`popleft` 为 $O(1)$；`list.pop(0)` 为 $O(n)$ |
| 流的 top-k | `heapq.nlargest(k, it)` | $O(n \log k)$；大小为 k 的最小堆 |
| 合并有序输入 | `heapq.merge` | 惰性，m 个流时每个元素 $O(\log m)$ |
| 相等元素的连续段 | `itertools.groupby` | 只对**相邻**的相等键分组；要全局分组需先排序 |
| 组合 / 笛卡尔积 | `combinations`、`permutations`、`product` | 基于位置，因此重复的值会产生重复的元组 |
| 前缀和 | `itertools.accumulate` | 也可传入函数，例如用 `max` 得到滚动最大值 |

**常见陷阱**：

- `groupby` 产出的惰性子迭代器在你前进后就会失效；要立即消耗每个分组（`list(g)`）。
- `Counter` 的算术运算会丢弃非正计数；`c1 - c2` 不是带符号的差。
- `most_common()` 在并列时按插入顺序稳定排序，而不是按字母序。
- `defaultdict` 在查找时会悄悄插入键；返回或打印前先转换为 `dict`。
- 集合是无序的：比较或返回前先排序。
- 组合类函数增长很快：`combinations` 为 $\binom{n}{k}$，`permutations` 为 $n!$。要说明成本。

## 示例讲解

求 `"b a b c a d"` 中出现次数最多的前 3 个词，并列时按字母序。

```python
from collections import Counter
words = "b a b c a d".split()
c = Counter(words)                    # b:2, a:2, c:1, d:1
c.most_common(3)                      # [('b', 2), ('a', 2), ('c', 1)]   first-seen order
sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
                                      # [('a', 2), ('b', 2), ('c', 1)]
```

`most_common` 在计数上是对的，但 `b` 排在 `a` 前面只是因为 `b` 先出现；当面试官要求“并列时按字母序”，他期望看到显式的排序键。当不同单词数量巨大时，`heapq.nsmallest(k, c.items(), key=lambda kv: (-kv[1], kv[0]))` 以 $O(n \log k)$ 给出相同答案，而不必对全部 $n$ 个不同元素排序。构建 Counter 的复杂度对 $N$ 个词元为 $O(N)$。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "`[(k, len(list(g))) for k, g in itertools.groupby(\"aabaa\")]` 返回什么？",
  "options": [
    "[(\"a\", 4), (\"b\", 1)]",
    "[(\"a\", 2), (\"b\", 1), (\"a\", 2)]",
    "[(\"a\", 2), (\"b\", 1)]",
    "报错"
  ],
  "explanation": "`groupby` 只对相邻的相等元素分组，所以两段 \"a\" 保持分开。若要全局分组需先排序。"
}
```

```quiz
{
  "id": "q2",
  "question": "你需要为一个有 1000 万个节点的图的 BFS 准备 FIFO 队列。哪个正确？",
  "options": [
    "带 `pop(0)` 的 `list`",
    "带 `popleft()` 的 `collections.deque`",
    "`heapq`",
    "`set`"
  ],
  "explanation": "`deque.popleft` 为 $O(1)$；`list.pop(0)` 要移动所有元素，为 $O(n)$，会让 BFS 变成平方复杂度。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "编写 `top_k_words(text, k)`：把文本转为小写，把由 `[a-z']+` 构成的连续片段当作单词，返回出现最频繁的 `k` 个，形式为 `(word, count)` 列表，按计数降序、再按单词升序排序。",
  "hints": [
    "`re.findall(r\"[a-z']+\", text.lower())` 用于分词。",
    "用键 `(-count, word)` 对 `counter.items()` 排序，而不是依赖 `most_common`。"
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "编写 `group_anagrams(words)`，把互为字母异位词的单词分组，返回分组列表（每组是排序后的单词列表），各组再按其第一个单词排序。单词均为小写，单个单词也算一组。",
  "hints": [
    "单词排序后的字母是规范化的键。",
    "使用 `defaultdict(list)`，然后对每组及分组列表排序。"
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "编写 `rle(xs)`，用 `itertools.groupby` 返回游程编码，形式为 `(value, count)` 列表（如 `\"aabccc\"` -> `[(\"a\", 2), (\"b\", 1), (\"c\", 3)]`）；再编写 `unrle(pairs)`，把它还原为列表。然后编写 `subsets_with_sum(nums, target)`：从 `nums` 的任意非空子集（按位置选取）中，找出和等于 `target` 的，返回去重后的元组（每个元组内部升序）的排序列表。",
  "hints": [
    "用 `sum(1 for _ in g)` 统计一组的长度，并在前进之前就消耗它。",
    "让 `r` 从 1 循环到 `len(nums)`，使用 `combinations(nums, r)`；把排序后的元组放进集合去重。"
  ]
}
```

> [!TIP] 面试技巧
> - 写代码前先说出标准库工具及其复杂度（`deque` 两端 O(1)、`heapq` O(n log k)、`Counter` O(n)）。
> - 用排序键显式规定并列处理；不要依赖 `most_common` 或集合顺序。
> - 记住 `groupby` 需要排序的输入才能做全局分组，以及 `defaultdict` 在读取时会创建键。
