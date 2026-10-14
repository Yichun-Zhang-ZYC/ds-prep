import { Link, useNavigate } from 'react-router-dom';
import { ORDER, SECTIONS, SECTION_BY_ID } from '../content/loadCurriculum';
import { ROLE_KEYS, type RoleKey, type Section } from '../content/types';
import { useAuth } from '../auth/useAuth';
import { Header } from '../components/layout/Header';
import { ProgressBar } from '../components/progress/ProgressBar';
import { useI18n } from '../i18n/useI18n';
import { continueTarget, formatMinutes, isTouched, stats, type Stats } from '../progress/derive';
import type { ProgressMap } from '../progress/types';
import { useProgress } from '../progress/useProgress';

const STATE: Record<Stats['state'], { key: string; cls: string }> = {
  'not-started': { key: 'state.notStarted', cls: '' },
  'in-progress': { key: 'state.inProgress', cls: 'bg-accent-soft text-accent' },
  completed: { key: 'state.completed', cls: 'bg-success-soft text-success' },
  'coming-soon': { key: 'state.comingSoon', cls: '' },
};

function Stars({ n }: { n: number }) {
  const { t } = useI18n();
  if (!n) return <span className="badge">{t('priority.0')}</span>;
  const label = t('priority.forRole', { label: t(`priority.${n}`), n });
  return (
    <span className="whitespace-nowrap text-[13px] tracking-[1px] text-accent" aria-label={label} title={label}>
      {'★'.repeat(n)}
      <span className="text-track">{'★'.repeat(3 - n)}</span>
    </span>
  );
}

function SectionCard({ section, progress, role }: { section: Section; progress: ProgressMap; role: RoleKey | null }) {
  const { t, loc } = useI18n();
  const s = stats(section.lessons, progress);
  const label = STATE[s.state];
  const stars = role ? section.roles[role] ?? 0 : null;
  const title = loc(section.title, section.titleZh);
  return (
    <Link
      to={`/section/${section.id}`}
      className={`card grid grid-rows-[auto_1fr_auto] gap-3.5 p-5 transition hover:-translate-y-px hover:border-accent ${stars === 0 ? 'opacity-55' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-semibold leading-snug">{title}</h3>
        {stars !== null && <Stars n={stars} />}
      </div>
      <p className="text-sm text-muted">{loc(section.description, section.descriptionZh)}</p>
      <div className="grid gap-2 text-[13px]">
        <ProgressBar pct={s.pct} label={t('dash.progressOf', { title })} />
        <div className="flex items-center justify-between gap-2 text-muted">
          <span className="tabular-nums">
            {s.total ? t('dash.cardLessons', { done: s.completed, total: s.total }) : t('dash.cardPlanned', { n: s.planned })}
          </span>
          <span className={`badge ${label.cls}`}>{t(label.key)}</span>
        </div>
        <div className="tabular-nums text-muted">
          {s.state === 'coming-soon' ? t('dash.inProgressContent') : s.minutesLeft ? t('dash.timeLeft', { time: formatMinutes(s.minutesLeft) }) : t('dash.allDone')}
          {s.total > 0 && s.planned > 0 && t('dash.morePlanned', { n: s.planned })}
        </div>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const { user: authUser } = useAuth();
  const { progress, user, setTargetRole, ready } = useProgress();
  const { t, loc, roleLabel } = useI18n();
  const navigate = useNavigate();
  const role = user?.targetRole ?? null;

  const all = stats(ORDER, progress);
  const next = continueTarget(ORDER, progress, user?.lastLessonId ?? null);
  const nextSection = next ? SECTION_BY_ID.get(next.sectionId) : null;
  const firstName = (user?.displayName || authUser?.displayName || t('dash.there')).split(' ')[0];
  const started = ORDER.some(l => isTouched(progress, l.id));

  // Role filter (DESIGN.md §5.2): stable sort by stars, sections with no stars dimmed.
  const sections = role ? [...SECTIONS].sort((a, b) => (b.roles[role] ?? 0) - (a.roles[role] ?? 0)) : SECTIONS;

  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-[1160px] gap-7 px-4 pb-16 pt-8">
        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="grid content-start gap-2.5">
            <span className="eyebrow">{t('common.myLearning')}</span>
            <h1 className="text-[28px] font-bold tracking-tight">{t(started ? 'dash.welcomeBack' : 'dash.welcome', { name: firstName })}</h1>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[40px] font-bold tabular-nums tracking-tight">{all.pct}%</span>
              <span className="tabular-nums text-muted">{t('dash.lessonsComplete', { done: all.completed, total: all.total })}</span>
            </div>
            <ProgressBar pct={all.pct} label={t('dash.overall')} />
          </div>
          {next && nextSection && (
            <div className="grid content-between gap-3 rounded-card border border-border bg-surface p-5">
              <div className="eyebrow">{t(started ? 'dash.continueWhere' : 'dash.startHere')}</div>
              <div>
                <div className="text-[17px] font-semibold">{loc(next.title, next.titleZh)}</div>
                <div className="text-sm text-muted">
                  {loc(nextSection.title, nextSection.titleZh)} · {t('common.minutes', { n: next.estimatedMinutes })}
                </div>
              </div>
              <div>
                <button className="btn btn-primary" onClick={() => navigate(`/lesson/${next.sectionId}/${next.id}`)} disabled={!ready}>
                  {t(started ? 'dash.continue' : 'dash.start')}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-6">
            <div>
              <h2 className="text-xl font-semibold">{t('dash.sections')}</h2>
              <p className="text-sm text-muted">{role ? t('dash.sortedFor', { role: roleLabel(role) }) : t('dash.inOrder')}</p>
            </div>
            <label className="grid w-full gap-1 text-[13px] text-muted sm:w-auto" htmlFor="target-role">
              {t('dash.targetRole')}
              <select
                id="target-role"
                className="input sm:min-w-[240px]"
                value={role ?? ''}
                onChange={e => setTargetRole((e.target.value || null) as RoleKey | null)}
              >
                <option value="">{t('dash.allRoles')}</option>
                {ROLE_KEYS.map(k => (
                  <option key={k} value={k}>{roleLabel(k)}</option>
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
