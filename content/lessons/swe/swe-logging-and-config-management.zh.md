---
id: swe-logging-and-config-management
title: "日志与配置管理"
---

## 为什么重要
夜间流水线在凌晨 3 点失败时，日志是你唯一的依据；同一份代码要在笔记本、CI 和生产环境中运行，配置就不能写在代码里。面试官用这些话题考察你能否运维自己构建的东西。

## 概念
**用 logging，而不是 `print`。** `logging` 模块提供级别、时间戳、模块名、路由和结构化输出，且无需改代码就能调高或调低详细程度。

```python
import logging

logger = logging.getLogger(__name__)          # one logger per module

def setup_logging(level="INFO"):
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

def train(n_rows):
    logger.info("training started rows=%d", n_rows)     # lazy %-formatting
    try:
        ...
    except Exception:
        logger.exception("training failed")            # message + traceback
        raise
```

- 级别：`DEBUG`（诊断）< `INFO`（里程碑）< `WARNING`（意外但已处理）< `ERROR`（操作失败）< `CRITICAL`。生产环境通常运行在 `INFO`。
- 库只创建 logger，不配置 handler；只有应用入口调用 `basicConfig`。
- 传参数（`logger.info("rows=%d", n)`）而不是 f-string，这样级别被禁用时就会跳过格式化。
- 记录*带上下文的事件*（id、行数、耗时），日志聚合器优先用 JSON lines，绝不记录密钥或原始 PII。

**配置。** 把随环境变化的设置（路径、URL、超参数、凭证）与代码分离。优先级从低到高：代码默认值、配置文件（YAML/TOML）、环境变量、命令行参数。

```python
# 12-factor style: code reads settings from the environment
import os
DB_URL = os.environ["DB_URL"]                       # required: KeyError if missing
BATCH = int(os.environ.get("BATCH_SIZE", "256"))    # optional with default (env values are strings!)
```

- 密钥来自环境变量或密钥管理器，绝不放进 git。
- 在启动时校验并快速失败（缺少键、类型错误），而不是跑了一小时后才失败。类型化的设置类（`pydantic-settings`、dataclass）既能做到这点又能记录 schema。
- 启动时记录生效的配置（去掉密钥），这样仅凭日志就能复现一次运行。

## 示例讲解
场景：训练任务从环境中读取 `BATCH_SIZE=512`，但代码里比较 `batch > 100`，而所有值都是字符串，于是只有运行到该分支时才抛出 `TypeError`，已经过去 40 分钟。

如果使用按默认值类型转换并在启动时校验的加载器，任务会在第一秒就以 `missing required config: db_url` 失败，或者以 `int` 类型的 `batch_size == 512` 正常运行。第一行日志打印生效的配置，因此运行可以被复现。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "为什么写 `logger.info(\"rows=%d\", n)` 而不是 `logger.info(f\"rows={n}\")`？",
  "options": [
    "f-string 写法是语法错误",
    "%-风格输出更易读",
    "级别被禁用时会跳过格式化，且日志聚合器可以按固定的消息模板分组",
    "它会添加时间戳"
  ],
  "explanation": "延迟格式化在 INFO 关闭时避免了无谓开销，并保持消息模板恒定。"
}
```

```quiz
{
  "id": "q2",
  "question": "数据库密码和 API key 应该放在哪里？",
  "options": [
    "提交到 git 的 `config.yaml` 中",
    "环境变量或密钥管理器中，在运行时注入",
    "作为模块常量",
    "为方便调试写进日志消息"
  ],
  "explanation": "密钥不进版本控制和日志；12-factor 方式是从环境中读取。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `load_config(defaults, env, prefix='APP_')`。对 `defaults` 中的每个键，名为 `prefix + key.upper()` 的环境变量会覆盖它，并转换成默认值的类型（`bool` 对 'true'、'1'、'yes' 不区分大小写地视为 True，其他一律 False）。默认值为 `None` 表示该键必填：保留原始字符串，缺失则抛出 `ValueError`。忽略无关的环境变量，且不要修改输入。",
  "hints": [
    "在通用的 `type(default)(raw)` 转换之前先检查 `isinstance(default, bool)`，因为 `bool('False')` 为 True。",
    "构造新字典；环境值缺失时回退到默认值，除非默认值是 None。"
  ]
}
```

> [!TIP] 面试技巧
> - 提到级别、按模块的 logger、用 `logger.exception` 记录 traceback，以及“日志中不含密钥或 PII”。
> - 配置的回答：默认值 < 文件 < 环境变量 < 命令行；密钥用环境变量（12-factor）；校验并快速失败。
> - 陷阱：环境变量永远是字符串，所以 `"False"` 为真值，除非你去解析它。
