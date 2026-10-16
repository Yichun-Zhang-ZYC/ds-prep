---
id: data-engineering-transformations-vs-actions-lazy-evaluation
title: Transformations vs actions, lazy evaluation
estimatedMinutes: 10
difficulty: easy
tags: [data-engineering, spark, lazy-evaluation]
---

## Why it matters
"Why did my Spark job run the same expensive step three times?" and "why did nothing happen when I ran this cell?" both come from lazy evaluation. Interviewers check you know when Spark actually executes, and when to cache.

## Concept
- **Transformations** (`select`, `filter`, `withColumn`, `join`, `groupBy().agg()`) return a new DataFrame and only add steps to the **logical plan**. Nothing runs yet.
- **Actions** (`count`, `collect`, `show`, `take`, `write`, `toPandas`) trigger execution: Spark optimizes the whole plan and runs a job.

Benefits of laziness: the optimizer sees the full pipeline (pushes filters down, prunes columns, combines steps) before running anything.

Consequences:
- Errors (bad column names caught at analysis are immediate, but runtime data errors) may appear only at the action.
- **Recomputation**: each action recomputes the plan from the source unless data is cached. If you call `df.count()` and then `df.write`, the upstream work runs twice.
- **`cache()` / `persist()`** keep a DataFrame in memory/disk after its first computation; worth it when reused by several actions and expensive to recompute. `unpersist()` when done. Caching everything wastes memory and can slow jobs.
- `explain()` prints the physical plan without running it.

## Worked example
```python
clean = raw.filter(F.col("valid")).join(users, "user_id")    # transformation: instant
clean.count()            # action #1: reads raw + users, joins
clean.write.parquet(p)   # action #2: reads and joins AGAIN
```
Adding `clean = clean.cache()` before the first action makes the second action read from memory. Alternatively drop the debugging `count()`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Which of these triggers a Spark job?",
  "options": ["df.filter(df.x > 1)", "df.withColumn('y', df.x * 2)", "df.select('x')", "df.count()"],
  "answer": 3,
  "explanation": "count() is an action; the others are lazy transformations."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Build a tiny lazy DataFrame. `Lazy(source)` takes a function returning a list of rows; `filter(fn)` and `map(fn)` return new Lazy objects that record steps without running. `collect()` runs the source and steps and returns the list; `count()` returns its length. Track how many times the source runs in a shared counter `self.stats['source_runs']` (shared by derived objects). `cache()` returns a Lazy whose first action stores the result so later actions don't rerun the source.",
  "starterCode": "class Lazy:\n    def __init__(self, source, steps=None, stats=None):\n        self.source = source\n        self.steps = steps or []\n        self.stats = stats if stats is not None else {'source_runs': 0}\n        self._cached = None\n        self._cache_enabled = False\n\n    def filter(self, fn):\n        pass\n\n    def map(self, fn):\n        pass\n\n    def cache(self):\n        pass\n\n    def collect(self):\n        pass\n\n    def count(self):\n        pass\n",
  "tests": "src = lambda: [1, 2, 3, 4, 5]\nd = Lazy(src).filter(lambda x: x % 2 == 1).map(lambda x: x * 10)\nassert d.stats['source_runs'] == 0\nassert d.collect() == [10, 30, 50]\nassert d.count() == 3\nassert d.stats['source_runs'] == 2\nc = Lazy(src).map(lambda x: x + 1).cache()\nassert c.collect() == [2, 3, 4, 5, 6] and c.count() == 5\nassert c.stats['source_runs'] == 1",
  "solution": "class Lazy:\n    def __init__(self, source, steps=None, stats=None):\n        self.source = source\n        self.steps = steps or []\n        self.stats = stats if stats is not None else {'source_runs': 0}\n        self._cached = None\n        self._cache_enabled = False\n\n    def filter(self, fn):\n        return Lazy(self.source, self.steps + [('filter', fn)], self.stats)\n\n    def map(self, fn):\n        return Lazy(self.source, self.steps + [('map', fn)], self.stats)\n\n    def cache(self):\n        out = Lazy(self.source, list(self.steps), self.stats)\n        out._cache_enabled = True\n        return out\n\n    def collect(self):\n        if self._cached is not None:\n            return list(self._cached)\n        self.stats['source_runs'] += 1\n        rows = self.source()\n        for kind, fn in self.steps:\n            rows = [fn(r) for r in rows] if kind == 'map' else [r for r in rows if fn(r)]\n        if self._cache_enabled:\n            self._cached = rows\n        return list(rows)\n\n    def count(self):\n        return len(self.collect())",
  "hints": ["Transformations only append to steps.", "Every uncached action calls the source again; caching stores the first result."]
}
```

> [!TIP] Interview tips
> - Define transformations (lazy, build a plan) vs actions (trigger a job) with examples.
> - Explain that laziness enables whole-plan optimization, and that each action recomputes unless cached.
> - Cache selectively (reused + expensive), and remove debugging actions like count() from production jobs.
