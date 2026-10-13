import curriculumJson from '../../content/curriculum.json';
import lessonMetas from 'virtual:lesson-meta';
import type { Curriculum, Lesson, LessonMeta, Section } from './types';

/** Merges curriculum.json (order + planned lessons) with build-time lesson metadata. */
export function buildSections(curriculum: Curriculum, metas: LessonMeta[]): Section[] {
  const metaById = new Map(metas.map(m => [m.id, m]));
  return curriculum.sections.map(sec => {
    const subtopics = sec.subtopics.map(st => ({
      id: st.id,
      title: st.title,
      titleZh: st.titleZh,
      lessons: st.lessons.map((ref): Lesson => {
        const meta = metaById.get(ref.id);
        return {
          id: ref.id,
          sectionId: sec.id,
          subtopicId: st.id,
          title: meta?.title ?? ref.title,
          titleZh: meta?.titleZh ?? ref.titleZh,
          hasZh: !!meta?.titleZh,
          available: !!meta && meta.sectionId === sec.id,
          estimatedMinutes: meta?.estimatedMinutes ?? 0,
          difficulty: meta?.difficulty,
          blocks: meta?.blocks ?? [],
        };
      }),
    }));
    return {
      id: sec.id,
      title: sec.title,
      titleZh: sec.titleZh,
      description: sec.description,
      descriptionZh: sec.descriptionZh,
      roles: sec.roles,
      subtopics,
      lessons: subtopics.flatMap(s => s.lessons),
    };
  });
}

export const SECTIONS: Section[] = buildSections(curriculumJson as Curriculum, lessonMetas);
export const SECTION_BY_ID = new Map(SECTIONS.map(s => [s.id, s]));
export const LESSON_BY_ID = new Map(SECTIONS.flatMap(s => s.lessons).map(l => [l.id, l]));
/** Global learning order over lessons that exist (DESIGN.md §10). */
export const ORDER: Lesson[] = SECTIONS.flatMap(s => s.lessons).filter(l => l.available);

const bodies = import.meta.glob<string>('/content/lessons/*/*.md', { query: '?raw', import: 'default' });

/** Lazily loads one lesson's raw Markdown in English and, when it exists, Chinese (code-split per file). */
export async function loadLessonSource(sectionId: string, lessonId: string): Promise<{ en: string; zh: string | null } | null> {
  const loadEn = bodies[`/content/lessons/${sectionId}/${lessonId}.md`];
  if (!loadEn) return null;
  const loadZh = bodies[`/content/lessons/${sectionId}/${lessonId}.zh.md`];
  const [en, zh] = await Promise.all([loadEn(), loadZh ? loadZh() : Promise.resolve(null)]);
  return { en, zh };
}
