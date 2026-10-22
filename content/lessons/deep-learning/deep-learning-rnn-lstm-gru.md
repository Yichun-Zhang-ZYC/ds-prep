---
id: deep-learning-rnn-lstm-gru
title: RNN, LSTM, GRU
estimatedMinutes: 14
difficulty: medium
tags: [deep-learning, rnn, sequence-models]
---

## Why it matters
Recurrent nets were the standard for sequences before transformers, and interviewers still ask why vanilla RNNs forget, how LSTM gates fix it, and how GRU differs.

## Concept
A **vanilla RNN** reuses the same weights at every step and carries a hidden state:
$$h_t = \tanh(W_h h_{t-1} + W_x x_t + b)$$
Training uses **backpropagation through time (BPTT)**: unroll the loop and backprop through every step (often truncated to a window for cost).

**The problem**: $\partial h_T/\partial h_t$ is a product of $T - t$ Jacobians, each $\approx W_h^\top \text{diag}(\tanh')$. If the largest singular value is below 1 the product **vanishes** (can't learn long-range dependencies); above 1 it **explodes** (fix with gradient clipping).

**LSTM** adds a **cell state** $c_t$ with additive updates and three gates ($\sigma$ outputs in $(0,1)$):
$$f_t = \sigma(\cdot),\ i_t = \sigma(\cdot),\ o_t = \sigma(\cdot),\ \tilde c_t = \tanh(\cdot)$$
$$c_t = f_t \odot c_{t-1} + i_t \odot \tilde c_t, \qquad h_t = o_t \odot \tanh(c_t)$$
Each gate has the form $W x_t + U h_{t-1} + b$. Because $\partial c_t/\partial c_{t-1} = f_t$ (no repeated squashing matrix), gradients can flow across many steps when the forget gate is near 1. Initialize the forget bias to about 1. **Parameters**: $4\,(H(H + D) + H)$ for hidden size $H$, input size $D$.

**GRU** merges cell and hidden state with two gates, update $z_t$ and reset $r_t$: $h_t = (1 - z_t) \odot h_{t-1} + z_t \odot \tilde h_t$ with $\tilde h_t = \tanh(W x_t + U(r_t \odot h_{t-1}) + b)$. It has 3 weight blocks instead of 4 (about 25% fewer parameters), trains faster and often matches LSTM accuracy.

**Practicalities**: bidirectional RNNs read both directions (not for generation); stack layers with dropout between them; pad and pack variable-length batches. **Why transformers won**: RNNs are sequential (no parallelism across time), and long-range signal still degrades; attention connects any two positions in one step.

## Worked example
**Vanishing**: scalar RNN $h_t = \tanh(0.5\,h_{t-1} + x_t)$, $h_0 = 0$, inputs $x = (1, 0)$.

$h_1 = \tanh(1) = 0.762$; $h_2 = \tanh(0.5 \cdot 0.762) = \tanh(0.381) = 0.363$. The influence of $x_1$ on $h_t$ shrinks by a factor $0.5\,\tanh' \le 0.5$ each step; after 20 steps $\le 0.5^{20} \approx 10^{-6}$.

**LSTM parameter count**: $D = 128$, $H = 256$: $4\,(256 \cdot (256 + 128) + 256) = 4 \cdot 98{,}560 = 394{,}240$. A GRU with the same sizes has $\tfrac34$ of that: $295{,}680$.

**One LSTM step**, all pre-activations 0: every gate is $\sigma(0) = 0.5$ and $\tilde c = \tanh(0) = 0$. With $c_{t-1} = 1$: $c_t = 0.5\cdot1 + 0.5\cdot0 = 0.5$, $h_t = 0.5\,\tanh(0.5) = 0.231$.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does the LSTM cell state help with long-range dependencies?",
  "options": [
    "Its update is additive, $c_t = f_t \\odot c_{t-1} + \\dots$, so gradients can pass through with only the forget gate as a factor",
    "It uses ReLU instead of tanh",
    "It has more parameters than an RNN",
    "It removes the need for BPTT"
  ],
  "answer": 0,
  "explanation": "$\\partial c_t / \\partial c_{t-1} = f_t$. With $f_t \\approx 1$, gradients are preserved instead of repeatedly multiplied by a weight matrix and squashed."
}
```

```quiz
{
  "id": "q2",
  "question": "Compared with an LSTM of the same hidden size, a GRU has:",
  "options": [
    "More gates and more parameters",
    "No gates at all",
    "Fewer parameters (3 weight blocks instead of 4) and no separate cell state",
    "The same number of parameters but a separate memory cell"
  ],
  "answer": 2,
  "explanation": "A GRU has update and reset gates and merges cell and hidden state, giving 3H(H+D+1) parameters versus 4H(H+D+1) for an LSTM (single-bias convention)."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Write `lstm_step(x, h, c, W, U, b)` for one example. `W` has shape (4H, D), `U` has shape (4H, H), `b` has shape (4H,). Compute `z = W @ x + U @ h + b` and split it into four H-sized blocks in the order input `i`, forget `f`, candidate `g`, output `o`. Apply sigmoid to i, f, o and tanh to g. Return `(h_new, c_new)`. Also write `lstm_param_count(d, h)` for the single-bias convention.",
  "setup": "import numpy as np",
  "packages": [
    "numpy"
  ],
  "starterCode": "import numpy as np\n\ndef lstm_step(x, h, c, W, U, b):\n    pass\n\ndef lstm_param_count(d, h):\n    pass\n\nH, D = 2, 3\nh1, c1 = lstm_step(np.ones(D), np.zeros(H), np.array([1.0, -2.0]), np.zeros((4 * H, D)), np.zeros((4 * H, H)), np.zeros(4 * H))\nprint(h1, c1, lstm_param_count(128, 256))",
  "tests": "H, D = 2, 3\nW0, U0, b0 = np.zeros((4 * H, D)), np.zeros((4 * H, H)), np.zeros(4 * H)\nc = np.array([1.0, -2.0])\nh1, c1 = lstm_step(np.ones(D), np.zeros(H), c, W0, U0, b0)\nassert np.allclose(c1, 0.5 * c)\nassert np.allclose(h1, 0.5 * np.tanh(0.5 * c))\nb = np.concatenate([-20 * np.ones(H), 20 * np.ones(H), np.zeros(H), np.zeros(H)])\nh2, c2 = lstm_step(np.ones(D), np.zeros(H), c, W0, U0, b)\nassert np.allclose(c2, c, atol=1e-6)\nassert np.allclose(h2, 0.5 * np.tanh(c), atol=1e-6)\nassert lstm_param_count(128, 256) == 394240",
  "solution": "import numpy as np\n\ndef sigmoid(z):\n    return 1.0 / (1.0 + np.exp(-z))\n\ndef lstm_step(x, h, c, W, U, b):\n    z = W @ x + U @ h + b\n    i, f, g, o = np.split(z, 4)\n    i, f, o = sigmoid(i), sigmoid(f), sigmoid(o)\n    g = np.tanh(g)\n    c_new = f * c + i * g\n    h_new = o * np.tanh(c_new)\n    return h_new, c_new\n\ndef lstm_param_count(d, h):\n    return 4 * (h * (h + d) + h)",
  "hints": [
    "`i, f, g, o = np.split(z, 4)`.",
    "c_new = f * c + i * g; h_new = o * np.tanh(c_new)."
  ]
}
```

> [!TIP] Interview tips
> - Explain vanishing gradients as a product of Jacobians over time, and LSTM's additive cell path as the fix.
> - Know the gate equations and the parameter count formula $4(H(H+D)+H)$; GRU is about 3/4 of that.
> - Contrast with transformers: RNNs are sequential and weaker on long range, but constant memory per step at inference.
