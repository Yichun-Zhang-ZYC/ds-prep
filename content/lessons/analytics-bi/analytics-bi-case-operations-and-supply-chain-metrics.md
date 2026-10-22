---
id: analytics-bi-case-operations-and-supply-chain-metrics
title: "Case: Operations and supply-chain metrics"
estimatedMinutes: 13
difficulty: medium
tags: [case-study, operations, supply-chain, inventory, forecasting]
---

## Why it matters
Operations cases ("deliveries are late, inventory is piling up, what do we measure?") appear at retailers, marketplaces and logistics firms. They test whether you can pick precise service, cost and forecast metrics and spot the trade-off between stockouts and excess inventory.

## Concept
**Service metrics**:
- **On-time rate**: orders delivered by the promised date / orders. **In-full rate**: orders with all lines and quantities / orders.
- **OTIF** = orders both on time AND in full / orders. It is not on-time × in-full unless the two are independent; compute it per order.
- **Fill rate**: units shipped / units ordered. **Stockout rate**: share of demand (or time) with zero stock.

**Inventory and cost**:
- **Inventory turnover** = COGS / average inventory. **Days of inventory (DIO)** = 365 / turnover.
- **Carrying cost** (capital, storage, shrink, obsolescence) vs **stockout cost** (lost sales, expediting, churn).
- **Cash conversion cycle** = DIO + DSO − DPO.

**Flow and capacity**: **cycle time**, **throughput** and work-in-progress are linked by Little's law, $L = \lambda W$. **Utilisation** near 100% makes queues explode, so leave slack.

**Forecast quality**:
- **WAPE** = $\sum |A_t - F_t| / \sum A_t$ (robust to zeros, weights big items). Avoid MAPE for intermittent demand.
- **Bias** = $\sum (F_t - A_t) / \sum A_t$. Positive means over-forecasting (excess stock), negative under-forecasting (stockouts).

**Reorder logic** for demand with mean $\mu$ and standard deviation $\sigma$ per day, lead time $L$ days (fixed):

$$SS = z\,\sigma\sqrt{L},\qquad ROP = \mu L + SS$$

where $z$ comes from the target cycle service level (95% gives $z \approx 1.645$). Lead-time variability adds to the safety stock; more variable demand or longer lead times mean more stock.

**Pitfalls**: averaging across SKUs hides problem items (segment with ABC analysis); metrics measured at the wrong level (line vs order); improving one metric by gaming another (fill rate up via over-stocking); ignoring that demand is censored when stock is out.

## Worked example
A regional warehouse reviews last month (illustrative). It shipped 1,000 orders: 920 on time, 950 in full, and 890 both on time and in full.

- On-time 92%, in-full 95%, **OTIF 89%**. Multiplying 92% × 95% = 87.4% would be wrong because late orders and short orders overlap. Only 60 orders were late but complete, 30 were on time but short, 20 were both late and short.
- The \$12M COGS and \$2M average inventory give turnover = 6.0 and DIO = 365 / 6 ≈ 61 days.

A fast-moving SKU has mean demand 200 units/day, $\sigma = 40$ units/day, and a 9-day supplier lead time. For 95% cycle service:

- $SS = 1.645 \times 40 \times \sqrt{9} = 1.645 \times 120 \approx 197$ units.
- $ROP = 200 \times 9 + 197 = 1{,}997$ units.

Forecast review on 4 weeks: actual 100, 120, 80, 100 and forecast 110, 130, 90, 110. WAPE = (10 + 10 + 10 + 10) / 400 = 10%, bias = +40/400 = **+10%**. All errors are in the same direction: the forecast is systematically high, which explains the stock build-up. Fix the bias before adding safety stock.

Action: cut the forecast by the measured bias, recompute reorder points, track OTIF and DIO by ABC class, and check that the lower stock does not push stockouts up.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Out of 200 orders, 160 are on time and 180 are in full. What is the minimum possible OTIF?",
  "options": [
    "72% (0.8 x 0.9)",
    "70% (140 orders)",
    "80%",
    "90%"
  ],
  "answer": 1,
  "explanation": "Worst case the 40 late and 20 short orders do not overlap: 200 − 40 − 20 = 140 orders both on time and in full, 70%. The best case is 160 (80%). The product 72% assumes independence."
}
```

```quiz
{
  "id": "q2",
  "question": "Forecast bias is +12% and WAPE is 15%. What is the best first move?",
  "options": [
    "Raise safety stock to cover the error",
    "Correct the systematic over-forecast, then recompute safety stock from the remaining variability",
    "Switch to MAPE",
    "Ignore bias; only WAPE matters"
  ],
  "answer": 1,
  "explanation": "Most of the error is directional and fixable. Holding extra stock to cover a known bias just inflates inventory."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `service_metrics(orders)`. Each order is a dict with `promised` and `delivered` (day numbers) and `ordered_units` and `shipped_units`. An order is on time if `delivered <= promised` and in full if `shipped_units >= ordered_units`. Return a dict with `on_time`, `in_full`, `otif` (order shares) and `fill_rate` (total shipped / total ordered, shipped capped at ordered per order).",
  "starterCode": "def service_metrics(orders):\n    pass\n\norders = [\n    {'promised': 5, 'delivered': 5, 'ordered_units': 10, 'shipped_units': 10},\n    {'promised': 5, 'delivered': 7, 'ordered_units': 10, 'shipped_units': 10},\n    {'promised': 5, 'delivered': 4, 'ordered_units': 10, 'shipped_units': 6},\n    {'promised': 5, 'delivered': 8, 'ordered_units': 10, 'shipped_units': 5},\n]\nprint(service_metrics(orders))",
  "tests": "orders = [\n    {'promised': 5, 'delivered': 5, 'ordered_units': 10, 'shipped_units': 10},\n    {'promised': 5, 'delivered': 7, 'ordered_units': 10, 'shipped_units': 10},\n    {'promised': 5, 'delivered': 4, 'ordered_units': 10, 'shipped_units': 6},\n    {'promised': 5, 'delivered': 8, 'ordered_units': 10, 'shipped_units': 5},\n]\nm = service_metrics(orders)\nassert abs(m['on_time'] - 0.5) < 1e-12\nassert abs(m['in_full'] - 0.5) < 1e-12\nassert abs(m['otif'] - 0.25) < 1e-12\nassert abs(m['fill_rate'] - 31 / 40) < 1e-12\norders[0]['shipped_units'] = 12\nassert abs(service_metrics(orders)['fill_rate'] - 31 / 40) < 1e-12",
  "solution": "def service_metrics(orders):\n    n = len(orders)\n    ot = sum(o['delivered'] <= o['promised'] for o in orders)\n    inf = sum(o['shipped_units'] >= o['ordered_units'] for o in orders)\n    both = sum(o['delivered'] <= o['promised'] and o['shipped_units'] >= o['ordered_units'] for o in orders)\n    shipped = sum(min(o['shipped_units'], o['ordered_units']) for o in orders)\n    ordered = sum(o['ordered_units'] for o in orders)\n    return {'on_time': ot / n, 'in_full': inf / n, 'otif': both / n, 'fill_rate': shipped / ordered}",
  "hints": [
    "OTIF needs both conditions on the same order, not the product of the two rates.",
    "Cap shipped units with `min(shipped, ordered)` so over-shipping does not hide shortfalls."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `wape(actual, forecast)` = Σ|A − F| / ΣA and `bias(actual, forecast)` = Σ(F − A) / ΣA. Then implement `inventory_days(cogs, avg_inventory)` = 365 / (cogs / avg_inventory).",
  "starterCode": "def wape(actual, forecast):\n    pass\n\ndef bias(actual, forecast):\n    pass\n\ndef inventory_days(cogs, avg_inventory):\n    pass\n\na = [100, 120, 80, 100]\nf = [110, 130, 90, 110]\nprint(wape(a, f), bias(a, f), inventory_days(12e6, 2e6))",
  "tests": "a = [100, 120, 80, 100]\nf = [110, 130, 90, 110]\nassert abs(wape(a, f) - 0.1) < 1e-12\nassert abs(bias(a, f) - 0.1) < 1e-12\nassert abs(wape([10, 10], [15, 5]) - 0.5) < 1e-12\nassert abs(bias([10, 10], [15, 5])) < 1e-12\nassert abs(inventory_days(12e6, 2e6) - 365 / 6) < 1e-9",
  "solution": "def wape(actual, forecast):\n    return sum(abs(a - f) for a, f in zip(actual, forecast)) / sum(actual)\n\ndef bias(actual, forecast):\n    return sum(f - a for a, f in zip(actual, forecast)) / sum(actual)\n\ndef inventory_days(cogs, avg_inventory):\n    return 365 / (cogs / avg_inventory)",
  "hints": [
    "WAPE uses absolute errors; bias uses signed errors, so they can cancel.",
    "In the second test the errors offset: WAPE 50% but bias 0%."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `reorder_point(mean_daily, sd_daily, lead_days, service)`. Use `statistics.NormalDist().inv_cdf(service)` for z. Return `(safety_stock, reorder_point)` with `safety_stock = z * sd_daily * sqrt(lead_days)` and `reorder_point = mean_daily * lead_days + safety_stock`. Then implement `expected_holding_saving(old_ss, new_ss, unit_cost, holding_rate)` = (old_ss − new_ss) × unit_cost × holding_rate (annual carrying-cost saving).",
  "starterCode": "from math import sqrt\nfrom statistics import NormalDist\n\ndef reorder_point(mean_daily, sd_daily, lead_days, service):\n    pass\n\ndef expected_holding_saving(old_ss, new_ss, unit_cost, holding_rate):\n    pass\n\nprint(reorder_point(200, 40, 9, 0.95))",
  "tests": "ss, rop = reorder_point(200, 40, 9, 0.95)\nassert abs(ss - 197.38) < 0.05\nassert abs(rop - (1800 + ss)) < 1e-9\nss0, rop0 = reorder_point(10, 0, 4, 0.99)\nassert abs(ss0) < 1e-12 and abs(rop0 - 40) < 1e-12\nss2, _ = reorder_point(200, 40, 9, 0.99)\nassert ss2 > ss\nassert abs(expected_holding_saving(300, 200, 5, 0.2) - 100) < 1e-9",
  "solution": "from math import sqrt\nfrom statistics import NormalDist\n\ndef reorder_point(mean_daily, sd_daily, lead_days, service):\n    z = NormalDist().inv_cdf(service)\n    ss = z * sd_daily * sqrt(lead_days)\n    return ss, mean_daily * lead_days + ss\n\ndef expected_holding_saving(old_ss, new_ss, unit_cost, holding_rate):\n    return (old_ss - new_ss) * unit_cost * holding_rate",
  "hints": [
    "Safety stock grows with the square root of lead time, not linearly.",
    "A higher service level means a larger z and therefore more safety stock."
  ]
}
```

> [!TIP] Interview tips
> - Define each metric precisely (per order vs per unit, which denominator) and say OTIF must be computed per order.
> - Frame inventory as a trade-off: carrying cost against stockout cost, with safety stock tied to a service level and demand and lead-time variability.
> - Separate forecast bias (fixable, directional) from forecast noise (needs buffer), and segment by ABC class before averaging.
