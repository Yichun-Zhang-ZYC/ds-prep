---
id: python-list-dict-set-comprehensions
title: List / dict / set comprehensions
estimatedMinutes: 8
difficulty: easy
tags: [python, core, comprehensions]
---

## Why it matters
Comprehensions are the idiomatic way to transform and filter collections in Python. Interviewers expect you to write them fluently in coding rounds and to know when a plain loop is clearer.

## Concept
```python
squares = [x * x for x in nums]                     # list
evens   = [x for x in nums if x % 2 == 0]           # with filter
labels  = ["pos" if x > 0 else "neg" for x in nums] # conditional expression
lookup  = {u["id"]: u for u in users}               # dict
uniq    = {w.lower() for w in words}                # set
total   = sum(x * x for x in nums)                  # generator expression (lazy)
pairs   = [(i, j) for i in range(3) for j in range(i)]  # nested: outer loop first
```

- Filter `if` goes **after** the `for`; a conditional *expression* (`a if c else b`) goes **before** it.
- Nested comprehensions read left to right like nested loops.
- A **generator expression** `( ... )` doesn't build a list; use it when you only iterate once (inside `sum`, `max`, `any`).
- Comprehension variables don't leak into the enclosing scope (Python 3).
- If it needs more than ~2 clauses or side effects, write a regular loop.

## Worked example
Invert a dict and group values:

```python
color = {"apple": "red", "cherry": "red", "lime": "green"}
by_color = {c: sorted(k for k, v in color.items() if v == c) for c in set(color.values())}
# {'red': ['apple', 'cherry'], 'green': ['lime']}
```
(That's O(n·k); for large data, a `defaultdict(list)` loop is O(n).)

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does `[x for x in range(4) for y in range(x)]` produce?",
  "options": ["[0, 1, 2, 3]", "[1, 2, 2, 3, 3, 3]", "[0, 1, 1, 2, 2, 2]", "[[0], [1], [2]]"],
  "answer": 1,
  "explanation": "For each x, the inner loop runs x times: x=1 once, x=2 twice, x=3 three times."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Using comprehensions, write `word_lengths(words)` returning a dict word → length for words with at least 3 letters, `flatten(matrix)` returning a flat list, and `unique_domains(emails)` returning the set of lowercase domains.",
  "starterCode": "def word_lengths(words):\n    pass\n\ndef flatten(matrix):\n    pass\n\ndef unique_domains(emails):\n    pass\n\nprint(word_lengths(['a', 'tree', 'cat']), flatten([[1, 2], [3]]), unique_domains(['a@X.com', 'b@x.com', 'c@y.org']))",
  "tests": "assert word_lengths(['a', 'tree', 'cat', 'is']) == {'tree': 4, 'cat': 3}\nassert flatten([[1, 2], [3], []]) == [1, 2, 3]\nassert unique_domains(['a@X.com', 'b@x.com', 'c@y.org']) == {'x.com', 'y.org'}",
  "solution": "def word_lengths(words):\n    return {w: len(w) for w in words if len(w) >= 3}\n\ndef flatten(matrix):\n    return [x for row in matrix for x in row]\n\ndef unique_domains(emails):\n    return {e.split('@')[1].lower() for e in emails}",
  "hints": ["Nested comprehension: `for row in matrix for x in row`.", "Split on '@' and take the second part."]
}
```

> [!TIP] Interview tips
> - Use comprehensions for simple map/filter; switch to loops when logic gets complex.
> - Mention generator expressions for memory efficiency on large inputs.
> - Watch the order in nested comprehensions; say it out loud as nested loops.
