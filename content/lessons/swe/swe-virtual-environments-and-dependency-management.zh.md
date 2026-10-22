---
id: swe-virtual-environments-and-dependency-management
title: "虚拟环境与依赖管理（venv、conda、uv、poetry）"
---

## 为什么重要
“在我机器上能跑”是数据科学中的经典失败：用 pandas 1.5 训练的模型在 2.x 下出错，或者 CI 装了更新的 NumPy。面试官会问你如何让环境可复现、选用哪种工具，以考察你是否把依赖视为交付物的一部分。

## 概念
**为什么要隔离。** 每个项目拥有独立的解释器和包，项目 A 可以固定 `numpy==1.26` 而 B 使用 2.0，且不会影响系统 Python。*虚拟环境*本质上就是一个目录，包含 Python 的副本/符号链接和自己的 `site-packages`。

```bash
# venv + pip: built in, simplest
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip freeze > requirements.lock.txt      # record exact versions

# uv: fast (Rust) drop-in, with a lock file
uv init && uv add pandas scikit-learn
uv lock && uv sync                       # reproducible install from uv.lock

# conda: also manages non-Python binaries (CUDA, MKL, GDAL)
conda create -n churn python=3.11 && conda activate churn
```

**工具选择。**
- **venv + pip**：无需额外安装；适合大多数服务。在大型依赖栈上解析较慢。
- **conda / mamba**：能解析已编译的非 Python 依赖（CUDA toolkit、GDAL）以及 Python 版本本身；较重，且在 conda 环境中混用 `pip` 可能破坏求解。
- **uv**：解析/安装速度极快，管理 Python 版本，生成跨平台的 `uv.lock`。如今常见的默认选择。
- **poetry**：依赖分组、lock 文件（`poetry.lock`）、构建与发布一体化。

**声明与锁定。** `pyproject.toml` 表达*意图*（`pandas>=2.0`）；lock 文件记录带哈希的*精确解析树*（pandas 2.2.2、numpy 1.26.4……）。应用应同时提交两者，CI 从 lock 安装。依赖解析是图问题：每个包在其依赖之后安装（拓扑序），出现环或版本冲突时求解失败。

**习惯。** 每个项目一个环境，绝不 `sudo pip install`，固定 Python 版本（`requires-python`），把开发依赖（`pytest`、`ruff`）与运行时依赖分开，并在 CI 中从 lock 重建以证明可复现。

## 示例讲解
场景：队友跑出的 AUC 不同。`pip freeze` 显示她装的是 `scikit-learn 1.5`，而 lock 里是 `1.4.2`，且两个版本之间某个默认值变了。

修复：她运行 `uv sync`（或在全新 venv 中 `pip install -r requirements.lock.txt`），重新安装与 lock 完全一致的集合。CI 也这样做，因此训练、测试和生产共用同一棵依赖树。升级变成有意为之：`uv lock --upgrade-package scikit-learn`，跑测试，提交新的 lock。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "lock 文件能提供 `pyproject.toml` 中 `pandas>=2.0` 提供不了的什么？",
  "options": [
    "更快的导入",
    "整棵依赖树的精确解析版本（及哈希），使安装可复现",
    "自动安全补丁",
    "更小的 wheel"
  ],
  "explanation": "版本范围随时间允许多种有效安装；lock 固定其中一种，包括传递依赖。"
}
```

```quiz
{
  "id": "q2",
  "question": "什么时候 conda 比 venv + pip 更合适？",
  "options": [
    "总是，因为它更快",
    "只需要纯 Python 包时",
    "需要非 Python 二进制依赖（如 CUDA toolkit、GDAL）或要管理 Python 版本时",
    "部署到最小化 Docker 镜像时"
  ],
  "explanation": "conda 打包原生库和解释器；pip 只安装 Python 发行版。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `install_order(deps)`：给定 `{package: [直接依赖]}`，返回安装顺序，使每个包都排在其依赖之后（仅作为依赖出现的包也要包含）。在已就绪的包中按字母序打破平局。出现依赖环时抛出 `ValueError`。",
  "hints": [
    "反复选取剩余依赖集合为空且字母序最小的包（Kahn 算法）。",
    "如果没有就绪的包但仍有剩余包，说明存在环。"
  ]
}
```

> [!TIP] 面试技巧
> - 区分“声明”（`pyproject.toml` 中的范围）与“锁定”（精确版本加哈希），并说明应用要提交 lock。
> - 被问 venv 与 conda 时：需要非 Python 二进制或 GPU 工具链用 conda；否则为了速度和简洁用 venv/uv。
> - 陷阱：在杂乱的全局环境中 `pip freeze > requirements.txt` 会固定几百个无关包；应在干净的项目环境中 freeze。
