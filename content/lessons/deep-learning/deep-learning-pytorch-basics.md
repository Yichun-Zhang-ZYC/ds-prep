---
id: deep-learning-pytorch-basics
title: "PyTorch basics (tensor, autograd, Dataset / DataLoader, training loop)"
estimatedMinutes: 14
difficulty: medium
tags: [deep-learning, pytorch, autograd, training-loop]
---

## Why it matters
PyTorch is the default framework for DL work, and interviews often include "write a training loop" or "what does `loss.backward()` do". Knowing the five-line loop, why you call `zero_grad()`, and how autograd builds a graph separates users from people who understand it.

## Concept
**Tensors** are n-d arrays with a dtype, a device (CPU/GPU) and an optional gradient history.

```python
import torch
x = torch.tensor([[1., 2.], [3., 4.]])      # float32 by default
y = x @ x.T + 1                              # matmul, broadcasting
x.shape, x.dtype, x.device
x = x.to("cuda" if torch.cuda.is_available() else "cpu")
x.view(4), x.reshape(2, 2), x.T              # view shares memory
```

**Autograd** records operations on tensors with `requires_grad=True` into a dynamic computation graph (built on the fly each forward pass). `loss.backward()` walks it in reverse topological order applying the chain rule and **accumulates** into `.grad` of every leaf.

```python
w = torch.tensor(3.0, requires_grad=True)
loss = (w * 2 - 6) ** 2
loss.backward()          # w.grad = 2 * (w*2 - 6) * 2 = 0
with torch.no_grad():    # no graph: inference / manual updates
    w -= 0.1 * w.grad
w.grad.zero_()           # grads accumulate, so reset every step
```

**Dataset / DataLoader**: a `Dataset` implements `__len__` and `__getitem__`; a `DataLoader` batches, shuffles and loads in parallel (`num_workers`), calling `collate_fn` to stack samples (custom `collate_fn` to pad variable-length sequences).

```python
from torch.utils.data import Dataset, DataLoader
class DS(Dataset):
    def __init__(self, X, y): self.X, self.y = X, y
    def __len__(self): return len(self.X)
    def __getitem__(self, i): return self.X[i], self.y[i]
loader = DataLoader(DS(X, y), batch_size=32, shuffle=True)
```

**The training loop**: forward, loss, zero grads, backward, step.

```python
model = torch.nn.Sequential(torch.nn.Linear(10, 32), torch.nn.ReLU(), torch.nn.Linear(32, 1))
opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
loss_fn = torch.nn.BCEWithLogitsLoss()
for epoch in range(10):
    model.train()
    for xb, yb in loader:
        opt.zero_grad()                       # clear old grads
        loss = loss_fn(model(xb).squeeze(-1), yb)
        loss.backward()                       # compute grads
        opt.step()                            # update params
    model.eval()
    with torch.no_grad():                     # validation
        ...
```

**Gotchas**: `model.train()` vs `model.eval()` toggles dropout and BatchNorm behavior; `torch.no_grad()` / `inference_mode()` saves memory at eval; `loss.item()` (not `loss`) when logging, otherwise you keep the graph alive; `BCEWithLogitsLoss` and `CrossEntropyLoss` take raw logits (not sigmoid/softmax outputs); move model and data to the same device; set seeds for reproducibility; with an LR scheduler, call `scheduler.step()` after `optimizer.step()`.

## Worked example
Take $e = x\,w + x$ with $x = 2$, $w = -3$.

Forward: $c = x w = -6$, $e = c + x = -4$.

Backward, seeding $\partial e/\partial e = 1$:
- Through the add: $\partial e/\partial c = 1$ and a direct $\partial e/\partial x = 1$.
- Through the mul: $\partial c/\partial x = w = -3$, $\partial c/\partial w = x = 2$.
- $x$ is used twice, so its gradients **sum**: $\partial e/\partial x = 1 + (-3) = -2$. And $\partial e/\partial w = 2$.

This is exactly what `.grad` accumulation does, and why you must zero gradients between steps.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What happens if you omit optimizer.zero_grad() in the training loop?",
  "options": ["Nothing, PyTorch resets automatically", "Gradients accumulate across batches, producing wrong updates", "Training becomes deterministic", "The model switches to eval mode"],
  "answer": 1,
  "explanation": "backward() adds into .grad. Without zeroing, each step uses the sum of all previous batches' gradients."
}
```

```quiz
{
  "id": "q2",
  "question": "Your classifier uses nn.CrossEntropyLoss. What should the model's last layer output?",
  "options": ["Softmax probabilities", "Raw logits", "Sigmoid outputs", "Argmax class ids"],
  "answer": 1,
  "explanation": "CrossEntropyLoss applies log-softmax internally, so feed it logits. Adding softmax first hurts numerical stability and gradients."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "The real library cannot run here, so build the core idea: a scalar autograd `Value`. Implement `__add__`, `__mul__` (accepting Value or number), `relu`, and `backward()` which seeds the output grad with 1 and applies the chain rule in reverse topological order, accumulating into `.grad`.",
  "starterCode": "class Value:\n    def __init__(self, data, children=()):\n        self.data = float(data)\n        self.grad = 0.0\n        self._prev = children\n        self._backward = lambda: None\n\n    def __add__(self, other):\n        pass\n\n    def __mul__(self, other):\n        pass\n\n    def relu(self):\n        pass\n\n    def backward(self):\n        pass\n\nx, w = Value(2), Value(-3)\ne = x * w + x\ne.backward()\nprint(e.data, x.grad, w.grad)",
  "tests": "x, w = Value(2), Value(-3)\ne = x * w + x\ne.backward()\nassert e.data == -4 and x.grad == -2 and w.grad == 2\na = Value(3.0)\nb = a * a\nb.backward()\nassert b.data == 9 and a.grad == 6\nu, v = Value(1.5), Value(2.0)\nr = (u * v + Value(-5)).relu()\nr.backward()\nassert r.data == 0 and u.grad == 0 and v.grad == 0\np = (Value(2) * 3 + 1).relu()\np.backward()\nassert p.data == 7\nw = Value(0.0)\nfor _ in range(60):\n    w.grad = 0.0\n    d = w * 2 + Value(-6)\n    loss = d * d\n    loss.backward()\n    w.data -= 0.05 * w.grad\nassert abs(w.data - 3.0) < 1e-3",
  "solution": "class Value:\n    def __init__(self, data, children=()):\n        self.data = float(data)\n        self.grad = 0.0\n        self._prev = children\n        self._backward = lambda: None\n\n    def __add__(self, other):\n        other = other if isinstance(other, Value) else Value(other)\n        out = Value(self.data + other.data, (self, other))\n        def _backward():\n            self.grad += out.grad\n            other.grad += out.grad\n        out._backward = _backward\n        return out\n\n    def __mul__(self, other):\n        other = other if isinstance(other, Value) else Value(other)\n        out = Value(self.data * other.data, (self, other))\n        def _backward():\n            self.grad += other.data * out.grad\n            other.grad += self.data * out.grad\n        out._backward = _backward\n        return out\n\n    def relu(self):\n        out = Value(max(0.0, self.data), (self,))\n        def _backward():\n            self.grad += (1.0 if self.data > 0 else 0.0) * out.grad\n        out._backward = _backward\n        return out\n\n    def backward(self):\n        topo, seen = [], set()\n        def build(v):\n            if id(v) not in seen:\n                seen.add(id(v))\n                for c in v._prev:\n                    build(c)\n                topo.append(v)\n        build(self)\n        self.grad = 1.0\n        for v in reversed(topo):\n            v._backward()",
  "hints": ["Each op creates `out` and defines a closure that adds (local derivative * out.grad) into each input's grad, using +=.", "Build a topological order with DFS, then call _backward on nodes in reverse."]
}
```

> [!TIP] Interview tips
> - Recite the loop: `zero_grad`, forward, loss, `backward`, `step`; explain that gradients accumulate.
> - Know `train()` vs `eval()`, `no_grad()`, and that losses take logits.
> - Describe autograd as a dynamic graph traversed in reverse with the chain rule; a variable used twice sums its gradients.
