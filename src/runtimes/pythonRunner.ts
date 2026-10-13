export interface PythonResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error?: string;
  timedOut?: boolean;
  stopped?: boolean;
  /** The Pyodide runtime itself couldn't load (network / CDN). */
  loadFailed?: boolean;
}

export const PYTHON_TIMEOUT_MS = 10_000;

type Pending = { resolve(r: PythonResult): void; timer?: ReturnType<typeof setTimeout> };

/**
 * Owns one Pyodide Web Worker. Stop / timeout terminate the worker (the only way to
 * interrupt running Python) and the next run starts a fresh one.
 */
class PythonRunner {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private loadingListeners = new Set<(loading: boolean) => void>();
  private loaded = false;

  onLoadingChange(fn: (loading: boolean) => void): () => void {
    this.loadingListeners.add(fn);
    return () => this.loadingListeners.delete(fn);
  }

  private setLoading(v: boolean) {
    this.loadingListeners.forEach(fn => fn(v));
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./pyodideWorker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'loading') this.setLoading(true);
      else if (msg.type === 'started') {
        if (!this.loaded) {
          this.loaded = true;
          this.setLoading(false);
        }
        const p = this.pending.get(msg.id);
        if (p) p.timer = setTimeout(() => this.abort(msg.id, { timedOut: true }), PYTHON_TIMEOUT_MS);
      } else if (msg.type === 'result') {
        const p = this.pending.get(msg.id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        if (!this.loaded) {
          this.loaded = true;
          this.setLoading(false);
        }
        p.resolve({ ok: msg.ok, stdout: msg.stdout, stderr: msg.stderr, error: msg.error });
      }
    };
    w.onerror = e => {
      this.setLoading(false);
      console.error('Pyodide worker error', e.message);
      this.failAll('', true);
    };
    this.worker = w;
    return w;
  }

  private failAll(error: string, loadFailed = false) {
    this.pending.forEach(p => {
      clearTimeout(p.timer);
      p.resolve({ ok: false, stdout: '', stderr: '', error, loadFailed, stopped: !loadFailed });
    });
    this.pending.clear();
    this.worker?.terminate();
    this.worker = null;
    this.loaded = false;
  }

  private abort(id: number, flags: { timedOut?: boolean; stopped?: boolean }) {
    const p = this.pending.get(id);
    if (!p) return;
    this.pending.delete(id);
    this.worker?.terminate();
    this.worker = null;
    this.loaded = false;
    this.setLoading(false);
    p.resolve({ ok: false, stdout: '', stderr: '', ...flags });
    // Anything else queued on the dead worker is lost too.
    this.failAll('');
  }

  run(code: string, packages: string[] = []): Promise<PythonResult> {
    const id = ++this.seq;
    const w = this.ensureWorker();
    return new Promise(resolve => {
      this.pending.set(id, { resolve });
      w.postMessage({ id, code, packages });
    });
  }

  stop() {
    const ids = [...this.pending.keys()];
    if (ids.length) this.abort(ids[0], { stopped: true });
  }
}

let runner: PythonRunner | null = null;
/** Lazily created so lessons without Python never start a worker. */
export const getPythonRunner = () => (runner ??= new PythonRunner());
