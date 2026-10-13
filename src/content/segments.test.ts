import { checkZhOverlay } from './parse';
import { compareShapes, splitLesson } from './segments';

const EN = `## Why it matters
Text with a code sample:

\`\`\`sql
-- ## not a heading inside code
SELECT 1;
\`\`\`

## Practice

\`\`\`quiz
{ "id": "q1", "question": "Q?", "options": ["a", "b"], "answer": 0 }
\`\`\`

> [!TIP] Interview tips
> - one
`;

const ZH = `## 为什么重要
中文正文：

\`\`\`sql
SELECT 1;
\`\`\`

## 练习

\`\`\`quiz
{ "id": "q1", "question": "问题？", "options": ["甲", "乙"] }
\`\`\`

> [!TIP] 面试技巧
> - 一
`;

describe('splitLesson', () => {
  it('splits on ## headings but not inside code fences', () => {
    const s = splitLesson(EN);
    expect(s.map(x => x.heading)).toEqual(['Why it matters', 'Practice']);
    expect(s[0].segments).toHaveLength(1);
    expect(s[0].segments[0]).toMatchObject({ type: 'md' });
    expect((s[0].segments[0] as { text: string }).text).toContain('## not a heading');
    expect(s[1].segments.map(x => (x.type === 'md' ? 'md' : x.kind))).toEqual(['quiz', 'md']);
  });

  it('accepts a Chinese file with the same shape', () => {
    expect(compareShapes(splitLesson(EN), splitLesson(ZH))).toEqual([]);
  });

  it('reports shape differences', () => {
    const broken = ZH.replace(/```quiz[\s\S]*?```\n/, '');
    expect(compareShapes(splitLesson(EN), splitLesson(broken))[0]).toMatch(/section 2/);
    expect(compareShapes(splitLesson(EN), splitLesson('## only one'))[0]).toMatch(/2 "##" sections/);
  });
});

describe('checkZhOverlay', () => {
  const base = { id: 'q1', question: 'Q?', options: ['a', 'b'], answer: 0 };
  it('accepts a translated quiz', () => {
    expect(checkZhOverlay('quiz', '{"question":"问？","options":["甲","乙"]}', base).errors).toEqual([]);
  });
  it('rejects option count mismatches and missing text', () => {
    expect(checkZhOverlay('quiz', '{"question":"问？","options":["甲"]}', base).errors[0]).toMatch(/1 items, English has 2/);
    expect(checkZhOverlay('reveal', '{"prompt":"问"}', {}).errors[0]).toMatch(/answer/);
  });
});
