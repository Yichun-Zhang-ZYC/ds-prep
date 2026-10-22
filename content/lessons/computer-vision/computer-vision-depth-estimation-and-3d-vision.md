---
id: computer-vision-depth-estimation-and-3d-vision
title: "Depth estimation & 3D vision"
estimatedMinutes: 12
difficulty: hard
tags: [computer-vision, depth, stereo, 3d, nerf, camera-geometry]
---

## Why it matters
Robots, AR and self-driving cars need metric 3D structure, not just labels. Interviews test camera geometry basics, why monocular depth is ambiguous, and how modern depth and 3D reconstruction models fit together.

## Concept
**Pinhole camera.** A 3D point $(X, Y, Z)$ in camera coordinates projects to pixel $(u, v)$:

$$u = f_x \frac{X}{Z} + c_x, \qquad v = f_y \frac{Y}{Z} + c_y$$

$f$ is focal length in pixels and $(c_x, c_y)$ the principal point (together the **intrinsics** $K$). Given depth $Z$, a pixel **back-projects** to $X = (u - c_x) Z / f_x$, $Y = (v - c_y) Z / f_y$. Extrinsics $[R \mid t]$ move points between world and camera frames.

**Depth sources**
- **Stereo**: two rectified cameras with baseline $B$; a point shifts by **disparity** $d$ pixels, giving $Z = fB/d$. Depth error grows with the square of distance: $\Delta Z \approx \dfrac{Z^2}{fB}\Delta d$. Needs textured regions to match.
- **Active sensors**: LiDAR, time-of-flight, structured light give metric depth but sparse or short-range.
- **Monocular depth** (single image): ill-posed because many 3D scenes give the same image. Networks learn priors (object sizes, perspective, texture gradients). Output is often **relative** (up to scale/shift) and trained with scale-invariant losses; models such as MiDaS, Depth Anything or ZoeDepth/Metric3D differ in whether they output relative or metric depth. Metric scale needs known intrinsics, a reference object, or fine-tuning for the domain.
- **Multi-view**: Structure from Motion / SLAM triangulate points from matched features across frames and recover camera poses.

**3D representations**: depth maps, point clouds (PointNet processes unordered points), meshes, voxels, and neural scene representations. **NeRF** fits an MLP mapping position + view direction to color and density, trained by volume rendering photometric loss from posed images; **3D Gaussian Splatting** represents the scene as many 3D Gaussians for much faster training and real-time rendering.

**Metrics**: depth AbsRel $= \frac{1}{n}\sum |\hat z - z|/z$, RMSE, and $\delta < 1.25$ accuracy (fraction with $\max(\hat z/z,\ z/\hat z) < 1.25$). Align scale/shift first when evaluating relative-depth models.

## Worked example
Stereo rig: $f = 700$ px, $B = 0.12$ m. A match with disparity $d = 14$ px has $Z = 700 \cdot 0.12/14 = 6$ m. A 1 px disparity error there causes about $6^2/(700 \cdot 0.12) = 36/84 \approx 0.43$ m of depth error; at $Z = 12$ m the same error costs about 1.7 m.

Back-project pixel $(420, 140)$ at $Z = 6$ with $c = (320, 240)$: $X = 100 \cdot 6/700 \approx 0.857$ m, $Y = -100 \cdot 6/700 \approx -0.857$ m (above the optical axis, since image $v$ points down).

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "Why can a single image not determine metric depth on its own?",
  "options": [
    "Images have no color information",
    "Many different 3D scenes (different sizes and distances) project to the same image, so scale is ambiguous",
    "Cameras do not have a focal length",
    "Depth needs at least five images"
  ],
  "answer": 1,
  "explanation": "Perspective projection discards absolute scale: a small near object and a large far object can look identical. Models use learned priors and often predict relative depth."
}
```

```quiz
{
  "id": "q2",
  "question": "For a stereo rig, how do you reduce depth error at long range?",
  "options": [
    "Reduce the baseline",
    "Increase baseline and/or focal length, or improve subpixel disparity accuracy",
    "Lower the image resolution",
    "Use a smaller sensor"
  ],
  "answer": 1,
  "explanation": "Delta Z is about Z^2 / (f B) * Delta d, so larger f (pixels), larger B, or smaller disparity error all help."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `depth_from_disparity(d, f, B)`, `depth_error(Z, f, B, dd=1.0)` (first-order depth error for a disparity error `dd`), `backproject(u, v, Z, fx, fy, cx, cy)` returning `(X, Y, Z)`, and `project(X, Y, Z, fx, fy, cx, cy)` returning `(u, v)`.",
  "setup": "",
  "starterCode": "def depth_from_disparity(d, f, B):\n    pass\n\ndef depth_error(Z, f, B, dd=1.0):\n    pass\n\ndef backproject(u, v, Z, fx, fy, cx, cy):\n    pass\n\ndef project(X, Y, Z, fx, fy, cx, cy):\n    pass\n",
  "tests": "assert abs(depth_from_disparity(14, 700, 0.12) - 6.0) < 1e-12\nassert abs(depth_error(6, 700, 0.12) - 36 / 84) < 1e-12\nassert abs(depth_error(12, 700, 0.12) - 144 / 84) < 1e-12\nX, Y, Z = backproject(420, 140, 6, 700, 700, 320, 240)\nassert abs(X - 600 / 700) < 1e-12 and abs(Y + 600 / 700) < 1e-12 and Z == 6\nu, v = project(X, Y, Z, 700, 700, 320, 240)\nassert abs(u - 420) < 1e-9 and abs(v - 140) < 1e-9\nassert project(0, 0, 5, 500, 500, 320, 240) == (320, 240)",
  "solution": "def depth_from_disparity(d, f, B):\n    return f * B / d\n\ndef depth_error(Z, f, B, dd=1.0):\n    return Z * Z / (f * B) * dd\n\ndef backproject(u, v, Z, fx, fy, cx, cy):\n    return ((u - cx) * Z / fx, (v - cy) * Z / fy, Z)\n\ndef project(X, Y, Z, fx, fy, cx, cy):\n    return (fx * X / Z + cx, fy * Y / Z + cy)\n",
  "hints": [
    "Z = f * B / d, and dZ/dd magnitude is Z^2 / (f * B).",
    "Back-projection is the algebraic inverse of projection when Z is known."
  ]
}
```

> [!TIP] Interview tips
> - Write the pinhole projection and the stereo formula $Z = fB/d$ from memory, and note that depth precision degrades quadratically with range.
> - Explain monocular scale ambiguity and the relative-vs-metric distinction; mention scale-invariant losses.
> - Contrast NeRF (implicit, slow to train/render) with Gaussian Splatting (explicit, fast) and with classical SfM/SLAM (sparse geometry, poses).
