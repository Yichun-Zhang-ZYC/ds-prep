---
id: deep-learning-forward-and-backpropagation
title: 前向传播与反向传播
---

## 为什么重要
反向传播是所有神经网络的训练方式，“推导两层网络的梯度”是经典的白板题。它本质上就是链式法则，只不过通过组织让每个中间结果都得以复用。

## 概念
**前向传播**：计算并*缓存*每层的预激活值和激活值：$z^{(l)} = W^{(l)} h^{(l-1)} + b^{(l)}$，$h^{(l)} = \phi(z^{(l)})$，然后计算损失 $L$。

**反向传播**（逆序），记 $\delta^{(l)} = \partial L / \partial z^{(l)}$：
- 输出层：$\delta^{(L)} = \partial L/\partial \hat y \odot \phi'(z^{(L)})$（对于 softmax + 交叉熵或 sigmoid + BCE，简化为 $\hat y - y$）。
- 隐藏层：$\delta^{(l)} = \big(W^{(l+1)\top}\delta^{(l+1)}\big) \odot \phi'(z^{(l)})$。
- 参数梯度：$\partial L/\partial W^{(l)} = \delta^{(l)} h^{(l-1)\top}$，$\ \partial L/\partial b^{(l)} = \delta^{(l)}$（对 batch 求和）。

实践中的意义：
- **成本**：反向传播的成本约为前向的 2 倍；总训练 FLOPs 大约是前向的 3 倍。这比数值微分便宜得多，后者每个参数都需要一次前向传播。
- **内存**：反向传播需要保存激活值，所以激活内存随 batch 大小和深度增长。**梯度检查点**通过重新计算激活值来用计算换内存。
- **自动微分**框架（PyTorch、JAX）构建计算图并应用反向模式微分：一次反向传播就能得到标量损失对所有参数的梯度。
- 逐层重复出现的因子 $\phi'(z)$ 和 $W^\top$ 是梯度消失/爆炸的来源。
- **梯度检查**：与 $(L(\theta+\epsilon) - L(\theta-\epsilon))/2\epsilon$ 比较，可用来调试手写的反向传播。

## 示例讲解
微型网络，全部为标量：$z_1 = w_1 x + b_1$，$h = \text{relu}(z_1)$，$\hat y = w_2 h + b_2$，损失 $L = \tfrac12(\hat y - y)^2$。

取 $x=2,\ w_1=0.5,\ b_1=0,\ w_2=3,\ b_2=1,\ y=5$。

**前向**：$z_1 = 1$，$h = 1$，$\hat y = 3\cdot1 + 1 = 4$，$L = \tfrac12(4-5)^2 = 0.5$。

**反向**：
- $\partial L/\partial \hat y = \hat y - y = -1$
- $\partial L/\partial w_2 = -1 \cdot h = -1$，$\ \partial L/\partial b_2 = -1$
- $\partial L/\partial h = -1 \cdot w_2 = -3$
- $\partial L/\partial z_1 = -3 \cdot \mathbb 1[z_1>0] = -3$
- $\partial L/\partial w_1 = -3 \cdot x = -6$，$\ \partial L/\partial b_1 = -3$

用 $\eta = 0.1$ 做一步 SGD：$w_1 = 0.5 + 0.6 = 1.1$，$w_2 = 3.1$，$b_1 = 0.3$，$b_2 = 1.1$。新的前向：$z_1 = 2.2 + 0.3 = 2.5$，$\hat y = 3.1 \cdot 2.5 + 1.1 = 8.85$——过冲了（损失 7.4）！步长太大；这就是学习率重要的原因。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么反向传播计算梯度比有限差分便宜得多？",
  "options": ["它使用了更好的优化器", "它忽略较小的权重", "它通过链式法则复用中间结果，大约一次反向传播就得到所有梯度", "它只计算最后一层的梯度"],
  "explanation": "反向模式自动微分用大约 2 倍前向的成本就能得到标量损失对所有参数的梯度；有限差分则每个参数都需要一次前向传播。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于隐藏层 $l$，哪个表达式给出 $\\delta^{(l)} = \\partial L/\\partial z^{(l)}$？",
  "options": ["$W^{(l)}\\delta^{(l+1)}$", "$(W^{(l+1)\\top}\\delta^{(l+1)}) \\odot \\phi'(z^{(l)})$", "$\\delta^{(l+1)} \\odot h^{(l-1)}$", "$\\phi(z^{(l)})\\,\\delta^{(l+1)}$"],
  "explanation": "把下一层的误差通过转置权重传回来，再逐元素乘以局部的激活函数导数。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "为单隐藏层网络实现 `forward_backward(X, y, W1, b1, W2, b2)`：`H = tanh(X @ W1 + b1)`，`yhat = H @ W2 + b2`（`W2` 形状为 `(h,)`，`b2` 是标量），损失为 `0.5 * mean((yhat - y)**2)`。返回 `(loss, grads)`，其中 `grads` 是键为 `'W1', 'b1', 'W2', 'b2'` 的字典，形状与对应参数相同。",
  "hints": ["dL/dyhat = (yhat - y) / n。然后 dW2 = H.T @ dy，db2 = dy.sum()，dH = outer(dy, W2)。", "tanh'(z) = 1 - H**2，所以 dZ1 = dH * (1 - H**2)；dW1 = X.T @ dZ1，db1 = dZ1.sum(axis=0)。"]
}
```

> [!TIP] 面试技巧
> - 要能从零推导两层网络的情形：输出层的 delta、转置权重乘以 delta、逐元素乘激活导数。
> - 提到缓存激活值、内存成本和梯度检查点。
> - 要知道梯度检查（有限差分）是调试自定义反向传播的标准方法。
