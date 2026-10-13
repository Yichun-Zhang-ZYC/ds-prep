/// <reference types="vite/client" />

declare module 'virtual:lesson-meta' {
  import type { LessonMeta } from './content/types';
  const metas: LessonMeta[];
  export default metas;
}
