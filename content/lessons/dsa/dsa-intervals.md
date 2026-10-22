---
id: dsa-intervals
title: Intervals
estimatedMinutes: 12
difficulty: medium
tags: [dsa, intervals, sorting, sweep-line, greedy]
---

## Why it matters
Meeting rooms, merging ranges, inserting a booking and finding overlaps are interview staples (and map to real calendar and log-session problems). Nearly all of them reduce to: **sort by start**, then sweep once.

## Concept
An interval is `[start, end]`. Two closed intervals **overlap** iff $a.start \le b.end$ and $b.start \le a.end$; clarify whether touching endpoints (`[1,4]` and `[4,5]`) count as overlapping.

**Merge intervals** (sort by start, $O(n \log n)$): keep a result list; if the next interval's start $\le$ the last merged end, extend that end to `max(last_end, end)`, else append a new one. Forgetting `max` breaks nested intervals like `[1,10]`, `[2,3]`.

**Insert interval** into a sorted, non-overlapping list in $O(n)$: copy the intervals that end before the new one starts, merge everything that overlaps it (min of starts, max of ends), then copy the rest.

**Minimum meeting rooms** (maximum concurrent intervals):
- **Min-heap of end times**: sort by start; if the earliest end $\le$ the new start, reuse that room (pop), then push the new end. Heap size at the end is the answer. $O(n \log n)$.
- **Sweep line**: turn each interval into events `(start, +1)` and `(end, -1)`, sort (ends before starts at equal times if touching is allowed), and track the running maximum.

**Minimum removals so the rest do not overlap** (activity selection, greedy): sort by **end**, keep an interval if its start $\ge$ the last kept end, else remove it. The earliest finisher leaves the most room. Answer $= n - \text{kept}$.

**Other patterns**: interval intersection of two sorted lists with two pointers ($O(m+n)$), can-attend-all-meetings (sorted starts versus previous ends), and difference arrays for "add 1 on a range" updates.

Always say "sort first", note the $O(n \log n)$ cost, and test empty, single, nested and touching cases.

## Worked example
Merge `[[8,10], [1,3], [15,18], [2,6]]`. Sort by start: `[1,3], [2,6], [8,10], [15,18]`.
1. Start result `[1,3]`.
2. `[2,6]`: start $2 \le 3$, overlap, end becomes $\max(3, 6) = 6$: `[1,6]`.
3. `[8,10]`: $8 > 6$, append. `[15,18]`: $15 > 10$, append.
4. Result `[[1,6], [8,10], [15,18]]`.

Meeting rooms for `[[0,30], [5,10], [15,20]]`, heap of end times:
1. `[0,30]`: heap empty, push 30. Heap `[30]`.
2. `[5,10]`: earliest end 30 > 5, need a second room, push 10. Heap `[10, 30]`.
3. `[15,20]`: earliest end 10 $\le$ 15, reuse that room: pop 10, push 20. Heap `[20, 30]`.
4. Heap size **2** rooms.

Non-overlap removals for `[[1,2], [2,3], [3,4], [1,3]]`: sort by end gives `[1,2], [2,3], [1,3], [3,4]` (ties by input order). Keep `[1,2]`, keep `[2,3]`, drop `[1,3]` (start 1 < 3), keep `[3,4]`: **1** removal.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What is the first step for almost every interval problem (merge, rooms, removals)?",
  "options": [
    "Build a graph",
    "Sort the intervals (by start, or by end for the greedy)",
    "Binary search for the midpoint",
    "Hash each interval"
  ],
  "answer": 1,
  "explanation": "Sorting makes overlapping intervals adjacent so one linear sweep suffices; total time is $O(n \\log n)$."
}
```

```quiz
{
  "id": "q2",
  "question": "Merging `[1,10]` followed (after sorting) by `[2,3]` should produce what, and what code mistake would break it?",
  "options": [
    "[1,3]; using the new interval's end",
    "[2,10]; using the new start",
    "[1,10]; forgetting max(last_end, end) would give [1,3]",
    "[1,10]; no mistake is possible"
  ],
  "answer": 2,
  "explanation": "The merged end must be `max(last_end, end)`; assigning `end` directly shrinks the nested interval case to `[1,3]`."
}
```

## Practice

```python-exercise
{"id": "ex1", "prompt": "Intervals are `[start, end]` lists, closed, and **touching intervals overlap** (`[1,4]` and `[4,5]` merge). Implement (1) `merge_intervals(intervals)`: sorted merged list (do not mutate the input), (2) `insert_interval(intervals, new)`: `intervals` is sorted and non-overlapping, return the merged result, (3) `min_meeting_rooms(intervals)`: the minimum number of rooms, where a meeting ending at `t` frees its room for one starting at `t`, and (4) `min_removals(intervals)`: the minimum number of intervals to remove so the rest do not overlap, where touching is **allowed** (`[1,2]` and `[2,3]` can coexist).", "starterCode": "def merge_intervals(intervals):\n    pass\n\ndef insert_interval(intervals, new):\n    pass\n\ndef min_meeting_rooms(intervals):\n    pass\n\ndef min_removals(intervals):\n    pass\n\nprint(merge_intervals([[8, 10], [1, 3], [15, 18], [2, 6]]))\nprint(insert_interval([[1, 3], [6, 9]], [2, 5]))\nprint(min_meeting_rooms([[0, 30], [5, 10], [15, 20]]))\nprint(min_removals([[1, 2], [2, 3], [3, 4], [1, 3]]))", "tests": "import random\nassert merge_intervals([]) == []\nassert merge_intervals([[1, 4]]) == [[1, 4]]\nassert merge_intervals([[8, 10], [1, 3], [15, 18], [2, 6]]) == [[1, 6], [8, 10], [15, 18]]\nassert merge_intervals([[1, 4], [4, 5]]) == [[1, 5]]\nassert merge_intervals([[1, 10], [2, 3]]) == [[1, 10]]\nassert merge_intervals([[1, 4], [0, 4]]) == [[0, 4]]\nassert merge_intervals([[1, 2], [1, 2]]) == [[1, 2]]\nassert merge_intervals([[2, 3], [4, 5], [6, 7]]) == [[2, 3], [4, 5], [6, 7]]\norig = [[3, 4], [1, 2]]\nmerge_intervals(orig)\nassert orig == [[3, 4], [1, 2]]\nassert insert_interval([], [5, 7]) == [[5, 7]]\nassert insert_interval([[1, 3], [6, 9]], [2, 5]) == [[1, 5], [6, 9]]\nassert insert_interval([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]) == [[1, 2], [3, 10], [12, 16]]\nassert insert_interval([[1, 5]], [2, 3]) == [[1, 5]]\nassert insert_interval([[3, 5]], [1, 2]) == [[1, 2], [3, 5]]\nassert insert_interval([[1, 2]], [3, 4]) == [[1, 2], [3, 4]]\nassert insert_interval([[1, 2]], [2, 4]) == [[1, 4]]\nassert insert_interval([[1, 2], [5, 6]], [0, 10]) == [[0, 10]]\nassert min_meeting_rooms([]) == 0\nassert min_meeting_rooms([[1, 2]]) == 1\nassert min_meeting_rooms([[0, 30], [5, 10], [15, 20]]) == 2\nassert min_meeting_rooms([[7, 10], [2, 4]]) == 1\nassert min_meeting_rooms([[1, 2], [2, 3]]) == 1\nassert min_meeting_rooms([[1, 5], [1, 5], [1, 5]]) == 3\nassert min_meeting_rooms([[1, 10], [2, 3], [4, 5], [6, 7]]) == 2\nassert min_removals([]) == 0\nassert min_removals([[1, 2], [2, 3], [3, 4], [1, 3]]) == 1\nassert min_removals([[1, 2], [1, 2], [1, 2]]) == 2\nassert min_removals([[1, 2], [2, 3]]) == 0\nassert min_removals([[1, 100], [11, 22], [1, 11], [2, 12]]) == 2\nassert min_removals([[0, 2], [1, 3], [2, 4], [3, 5], [4, 6]]) == 2\nrng = random.Random(5)\nfor _ in range(60):\n    ivs = []\n    for _ in range(rng.randint(0, 8)):\n        s = rng.randint(0, 10)\n        ivs.append([s, s + rng.randint(0, 5)])\n    cover = set()\n    for s, e in ivs:\n        cover.update(x / 2 for x in range(2 * s, 2 * e + 1))\n    m = merge_intervals(ivs)\n    for a, b in zip(m, m[1:]):\n        assert a[1] < b[0]\n    cov2 = set()\n    for s, e in m:\n        cov2.update(x / 2 for x in range(int(2 * s), int(2 * e) + 1))\n    assert cover == cov2\n    pts = [x / 2 for x in range(0, 40)]\n    best = max([sum(1 for s, e in ivs if s <= p < e) for p in pts] + [0])\n    pos = [iv for iv in ivs if iv[1] > iv[0]]\n    assert min_meeting_rooms(pos) == best", "solution": "import heapq\n\ndef merge_intervals(intervals):\n    merged = []\n    for s, e in sorted(intervals):\n        if merged and s <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], e)\n        else:\n            merged.append([s, e])\n    return merged\n\ndef insert_interval(intervals, new):\n    s, e = new\n    out, i, n = [], 0, len(intervals)\n    while i < n and intervals[i][1] < s:\n        out.append(list(intervals[i]))\n        i += 1\n    while i < n and intervals[i][0] <= e:\n        s = min(s, intervals[i][0])\n        e = max(e, intervals[i][1])\n        i += 1\n    out.append([s, e])\n    while i < n:\n        out.append(list(intervals[i]))\n        i += 1\n    return out\n\ndef min_meeting_rooms(intervals):\n    heap = []\n    for s, e in sorted(intervals):\n        if heap and heap[0] <= s:\n            heapq.heapreplace(heap, e)\n        else:\n            heapq.heappush(heap, e)\n    return len(heap)\n\ndef min_removals(intervals):\n    kept, last_end = 0, float('-inf')\n    for s, e in sorted(intervals, key=lambda iv: iv[1]):\n        if s >= last_end:\n            kept += 1\n            last_end = e\n    return len(intervals) - kept", "hints": ["Merge: sort a copy by start; compare `cur[0] <= merged[-1][1]` and extend with `max`.", "Insert: three phases using one pass: before (end < new start), overlapping (start <= new end), after.", "Rooms: sort by start, keep a min-heap of end times; pop while `heap[0] <= start` (or just once), then push `end`.", "Removals: sort by end, greedily keep when `start >= last_end`."]}
```

> [!TIP] Interview tips
> - Clarify closed vs half-open intervals and whether touching counts as overlap; it changes `<` versus `<=`.
> - Say "sort by start" for merging and rooms, but "sort by end" for the keep-the-most greedy.
> - The heap-of-ends and the sweep-line solutions both give the minimum rooms in $O(n \log n)$; mention both.
> - Test empty input, a single interval, fully nested intervals and duplicates.
