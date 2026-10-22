---
id: swe-project-structure-packaging
title: "项目结构与打包"
---

## 为什么重要
提交一堆零散 notebook 的数据科学家是个警示信号；提交带测试、可安装包的人才会被录用。面试官会问“你会怎么组织这个项目，让队友能直接运行？”，因为只能在某个文件夹里运行的代码无法顺利交接到生产环境。

## 概念
**脚本、模块与包。** *模块*是单个 `.py` 文件，*包*是包含模块的目录（带 `__init__.py`），*发行版（distribution）*是用 `pip` 安装的构建产物（wheel 或 sdist）。

**推荐布局**（src layout）：

```text
churn-model/
  pyproject.toml          # metadata, dependencies, tool config
  README.md
  src/churn/              # importable package ("src layout")
    __init__.py
    features.py
    train.py
  tests/
    test_features.py
  notebooks/              # exploration only, no logic that matters
```

- `src/` 迫使你测试*已安装*的包，而不是碰巧在 `sys.path` 上的任何东西，从而尽早发现缺失文件和错误的 import。
- 保持 notebook 轻量：它们从 `churn` 导入，绝不反过来。写在 notebook 里的逻辑无法测试和复用。
- 使用绝对导入（`from churn.features import build`），而不是 `sys.path` 技巧或 `import *`。

**打包**在 `pyproject.toml`（PEP 621）中声明，它在元数据方面取代了 `setup.py` 和 `requirements.txt`：

```toml
[project]
name = "churn"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = ["pandas>=2.0", "scikit-learn>=1.4"]

[project.optional-dependencies]
dev = ["pytest", "ruff"]

[project.scripts]
churn-train = "churn.train:main"   # installs a CLI command

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"
```

`pip install -e ".[dev]"` 执行*可编辑安装*：import 指向你的工作目录，修改后无需重新安装。`python -m build` 生成 wheel，用于分发到内部包索引。

**库与应用。** 库声明宽松的版本范围（`pandas>=2.0`），以便与其他包兼容；应用则在 lock 文件中固定精确版本，以实现可复现部署。

## 示例讲解
场景：`train.py` 里写了 `from features import build`，只有 `cd` 进该文件夹才能运行，在 CI 中报 `ModuleNotFoundError`。

修复：把代码移到 `src/churn/`，把导入改为 `from churn.features import build`，添加 `pyproject.toml`，运行 `pip install -e .`。现在在任何目录下 `python -c "import churn"` 都能成功，`pytest` 导入的就是用户拿到的同一个包，`churn-train` 也成为可用命令。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么许多团队偏好 `src/` 布局？",
  "options": [
    "它让导入更快",
    "测试导入的是已安装的包而不是工作目录，从而暴露打包错误",
    "pip 要求这样做",
    "它不再需要 `__init__.py`"
  ],
  "explanation": "使用 `src/` 时，不安装就无法从仓库根目录导入包，因此缺失文件或错误导入会在测试中暴露，而不是在生产中。"
}
```

```quiz
{
  "id": "q2",
  "question": "`pip install -e .` 的作用是什么？",
  "options": [
    "只安装开发依赖",
    "构建并上传 wheel",
    "安装项目，使 import 指向你的工作目录，修改后无需重新安装",
    "导出环境"
  ],
  "explanation": "可编辑安装把已安装的名称链接到你的源码目录。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `module_names(files)`：给定仓库文件路径，返回可从 `src/` 根目录导入的模块点分名称（排序）。只有当 `src` 与文件之间的每个目录都有 `__init__.py` 时该文件才算（因此缺少 `src/broken/sub/__init__.py` 时排除 `src/broken/sub/deep.py`）。`__init__.py` 对应包名本身；忽略 `src/` 之外的文件。",
  "hints": [
    "把所有路径放进集合，便于检查某个 `__init__.py` 是否存在。",
    "对 `src` 下目录列表的每个前缀，检查 `src/<前缀>/__init__.py` 是否存在。"
  ]
}
```

> [!TIP] 面试技巧
> - 说出“src layout、`pyproject.toml`、可编辑安装、轻量 notebook”，并解释*为什么*（测试已安装代码、可复现性、交接）。
> - 陷阱：子文件夹缺少 `__init__.py` 会让普通包的导入悄悄失败（命名空间包是例外，但很少是有意为之）。
> - 陷阱：把数据、模型或密钥提交进仓库；应使用 `.gitignore`、DVC 或对象存储，以及环境变量。
