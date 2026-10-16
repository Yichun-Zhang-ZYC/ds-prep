---
id: python-filtering-sorting
title: Filtering, sorting
estimatedMinutes: 10
difficulty: easy
tags: [python, pandas, filtering, sorting]
---

## Why it matters
"Find the top 5 customers by revenue in each region who signed up in 2024" is pandas filtering plus sorting. These are the bread and butter of pandas interview questions.

## Concept
```python
df[df["amount"] > 100]
df[(df["country"] == "US") & (df["amount"] > 100)]     # & | ~ with parentheses
df[df["country"].isin(["US", "CA"])]
df[df["amount"].between(10, 50)]                       # inclusive both ends
df[df["email"].str.endswith("@gmail.com", na=False)]
df[df["coupon"].notna()]
df.query("amount > 100 and country == 'US'")           # string expression

df.sort_values("amount", ascending=False)
df.sort_values(["region", "amount"], ascending=[True, False])
df.nlargest(5, "amount"); df.nsmallest(3, "price")
df.drop_duplicates(subset=["user_id"], keep="last")
df.sort_values("ts").groupby("user_id").tail(1)        # latest row per user
```

- Sorting is stable with `kind="stable"` (mergesort); useful for tie-breaking order.
- `na_position="first"/"last"` controls where NaNs go.
- `str` methods with `na=False` avoid NaN in the boolean mask.
- Top-N per group: sort then `groupby(...).head(n)`, or `groupby(...)[col].nlargest(n)`.

## Worked example
Top 2 orders per customer:

```python
(orders.sort_values(["customer", "amount"], ascending=[True, False])
       .groupby("customer")
       .head(2))
```
Equivalent to SQL `ROW_NUMBER() OVER (PARTITION BY customer ORDER BY amount DESC) <= 2`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which expression correctly filters rows where country is US or CA AND amount > 50?",
  "options": ["df[df.country == 'US' or 'CA' and df.amount > 50]", "df[df.country.isin(['US', 'CA']) & (df.amount > 50)]", "df[df.country in ['US', 'CA'] & df.amount > 50]", "df.filter(country=['US', 'CA'], amount=50)"],
  "answer": 1,
  "explanation": "Use isin for membership and & with parentheses for combining masks."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Orders have columns `customer`, `country`, `amount`. Write `big_na_orders(df, min_amount)` returning rows from US or CA with amount ≥ min_amount, sorted by amount descending (reset the index). Write `top_n_per_customer(df, n)` returning each customer's n largest orders sorted by customer then amount descending (reset the index).",
  "setup": "import pandas as pd",
  "packages": ["pandas"],
  "starterCode": "import pandas as pd\n\ndef big_na_orders(df, min_amount):\n    pass\n\ndef top_n_per_customer(df, n):\n    pass\n\ndf = pd.DataFrame({'customer': ['a', 'a', 'a', 'b', 'b'], 'country': ['US', 'CA', 'MX', 'US', 'US'], 'amount': [50, 80, 90, 20, 70]})\nprint(top_n_per_customer(df, 2))",
  "tests": "df = pd.DataFrame({'customer': ['a', 'a', 'a', 'b', 'b'], 'country': ['US', 'CA', 'MX', 'US', 'US'], 'amount': [50, 80, 90, 20, 70]})\nr = big_na_orders(df, 50)\nassert list(r['amount']) == [80, 70, 50] and list(r.index) == [0, 1, 2]\nt = top_n_per_customer(df, 2)\nassert list(zip(t['customer'], t['amount'])) == [('a', 90), ('a', 80), ('b', 70), ('b', 20)]\nassert list(t.index) == [0, 1, 2, 3]",
  "solution": "import pandas as pd\n\ndef big_na_orders(df, min_amount):\n    mask = df['country'].isin(['US', 'CA']) & (df['amount'] >= min_amount)\n    return df[mask].sort_values('amount', ascending=False).reset_index(drop=True)\n\ndef top_n_per_customer(df, n):\n    return (df.sort_values(['customer', 'amount'], ascending=[True, False])\n              .groupby('customer')\n              .head(n)\n              .reset_index(drop=True))",
  "hints": ["Combine isin with a comparison using &.", "Sort first, then groupby(...).head(n) keeps the top rows per group."]
}
```

> [!TIP] Interview tips
> - Use isin, between, str methods with na=False, and parenthesized & / | masks.
> - Top-N per group = sort + groupby.head; relate it to SQL window functions.
> - Reset the index after filtering/sorting if downstream code uses positions.
