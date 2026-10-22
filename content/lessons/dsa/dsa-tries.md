---
id: dsa-tries
title: "Tries"
estimatedMinutes: 12
difficulty: medium
tags: [dsa, trie, strings, prefix]
---

## Why it matters
A trie (prefix tree) answers "does any word start with this prefix?" in time proportional to the prefix length, independent of how many words are stored. It powers autocomplete, spell check, IP routing and word-search puzzles, and is a classic follow-up when a hash set of words is not enough.

## Concept
Each node represents a prefix; each edge is one character. A node stores its `children` (dict or 26-slot array) and an `is_end` flag marking that a stored word ends here.

| Operation | Cost (word length $L$) |
|---|---|
| insert / search / starts_with | $O(L)$ |
| space | $O(\text{total characters})$ worst case, less with shared prefixes |
| list all words under a prefix | $O(L + \text{size of subtree})$ |

**Hash set vs trie.** A set gives $O(L)$ exact lookup (hashing reads the whole string) but cannot answer prefix queries without scanning every word. A trie answers prefix queries natively, enumerates words in sorted order with a DFS in key order, and shares storage between common prefixes.

**Patterns**
- **Prefix existence / counting**: keep a `count` per node (words passing through) to answer "how many words start with `p`" in $O(L)$.
- **Autocomplete**: walk to the prefix node, then DFS its subtree (visit children in sorted order for lexicographic output; cap at $k$ results).
- **Word search II** (many words in a grid): build a trie of the words and run one DFS from each cell, pruning as soon as the current path is not a trie prefix. This beats running a separate DFS per word.
- **Longest common prefix / replace words**: walk the trie until a node has more than one child or is a word end.
- **Bitwise trie**: store integers bit by bit to solve max-XOR-pair in $O(32 n)$.

**Pitfalls.** Mixing up `search` (needs `is_end`) and `starts_with` (does not). Forgetting that the empty prefix always matches. Memory blow-up with dict nodes on huge alphabets; compress with a radix tree if asked.

## Worked example
Insert `car`, `card`, `care`, `cat`. Shared prefix `ca` is stored once:

```text
root -c-> c -a-> a -r-> r* -d-> d*
                  |        \-e-> e*
                  \-t-> t*        (* = is_end)
```

Nodes created: c, a, r, d, e, t = **6 nodes** for 4 words with 14 characters in total.

Queries:
- `search("car")`: walk c, a, r, node `r` has `is_end` so **true**.
- `search("ca")`: walk c, a, but `a` is not an end so **false**.
- `starts_with("ca")`: path exists so **true**.
- `starts_with("cb")`: no child `b` under `c` so **false**.
- Autocomplete `"car"`: node `r` (is a word) then children in order `d`, `e` gives `car`, `card`, `care`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A trie holds 100,000 words of length at most 10. What is the cost of `starts_with(p)` for a prefix of length 4?",
  "options": [
    "O(100,000)",
    "O(4)",
    "O(log 100,000)",
    "O(10 * 100,000)"
  ],
  "answer": 1,
  "explanation": "The walk follows one edge per prefix character, so it is O(len(p)) = O(4), independent of how many words are stored."
}
```

```quiz
{
  "id": "q2",
  "question": "Your trie contains `apple`. What do `search('app')` and `starts_with('app')` return if `app` was never inserted?",
  "options": [
    "True and True",
    "False and True",
    "True and False",
    "False and False"
  ],
  "answer": 1,
  "explanation": "`app` is a path (prefix) but no node on it has is_end set for that length, so search is False while starts_with is True."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement a `Trie` class with `insert(word)`, `search(word)` (exact word), `starts_with(prefix)`, `count_prefix(prefix)` (how many inserted words, counting duplicates, start with the prefix; the empty prefix counts all words) and `words_with_prefix(prefix)` (sorted list of distinct stored words starting with the prefix). The empty string is a valid word.",
  "starterCode": "class Trie:\n    def __init__(self):\n        pass\n\n    def insert(self, word):\n        pass\n\n    def search(self, word):\n        pass\n\n    def starts_with(self, prefix):\n        pass\n\n    def count_prefix(self, prefix):\n        pass\n\n    def words_with_prefix(self, prefix):\n        pass\n\nt = Trie()\nfor w in [\"car\", \"card\", \"care\", \"cat\"]:\n    t.insert(w)\nprint(t.search(\"car\"), t.search(\"ca\"), t.starts_with(\"ca\"))",
  "tests": "t = Trie()\nassert t.search(\"\") is False and t.starts_with(\"\") is True\nassert t.count_prefix(\"\") == 0 and t.words_with_prefix(\"\") == []\nfor w in [\"car\", \"card\", \"care\", \"cat\", \"car\"]:\n    t.insert(w)\nassert t.search(\"car\") and t.search(\"card\")\nassert not t.search(\"ca\") and not t.search(\"cars\") and not t.search(\"\")\nassert t.starts_with(\"ca\") and t.starts_with(\"card\") and not t.starts_with(\"cb\") and not t.starts_with(\"cardx\")\nassert t.count_prefix(\"car\") == 4\nassert t.count_prefix(\"ca\") == 5 and t.count_prefix(\"\") == 5\nassert t.count_prefix(\"x\") == 0\nassert t.words_with_prefix(\"car\") == [\"car\", \"card\", \"care\"]\nassert t.words_with_prefix(\"c\") == [\"car\", \"card\", \"care\", \"cat\"]\nassert t.words_with_prefix(\"d\") == []\nt.insert(\"\")\nassert t.search(\"\") is True and t.count_prefix(\"\") == 6\nassert t.words_with_prefix(\"\")[0] == \"\"\n",
  "solution": "class Node:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\n        self.pass_count = 0\n\nclass Trie:\n    def __init__(self):\n        self.root = Node()\n\n    def insert(self, word):\n        node = self.root\n        node.pass_count += 1\n        for ch in word:\n            if ch not in node.children:\n                node.children[ch] = Node()\n            node = node.children[ch]\n            node.pass_count += 1\n        node.is_end = True\n\n    def _walk(self, s):\n        node = self.root\n        for ch in s:\n            node = node.children.get(ch)\n            if node is None:\n                return None\n        return node\n\n    def search(self, word):\n        node = self._walk(word)\n        return node is not None and node.is_end\n\n    def starts_with(self, prefix):\n        return self._walk(prefix) is not None\n\n    def count_prefix(self, prefix):\n        node = self._walk(prefix)\n        return node.pass_count if node else 0\n\n    def words_with_prefix(self, prefix):\n        node = self._walk(prefix)\n        out = []\n        if node is None:\n            return out\n        def dfs(n, path):\n            if n.is_end:\n                out.append(\"\".join(path))\n            for ch in sorted(n.children):\n                path.append(ch)\n                dfs(n.children[ch], path)\n                path.pop()\n        dfs(node, list(prefix))\n        return out",
  "hints": [
    "Use a small `Node` with `children` (dict), `is_end` and `pass_count`.",
    "Increment `pass_count` on every node you walk through during insert, including the root, so `count_prefix('')` works.",
    "For `words_with_prefix`, walk to the prefix node (return [] if missing), then DFS over `sorted(children)` building the string."
  ]
}
```


> [!TIP] Interview tips
> - Say why not a hash set: the question needs prefix queries, which a set cannot do without a full scan.
> - Always state the memory trade-off: a dict-of-children trie can use more memory than the raw words; mention arrays of 26 or radix compression.
> - Word Search II is the standard follow-up: trie plus DFS with pruning, and remove found words (or mark them) to avoid duplicates.
> - Decide up front whether the empty string and duplicates are allowed and test them.
