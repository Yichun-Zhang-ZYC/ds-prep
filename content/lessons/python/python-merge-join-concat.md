---
id: python-merge-join-concat
title: merge / join / concat
estimatedMinutes: 12
difficulty: medium
tags: [python, pandas, joins]
---

## Why it matters
Combining tables is where silent data bugs live: duplicated rows from many-to-many joins, dropped rows from inner joins, mismatched key types. Interviewers want to see joins done deliberately and validated.

## Concept
```python
pd.merge(orders, users, on="user_id", how="left")        # SQL-style join
orders.merge(users, left_on="uid", right_on="user_id", how="inner")
orders.merge(users, on="user_id", how="left", validate="many_to_one", indicator=True)
pd.concat([df_jan, df_feb], ignore_index=True)            # stack rows
pd.concat([features_a, features_b], axis=1)               # side by side, aligned on index
left.join(right, how="left")                              # join on index
```

- `how`: `inner` (matches only), `left`, `right`, `outer`, `cross`.
- `validate="one_to_one" | "one_to_many" | "many_to_one"` raises if keys aren't unique as expected; this catches **row explosion** early.
- `indicator=True` adds `_merge` with `left_only` / `right_only` / `both`, useful for anti-joins and checking match rates.
- Overlapping non-key columns get suffixes (`_x`, `_y`; customize with `suffixes=`).
- Key dtypes must match ("123" vs 123 never joins). NaN keys match each other in pandas, unlike SQL.
- **Anti-join** (rows in A not in B): `A[~A.key.isin(B.key)]`, or merge with indicator and keep `left_only`.
- `pd.merge_asof` joins on the nearest earlier timestamp, useful for point-in-time features.

## Worked example
Orders (1,000 rows) left-joined to a `users` table that accidentally has duplicate user rows returns 1,037 rows; revenue now double-counts. `validate="many_to_one"` would have raised immediately. Always compare row counts before and after a join.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "After `orders.merge(users, on='user_id', how='left')`, the row count increased. Why?",
  "options": ["Left joins always add rows", "Some user_id values appear more than once in users, so matching orders are duplicated", "Missing users were dropped", "Index misalignment"],
  "answer": 1,
  "explanation": "A left join keeps every left row but repeats it for each matching right row."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `enrich_orders(orders, users)` that left-joins users onto orders by `user_id` with `validate='many_to_one'` and fills a missing `country` with 'unknown'. Write `orders_without_user(orders, users)` returning orders whose user_id is not in users (anti-join, reset the index). Write `stack_months(*dfs)` concatenating DataFrames vertically with a fresh index.",
  "setup": "import pandas as pd",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\n\ndef enrich_orders(orders, users):\n    pass\n\ndef orders_without_user(orders, users):\n    pass\n\ndef stack_months(*dfs):\n    pass\n",
  "tests": "orders = pd.DataFrame({'order_id': [1, 2, 3, 4], 'user_id': [10, 10, 20, 99], 'amount': [5, 7, 3, 9]})\nusers = pd.DataFrame({'user_id': [10, 20], 'country': ['US', 'CA']})\ne = enrich_orders(orders, users)\nassert len(e) == 4 and list(e['country']) == ['US', 'US', 'CA', 'unknown']\nbad_users = pd.concat([users, users.iloc[[0]]])\ntry:\n    enrich_orders(orders, bad_users)\n    assert False\nexcept pd.errors.MergeError:\n    pass\nw = orders_without_user(orders, users)\nassert list(w['order_id']) == [4] and list(w.index) == [0]\ns = stack_months(orders.iloc[:2], orders.iloc[2:])\nassert list(s.index) == [0, 1, 2, 3]",
  "solution": "import pandas as pd\n\ndef enrich_orders(orders, users):\n    out = orders.merge(users, on='user_id', how='left', validate='many_to_one')\n    out['country'] = out['country'].fillna('unknown')\n    return out\n\ndef orders_without_user(orders, users):\n    return orders[~orders['user_id'].isin(users['user_id'])].reset_index(drop=True)\n\ndef stack_months(*dfs):\n    return pd.concat(dfs, ignore_index=True)",
  "hints": ["validate='many_to_one' raises MergeError if users has duplicate keys.", "Anti-join: ~isin(...)."]
}
```

> [!TIP] Interview tips
> - State the join type and expected cardinality; use `validate=` and compare row counts.
> - Check match rates with `indicator=True` and confirm key dtypes match.
> - Know concat (stacking) vs merge (joining on keys), and mention merge_asof for time-based joins.
