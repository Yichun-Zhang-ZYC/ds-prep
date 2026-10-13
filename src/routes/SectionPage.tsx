import { Link, Navigate, useParams } from 'react-router-dom';
import { SECTION_BY_ID } from '../content/loadCurriculum';
import { Header } from '../components/layout/Header';
import { BlockBadges } from '../components/lesson/BlockBadges';
import { ProgressBar } from '../components/progress/ProgressBar';
import { StatusIcon } from '../components/progress/StatusIcon';
import { continueTarget, lessonStatus, stats } from '../progress/derive';
import { useProgress } from '../progress/useProgress';

export function SectionPage() {
  const { sectionId = '' } = useParams();
  const section = SECTION_BY_ID.get(sectionId);
  const { progress } = useProgress();
  if (!section) return <Navigate to="/" replace />;

  const s = stats(section.lessons, progress);
  const available = section.lessons.filter(l => l.available);
  const next = continueTarget(available, progress, null);

  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-[1160px] gap-7 px-4 pb-16 pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <Link to="/" className="hover:text-accent hover:underline">My Learning</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{section.title}</span>
        </nav>

        <section className="grid items-end gap-x-8 gap-y-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h1 className="text-[30px] font-bold tracking-tight">{section.title}</h1>
            <p className="mt-1.5 max-w-[62ch] text-muted">{section.description}</p>
          </div>
          <div className="grid gap-2 md:min-w-[280px]">
            <div className="flex justify-between text-sm tabular-nums text-muted">
              <span>{s.total ? `${s.completed} / ${s.total} lessons` : 'No lessons yet'}</span>
              <span>{s.pct}%</span>
            </div>
            <ProgressBar pct={s.pct} label={`${section.title} progress`} />
            {next ? (
              <Link to={`/lesson/${section.id}/${next.id}`} className="btn btn-primary">
                <span className="truncate">{s.completed || progress.has(next.id) ? 'Continue' : 'Start'}: {next.title}</span>
              </Link>
            ) : s.total ? (
              <span className="badge bg-success-soft text-success">Section complete</span>
            ) : (
              <span className="badge">Coming soon</span>
            )}
          </div>
        </section>

        <div className="grid gap-3">
          {section.subtopics.map(sub => {
            const ss = stats(sub.lessons, progress);
            return (
              <details key={sub.id} open className="group overflow-hidden rounded-card border border-border">
                <summary className="flex list-none items-center gap-3 bg-surface px-4.5 py-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="text-muted transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                  <span className="min-w-0 flex-1 font-semibold">{sub.title}</span>
                  <span className="text-[13px] tabular-nums text-muted">{ss.total ? `${ss.completed} / ${ss.total}` : 'Planned'}</span>
                  <ProgressBar pct={ss.pct} size="mini" label={`${sub.title} progress`} />
                </summary>
                {sub.lessons.map(l =>
                  l.available ? (
                    <Link
                      key={l.id}
                      to={`/lesson/${section.id}/${l.id}`}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4.5 py-3 hover:bg-surface md:grid-cols-[auto_minmax(0,1fr)_auto_auto]"
                    >
                      <StatusIcon status={lessonStatus(progress, l.id)} />
                      <span className="text-[15px]">{l.title}</span>
                      <span className="hidden gap-1.5 md:flex"><BlockBadges blocks={l.blocks} /></span>
                      <span className="min-w-[52px] text-right text-[13px] tabular-nums text-muted">{l.estimatedMinutes} min</span>
                    </Link>
                  ) : (
                    <div key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4.5 py-3 text-muted">
                      <StatusIcon status="soon" />
                      <span className="text-[15px]">{l.title}</span>
                      <span className="text-[12px]">Coming soon</span>
                    </div>
                  ),
                )}
              </details>
            );
          })}
        </div>
      </main>
    </>
  );
}
