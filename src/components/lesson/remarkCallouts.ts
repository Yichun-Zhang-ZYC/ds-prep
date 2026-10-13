/**
 * remark plugin: GitHub-style callouts.
 *   > [!TIP] Interview tips
 *   > - ...
 * becomes <aside class="callout callout-tip" data-title="Interview tips">…</aside>
 */
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

export const CALLOUT_TYPES = ['TIP', 'NOTE', 'WARNING'] as const;
const DEFAULT_TITLES: Record<string, string> = { TIP: 'Tip', NOTE: 'Note', WARNING: 'Warning' };
const MARKER = /^\[!(TIP|NOTE|WARNING)\][ \t]*([^\n]*)\n?/;

function visit(node: MdNode) {
  for (const child of node.children ?? []) {
    if (child.type === 'blockquote') transform(child);
    visit(child);
  }
}

function transform(bq: MdNode) {
  const para = bq.children?.[0];
  const text = para?.type === 'paragraph' ? para.children?.[0] : undefined;
  if (!para || text?.type !== 'text' || !text.value) return;
  const m = text.value.match(MARKER);
  if (!m) return;
  const kind = m[1];
  const title = m[2].trim() || DEFAULT_TITLES[kind];
  text.value = text.value.slice(m[0].length);
  // Drop the paragraph if the marker line was all it held.
  if (!text.value && para.children!.length === 1) bq.children!.shift();
  else if (!text.value) para.children!.shift();
  // A soft line break right after the marker would leave a leading newline.
  else text.value = text.value.replace(/^\n/, '');
  bq.data = {
    hName: 'aside',
    hProperties: { className: ['callout', `callout-${kind.toLowerCase()}`], dataTitle: title, dataKind: kind.toLowerCase() },
  };
}

export function remarkCallouts() {
  return (tree: MdNode) => visit(tree);
}
