---
id: deep-learning-graph-neural-networks
title: Graph neural networks
estimatedMinutes: 12
difficulty: hard
tags: [deep-learning, gnn, graphs]
---

## Why it matters
Data such as social networks, molecules, road maps and user-item interactions is a graph, not a grid or a sequence. Interviewers ask how message passing works, what a GCN layer computes, and why deep GNNs fail (over-smoothing).

## Concept
A graph has nodes with features $X \in \mathbb{R}^{n \times d}$ and edges given by an adjacency matrix $A$. A GNN builds node representations by **message passing**: each layer lets a node aggregate its neighbours' vectors, then updates its own.
$$h_v^{(k+1)} = \text{UPDATE}\Big(h_v^{(k)},\ \text{AGG}\big(\{h_u^{(k)} : u \in \mathcal{N}(v)\}\big)\Big)$$
After $k$ layers a node sees its **$k$-hop neighbourhood** (its receptive field).

- **GCN** (Kipf & Welling): $H' = \sigma(\hat A H W)$ with $\hat A = \tilde D^{-1/2}(A + I)\tilde D^{-1/2}$. Self-loops keep a node's own signal; symmetric normalisation stops high-degree nodes from dominating.
- **GraphSAGE**: sample a fixed number of neighbours, aggregate (mean, max or LSTM), concatenate with the node's own vector. Sampling makes it **inductive** and scalable to huge graphs.
- **GAT**: learn attention weights $\alpha_{vu}$ over neighbours, so some neighbours matter more than others.
- **Permutation invariance**: the aggregator must be order-independent (sum, mean, max), because neighbours have no order. Sum is strictly more expressive than mean or max (it sees multiset sizes); this is the idea behind GIN and its link to the Weisfeiler-Lehman test.
- **Tasks**: node classification (a label per node), link prediction (score pairs of node embeddings, e.g. dot product), graph classification (a **readout** such as sum or mean pooling over nodes, then an MLP).
- **Pitfalls**: **over-smoothing** (many layers make all node vectors converge; use 2 to 4 layers, residual connections or skip links), **over-squashing** (long-range information is compressed through bottleneck edges), neighbourhood explosion in mini-batching (fix with sampling), and **transductive leakage** (test nodes' features and edges are visible during training, which is acceptable only if the task allows it).
- GNNs only help when edges carry signal beyond the node features; compare against an MLP baseline first.

## Worked example
Path graph $0 - 1 - 2$ with scalar features $h = (1, 2, 3)$. Use mean aggregation over the node and its neighbours (self-loop included):

- node 0: $(1 + 2)/2 = 1.5$
- node 1: $(1 + 2 + 3)/3 = 2$
- node 2: $(2 + 3)/2 = 2.5$

After layer 1: $(1.5, 2, 2.5)$. After layer 2, node 0 becomes $(1.5 + 2)/2 = 1.75$ and node 2 becomes $2.25$, so it now carries information from node 2 (two hops away). The spread shrinks from $2$ to $0.5$. Repeat many times and all three values converge to the same number: that is over-smoothing in miniature.

For the symmetric GCN normalisation, degrees with self-loops are $(2, 3, 2)$, so node 0 receives $\tfrac12 \cdot 1 + \tfrac{1}{\sqrt 6} \cdot 2 \approx 1.316$ before the weight matrix and nonlinearity.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why do GNNs typically use only 2 to 4 layers?",
  "options": [
    "Each layer doubles the number of parameters",
    "More layers make node representations converge to similar values (over-smoothing) and enlarge neighbourhoods exponentially",
    "Adjacency matrices cannot be multiplied more than four times",
    "Backpropagation does not work through graphs"
  ],
  "answer": 1,
  "explanation": "Repeated neighbourhood averaging acts like a low-pass filter, so node embeddings become indistinguishable. Receptive fields also grow quickly, causing neighbourhood explosion and over-squashing."
}
```

```quiz
{
  "id": "q2",
  "question": "What makes GraphSAGE an inductive method?",
  "options": [
    "It uses no node features",
    "It trains a separate embedding per node",
    "It learns aggregator functions over sampled neighbours, so it can embed nodes unseen during training",
    "It only works on directed graphs"
  ],
  "answer": 2,
  "explanation": "GraphSAGE learns parameters of the aggregator rather than a lookup table of node embeddings, so new nodes can be embedded from their features and neighbours."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement message passing with numpy. `mean_agg(A, H)`: add self-loops to adjacency `A` (n, n), then return the row-normalised average of `H` (n, d) over each node and its neighbours. `gcn_layer(A, H, W)`: compute `relu(Ahat @ H @ W)` where `Ahat = D^-1/2 (A + I) D^-1/2` using degrees of `A + I`.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef mean_agg(A, H):\n    pass\n\ndef gcn_layer(A, H, W):\n    pass\n\nA = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]], dtype=float)\nH = np.array([[1.0], [2.0], [3.0]])\nprint(mean_agg(A, H).ravel(), gcn_layer(A, H, np.array([[1.0]])).ravel())",
  "tests": "A = np.array([[0, 1, 0], [1, 0, 1], [0, 1, 0]], dtype=float)\nH = np.array([[1.0], [2.0], [3.0]])\nm = mean_agg(A, H)\nassert np.allclose(m.ravel(), [1.5, 2.0, 2.5])\ng = gcn_layer(A, H, np.array([[1.0]]))\nassert abs(g[0, 0] - (0.5 + 2 / np.sqrt(6))) < 1e-9\nassert abs(g[1, 0] - (1 / np.sqrt(6) + 2 / 3 + 3 / np.sqrt(6))) < 1e-9\nassert np.all(gcn_layer(A, H, np.array([[-1.0]])) == 0)\nx = H.copy()\nfor _ in range(60):\n    x = mean_agg(A, x)\nassert x.max() - x.min() < 1e-3\nassert abs(mean_agg(A, mean_agg(A, H))[0, 0] - 1.75) < 1e-12",
  "solution": "import numpy as np\n\ndef mean_agg(A, H):\n    At = A + np.eye(len(A))\n    return (At / At.sum(axis=1, keepdims=True)) @ H\n\ndef gcn_layer(A, H, W):\n    At = A + np.eye(len(A))\n    dinv = 1.0 / np.sqrt(At.sum(axis=1))\n    Ahat = dinv[:, None] * At * dinv[None, :]\n    return np.maximum(Ahat @ H @ W, 0)",
  "hints": [
    "`A + np.eye(n)` adds self-loops; the row sums are the degrees.",
    "Symmetric normalisation: `Ahat[i, j] = At[i, j] / sqrt(d_i d_j)`; use broadcasting with a 1-D vector of inverse square-root degrees.",
    "Applying `mean_agg` repeatedly shrinks the spread between nodes: over-smoothing."
  ]
}
```

> [!TIP] Interview tips
> - Define message passing in one sentence: aggregate neighbours with a permutation-invariant function, then update. Say what $k$ layers means ($k$-hop receptive field).
> - Know GCN vs GraphSAGE vs GAT and the transductive vs inductive distinction.
> - Raise over-smoothing and why GNNs are shallow, unlike CNNs or transformers; mention that a transformer over a fully connected graph is a GNN with attention.
