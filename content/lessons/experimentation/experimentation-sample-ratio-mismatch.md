---
id: experimentation-sample-ratio-mismatch
title: Sample ratio mismatch (SRM)
estimatedMinutes: 12
difficulty: medium
tags: [experimentation, srm, data-quality, chi-square]
---

## Why it matters
If a 50/50 test ends up 50.6/49.4, the result may be invalid no matter how good the lift looks. SRM checks are the first thing experienced analysts look at, and interviewers love "the test won, but the groups were uneven. What do you do?".

## Concept
**SRM**: the observed split differs from the designed split by more than chance allows. Test it with a chi-square goodness-of-fit test (df = number of groups − 1). Many teams use a strict threshold like p < 0.001 because they check it on every test.

$$
\chi^2 = \sum_{\text{groups}} \frac{(O - E)^2}{E}
$$

Common causes:
- the treatment crashes or loads slower, so fewer treatment users get **logged**,
- bots or filters removed unevenly,
- redirects that drop users in one arm,
- assignment bugs or users switching devices,
- the treatment changes who **qualifies** for the analysis (e.g. trigger conditions).

If SRM is detected: **don't trust the result**. Find the cause, fix it, rerun.

## Worked example
Designed 50/50, observed 101,500 control vs 98,500 treatment (total 200,000).

$$
\chi^2 = \frac{1500^2}{100{,}000} \times 2 = 45, \qquad p \approx 2 \times 10^{-11}
$$

Clear SRM. Digging in: the treatment's new page took longer to load, and users who bounced before the logging call never appeared in treatment data. The "lift" came from losing the least engaged treatment users.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A test shows a significant +3% lift, but there is a strong SRM (p < 0.0001). What should you do?",
  "options": ["Ship it, the lift is significant", "Treat the result as untrustworthy, investigate the cause of SRM, and rerun", "Reweight the groups to 50/50 and report the lift", "Ignore SRM if the lift is large"],
  "answer": 1,
  "explanation": "SRM means the groups are no longer comparable. Reweighting doesn't fix selection bias."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `srm_check(counts, shares)` returning `(chi2, p_value)` for a test with any number of groups. For the p-value with 1 degree of freedom (two groups), use `math.erfc(math.sqrt(chi2 / 2))`; for more groups, return `None` for the p-value.",
  "starterCode": "import math\n\ndef srm_check(counts, shares):\n    pass\n\nprint(srm_check([101500, 98500], [0.5, 0.5]))",
  "tests": "import math\nchi2, p = srm_check([101500, 98500], [0.5, 0.5])\nassert abs(chi2 - 45) < 1e-9 and p < 1e-10\nchi2, p = srm_check([5030, 4970], [0.5, 0.5])\nassert abs(chi2 - 0.36) < 1e-9 and p > 0.5\nchi2, p = srm_check([900, 1000, 1100], [1/3, 1/3, 1/3])\nassert abs(chi2 - 20) < 1e-9 and p is None",
  "solution": "import math\n\ndef srm_check(counts, shares):\n    n = sum(counts)\n    chi2 = sum((o - n * s) ** 2 / (n * s) for o, s in zip(counts, shares))\n    p = math.erfc(math.sqrt(chi2 / 2)) if len(counts) == 2 else None\n    return chi2, p",
  "hints": ["Expected count = total × designed share.", "With 1 df, P(χ² > x) = erfc(√(x/2))."]
}
```

> [!TIP] Interview tips
> - Check SRM before looking at any metric, and say so.
> - Name likely causes: logging loss from slower pages, bot filtering, trigger conditions.
> - Never "fix" SRM by reweighting; the missing users differ systematically.
