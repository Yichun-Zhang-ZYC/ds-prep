import { checkFrontmatter, checkQuiz, checkSqlExercise, extractBlocks, lessonMetaFromFile, splitFrontmatter } from './parse';

const LESSON = `---
id: demo-lesson
title: Demo
estimatedMinutes: 10
difficulty: easy
tags: [a, b]
---

## Concept
Text.

\`\`\`sql
SELECT 1;
\`\`\`

\`\`\`quiz
{ "id": "q1", "question": "Q?", "options": ["a", "b"], "answer": 1 }
\`\`\`

\`\`\`sql-exercise
{ "id": "ex1", "prompt": "p", "setup": "CREATE TABLE t (x INT);", "starterCode": "", "solution": "SELECT x FROM t;" }
\`\`\`
`;

describe('frontmatter', () => {
  it('splits and validates frontmatter', () => {
    const { data, body } = splitFrontmatter(LESSON);
    expect(body.startsWith('\n## Concept')).toBe(true);
    const { fm, errors } = checkFrontmatter(data);
    expect(errors).toEqual([]);
    expect(fm).toMatchObject({ id: 'demo-lesson', estimatedMinutes: 10, tags: ['a', 'b'] });
  });

  it('reports missing fields', () => {
    const { errors } = checkFrontmatter({ id: 'x', difficulty: 'impossible' });
    expect(errors).toHaveLength(3);
  });
});

describe('blocks', () => {
  it('extracts only interactive block kinds', () => {
    const blocks = extractBlocks(splitFrontmatter(LESSON).body);
    expect(blocks.map(b => b.kind)).toEqual(['quiz', 'sql-exercise']);
  });

  it('builds lesson metadata with block kinds for badges', () => {
    const { meta } = lessonMetaFromFile(LESSON, 'sql');
    expect(meta?.blocks).toEqual(['quiz', 'sql-exercise']);
    expect(meta?.sectionId).toBe('sql');
  });

  it('validates quiz answers against options', () => {
    expect(checkQuiz('{"id":"q","question":"?","options":["a","b"],"answer":2}').errors[0]).toMatch(/option index/);
    expect(checkQuiz('{"id":"q","question":"?","options":["a","b","c"],"type":"multi","answer":[0,2]}').errors).toEqual([]);
    expect(checkQuiz('{not json').errors[0]).toMatch(/invalid JSON/);
  });

  it('requires sql-exercise fields', () => {
    expect(checkSqlExercise('{"id":"e"}').errors.length).toBeGreaterThan(2);
  });
});
