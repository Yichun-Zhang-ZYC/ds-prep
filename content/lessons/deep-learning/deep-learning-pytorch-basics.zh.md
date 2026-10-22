---
id: deep-learning-pytorch-basics
title: "PyTorch 基础（张量、autograd、Dataset / DataLoader、训练循环）"
---

## 为什么重要
PyTorch 是深度学习工作的默认框架，面试常出现“写一个训练循环”或“`loss.backward()` 做了什么”。知道那五行循环、为什么要调用 `zero_grad()`，以及 autograd 如何构建计算图，能把只会调用的人和真正理解的人区分开。

## 概念
**张量**是带有 dtype、设备（CPU/GPU）和可选梯度历史的 n 维数组。

```python
import torch
x = torch.tensor([[1., 2.], [3., 4.]])      # float32 by default
y = x @ x.T + 1                              # matmul, broadcasting
x.shape, x.dtype, x.device
x = x.to("cuda" if torch.cuda.is_available() else "cpu")
x.view(4), x.reshape(2, 2), x.T              # view shares memory
```

**Autograd** 把对 `requires_grad=True` 的张量的操作记录到动态计算图中（每次前向传播时即时构建）。`loss.backward()` 按反向拓扑顺序遍历该图并应用链式法则，把结果**累加**到每个叶子节点的 `.grad` 中。

```python
w = torch.tensor(3.0, requires_grad=True)
loss = (w * 2 - 6) ** 2
loss.backward()          # w.grad = 2 * (w*2 - 6) * 2 = 0
with torch.no_grad():    # no graph: inference / manual updates
    w -= 0.1 * w.grad
w.grad.zero_()           # grads accumulate, so reset every step
```

**Dataset / DataLoader**：`Dataset` 实现 `__len__` 和 `__getitem__`；`DataLoader` 负责分批、打乱并并行加载（`num_workers`），通过 `collate_fn` 把样本堆叠起来（可自定义 `collate_fn` 来填充变长序列）。

```python
from torch.utils.data import Dataset, DataLoader
class DS(Dataset):
    def __init__(self, X, y): self.X, self.y = X, y
    def __len__(self): return len(self.X)
    def __getitem__(self, i): return self.X[i], self.y[i]
loader = DataLoader(DS(X, y), batch_size=32, shuffle=True)
```

**训练循环**：前向、损失、清零梯度、反向、更新。

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

**常见陷阱**：`model.train()` 与 `model.eval()` 会切换 dropout 和 BatchNorm 的行为；评估时 `torch.no_grad()` / `inference_mode()` 可省显存；记录日志时用 `loss.item()`（而不是 `loss`），否则计算图会一直保留；`BCEWithLogitsLoss` 和 `CrossEntropyLoss` 接收原始 logits（而不是 sigmoid/softmax 的输出）；模型和数据要放在同一设备上；设置随机种子以便复现；使用学习率调度器时，在 `optimizer.step()` 之后调用 `scheduler.step()`。

## 示例讲解
取 $e = x\,w + x$，其中 $x = 2$，$w = -3$。

前向：$c = x w = -6$，$e = c + x = -4$。

反向，从 $\partial e/\partial e = 1$ 开始：
- 经过加法：$\partial e/\partial c = 1$，且直接有 $\partial e/\partial x = 1$。
- 经过乘法：$\partial c/\partial x = w = -3$，$\partial c/\partial w = x = 2$。
- $x$ 被使用了两次，所以它的梯度要**相加**：$\partial e/\partial x = 1 + (-3) = -2$。而 $\partial e/\partial w = 2$。

这正是 `.grad` 累加所做的事，也是为什么每一步之间必须清零梯度。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "如果在训练循环中省略 optimizer.zero_grad() 会发生什么？",
  "options": ["什么都不会发生，PyTorch 会自动重置", "梯度在各个 batch 之间累加，导致错误的更新", "训练变得确定性", "模型切换到 eval 模式"],
  "explanation": "backward() 是把梯度加到 .grad 上。不清零的话，每一步用的是之前所有 batch 梯度的总和。"
}
```

```quiz
{
  "id": "q2",
  "question": "你的分类器使用 nn.CrossEntropyLoss。模型最后一层应该输出什么？",
  "options": ["Softmax 概率", "原始 logits", "Sigmoid 输出", "argmax 类别 id"],
  "explanation": "CrossEntropyLoss 内部会做 log-softmax，所以应传入 logits。先加 softmax 会损害数值稳定性和梯度。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "真正的库无法在这里运行，所以我们实现其核心思想：标量 autograd `Value`。实现 `__add__`、`__mul__`（接受 Value 或数字）、`relu`，以及 `backward()`：把输出梯度设为 1，按反向拓扑顺序应用链式法则，并累加到 `.grad`。",
  "hints": ["每个运算创建 `out` 并定义一个闭包，用 += 把（局部导数 * out.grad）加到每个输入的 grad 上。", "用 DFS 构建拓扑顺序，然后按逆序对节点调用 _backward。"]
}
```

> [!TIP] 面试技巧
> - 背出循环：`zero_grad`、前向、损失、`backward`、`step`；并解释梯度会累加。
> - 了解 `train()` 与 `eval()`、`no_grad()`，以及损失函数接收的是 logits。
> - 把 autograd 描述为按链式法则反向遍历的动态图；被使用两次的变量，其梯度要相加。
