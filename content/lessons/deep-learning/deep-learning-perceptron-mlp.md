---
id: deep-learning-perceptron-mlp
title: "Perceptron, MLP"
estimatedMinutes: 10
difficulty: easy
tags: [deep-learning, perceptron, mlp, fundamentals]
---

## Why it matters
The perceptron and the multilayer perceptron (MLP) are the base case for every neural-network question. Interviewers use them to check that you know why depth and non-linearity matter (the XOR problem), what a layer actually computes, and how a model is trained.

## Concept
**Perceptron**: a linear classifier $\hat y = \mathbb 1[\,w^\top x + b > 0\,]$. Learning rule on each example: $w \leftarrow w + \eta\,(y - \hat y)\,x$, $b \leftarrow b + \eta\,(y - \hat y)$ (a no-op when correct). If the data is **linearly separable** it converges in finitely many updates (Novikoff); if not (e.g. XOR) it never converges.

**MLP**: stack layers $h^{(l)} = \phi(W^{(l)} h^{(l-1)} + b^{(l)})$ with a non-linear $\phi$. Key facts:
- **Without a non-linearity, depth collapses**: $W_2(W_1 x) = (W_2 W_1)x$ is still one linear map.
- **Universal approximation**: one hidden layer with enough units can approximate any continuous function on a compact set. It says nothing about how many units are needed or whether SGD finds the weights; depth is usually more parameter-efficient.
- **Parameter count** for a layer $n_{in} \to n_{out}$: $n_{in} n_{out} + n_{out}$.
- **Output head** depends on the task: sigmoid (binary), softmax (multiclass), linear (regression).
- Training = forward pass, loss, backprop, gradient step (see the backprop lesson). The perceptron rule is *not* gradient descent on a smooth loss; an MLP trained with backprop is.

## Worked example
**AND is separable.** Start $w = (0,0)$, $b = 0$, $\eta = 1$. Sample $(1,1)$ with $y=1$: $\hat y = 0$ (since $0 > 0$ is false), so $w \leftarrow (1,1)$, $b \leftarrow 1$. Then $(0,0)$ with $y=0$: $z = 1 > 0$ predicts 1, so $b \leftarrow 0$. A few more passes give e.g. $w=(1,1)$, $b=-1$: only $(1,1)$ has $z = 1 > 0$.

**XOR is not**, but a 2-unit ReLU hidden layer solves it: $h_1 = \text{relu}(x_1 + x_2)$, $h_2 = \text{relu}(x_1 + x_2 - 1)$, $y = h_1 - 2h_2$.

| $(x_1,x_2)$ | $h_1$ | $h_2$ | $y$ |
|---|---|---|---|
| (0,0) | 0 | 0 | 0 |
| (1,0) | 1 | 0 | 1 |
| (0,1) | 1 | 0 | 1 |
| (1,1) | 2 | 1 | 0 |

Parameter count of a 784 → 128 → 10 MLP: $784\cdot128+128 + 128\cdot10+10 = 100{,}480 + 1{,}290 = 101{,}770$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "A 5-layer network uses only linear (identity) activations. What function class can it represent?",
  "options": ["Any continuous function", "Only a single linear (affine) map", "Piecewise-linear functions", "Only quadratic functions"],
  "answer": 1,
  "explanation": "Composition of linear maps is linear, so extra layers add nothing without a non-linearity."
}
```

```quiz
{
  "id": "q2",
  "question": "The perceptron learning rule is run on XOR data. What happens?",
  "options": ["It converges after a few epochs", "It converges only with a small learning rate", "It never converges because the data is not linearly separable", "It converges to the maximum-margin solution"],
  "answer": 2,
  "explanation": "Perceptron convergence is guaranteed only for linearly separable data; XOR is not, so the weights keep cycling."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `perceptron_train(X, y, lr=1.0, epochs=20)` that starts from zero weights/bias and applies the perceptron rule (predict 1 if `w·x + b > 0` else 0), returning `(w, b)` with `w` a list. Then write `xor_mlp(x1, x2)` that computes the 2-hidden-unit ReLU network from the worked example, and `count_params(sizes)` that returns the parameter count of an MLP with the given layer sizes.",
  "starterCode": "def perceptron_train(X, y, lr=1.0, epochs=20):\n    pass\n\ndef xor_mlp(x1, x2):\n    pass\n\ndef count_params(sizes):\n    pass\n\nX = [[0, 0], [0, 1], [1, 0], [1, 1]]\nprint(perceptron_train(X, [0, 0, 0, 1]), xor_mlp(1, 1), count_params([784, 128, 10]))",
  "tests": "X = [[0, 0], [0, 1], [1, 0], [1, 1]]\nw, b = perceptron_train(X, [0, 0, 0, 1])\nassert [1 if w[0] * a + w[1] * c + b > 0 else 0 for a, c in X] == [0, 0, 0, 1]\nw, b = perceptron_train(X, [0, 1, 1, 1])\nassert [1 if w[0] * a + w[1] * c + b > 0 else 0 for a, c in X] == [0, 1, 1, 1]\nassert [xor_mlp(a, c) for a, c in X] == [0, 1, 1, 0]\nassert count_params([784, 128, 10]) == 101770\nassert count_params([2, 2, 1]) == 9",
  "solution": "def perceptron_train(X, y, lr=1.0, epochs=20):\n    d = len(X[0])\n    w = [0.0] * d\n    b = 0.0\n    for _ in range(epochs):\n        for xi, yi in zip(X, y):\n            z = sum(wj * xj for wj, xj in zip(w, xi)) + b\n            yhat = 1 if z > 0 else 0\n            err = yi - yhat\n            w = [wj + lr * err * xj for wj, xj in zip(w, xi)]\n            b += lr * err\n    return w, b\n\ndef xor_mlp(x1, x2):\n    h1 = max(0, x1 + x2)\n    h2 = max(0, x1 + x2 - 1)\n    return h1 - 2 * h2\n\ndef count_params(sizes):\n    return sum(a * b + b for a, b in zip(sizes[:-1], sizes[1:]))",
  "hints": ["The error `y - y_hat` is 0 when the prediction is right, so applying the update unconditionally is equivalent.", "`count_params([784, 128, 10])` is the sum over consecutive pairs (a, b) of `a*b + b`."]
}
```

> [!TIP] Interview tips
> - Say "depth without non-linearity collapses to one linear map" and "XOR needs a hidden layer".
> - Mention universal approximation, then immediately note it does not guarantee learnability or efficiency.
> - Know that perceptron convergence needs linear separability; logistic regression is the smooth, probabilistic version.
