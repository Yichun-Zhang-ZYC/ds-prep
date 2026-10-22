---
id: dsa-bit-manipulation
title: "Bit manipulation"
estimatedMinutes: 11
difficulty: medium
tags: [dsa, bit-manipulation, xor, bitmask]
---

## Why it matters
Bit tricks turn $O(n)$ memory into $O(1)$ (single number via XOR), make subsets and small-state DP compact (bitmasks), and appear as quick-fire questions in many screens: power of two, count set bits, missing number. They are also how permissions, flags and Bloom filters are implemented.

## Concept
**Operators (Python ints are arbitrary precision)**: `&` and, `|` or, `^` xor, `~` not, `<<` / `>>` shifts.

**Identities worth memorizing**

| Goal | Expression |
|---|---|
| test bit $i$ | `(x >> i) & 1` |
| set / clear / toggle bit $i$ | `x \| (1 << i)`, `x & ~(1 << i)`, `x ^ (1 << i)` |
| lowest set bit | `x & -x` |
| clear lowest set bit | `x & (x - 1)` |
| power of two (x > 0) | `x & (x - 1) == 0` |
| multiply / floor-divide by $2^k$ | `x << k`, `x >> k` |

**XOR properties**: $a \oplus a = 0$, $a \oplus 0 = a$, commutative and associative. So XOR-ing a list where every value appears twice except one leaves the unique value, in $O(n)$ time and $O(1)$ space. Missing number in `0..n`: XOR all indices and all values.

**Popcount (Kernighan)**: repeat `x &= x - 1` until zero; the loop runs once per set bit. In Python 3.10+ use `x.bit_count()`.

**Bitmask subsets**: for `n` items, every integer `m` in `[0, 2^n)` encodes a subset (bit $i$ set means item $i$ is chosen). $2^n$ subsets times $O(n)$ per subset. Bitmask DP (e.g. visited-set in TSP, $n \le 20$) stores a set as one integer.

**Python gotchas.** Integers never overflow, and negatives behave as infinite two's complement: `-1 >> 1 == -1`. To emulate 32-bit unsigned, mask with `0xFFFFFFFF`. `~x == -x - 1`. Operator precedence: `==` binds tighter than `&`, so write `(x & 1) == 0`.

## Worked example
**1. Single number**, `[4, 1, 2, 1, 2]`: XOR everything.
`4 ^ 1 = 5`, `5 ^ 2 = 7`, `7 ^ 1 = 6`, `6 ^ 2 = 4`. The pairs cancel, leaving **4**.

**2. Popcount of 44 with Kernighan**: $44 = 101100_2$.

```text
x=101100 (44)  x-1=101011  x&(x-1)=101000 (40)  count=1
x=101000 (40)  x-1=100111  x&(x-1)=100000 (32)  count=2
x=100000 (32)  x-1=011111  x&(x-1)=000000 (0)   count=3
```

3 iterations for 3 set bits, not 6 (the bit length). **3. Subsets of `[a, b, c]`**: masks `000..111` give 8 subsets; mask `101` (5) is `{a, c}`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `x & (x - 1)` do for x > 0?",
  "options": [
    "Sets the lowest zero bit",
    "Clears the lowest set bit",
    "Isolates the lowest set bit",
    "Flips all bits"
  ],
  "answer": 1,
  "explanation": "Subtracting 1 flips the lowest set bit and all zeros below it; AND-ing with x clears exactly that lowest set bit."
}
```

```quiz
{
  "id": "q2",
  "question": "An array has every value twice except two distinct values a and b. What does XOR-ing all elements give?",
  "options": [
    "a",
    "b",
    "a ^ b",
    "0"
  ],
  "answer": 2,
  "explanation": "Duplicates cancel, leaving a ^ b. Any set bit in it separates a from b, which lets you split the array into two groups and recover both."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement (1) `count_bits(x)` for x >= 0 using the `x & (x - 1)` trick. (2) `is_power_of_two(x)` (False for x <= 0). (3) `single_number(nums)` where every value appears twice except one. (4) `missing_number(nums)` for a list holding `n` distinct values from `0..n` with one missing, using XOR. (5) `counting_bits(n)`: list of popcounts for `0..n` in $O(n)$ using `res[i] = res[i >> 1] + (i & 1)`. (6) `subsets(nums)` via bitmasks: all subsets, each in the original element order, returned sorted as a list of lists.",
  "starterCode": "def count_bits(x):\n    pass\n\ndef is_power_of_two(x):\n    pass\n\ndef single_number(nums):\n    pass\n\ndef missing_number(nums):\n    pass\n\ndef counting_bits(n):\n    pass\n\ndef subsets(nums):\n    pass\n\nprint(count_bits(44), single_number([4, 1, 2, 1, 2]))",
  "tests": "assert count_bits(0) == 0 and count_bits(1) == 1 and count_bits(44) == 3\nassert count_bits(255) == 8 and count_bits(2 ** 40) == 1 and count_bits(2 ** 40 - 1) == 40\nassert is_power_of_two(1) and is_power_of_two(1024) and is_power_of_two(2 ** 62)\nassert not is_power_of_two(0) and not is_power_of_two(-8) and not is_power_of_two(6) and not is_power_of_two(3)\nassert single_number([4, 1, 2, 1, 2]) == 4\nassert single_number([7]) == 7\nassert single_number([-3, 5, 5]) == -3\nassert single_number([0, 9, 0]) == 9\nassert missing_number([3, 0, 1]) == 2\nassert missing_number([]) == 0\nassert missing_number([0]) == 1\nassert missing_number([1]) == 0\nassert missing_number([9, 6, 4, 2, 3, 5, 7, 0, 1]) == 8\nassert counting_bits(0) == [0]\nassert counting_bits(5) == [0, 1, 1, 2, 1, 2]\nassert counting_bits(8)[8] == 1 and len(counting_bits(8)) == 9\nassert subsets([]) == [[]]\nassert subsets([1]) == [[], [1]]\nassert subsets([1, 2, 3]) == [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]\nassert len(subsets(list(range(10)))) == 1024\n",
  "solution": "def count_bits(x):\n    c = 0\n    while x:\n        x &= x - 1\n        c += 1\n    return c\n\ndef is_power_of_two(x):\n    return x > 0 and (x & (x - 1)) == 0\n\ndef single_number(nums):\n    r = 0\n    for v in nums:\n        r ^= v\n    return r\n\ndef missing_number(nums):\n    r = len(nums)\n    for i, v in enumerate(nums):\n        r ^= i ^ v\n    return r\n\ndef counting_bits(n):\n    res = [0] * (n + 1)\n    for i in range(1, n + 1):\n        res[i] = res[i >> 1] + (i & 1)\n    return res\n\ndef subsets(nums):\n    n = len(nums)\n    out = []\n    for mask in range(1 << n):\n        out.append([nums[i] for i in range(n) if (mask >> i) & 1])\n    return sorted(out)",
  "hints": [
    "Kernighan: `while x: x &= x - 1; c += 1`.",
    "`x > 0 and x & (x - 1) == 0` needs parentheses in Python: `(x & (x - 1)) == 0`.",
    "missing_number: start with `n = len(nums)`, XOR in every index and every value.",
    "subsets: for mask in range(1 << n), pick `nums[i]` where `(mask >> i) & 1`; sort the result at the end."
  ]
}
```


> [!TIP] Interview tips
> - Know `x & (x - 1)` and `x & -x` cold; they solve a dozen problems.
> - Python has no overflow: if the problem says 32-bit, mask with `0xFFFFFFFF` and convert back if the sign bit is set.
> - Mention `int.bit_count()` after showing the manual version, but write the manual one first.
> - Bitmask subsets only work for small n (up to about 20); say so.
