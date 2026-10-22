---
id: deep-learning-model-interpretability-for-deep-nets
title: Interpretability for deep nets (saliency, attention, probing)
estimatedMinutes: 12
difficulty: hard
tags: [deep-learning, interpretability, explainability]
---

## Why it matters
Stakeholders and regulators ask why a network made a prediction, and debugging often needs the same answer (is the model looking at the watermark or the tumour?). Interviewers test whether you know the main attribution methods, their failure modes, and the claim that attention is not automatically an explanation. For tabular SHAP/LIME see the ML lessons; this lesson is about deep nets.

## Concept
**Gradient-based attribution** (which input features move the output most)
- **Saliency**: $|\partial f / \partial x_i|$. Cheap, but noisy and local; saturated units give zero gradient even for important inputs.
- **Gradient $\times$ input**: $x_i \, \partial f/\partial x_i$. Accounts for feature magnitude.
- **SmoothGrad**: average saliency over noisy copies of the input to reduce noise.
- **Integrated Gradients (IG)**: integrate the gradient along a straight path from a **baseline** $x'$ to $x$:
$$\text{IG}_i = (x_i - x_i')\int_0^1 \frac{\partial f(x' + \alpha(x - x'))}{\partial x_i}\,d\alpha$$
approximated by a Riemann sum (20 to 300 steps). **Completeness**: $\sum_i \text{IG}_i = f(x) - f(x')$, which also tells you if the step count is enough. Results depend on the baseline (black image, zeros, blur, mean embedding).
- **Grad-CAM** (CNNs): weight the last conv feature maps by the pooled gradients of the class score to get a coarse heat-map.
- **Perturbation methods**: occlusion (replace a feature or patch by a baseline and measure the drop), LIME, SHAP (Shapley values; DeepSHAP/GradientSHAP are approximations). Model-agnostic but slower and baseline-sensitive.

**Attention is not (necessarily) explanation.** Attention weights show where information is *routed* in one layer, but values and later layers transform it; different attention distributions can give the same prediction, and gradient or leave-one-out importance often disagrees with it. Better: **attention rollout/flow** (multiply attention across layers) or gradient-weighted attention, and always check with interventions.

**Probing** asks what a hidden representation encodes: train a small (usually linear) classifier on frozen activations to predict a property (part of speech, syntax depth, a game state). High accuracy shows the information is *decodable*, not that the model *uses* it. Use **control tasks** (random labels), compare against a random-init baseline, and prefer simple probes (or report probe complexity); confirm causal use with interventions (activation patching, ablation, steering).

**Related**: concept activation vectors (TCAV), feature visualisation, and **mechanistic interpretability** (circuits, sparse autoencoders on activations).

**Pitfalls**: **sanity checks** (Adebayo et al.): an explanation that barely changes when you randomise the model's weights is just doing edge detection, not explaining the model. Faithfulness (does removing the top-attributed features change the output?) is different from plausibility (does it look right to humans?). Explanations are also not causal statements about the world.

## Worked example
Take $f(x) = x_0 x_1$ with $x = (2, 3)$ and baseline $x' = (0, 0)$, so $f(x) - f(x') = 6$.

- **Gradient $\times$ input**: $\nabla f = (x_1, x_0) = (3, 2)$, so attributions $(2 \cdot 3, 3 \cdot 2) = (6, 6)$, summing to $12$. Completeness fails because of the feature interaction.
- **Integrated gradients**: along the path $x(\alpha) = \alpha x$, the gradient is $(3\alpha, 2\alpha)$. Then $\text{IG}_0 = 2\int_0^1 3\alpha\,d\alpha = 3$ and $\text{IG}_1 = 3\int_0^1 2\alpha\,d\alpha = 3$. Sum $= 6 = f(x) - f(x')$: complete, with the credit split evenly between the two interacting features.
- **Occlusion** (zero out one feature at a time): removing either feature drops the output by $6$, so each looks like it is responsible for everything.

Three methods, three answers: the choice of method and baseline is part of the explanation.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does the completeness property of Integrated Gradients guarantee?",
  "options": [
    "Attributions are the same for every baseline",
    "Attributions sum to $f(x) - f(\\text{baseline})$",
    "Attributions are always positive",
    "Attributions equal the plain gradient"
  ],
  "answer": 1,
  "explanation": "IG attributions add up to the difference between the output at the input and at the baseline, a useful check that the Riemann sum has enough steps."
}
```

```quiz
{
  "id": "q2",
  "question": "A linear probe on layer-6 activations predicts part of speech with 97% accuracy. What can you conclude?",
  "options": [
    "The model uses part of speech to make its predictions",
    "Layer 6 attention heads encode syntax",
    "The information is linearly decodable from layer 6, but this alone does not show the model uses it",
    "The probe is overfitting"
  ],
  "answer": 2,
  "explanation": "Probing shows decodability. To claim the model relies on it, you need interventions (ablation, patching) and controls such as a random-init baseline or control tasks."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write attribution functions for a scalar model `f` with gradient function `grad_f` (both take a numpy vector). `grad_x_input(grad_f, x)` = `x * grad_f(x)`. `integrated_gradients(grad_f, x, baseline, steps=100)`: midpoint Riemann sum, averaging `grad_f(baseline + (k+0.5)/steps * (x - baseline))` for k in 0..steps-1, then multiplying by `(x - baseline)`. `occlusion(f, x, baseline)`: for each feature i, `f(x) - f(x_with_feature_i_replaced_by_baseline_i)`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef grad_x_input(grad_f, x):\n    pass\n\ndef integrated_gradients(grad_f, x, baseline, steps=100):\n    pass\n\ndef occlusion(f, x, baseline):\n    pass\n\nf = lambda x: x[0] * x[1]\ngrad_f = lambda x: np.array([x[1], x[0]])\nx = np.array([2.0, 3.0])\nprint(integrated_gradients(grad_f, x, np.zeros(2)))",
  "tests": "f = lambda x: x[0] * x[1]\ngrad_f = lambda x: np.array([x[1], x[0]])\nx = np.array([2.0, 3.0])\nb = np.zeros(2)\nassert np.allclose(grad_x_input(grad_f, x), [6.0, 6.0])\nig = integrated_gradients(grad_f, x, b)\nassert np.allclose(ig, [3.0, 3.0], atol=1e-9)\nassert abs(ig.sum() - (f(x) - f(b))) < 1e-9\nassert np.allclose(occlusion(f, x, b), [6.0, 6.0])\nw = np.array([1.5, -2.0, 0.5])\nsig = lambda z: 1 / (1 + np.exp(-z))\ng2 = lambda x: sig(w @ x) * (1 - sig(w @ x)) * w\nf2 = lambda x: sig(w @ x)\nx2 = np.array([1.0, 0.5, 2.0])\nb2 = np.zeros(3)\nig2 = integrated_gradients(g2, x2, b2, steps=400)\nassert abs(ig2.sum() - (f2(x2) - f2(b2))) < 1e-4\nassert np.allclose(integrated_gradients(grad_f, x, x), 0.0)",
  "solution": "import numpy as np\n\ndef grad_x_input(grad_f, x):\n    return x * grad_f(x)\n\ndef integrated_gradients(grad_f, x, baseline, steps=100):\n    diff = x - baseline\n    total = np.zeros_like(x, dtype=float)\n    for k in range(steps):\n        total += grad_f(baseline + (k + 0.5) / steps * diff)\n    return diff * total / steps\n\ndef occlusion(f, x, baseline):\n    base = f(x)\n    out = np.zeros(len(x))\n    for i in range(len(x)):\n        z = x.copy()\n        z[i] = baseline[i]\n        out[i] = base - f(z)\n    return out",
  "hints": [
    "IG is (x - baseline) times the average gradient along the straight path.",
    "For `f = x0 * x1` the midpoint rule is exact because the path gradient is linear in alpha.",
    "Copy `x` before overwriting a feature in `occlusion`."
  ]
}
```

> [!TIP] Interview tips
> - Name two or three methods (saliency, IG, Grad-CAM/occlusion/SHAP) with one-line mechanics, and state IG's completeness property and baseline sensitivity.
> - Be ready to argue that attention weights are not faithful explanations by themselves; mention rollout and intervention tests.
> - Distinguish probing (decodability) from causal evidence (ablation, patching), and mention sanity checks and faithfulness vs plausibility.
