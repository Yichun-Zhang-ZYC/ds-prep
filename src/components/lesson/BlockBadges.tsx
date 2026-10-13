import type { BlockKind } from '../../content/types';

export function BlockBadges({ blocks }: { blocks: BlockKind[] }) {
  return (
    <>
      {blocks.includes('quiz') && <span className="badge">Quiz</span>}
      {blocks.includes('sql-exercise') && <span className="badge bg-accent-soft text-accent">SQL</span>}
      {blocks.includes('python-exercise') && <span className="badge bg-warning-soft text-warning">Python</span>}
    </>
  );
}
