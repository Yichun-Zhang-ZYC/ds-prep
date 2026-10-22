---
id: mlops-model-servers
title: "Model servers (TorchServe, Triton, BentoML)"
estimatedMinutes: 12
difficulty: hard
tags: [mlops, serving, triton, torchserve, bentoml, dynamic-batching]
---

## Why it matters
Plain FastAPI stops scaling when models are large, GPU-bound or latency-critical. Interviewers ask what a dedicated model server adds and how dynamic batching trades latency for throughput.

## Concept
A **model server** hosts one or many models behind a standard inference API and handles the hard parts: batching, concurrency, hardware use, model loading and versioning, metrics.

**What it gives you over a hand-rolled API**:
- **Dynamic batching**: queue requests briefly and run them as one batch, which raises GPU utilization and throughput. Controlled by `max_batch_size` and a **max queue delay** (wait budget).
- **Concurrent model instances** per GPU, **multi-model** hosting, model repository with versions, hot reload, health and Prometheus metrics, gRPC and HTTP.
- **Optimised runtimes**: TensorRT, ONNX Runtime, quantization, CUDA graphs.

**Common servers**:
- **NVIDIA Triton**: multi-framework (TensorRT, ONNX, PyTorch, TensorFlow, Python backend), dynamic and sequence batching, **ensembles** (pre/post-processing pipelines), model analyzer for tuning. Best for GPU throughput.
- **TorchServe**: PyTorch-native, `.mar` model archives with custom handlers, simple but less actively developed.
- **BentoML**: Python-first; define a *service* with decorators, package into a "Bento" and a Docker image; adaptive batching, easy for non-GPU or pipeline-style services.
- **TF Serving**, **KServe** (Kubernetes inference platform, autoscaling to zero, canary), **Ray Serve** (composition, autoscaling), **vLLM / TGI** for LLMs (continuous batching, paged KV cache).

**Dynamic batching trade-off**: a batch of size $b$ costs $t(b) = t_0 + c\,b$ (fixed overhead plus per-item cost), so throughput $b/t(b)$ rises with $b$ and saturates. But each request may wait up to the queue delay, so p50 latency grows. Choose `max_queue_delay` so that wait + compute stays inside the latency SLO.

**Choosing**: CPU, small models, or custom business logic: FastAPI or BentoML. GPU deep learning at scale: Triton (often behind KServe). LLMs: vLLM/TGI/TensorRT-LLM. Always load-test with realistic traffic.

## Worked example
A GPU model has $t(b) = 8 + 1\cdot b$ ms (8 ms fixed overhead, 1 ms per item).

- Batch of 1: 9 ms per request, throughput $1/9\text{ ms} \approx 111$ req/s.
- Batch of 16: $t = 24$ ms, throughput $16/24\text{ ms} \approx 667$ req/s, **6x higher**.

With max queue delay 5 ms, a request waits at most 5 ms and then 24 ms of compute, so worst-case latency is about 29 ms. If the SLO is 50 ms, this is a good setting; at 100 req/s traffic the queue rarely fills 16, so batches close by timeout, and you pay up to 5 ms for a modest gain. The benefit grows with traffic.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does raising the max queue delay in dynamic batching typically do?",
  "options": ["Lowers throughput and latency", "Raises batch sizes and throughput but adds waiting time", "Changes model accuracy", "Disables batching"],
  "answer": 1,
  "explanation": "A longer wait collects bigger batches (more throughput) at the cost of extra queueing latency."
}
```

```quiz
{
  "id": "q2",
  "question": "Which server is the best fit for high-throughput GPU inference with TensorRT/ONNX models and ensembles?",
  "options": ["A single-threaded Flask app", "NVIDIA Triton Inference Server", "A cron job", "A Jupyter notebook"],
  "answer": 1,
  "explanation": "Triton is built for multi-framework GPU serving with dynamic batching and ensembles."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Simulate dynamic batching. `form_batches(arrivals, max_batch, max_wait)`: `arrivals` is a sorted list of request arrival times in ms. A batch opens at its first request's arrival `t0`; it accepts requests arriving up to and including `t0 + max_wait`, and closes (dispatches) as soon as it has `max_batch` requests, at the arrival time of the last one; otherwise it dispatches at `t0 + max_wait`. Return a list of `(dispatch_time, [request_indices])`. Then `throughput(b, fixed_ms, per_item_ms)` returns requests per second for a batch of size `b` with cost `fixed + per_item * b` ms.",
  "starterCode": "def form_batches(arrivals, max_batch, max_wait):\n    pass\n\ndef throughput(b, fixed_ms, per_item_ms):\n    pass\n",
  "tests": "arr = [0, 2, 3, 10, 11, 30]\nassert form_batches(arr, 3, 5) == [(3, [0, 1, 2]), (15, [3, 4]), (35, [5])]\nassert form_batches(arr, 1, 5) == [(0, [0]), (2, [1]), (3, [2]), (10, [3]), (11, [4]), (30, [5])]\nassert form_batches([], 4, 5) == []\nassert form_batches([0, 5, 6], 8, 5) == [(5, [0, 1]), (11, [2])]\nassert abs(throughput(1, 8, 1) - 1000 / 9) < 1e-9\nassert abs(throughput(16, 8, 1) - 16000 / 24) < 1e-9\nassert throughput(16, 8, 1) / throughput(1, 8, 1) > 5.9",
  "solution": "def form_batches(arrivals, max_batch, max_wait):\n    out = []\n    i, n = 0, len(arrivals)\n    while i < n:\n        t0 = arrivals[i]\n        idx = [i]\n        j = i + 1\n        while j < n and len(idx) < max_batch and arrivals[j] <= t0 + max_wait:\n            idx.append(j)\n            j += 1\n        dispatch = arrivals[idx[-1]] if len(idx) == max_batch else t0 + max_wait\n        out.append((dispatch, idx))\n        i = j\n    return out\n\ndef throughput(b, fixed_ms, per_item_ms):\n    return b / (fixed_ms + per_item_ms * b) * 1000",
  "hints": ["Outer loop starts a batch at the first unassigned request; the inner loop absorbs requests while time <= t0 + max_wait and the batch is not full.", "Throughput = b / (fixed + per_item * b) * 1000."]
}
```

> [!TIP] Interview tips
> - Explain dynamic batching with the $t_0 + c\,b$ cost model and the latency/throughput trade-off, tuned against the SLO.
> - Match tool to need: BentoML/FastAPI for simple or CPU services, Triton for GPU throughput, vLLM/TGI for LLMs, KServe for Kubernetes rollout.
> - Pitfall: tuning on synthetic uniform traffic; bursty real traffic changes batch fill and tail latency, so load-test realistically.
