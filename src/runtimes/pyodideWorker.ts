/// <reference lib="webworker" />
/**
 * Runs Python in Pyodide off the main thread. Loaded from the CDN on first use.
 * Messages in:  { id, code, packages }
 * Messages out: { type: 'loading' } | { type: 'started', id } | { type: 'result', id, ok, stdout, stderr, error? }
 */
export const PYODIDE_VERSION = '0.27.2';
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

interface PyProxy { destroy(): void }
interface Pyodide {
  loadPackage(names: string[]): Promise<void>;
  runPythonAsync(code: string, opts?: { globals?: PyProxy }): Promise<unknown>;
  setStdout(opts: { batched: (s: string) => void }): void;
  setStderr(opts: { batched: (s: string) => void }): void;
  globals: { get(name: string): () => PyProxy };
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let pyodide: Promise<Pyodide> | null = null;

function getPyodide(): Promise<Pyodide> {
  if (!pyodide) {
    ctx.postMessage({ type: 'loading' });
    pyodide = import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`).then(m => m.loadPyodide({ indexURL: INDEX_URL }) as Promise<Pyodide>);
  }
  return pyodide;
}

/** Keeps only the user's frames from a Pyodide traceback. */
function cleanError(message: string): string {
  const lines = message.split('\n');
  const start = lines.findIndex(l => l.includes('File "<exec>"'));
  return (start >= 0 ? ['Traceback (most recent call last):', ...lines.slice(start)] : lines).join('\n').trim();
}

ctx.onmessage = async (e: MessageEvent<{ id: number; code: string; packages: string[] }>) => {
  const { id, code, packages } = e.data;
  let stdout = '';
  let stderr = '';
  try {
    const py = await getPyodide();
    if (packages.length) await py.loadPackage(packages);
    py.setStdout({ batched: s => (stdout += s + '\n') });
    py.setStderr({ batched: s => (stderr += s + '\n') });
    ctx.postMessage({ type: 'started', id });
    const ns = py.globals.get('dict')();
    try {
      await py.runPythonAsync(code, { globals: ns });
    } finally {
      ns.destroy();
    }
    ctx.postMessage({ type: 'result', id, ok: true, stdout, stderr });
  } catch (err) {
    ctx.postMessage({ type: 'result', id, ok: false, stdout, stderr, error: cleanError(String((err as Error)?.message ?? err)) });
  }
};
