---
id: computer-vision-video-understanding
title: Video understanding
estimatedMinutes: 12
difficulty: medium
tags: [computer-vision, video, action-recognition, 3d-cnn, video-transformer]
---

## Why it matters
Video is images plus time, and the cost explodes: 16 frames of a ViT is 16 times the tokens and far more than 16 times the attention. Interviewers ask how you represent motion, how you sample frames under a compute budget and how video models relate to the image models you already know.

## Concept
**What is different about video**: a clip is $T \times H \times W \times 3$. Appearance usually carries most of the signal (a pool means swimming), but some classes need motion or order ("open" vs "close" a door). Data is huge, frames are highly redundant, and labels are weak (clip- or video-level).

**Model families**
- **Frame-level 2-D CNN + temporal pooling**: score sampled frames independently and average (TSN-style). Cheap, strong on appearance-biased benchmarks, blind to fine temporal order.
- **Two-stream**: an RGB stream plus an **optical-flow** stream (explicit motion) fused late. Flow computation is expensive and has been largely replaced by learned temporal modeling.
- **3-D CNNs**: spatio-temporal convolutions (C3D, **I3D** inflates 2-D ImageNet kernels to 3-D, R(2+1)D factorizes space and time, **SlowFast** runs a slow high-resolution pathway for semantics and a fast low-resolution pathway for motion).
- **Video transformers**: tokenize into space-time patches (tubelets). **Joint** space-time attention costs $O((TP)^2)$ for $P$ patches per frame; **divided** attention (TimeSformer) does spatial then temporal attention, costing about $TP^2 + PT^2$; ViViT uses factorized variants. **VideoMAE** pretrains by masking about 90% of tubelets and reconstructing, which works because video is redundant.
- **Video-language models**: sample frames, encode them with a ViT, compress tokens (pooling or a Q-Former/resampler) and feed them to an LLM for captioning and video QA. Token budget is the main design constraint, see *Vision transformers* and *CLIP and vision-language models*.

**Frame sampling** is the central practical choice: **uniform / segment-based** (split the video into $K$ segments, take one frame each, random offset in training and centre at test), dense consecutive clips (for motion), or adaptive keyframes. Test-time: average several clips and spatial crops ("multi-view"), which costs inference compute.

**Tasks and metrics**: action recognition (Kinetics; top-1/top-5 at clip and video level), **temporal action localization** (find start and end; mAP at temporal IoU thresholds, with temporal NMS to drop duplicates), spatio-temporal detection, tracking (see *Object detection*), captioning (CIDEr), video QA, retrieval (recall@K).

**Pitfalls**: scene or object **bias** (models classify the background), leakage between clips of the same source video across train/test splits, label noise, long videos exceeding memory (hierarchical or streaming models), and decoding being the real bottleneck (use GPU decoding and cache clips).

## Worked example
ViT-B/16 on 224x224 gives $P = (224/16)^2 = 196$ tokens per frame. With $T = 16$ frames and one-frame tokens, a joint model sees $3136$ tokens and $3136^2 = 9{,}834{,}496$ attention pairs per head per layer. Divided space-time attention costs $T P^2 + P T^2 = 16 \cdot 196^2 + 196 \cdot 16^2 = 614{,}656 + 50{,}176 = 664{,}832$ pairs, about $14.8\times$ fewer. Using tubelets of 2 frames halves tokens to 1568, which cuts joint cost by another $4\times$.

Segment sampling for a 100-frame clip with $K = 4$: segment centres at frames 12, 37, 62, 87. That covers the whole clip with 4 forward passes of the image backbone instead of 100.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why does joint space-time self-attention over $T$ frames of $P$ patches scale badly?",
  "options": [
    "It needs optical flow",
    "Cost grows as $(TP)^2$, quadratically in both frames and patches",
    "It cannot use pretrained image weights",
    "It requires 3-D convolutions"
  ],
  "answer": 1,
  "explanation": "Every token attends to every token across all frames. Divided attention reduces this to about $TP^2 + PT^2$."
}
```

```quiz
{
  "id": "q2",
  "question": "A model recognises \"playing tennis\" from a single frame about as well as from the full clip. What does this suggest?",
  "options": [
    "The model learned excellent temporal reasoning",
    "The benchmark class is motion-dependent",
    "The benchmark is appearance-biased, so it tests scene recognition more than temporal understanding",
    "Frames must have been shuffled"
  ],
  "answer": 2,
  "explanation": "Many Kinetics-style classes are solvable from a single frame. Evaluate temporal modeling on motion-sensitive sets or order-shuffling ablations."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `segment_indices(T, K)`: split `T` frames into `K` equal segments and return the centre frame index of each, computed with integer arithmetic as `(2k+1)*T // (2K)`. Also implement `num_tokens(frames, size=224, patch=16, tubelet=1)`: the number of space-time tokens, `(frames // tubelet) * (size // patch) ** 2`.",
  "starterCode": "def segment_indices(T, K):\n    pass\n\ndef num_tokens(frames, size=224, patch=16, tubelet=1):\n    pass\n\nprint(segment_indices(100, 4), num_tokens(16))",
  "tests": "assert segment_indices(100, 4) == [12, 37, 62, 87]\nassert segment_indices(8, 8) == [0, 1, 2, 3, 4, 5, 6, 7]\nassert segment_indices(10, 1) == [5]\nassert all(0 <= i < 30 for i in segment_indices(30, 7)) and len(segment_indices(30, 7)) == 7\nassert num_tokens(16) == 3136\nassert num_tokens(16, tubelet=2) == 1568\nassert num_tokens(8, size=112, patch=16) == 392",
  "solution": "def segment_indices(T, K):\n    return [(2 * k + 1) * T // (2 * K) for k in range(K)]\n\ndef num_tokens(frames, size=224, patch=16, tubelet=1):\n    per_frame = (size // patch) ** 2\n    return (frames // tubelet) * per_frame",
  "hints": [
    "For T=100, K=4 the segment length is 25 and centres are at 12.5, 37.5, ... floored.",
    "A tubelet of 2 frames merges two frames into one token grid."
  ]
}
```

```python-exercise
{
  "id": "ex2",
  "prompt": "Implement `attn_pairs_joint(T, P)` = number of attention pairs when all $TP$ tokens attend to each other, and `attn_pairs_divided(T, P)` = pairs for divided attention: spatial within each frame ($T \\cdot P^2$) plus temporal across frames at each location ($P \\cdot T^2$).",
  "starterCode": "def attn_pairs_joint(T, P):\n    pass\n\ndef attn_pairs_divided(T, P):\n    pass\n\nprint(attn_pairs_joint(16, 196), attn_pairs_divided(16, 196))",
  "tests": "assert attn_pairs_joint(16, 196) == 9834496\nassert attn_pairs_divided(16, 196) == 664832\nassert abs(attn_pairs_joint(16, 196) / attn_pairs_divided(16, 196) - 14.79) < 0.01\nassert attn_pairs_joint(1, 10) == 100 and attn_pairs_divided(1, 10) == 100 + 10\nassert attn_pairs_divided(32, 196) > attn_pairs_divided(16, 196) * 2",
  "solution": "def attn_pairs_joint(T, P):\n    return (T * P) ** 2\n\ndef attn_pairs_divided(T, P):\n    return T * P * P + P * T * T",
  "hints": [
    "Joint attention is (T*P) squared.",
    "Divided = T*P*P + P*T*T."
  ]
}
```

```python-exercise
{
  "id": "ex3",
  "prompt": "Implement `tiou(a, b)` for segments `(start, end)` (0 if disjoint) and `temporal_nms(segments, thr)` for segments `(start, end, score)`: process in descending score and keep a segment only if its tIoU with every kept segment is `<= thr`. Return the kept segments in the order they were kept.",
  "starterCode": "def tiou(a, b):\n    pass\n\ndef temporal_nms(segments, thr):\n    pass\n\nprint(tiou((0, 10), (5, 15)))",
  "tests": "assert abs(tiou((0, 10), (5, 15)) - 5 / 15) < 1e-12\nassert tiou((0, 5), (6, 9)) == 0.0\nassert tiou((2, 4), (2, 4)) == 1.0\nsegs = [(0, 10, 0.9), (1, 10, 0.8), (20, 30, 0.7), (25, 35, 0.6)]\nassert temporal_nms(segs, 0.5) == [(0, 10, 0.9), (20, 30, 0.7), (25, 35, 0.6)]\nassert temporal_nms(segs, 0.3) == [(0, 10, 0.9), (20, 30, 0.7)]\nassert temporal_nms([], 0.5) == []",
  "solution": "def tiou(a, b):\n    inter = max(0.0, min(a[1], b[1]) - max(a[0], b[0]))\n    union = (a[1] - a[0]) + (b[1] - b[0]) - inter\n    return inter / union if union > 0 else 0.0\n\ndef temporal_nms(segments, thr):\n    kept = []\n    for s in sorted(segments, key=lambda s: -s[2]):\n        if all(tiou(s[:2], k[:2]) <= thr for k in kept):\n            kept.append(s)\n    return kept",
  "hints": [
    "Intersection = max(0, min(ends) - max(starts)).",
    "Sort by score descending, then compare each candidate with the already kept ones."
  ]
}
```

> [!TIP] Interview tips
> - Contrast appearance (frame CNN + pooling) with motion (flow, 3-D CNN, SlowFast) and attention over space-time tokens.
> - Be ready to compute token counts and attention cost, and explain divided attention and tubelets as the fix.
> - Mention frame sampling, multi-view test-time averaging and the compute trade-off.
> - Flag dataset pitfalls: static-scene bias and clip leakage across splits; for video LLMs the token budget is the bottleneck.
