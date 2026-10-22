---
id: analytics-bi-vlookup-xlookup-index-match
title: VLOOKUP / XLOOKUP / INDEX-MATCH
estimatedMinutes: 10
difficulty: easy
tags: [excel, google-sheets, lookup, vlookup, xlookup]
---

## Why it matters
Lookups are how analysts join tables in a spreadsheet. Interviewers for analyst roles ask when `VLOOKUP` breaks, why `INDEX-MATCH` and `XLOOKUP` are safer, and what `#N/A` means.

## Concept
A lookup finds a **key** in one range and returns a value from the same row of another range.

**`VLOOKUP(key, table, col_index, [range_lookup])`**
- Searches the **first column** of `table` only, so it can never look left of the key.
- `col_index` is a hard-coded position. Inserting a column silently shifts the result.
- `range_lookup = TRUE` (the default!) does an **approximate match**: it needs the first column sorted ascending and returns the largest value $\le$ key. Use `FALSE` (or `0`) for exact match.
- Returns the **first** match; duplicates are ignored.

**`INDEX(return_range, MATCH(key, lookup_range, 0))`**
- `MATCH` returns the position of the key, `INDEX` returns the value at that position. The return and lookup columns are separate, so you can look left and inserting columns is safe.
- Two `MATCH` calls (rows and columns) give a 2-D lookup.

**`XLOOKUP(key, lookup_range, return_range, [if_not_found], [match_mode], [search_mode])`**
- Exact match by default, looks in any direction, can return several columns, takes an `if_not_found` value instead of wrapping in `IFERROR`, and can search from the bottom (last match). Available in Excel 365/2021 and Google Sheets.

**Common errors**: `#N/A` = key not found (often trailing spaces or text vs number mismatch; use `TRIM` / `VALUE`). Fix duplicate keys before looking up, or you silently get the first row. For millions of rows, prefer a database join; lookups are slow and fragile.

## Worked example
Salaries are in `A2:C100` (id, name, salary) and you want the salary for id `E7` typed in `F1`.

- `=VLOOKUP(F1, A2:C100, 3, FALSE)` works, but breaks if someone inserts a column between name and salary.
- `=INDEX(C2:C100, MATCH(F1, A2:A100, 0))` survives column inserts, and the same pattern finds a name from a salary (look left).
- `=XLOOKUP(F1, A2:A100, C2:C100, "not found")` is the shortest and handles missing keys.

Tax brackets: thresholds `0, 10000, 40000, 85000` with rates `10%, 12%, 22%, 24%`. For income 50,000, `=VLOOKUP(50000, brackets, 2, TRUE)` returns the rate for the largest threshold $\le$ 50,000, which is 40,000, so the rate is 22%. This is the one legitimate use of approximate match, and the thresholds must be sorted.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A `VLOOKUP` is written as `=VLOOKUP(A2, Data!A:D, 3)` with no fourth argument and the data is unsorted. What happens?",
  "options": [
    "It does an exact match and returns #N/A for missing keys",
    "It does an approximate match and may return a wrong row without any error",
    "It errors because the fourth argument is required",
    "It searches every column for the key"
  ],
  "answer": 1,
  "explanation": "The default is `TRUE` (approximate match), which assumes a sorted first column and uses binary search. On unsorted data it can return a wrong row silently. Always pass `FALSE` for exact match."
}
```

```quiz
{
  "id": "q2",
  "question": "You need the employee name given a salary-grade code, but the code column is to the right of the name column. Which options work?",
  "options": [
    "VLOOKUP only",
    "INDEX-MATCH or XLOOKUP",
    "Neither; you must reorder the columns",
    "XLOOKUP only"
  ],
  "answer": 1,
  "explanation": "VLOOKUP can only return columns to the right of the lookup column. INDEX-MATCH and XLOOKUP use separate lookup and return ranges, so direction does not matter."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Reimplement the three lookups in plain Python. `vlookup(key, rows, col, approx=False)`: `rows` is a list of lists, the key lives in column 1 and `col` is 1-based. Exact mode returns the first matching row's value or `None` (the `#N/A`). Approximate mode assumes rows sorted ascending and returns the value from the last row whose key is $\\le$ the lookup key, or `None` if the key is below the first. `index_match(return_col, lookup_col, key)` returns the value at the first position where `lookup_col` equals the key, else `None`. `xlookup(key, lookup, result, if_not_found=None)` does the same but returns `if_not_found` when the key is missing.",
  "starterCode": "def vlookup(key, rows, col, approx=False):\n    pass\n\ndef index_match(return_col, lookup_col, key):\n    pass\n\ndef xlookup(key, lookup, result, if_not_found=None):\n    pass\n\nrows = [[\"E1\", \"Ana\", 70], [\"E2\", \"Ben\", 85]]\nprint(vlookup(\"E2\", rows, 2), index_match([70, 85], [\"E1\", \"E2\"], \"E2\"), xlookup(\"E9\", [\"E1\"], [70], \"n/a\"))",
  "tests": "rows = [[\"E1\", \"Ana\", 70], [\"E2\", \"Ben\", 85], [\"E2\", \"Dup\", 99]]\nassert vlookup(\"E2\", rows, 2) == \"Ben\"\nassert vlookup(\"E2\", rows, 3) == 85\nassert vlookup(\"E9\", rows, 2) is None\nbrackets = [[0, 0.10], [10000, 0.12], [40000, 0.22], [85000, 0.24]]\nassert vlookup(50000, brackets, 2, approx=True) == 0.22\nassert vlookup(40000, brackets, 2, approx=True) == 0.22\nassert vlookup(9999, brackets, 2, approx=True) == 0.10\nassert vlookup(-5, brackets, 2, approx=True) is None\nids = [\"E1\", \"E2\", \"E3\"]\nsal = [70, 85, 60]\nassert index_match(sal, ids, \"E3\") == 60\nassert index_match(ids, sal, 85) == \"E2\"\nassert index_match(sal, ids, \"E7\") is None\nassert xlookup(\"E2\", ids, sal) == 85\nassert xlookup(\"E7\", ids, sal, \"not found\") == \"not found\"\nassert xlookup(\"E2\", sal, ids) is None",
  "solution": "def vlookup(key, rows, col, approx=False):\n    if not approx:\n        for r in rows:\n            if r[0] == key:\n                return r[col - 1]\n        return None\n    best = None\n    for r in rows:\n        if r[0] <= key:\n            best = r\n        else:\n            break\n    return None if best is None else best[col - 1]\n\ndef index_match(return_col, lookup_col, key):\n    for i, v in enumerate(lookup_col):\n        if v == key:\n            return return_col[i]\n    return None\n\ndef xlookup(key, lookup, result, if_not_found=None):\n    for i, v in enumerate(lookup):\n        if v == key:\n            return result[i]\n    return if_not_found",
  "hints": [
    "VLOOKUP's col is 1-based, so use row[col - 1].",
    "For approximate mode, walk the sorted rows and remember the last one whose key is <= the lookup key; stop at the first row that is bigger."
  ]
}
```

> [!TIP] Interview tips
> - Always say you use exact match (`FALSE` / `0`) unless you are doing a sorted bracket lookup. The default approximate match is the classic trap.
> - Prefer `XLOOKUP`, or `INDEX-MATCH` when compatibility with older Excel matters. Explain that column inserts do not break them and that they can look left.
> - Before trusting a lookup, check for duplicate keys, trailing spaces and text-vs-number mismatches (`"007"` vs `7`). Use `IFERROR` or `if_not_found` deliberately, not to hide bugs.
