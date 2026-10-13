import { Link, useNavigate } from 'react-router-dom';
import { ORDER, SECTIONS, SECTION_BY_ID } from '../content/loadCurriculum';
import { ROLE_KEYS, ROLE_LABELS, type RoleKey, type Section } from '../content/types';
import { useAuth } from '../auth/useAuth';
import { Header } from '../components/layout/Header';
import { ProgressBar } from '../components/progress/ProgressBar';
import { continueTarget, formatMinutes, stats, type Stats } from '../progress/derive';
import type { ProgressMap } from '../progress/types';
import { useProgress } from '../progress/useProgress';

const STATE_LABEL: Record<Stats['state'], { text: string; cls: string }> = {
  'not-started': { text: 'Not started', cls: '' },
  'in-progress': { text: 'In progress', cls: 'bg-accent-soft text-accent' },
  completed: { text: 'Completed', cls: 'bg-success-soft text-success' },
  'coming-soon': { text: 'Coming soon', cls: '' },
};

const PRIORITY = ['Optional', 'Useful', 'Important', 'Core'];

function Stars({ n }: { n: number }) {
  if (!n) return <span className="badge">Optional</span>;
  return (
    <span className="whitespace-nowrap text-[13px] tracking-[1px] text-accent" aria-label={`${PRIORITY[n]} for this role (${n} of 3 stars)`} title={`${PRIORITY[n]} for this role`}>
      {'★'.repeat(n)}
      <span className="text-track">{'★'.repeat(3 - n)}</span>
    </span>
  );
}

function SectionCard({ section, progress, role }: { section: Section; progress: ProgressMap; role: RoleKey | null }) {
  const s = stats(section.lessons, progress);
  const label = STATE_LABEL[s.state];
  const stars = role ? section.roles[role] ?? 0 : null;
  return (
    <Link
      to={`/section/${section.id}`}
      className={`card grid grid-rows-[auto_1fr_auto] gap-3.5 p-5 transition hover:-translate-y-px hover:border-accent ${stars === 0 ? 'opacity-55' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-semibold leading-snug">{section.title}</h3>
        {stars !== null && <Stars n={stars} />}
      </div>
      <p className="text-sm text-muted">{section.description}</p>
      <div className="grid gap-2 text-[13px]">
        <ProgressBar pct={s.pct} label={`${section.title} progress`} />
        <div className="flex items-center justify-between gap-2 text-muted">
          <span className="tabular-nums">
            {s.total ? `${s.completed} / ${s.total} lessons` : `${s.planned} lessons planned`}
          </span>
          <span className={`badge ${label.cls}`}>{label.text}</span>
        </div>
        <div className="tabular-nums text-muted">
          {s.state === 'coming-soon' ? 'Content in progress' : s.minutesLeft ? `~${formatMinutes(s.minutesLeft)} left` : 'All done'}
          {s.total > 0 && s.planned > 0 && ` · ${s.planned} more planned`}
        </div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { user: authUser } = useAuth();
  const { progress, user, setTargetRole, ready } = useProgress();
  const navigate = useNavigate();
  const role = user?.targetRole ?? null;

  const all = stats(ORDER, progress);
  const next = continueTarget(ORDER, progress, user?.lastLessonId ?? null);
  const nextSection = next ? SECTION_BY_ID.get(next.sectionId) : null;
  const firstName = (user?.displayName || authUser?.displayName || 'there').split(' ')[0];
  const started = progress.size > 0;

  // Role filter (DESIGN.md §5.2): stable sort by stars, sections with no stars dimmed.
  const sections = role ? [...SECTIONS].sort((a, b) => (b.roles[role] ?? 0) - (a.roles[role] ?? 0)) : SECTIONS;

  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-[1160px] gap-7 px-4 pb-16 pt-8">
        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="grid content-start gap-2.5">
            <span className="eyebrow">My Learning</span>
            <h1 className="text-[28px] font-bold tracking-tight">{started ? `Welcome back, ${firstName}` : `Welcome, ${firstName}`}</h1>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[40px] font-bold tabular-nums tracking-tight">{all.pct}%</span>
              <span className="tabular-nums text-muted">
                {all.completed} of {all.total} lessons complete
              </span>
            </div>
            <ProgressBar pct={all.pct} label="Overall progress" />
          </div>
          {next && nextSection && (
            <div className="grid content-between gap-3 rounded-card border border-border bg-surface p-5">
              <div className="eyebrow">{started ? 'Continue where you left off' : 'Start here'}</div>
              <div>
                <div className="text-[17px] font-semibold">{next.title}</div>
                <div className="text-sm text-muted">
                  {nextSection.title} · {next.estimatedMinutes} min
                </div>
              </div>
              <div>
                <button className="btn btn-primary" onClick={() => navigate(`/lesson/${next.sectionId}/${next.id}`)} disabled={!ready}>
                  {started ? 'Continue learning →' : 'Start learning →'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6">
            <div>
              <h2 className="text-xl font-semibold">Sections</h2>
              <p className="text-sm text-muted">{role ? `Sorted by priority for ${ROLE_LABELS[role]}` : 'In learning order'}</p>
            </div>
            <label className="grid w-full gap-1 text-[13px] text-muted sm:w-auto" htmlFor="target-role">
              Target role
              <select
                id="target-role"
                className="input sm:min-w-[240px]"
                value={role ?? ''}
                onChange={e => setTargetRole((e.target.value || null) as RoleKey | null)}
              >
                <option value="">All roles</option>
                {ROLE_KEYS.map(k => (
                  <option key={k} value={k}>{ROLE_LABELS[k]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map(s => (
              <SectionCard key={s.id} section={s} progress={progress} role={role} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
