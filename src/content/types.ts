// ---------- curriculum.json ----------

export const ROLE_KEYS = ['ds', 'aids', 'da', 'bi', 'de', 'mle', 'mlsci', 'aidev', 'mlops', 'devops', 'dataops'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  ds: 'Data Scientist',
  aids: 'AI Data Scientist',
  da: 'Data Analyst',
  bi: 'BI Developer',
  de: 'Data Engineer',
  mle: 'ML Engineer',
  mlsci: 'ML Scientist',
  aidev: 'AI Developer / Engineer',
  mlops: 'MLOps Engineer',
  devops: 'DevOps Engineer',
  dataops: 'DataOps Engineer',
};

export interface CurriculumLessonRef {
  id: string;
  /** Planning title from INDEX.md; the lesson file's frontmatter title wins once written. */
  title: string;
}

export interface CurriculumSubtopic {
  id: string;
  title: string;
  lessons: CurriculumLessonRef[];
}

export interface CurriculumSection {
  id: string;
  title: string;
  description: string;
  roles: Partial<Record<RoleKey, number>>;
  subtopics: CurriculumSubtopic[];
}

export interface Curriculum {
  sections: CurriculumSection[];
}

// ---------- Lesson files ----------

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface LessonFrontmatter {
  id: string;
  title: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  tags: string[];
}

export type BlockKind = 'quiz' | 'sql-exercise' | 'python-exercise' | 'reveal';
export const BLOCK_KINDS: BlockKind[] = ['quiz', 'sql-exercise', 'python-exercise', 'reveal'];

/** Build-time metadata for one lesson file (produced by the content plugin). */
export interface LessonMeta extends LessonFrontmatter {
  sectionId: string;
  /** Interactive block kinds present in the body, for the Quiz / SQL / Python badges. */
  blocks: BlockKind[];
}

// ---------- Interactive block schemas (DESIGN.md §6.3) ----------

export interface QuizBlockData {
  id: string;
  question: string;
  options: string[];
  type?: 'single' | 'multi';
  answer: number | number[];
  explanation?: string;
}

export interface SqlExerciseData {
  id: string;
  prompt: string;
  setup: string;
  starterCode: string;
  solution: string;
  orderMatters?: boolean;
  hints?: string[];
}

export interface PythonExerciseData {
  id: string;
  prompt: string;
  setup?: string;
  starterCode: string;
  tests: string;
  solution: string;
  packages?: string[];
  hints?: string[];
}

export interface RevealBlockData {
  prompt: string;
  answer: string;
}

// ---------- Resolved curriculum used by the UI ----------

export interface Lesson {
  id: string;
  sectionId: string;
  subtopicId: string;
  title: string;
  /** False when the lesson is planned in curriculum.json but has no file yet ("Coming soon"). */
  available: boolean;
  estimatedMinutes: number;
  difficulty?: Difficulty;
  blocks: BlockKind[];
}

export interface Subtopic {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Section {
  id: string;
  title: string;
  description: string;
  roles: Partial<Record<RoleKey, number>>;
  subtopics: Subtopic[];
  lessons: Lesson[];
}
