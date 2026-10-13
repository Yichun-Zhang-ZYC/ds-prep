/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { lessonMetaFromFile } from './src/content/parse.ts';

const LESSONS_DIR = resolve(import.meta.dirname, 'content/lessons');
const META_ID = 'virtual:lesson-meta';
const RESOLVED_META_ID = '\0' + META_ID;

/**
 * Exposes `virtual:lesson-meta`: frontmatter + block kinds for every lesson file.
 * The sidebar and progress bars need this for all lessons up front, while lesson
 * bodies stay code-split via import.meta.glob (DESIGN.md §11).
 */
function lessonMetaPlugin(): Plugin {
  const collect = () => {
    const metas: unknown[] = [];
    if (!existsSync(LESSONS_DIR)) return metas;
    for (const sectionId of readdirSync(LESSONS_DIR)) {
      const dir = resolve(LESSONS_DIR, sectionId);
      let files: string[];
      try { files = readdirSync(dir).filter(f => f.endsWith('.md')); } catch { continue; }
      for (const f of files) {
        const { meta, errors } = lessonMetaFromFile(readFileSync(resolve(dir, f), 'utf8'), sectionId);
        if (meta) metas.push(meta);
        else console.warn(`[lesson-meta] ${sectionId}/${f}: ${errors.join('; ')}`);
      }
    }
    return metas;
  };
  return {
    name: 'ds-prep-lesson-meta',
    resolveId(id) {
      if (id === META_ID) return RESOLVED_META_ID;
    },
    load(id) {
      if (id === RESOLVED_META_ID) return `export default ${JSON.stringify(collect())};`;
    },
    configureServer(server) {
      server.watcher.add(LESSONS_DIR);
      const onChange = (file: string) => {
        if (relative(LESSONS_DIR, file).startsWith('..')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_META_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.watcher.on('change', onChange);
    },
  };
}

export default defineConfig({
  base: '/ds-prep/',
  plugins: [react(), tailwindcss(), lessonMetaPlugin()],
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
