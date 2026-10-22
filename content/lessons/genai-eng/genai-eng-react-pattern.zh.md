---
id: genai-eng-react-pattern
title: ReAct 模式
---

## 为什么重要
ReAct（Reasoning + Acting，推理加行动）是大多数 LLM agent 的基础：模型在思考和调用工具之间交替进行，利用观察结果决定下一步。面试官会问它如何工作、与思维链有何不同，以及如何避免它陷入循环或跑偏。

## 概念
**循环**（Yao 等，2022）：重复**思考（Thought）**（推理已知内容和所需信息），然后**行动（Action）**（用某个输入调用工具），然后**观察（Observation）**（工具输出追加到上下文），直到模型给出**最终答案（Final Answer）**。

```
Question: Who directed the film that won Best Picture in 1998?
Thought: I need the 1998 Best Picture winner.
Action: search[Best Picture 1998]
Observation: Titanic won Best Picture (1998 ceremony).
Thought: Now find its director.
Action: search[Titanic director]
Observation: James Cameron.
Final Answer: James Cameron
```

**为什么有效**：单纯的思维链依靠参数化记忆推理，可能产生幻觉；单纯的行动没有计划。ReAct 把每一步推理都建立在新证据之上，并让推理能在出现意外观察后修正计划。现代 API 用原生工具调用（结构化调用，而不是解析 `Action:` 文本）实现同样的循环，“思考”部分可选择使用扩展思考块。

**实现细节**：带有工具描述和格式的系统 prompt；在 `Observation:` 处设置停止序列，避免模型编造观察；解析动作的解析器；**最大步数**限制；把无法解析的输出和工具错误当作观察处理。

**失败模式与对策**：无限或重复的循环（步数上限，检测重复的相同动作）、上下文增长（总结或截断旧的观察）、选错工具（更清晰的描述，更少的工具）、错误累积（验证步骤，如 Reflexion 中的反思）、成本和延迟随步数增长（每一步都是一次完整的模型调用，prompt 缓存有助于避免重复支付前缀的费用）。

**相关模式**：**Plan-and-execute**（先做计划再执行各步；更便宜、更可预测，但适应性较差）、**Reflexion**（在多次尝试之间自我批评）、针对困难推理的思考**树搜索**。

## 示例讲解
任务：“澳大利亚首都的人口除以 1000 是多少？”工具：`search`、`calc`。

1. 思考：需要首都。行动：`search[capital of Australia]` 观察：Canberra。
2. 思考：需要它的人口。行动：`search[Canberra population]` 观察：约 456,000。
3. 思考：除以 1000。行动：`calc[456000/1000]` 观察：456。
4. 最终答案：456（千）。

成本：4 次模型调用，每次都带着不断增长的记录。如果记录从 300 增长到约 900 个 token，总 prompt token 大约为 $300 + 500 + 700 + 900 = 2400$，这就是为什么步数上限和 prompt 缓存很重要。设置 6 步的上限可以阻止一直重复 `search[Canberra population]` 的模型。

## 检验理解

```quiz
{
  "id": "q1",
  "question": "相比单纯的思维链，ReAct 增加了什么？",
  "options": [
    "更大的上下文窗口",
    "交错的行动，其观察结果让后续推理建立在外部证据之上",
    "用强化学习训练模型",
    "不再需要 prompt"
  ],
  "explanation": "ReAct 让推理与工具行动交替进行并把结果反馈回来，既减少幻觉又能修正计划。"
}
```

```quiz
{
  "id": "q2",
  "question": "一个 agent 把同样的搜索重复了 15 次。最直接的缓解措施是什么？",
  "options": [
    "把 temperature 提高到 2.0",
    "强制最大步数上限并检测重复的相同动作",
    "移除所有工具",
    "只用更长的系统 prompt"
  ],
  "explanation": "硬性的步数限制加上循环检测可以限制成本和失败。你也可以告诉模型重复的动作没有返回新信息。"
}
```

## 动手练习

```python-exercise
{
  "id": "ex1",
  "prompt": "实现 `run_react(llm, tools, question, max_steps)`。以记录 `Question: <question>\\n` 开始。每一步调用 `llm(transcript)` 获取文本。如果文本包含 `Final Answer:`，返回 `(answer, steps)`，其中 answer 是其后文本去除首尾空白的结果。否则解析 `Action: name[arg]`（正则 `Action:\\s*(\\w+)\\[(.*)\\]`），运行 `tools[name](arg)` 得到观察（未知工具：`Error: unknown tool <name>`；异常：`Error: <message>`；无法解析：记录 `(None, None, 'Error: invalid format')`），把 `text + '\\nObservation: ' + obs + '\\n'` 追加到记录中，并把 `(name, arg, obs)` 记入 `steps`。如果达到 max_steps 仍无最终答案，返回 `(None, steps)`。",
  "hints": [
    "先检查 'Final Answer:'，再尝试解析动作。",
    "总是把观察（包括错误）追加到记录中，这样模型才能对其作出反应。"
  ]
}
```

> [!TIP] 面试技巧
> - 做对比：CoT = 只有推理；工具调用 = 只有行动；ReAct = 交错进行，观察结果反馈回来。提到 plan-and-execute 作为更便宜的替代方案。
> - 始终限制循环：最大步数、token 预算、重复动作检测、墙钟超时；失败时返回部分结果并给出说明。
> - 提到停止序列或原生工具调用，这样模型无法捏造观察。
