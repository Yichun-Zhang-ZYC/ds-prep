/**
 * One-off generator: content/INDEX.md → content/curriculum.json.
 *
 * Lesson ids are permanent (they are Firestore keys), so this script refuses to
 * overwrite an existing curriculum.json unless --force is passed. After the first
 * run, edit curriculum.json by hand.
 *
 * Granularity rules:
 *   - "## N. Title"            → section
 *   - "* Bullet" with children → subtopic; each "   * Child" → lesson
 *   - "* Bullet" without children → lesson; consecutive ones are grouped into one
 *     subtopic (titled after the bullet if alone, otherwise "Core Topics")
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const INDEX = resolve(ROOT, 'content/INDEX.md');
const OUT = resolve(ROOT, 'content/curriculum.json');

const SECTION_META: Record<string, { id: string; description: string }> = {
  'SQL': { id: 'sql', description: 'Querying, aggregation, joins, window functions and classic interview patterns.' },
  'Python & Data Manipulation': { id: 'python', description: 'Core Python, NumPy, pandas and from-scratch coding questions.' },
  'Math Foundations': { id: 'math', description: 'Linear algebra, calculus, optimization and information theory for ML.' },
  'Probability': { id: 'probability', description: 'Counting, conditional probability, distributions and brain-teasers.' },
  'Statistics & Inference': { id: 'statistics', description: 'Sampling, estimation, hypothesis testing and regression.' },
  'Experimentation & Causal Inference': { id: 'experimentation', description: 'A/B test design, analysis pitfalls and causal methods.' },
  'Machine Learning': { id: 'ml', description: 'Fundamentals, core algorithms, evaluation and practical issues.' },
  'Deep Learning': { id: 'deep-learning', description: 'Neural networks, training techniques and modern architectures.' },
  'NLP & LLMs': { id: 'nlp-llms', description: 'Embeddings, transformers, LLM training, fine-tuning and efficiency.' },
  'GenAI Application Engineering': { id: 'genai-eng', description: 'Prompting, RAG, agents, evaluation, guardrails and LLMOps.' },
  'Computer Vision': { id: 'computer-vision', description: 'Classification, detection, segmentation and vision transformers.' },
  'Time Series & Forecasting': { id: 'time-series', description: 'Stationarity, ARIMA, ML forecasting and backtesting.' },
  'Recommender & Ranking Systems': { id: 'recsys', description: 'Collaborative filtering, two-tower models and learning to rank.' },
  'ML System Design': { id: 'ml-system-design', description: 'A repeatable design framework plus classic design questions.' },
  'MLOps': { id: 'mlops', description: 'Tracking, registries, pipelines, serving, monitoring and deployment.' },
  'Data Engineering': { id: 'data-engineering', description: 'Data modeling, storage, ETL, Spark, streaming and orchestration.' },
  'Cloud, DevOps & DataOps': { id: 'cloud-devops', description: 'Linux, Git, containers, Kubernetes, CI/CD, IaC and cloud services.' },
  'Data Analysis & BI': { id: 'analytics-bi', description: 'Business metrics, dashboards, BI tools and analytics case studies.' },
  'Product Sense, Metrics & AI PM': { id: 'product-sense', description: 'North-star metrics, product cases and AI product management.' },
  'Data Structures & Algorithms': { id: 'dsa', description: 'Complexity and the core patterns for coding interviews.' },
  'Software Engineering for Data/AI': { id: 'swe', description: 'Production Python, testing, APIs and backend basics.' },
  'Consulting & Case Interviews': { id: 'consulting', description: 'Case frameworks, market sizing and structuring ambiguous problems.' },
  'Behavioral Interviews': { id: 'behavioral', description: 'STAR stories, project deep dives and the questions to ask back.' },
};

// INDEX.md role table columns → curriculum role keys (DESIGN.md §6.1)
const COLUMN_ROLES = [
  ['ds', 'aids'],
  ['da', 'bi'],
  ['de'],
  ['mle', 'mlsci'],
  ['aidev'],
  ['mlops', 'devops', 'dataops'],
];

// Parenthetical asides are dropped from ids: "Order of execution (FROM → …)" → "order-of-execution"
const slug = (s: string) =>
  s.replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Hand-picked ids where the slug of the INDEX title reads badly
const ID_OVERRIDES: Record<string, string> = {
  'sql-count-vs-count-vs-count': 'sql-count-star-vs-count-col-vs-count-distinct',
};

const join = (sectionId: string, title: string) => {
  const t = slug(title);
  return t === sectionId || t.startsWith(sectionId + '-') ? t : `${sectionId}-${t}`;
};

const clip = (s: string, max = 64) => (s.length <= max ? s : s.slice(0, max).replace(/-[^-]*$/, ''));

type Lesson = { id: string; title: string };
type Subtopic = { id: string; title: string; lessons: Lesson[] };
type Section = { id: string; title: string; description: string; roles: Record<string, number>; subtopics: Subtopic[] };

function main() {
  if (existsSync(OUT) && !process.argv.includes('--force')) {
    console.error('content/curriculum.json already exists. Lesson ids are permanent; edit it by hand or pass --force.');
    process.exit(1);
  }
  const md = readFileSync(INDEX, 'utf8');
  const lines = md.split('\n');

  // Role table
  const roles = new Map<string, Record<string, number>>();
  for (const line of lines) {
    const m = line.match(/^\|\s*(\d+)\.\s*(.+?)\s*\|(.+)\|\s*$/);
    if (!m) continue;
    const cells = m[3].split('|').map(c => c.trim());
    const r: Record<string, number> = {};
    cells.forEach((c, i) => {
      const stars = (c.match(/★/g) || []).length;
      for (const key of COLUMN_ROLES[i] ?? []) r[key] = stars;
    });
    roles.set(m[2], r);
  }

  const sections: Section[] = [];
  // Lesson ids and subtopic ids are separate namespaces; each must be unique within its own.
  const makeUniq = () => {
    const seen = new Set<string>();
    return (id: string) => {
      id = ID_OVERRIDES[id] ?? id;
      let out = id, n = 2;
      while (seen.has(out)) out = `${id}-${n++}`;
      seen.add(out);
      return out;
    };
  };
  const uniqLesson = makeUniq();
  const uniq = makeUniq();

  let sec: Section | null = null;
  let tree: { title: string; children: string[] }[] = [];

  const flush = () => {
    if (!sec) return;
    let loose: string[] = [];
    const pushLoose = () => {
      if (!loose.length) return;
      const title = loose.length === 1 ? loose[0] : 'Core Topics';
      sec!.subtopics.push({
        id: uniq(clip(join(sec!.id, title))),
        title,
        lessons: loose.map(t => ({ id: uniqLesson(clip(join(sec!.id, t))), title: t })),
      });
      loose = [];
    };
    for (const node of tree) {
      if (node.children.length === 0) { loose.push(node.title); continue; }
      pushLoose();
      sec.subtopics.push({
        id: uniq(clip(join(sec.id, node.title))),
        title: node.title,
        lessons: node.children.map(t => ({ id: uniqLesson(clip(join(sec!.id, t))), title: t })),
      });
    }
    pushLoose();
    sections.push(sec);
  };

  for (const line of lines) {
    const h = line.match(/^##\s+\d+\.\s+(.+?)\s*$/);
    if (h) {
      flush();
      const title = h[1];
      const meta = SECTION_META[title];
      if (!meta) throw new Error(`No SECTION_META for "${title}"`);
      sec = { id: meta.id, title, description: meta.description, roles: roles.get(title) ?? {}, subtopics: [] };
      tree = [];
      continue;
    }
    if (!sec) continue;
    const top = line.match(/^\*\s+(.+?)\s*$/);
    if (top) { tree.push({ title: top[1], children: [] }); continue; }
    const child = line.match(/^\s{2,}\*\s+(.+?)\s*$/);
    if (child && tree.length) tree[tree.length - 1].children.push(child[1]);
  }
  flush();

  writeFileSync(OUT, JSON.stringify({ sections }, null, 2) + '\n');
  const lessonCount = sections.reduce((a, s) => a + s.subtopics.reduce((b, st) => b + st.lessons.length, 0), 0);
  console.log(`Wrote ${sections.length} sections, ${lessonCount} lessons → content/curriculum.json`);
}

main();
