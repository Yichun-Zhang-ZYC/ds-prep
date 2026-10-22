---
id: genai-eng-react-pattern
title: ReAct pattern
estimatedMinutes: 10
difficulty: medium
tags: [genai, agents, react, reasoning]
---

## Why it matters
ReAct (Reasoning + Acting) is the foundation of most LLM agents: the model alternates between thinking and calling tools, using observations to decide the next step. Interviewers ask how it works, how it differs from chain-of-thought, and how to keep it from looping or going off the rails.

## Concept
**The loop** (Yao et al., 2022): repeat **Thought** (reason about what is known and what is needed) then **Action** (call a tool with an input) then **Observation** (tool output appended to the context), until the model emits a **Final Answer**.

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

**Why it works**: CoT alone reasons from parametric memory and can hallucinate; acting alone has no plan. ReAct grounds each reasoning step in fresh evidence and lets reasoning repair plans after surprising observations. Modern APIs implement the same loop with native tool calling (structured calls instead of parsing `Action:` text) and optionally extended-thinking blocks for the "thought" part.

**Implementation details**: a system prompt with tool descriptions and the format; stop sequence at `Observation:` so the model does not invent observations; a parser for the action; a **max-steps** limit; handling of unparsable output and tool errors as observations.

**Failure modes and fixes**: infinite or repetitive loops (step cap, detect repeated identical actions), context growth (summarize or truncate old observations), wrong tool choice (clearer descriptions, fewer tools), compounding errors (verification step, reflection as in Reflexion), cost and latency scaling with steps (each step is a full model call, with prompt caching helping to avoid re-paying for the prefix).

**Related patterns**: **Plan-and-execute** (plan up front, then run steps; cheaper and more predictable, less adaptive), **Reflexion** (self-critique between attempts), **tree search** over thoughts for hard reasoning.

## Worked example
Task: "What is the population of the capital of Australia, divided by 1000?" Tools: `search`, `calc`.

1. Thought: need the capital. Action: `search[capital of Australia]` Observation: Canberra.
2. Thought: need its population. Action: `search[Canberra population]` Observation: about 456,000.
3. Thought: divide by 1000. Action: `calc[456000/1000]` Observation: 456.
4. Final Answer: 456 (thousand).

Cost: 4 model calls, each carrying the growing transcript. If the transcript grows from 300 to about 900 tokens, total prompt tokens are roughly $300 + 500 + 700 + 900 = 2400$, which is why step limits and prompt caching matter. A step cap of 6 would stop a model that keeps repeating `search[Canberra population]`.

## Check your understanding

```quiz
{
  "id": "q1",
  "question": "What does ReAct add over plain chain-of-thought?",
  "options": [
    "A larger context window",
    "Interleaved actions whose observations ground later reasoning in external evidence",
    "Training the model with reinforcement learning",
    "Removing the need for a prompt"
  ],
  "answer": 1,
  "explanation": "ReAct alternates reasoning with tool actions and feeds results back, reducing hallucination and enabling plan repair."
}
```

```quiz
{
  "id": "q2",
  "question": "An agent repeats the same search 15 times. Which mitigation is most direct?",
  "options": [
    "Raise the temperature to 2.0",
    "Enforce a max-steps cap and detect repeated identical actions",
    "Remove all tools",
    "Use a longer system prompt only"
  ],
  "answer": 1,
  "explanation": "Hard step limits plus loop detection bound cost and failure. You can also tell the model the repeated action returned nothing new."
}
```

## Practice

```python-exercise
{
  "id": "ex1",
  "prompt": "Implement `run_react(llm, tools, question, max_steps)`. Start with transcript `Question: <question>\\n`. Each step call `llm(transcript)` to get text. If the text contains `Final Answer:`, return `(answer, steps)` where answer is the stripped text after it. Otherwise parse `Action: name[arg]` (regex `Action:\\s*(\\w+)\\[(.*)\\]`), run `tools[name](arg)` to get an observation (unknown tool: `Error: unknown tool <name>`; exception: `Error: <message>`; unparsable text: record `(None, None, 'Error: invalid format')`), append `text + '\\nObservation: ' + obs + '\\n'` to the transcript and record `(name, arg, obs)` in `steps`. If max_steps is reached without a final answer return `(None, steps)`.",
  "starterCode": "import re\n\ndef run_react(llm, tools, question, max_steps):\n    pass\n",
  "tests": "def scripted(t):\n    if 'Observation:' not in t:\n        return 'Thought: need capital\\nAction: search[France capital]'\n    return 'Thought: done\\nFinal Answer: Paris'\n\ntools = {'search': lambda x: 'Paris is the capital', 'boom': lambda x: 1 / 0}\nans, steps = run_react(scripted, tools, 'Capital of France?', 5)\nassert ans == 'Paris'\nassert steps == [('search', 'France capital', 'Paris is the capital')]\n\nans, steps = run_react(lambda t: 'Action: search[again]', tools, 'q', 3)\nassert ans is None and len(steps) == 3\n\nseen = []\ndef llm2(t):\n    seen.append(t)\n    if len(seen) == 1:\n        return 'Action: wiki[x]'\n    if len(seen) == 2:\n        return 'Action: boom[x]'\n    if len(seen) == 3:\n        return 'I am not sure'\n    return 'Final Answer:  42 '\nans, steps = run_react(llm2, tools, 'q', 6)\nassert ans == '42'\nassert steps[0] == ('wiki', 'x', 'Error: unknown tool wiki')\nassert steps[1] == ('boom', 'x', 'Error: division by zero')\nassert steps[2] == (None, None, 'Error: invalid format')\nassert seen[0] == 'Question: q\\n'\nassert seen[1] == 'Question: q\\nAction: wiki[x]\\nObservation: Error: unknown tool wiki\\n'",
  "solution": "import re\n\ndef run_react(llm, tools, question, max_steps):\n    transcript = 'Question: ' + question + '\\n'\n    steps = []\n    for _ in range(max_steps):\n        text = llm(transcript)\n        if 'Final Answer:' in text:\n            return text.split('Final Answer:', 1)[1].strip(), steps\n        m = re.search(r'Action:\\s*(\\w+)\\[(.*)\\]', text)\n        if not m:\n            obs = 'Error: invalid format'\n            steps.append((None, None, obs))\n        else:\n            name, arg = m.group(1), m.group(2)\n            if name not in tools:\n                obs = 'Error: unknown tool ' + name\n            else:\n                try:\n                    obs = str(tools[name](arg))\n                except Exception as e:\n                    obs = 'Error: ' + str(e)\n            steps.append((name, arg, obs))\n        transcript += text + '\\nObservation: ' + obs + '\\n'\n    return None, steps\n",
  "hints": [
    "Check for 'Final Answer:' before trying to parse an action.",
    "Always append the observation (even errors) to the transcript so the model can react to it."
  ]
}
```

> [!TIP] Interview tips
> - Contrast: CoT = reasoning only; tool use = acting only; ReAct = interleaved with observations feeding back. Mention plan-and-execute as the cheaper alternative.
> - Always bound the loop: max steps, token budget, repeated-action detection, wall-clock timeout; return partial results with an explanation on failure.
> - Mention stop sequences or native tool calls so the model cannot fabricate observations.
