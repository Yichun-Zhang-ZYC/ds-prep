---
id: swe-design-patterns
title: 设计模式
---

## 为什么重要
设计模式是组织代码时共享的词汇。在 ML 和数据工程面试中，它们以“你如何让这条流水线可扩展？”的形式出现，你需要说出一个模式并给出简短的 Pythonic 版本，而不是背诵教科书。

## 概念
**设计模式**是针对反复出现的设计问题的可复用解决方案。先追求简单代码；只有当模式能消除真正的重复或耦合时才使用。在 Python 中，一等函数、鸭子类型和装饰器常常可以取代笨重的类层次结构。

**创建型**
- **工厂/注册表（Factory / registry）**：按名称创建对象而无需硬编码类，适合模型、加载器和配置（`create("xgboost", depth=6)`）。
- **单例（Singleton）**：一个共享实例（配置、连接池）。通常模块级对象比单例类更简单、更易测试。
- **建造者（Builder）**：逐步构造复杂对象（查询构建器、流水线构建器）。

**结构型**
- **适配器（Adapter）**：包装不兼容的接口以匹配所需接口（给第三方模型套一层 scikit-learn 风格的封装）。
- **装饰器（Decorator）**：在不修改可调用对象的情况下为其添加行为（`@retry`、`@cache`、计时、日志）。
- **外观（Facade）**：为复杂子系统提供简单接口。

**行为型**
- **策略（Strategy）**：在统一接口后交换可互换的算法（不同的评分器、填充方法、重试策略）。在 Python 中，直接传函数即可。
- **观察者/发布订阅（Observer / pub-sub）**：对象订阅事件（训练回调、指标钩子）。
- **模板方法（Template method）**：基类固定算法骨架（`fit`、`predict`），子类填充各步骤。
- **流水线/责任链（Pipeline / chain of responsibility）**：组合每一步都转换数据的步骤（如 sklearn 的 `Pipeline`）。

**背后的原则（SOLID）**：单一职责、开闭原则（扩展而不修改）、里氏替换、接口隔离、依赖倒置（依赖抽象、注入依赖，这也有助于测试）。优先**组合而非继承**。

```python
REGISTRY = {}

def register(name):
    def deco(cls):
        REGISTRY[name] = cls
        return cls
    return deco

@register("mean")
class MeanImputer:
    def fit_transform(self, xs):
        m = sum(xs) / len(xs)
        return [m if x is None else x for x in xs]

imputer = REGISTRY["mean"]()      # new strategy = new class, no edits elsewhere
```

## 示例讲解
一个训练脚本里 `if model == "rf": ... elif model == "xgb": ... elif model == "lr": ...` 在 4 个地方重复（构建、训练、保存、加载）。添加一个模型需要修改 4 个分支，还可能漏掉一个。重构：定义带 `fit/predict/save` 的 `Model` 接口，按名称索引的注册表（工厂），由配置字符串选择类。添加 "lightgbm" 只需一个带 `@register("lgbm")` 的新类：这就是开闭原则，测试也可以传入假模型。代价：原本 1 个文件的脚本多出 3 个新文件，有 3 个以上变体时值得，只有 1 个时则不值得。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "你想在不改动调用代码的前提下，在不同的重试策略（固定、指数、无）之间切换。哪种模式适合？",
  "options": ["Singleton", "Strategy", "Facade", "Builder"],
  "explanation": "Strategy 把可互换的算法封装在统一接口之后；在 Python 中你可以直接传一个函数或对象。"
}
```

```quiz
{
  "id": "q2",
  "question": "关于 Python 中的设计模式，下列哪种说法最准确？",
  "options": ["每个程序都应该至少使用三种模式", "一等函数和装饰器常常取代重型的类模式，所以在出现真正的重复或耦合之前保持简单", "单例是共享配置的最佳方式", "应当总是优先使用继承而非组合"],
  "explanation": "模式是工具，而不是目标。Python 的语言特性让许多模式变得很轻量，而且通常优先使用组合。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现一个注册表工厂和一个流水线。`register(name)` 是一个类装饰器，把类存入全局 `REGISTRY` 字典并返回该类。`create(name, **kwargs)` 用 kwargs 实例化已注册的类，名称未知时抛出 `KeyError`。`compose(*fns)` 返回一个函数，从左到右依次应用 `fns`（没有函数时原样返回输入）。",
  "hints": ["带参数的装饰器是一个返回真正装饰器的函数。", "compose 可以遍历 fns，把每个输出传给下一个。"]
}
```

> [!TIP] 面试技巧
> - 把模式与具体问题关联（可替换的模型 = 策略/注册表，钩子 = 观察者，重试/缓存 = 装饰器），而不是罗列定义。
> - 表现出克制：说明何时不该使用模式（过度设计、只有一种实现）。
> - 提到依赖注入和组合优于继承，因为它们让代码可测试（换入假对象或 mock）。
