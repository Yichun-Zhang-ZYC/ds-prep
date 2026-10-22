---
id: mlops-model-servers
title: 模型服务器（TorchServe、Triton、BentoML）
---

## 为什么重要
当模型很大、依赖 GPU 或对延迟敏感时，普通 FastAPI 就扩展不动了。面试官会问专用模型服务器带来了什么，以及动态批处理如何在延迟和吞吐之间权衡。

## 概念
**模型服务器**在标准推理 API 之后托管一个或多个模型，并处理其中困难的部分：批处理、并发、硬件利用、模型加载与版本管理、指标。

**相比手写 API 的优势**：
- **动态批处理**：把请求短暂排队后作为一个批次运行，提高 GPU 利用率和吞吐。由 `max_batch_size` 和**最大排队延迟**（等待预算）控制。
- 每块 GPU 上的**多个并发模型实例**、**多模型**托管、带版本的模型仓库、热重载、健康检查和 Prometheus 指标、gRPC 和 HTTP。
- **优化的运行时**：TensorRT、ONNX Runtime、量化、CUDA graphs。

**常见的服务器**：
- **NVIDIA Triton**：多框架（TensorRT、ONNX、PyTorch、TensorFlow、Python backend），动态批处理和序列批处理，**ensemble**（前后处理流水线），带用于调优的 model analyzer。最适合 GPU 吞吐。
- **TorchServe**：PyTorch 原生，带自定义 handler 的 `.mar` 模型归档，简单但开发活跃度较低。
- **BentoML**：以 Python 为先；用装饰器定义*服务*，打包成 “Bento” 和 Docker 镜像；自适应批处理，适合非 GPU 或流水线式的服务。
- **TF Serving**、**KServe**（Kubernetes 推理平台，可缩容到零，支持 canary）、**Ray Serve**（组合、自动扩缩容），以及面向 LLM 的 **vLLM / TGI**（连续批处理、分页 KV cache）。

**动态批处理的权衡**：大小为 $b$ 的批次耗时 $t(b) = t_0 + c\,b$（固定开销加每项成本），所以吞吐 $b/t(b)$ 随 $b$ 增大而上升并趋于饱和。但每个请求可能要等待最长一个排队延迟，所以 p50 延迟会增加。选择 `max_queue_delay`，使等待时间加计算时间保持在延迟 SLO 之内。

**如何选择**：CPU、小模型或自定义业务逻辑：FastAPI 或 BentoML。大规模 GPU 深度学习：Triton（常置于 KServe 之后）。LLM：vLLM/TGI/TensorRT-LLM。始终用真实的流量做压测。

## 示例讲解
某 GPU 模型的耗时为 $t(b) = 8 + 1\cdot b$ ms（固定开销 8 ms，每项 1 ms）。

- 批大小 1：每个请求 9 ms，吞吐 $1/9\text{ ms} \approx 111$ req/s。
- 批大小 16：$t = 24$ ms，吞吐 $16/24\text{ ms} \approx 667$ req/s，**提高了 6 倍**。

最大排队延迟为 5 ms 时，请求最多等待 5 ms，再加 24 ms 计算，所以最坏延迟约 29 ms。如果 SLO 是 50 ms，这是个不错的设置；在 100 req/s 的流量下，队列很少能凑满 16 个，批次因超时而关闭，你要付出最多 5 ms 换取有限的收益。流量越大，收益越大。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "在动态批处理中，调大最大排队延迟通常会怎样？",
  "options": ["降低吞吐和延迟", "提高批大小和吞吐，但增加等待时间", "改变模型准确率", "禁用批处理"],
  "explanation": "等待更久能凑成更大的批次（吞吐更高），代价是额外的排队延迟。"
}
```

```quiz
{
  "id": "q2",
  "question": "对于使用 TensorRT/ONNX 模型和 ensemble 的高吞吐 GPU 推理，哪个服务器最合适？",
  "options": ["单线程 Flask 应用", "NVIDIA Triton Inference Server", "cron 作业", "Jupyter notebook"],
  "explanation": "Triton 专为带动态批处理和 ensemble 的多框架 GPU 服务而构建。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "模拟动态批处理。`form_batches(arrivals, max_batch, max_wait)`：`arrivals` 是按升序排列的请求到达时间（ms）列表。批次在其第一个请求的到达时间 `t0` 打开；接受到达时间不超过 `t0 + max_wait`（含）的请求，并在达到 `max_batch` 个请求时立即关闭（派发），派发时间为最后一个请求的到达时间；否则在 `t0 + max_wait` 派发。返回 `(dispatch_time, [request_indices])` 的列表。然后编写 `throughput(b, fixed_ms, per_item_ms)`，返回批大小为 `b`、耗时 `fixed + per_item * b` ms 时的每秒请求数。",
  "hints": ["外层循环处理批次的第一个请求，内层循环在 deadline 之内继续吸收请求，直到凑满 max_batch。", "吞吐 = b / (fixed + per_item * b) * 1000。"]
}
```

> [!TIP] 面试技巧
> - 用 $t_0 + c\,b$ 成本模型解释动态批处理，以及按 SLO 调节的延迟/吞吐权衡。
> - 按需求匹配工具：简单或 CPU 服务用 BentoML/FastAPI，GPU 吞吐用 Triton，LLM 用 vLLM/TGI，Kubernetes 发布用 KServe。
> - 陷阱：在合成的均匀流量上调参；真实的突发流量会改变批次填充度和尾延迟，所以要用真实流量压测。
