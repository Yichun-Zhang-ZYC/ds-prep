import { Link, Navigate, useParams } from 'react-router-dom';
import { SECTION_BY_ID } from '../content/loadCurriculum';
import { Header } from '../components/layout/Header';
import { BlockBadges } from '../components/lesson/BlockBadges';
import { ProgressBar } from '../components/progress/ProgressBar';
import { StatusIcon } from '../components/progress/StatusIcon';
import { useI18n } from '../i18n/useI18n';
import { continueTarget, isTouched, lessonStatus, stats } from '../progress/derive';
import { useProgress } from '../progress/useProgress';
import { useToast } from '../components/Toast';

export function SectionPage() {
  const { sectionId = '' } = useParams();
  const section = SECTION_BY_ID.get(sectionId);
  const { progress, markUnread } = useProgress();
  const { t, loc } = useI18n();
  const toast = useToast();
  if (!section) return <Navigate to="/" replace />;

  const s = stats(section.lessons, progress);
  const available = section.lessons.filter(l => l.available);
  const next = continueTarget(available, progress, null);
  const title = loc(section.title, section.titleZh);

  return (
    <>
      <Header />
      <main className="mx-auto grid max-w-[1160px] gap-7 px-4 pb-16 pt-8">
        <nav aria-label={t('common.breadcrumb')} className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <Link to="/" className="hover:text-accent hover:underline">{t('common.myLearning')}</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{title}</span>
        </nav>

        <section className="grid items-end gap-x-8 gap-y-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h1 className="text-[30px] font-bold tracking-tight">{title}</h1>
            <p className="mt-1.5 max-w-[62ch] text-muted">{loc(section.description, section.descriptionZh)}</p>
          </div>
          <div className="grid gap-2 md:min-w-[280px]">
            <div className="flex justify-between text-sm tabular-nums text-muted">
              <span>{s.total ? t('dash.cardLessons', { done: s.completed, total: s.total }) : t('section.noLessons')}</span>
              <span>{s.pct}%</span>
            </div>
            <ProgressBar pct={s.pct} label={t('dash.progressOf', { title })} />
            {next ? (
              <Link to={`/lesson/${section.id}/${next.id}`} className="btn btn-primary">
                <span className="truncate">
                  {t(s.completed || isTouched(progress, next.id) ? 'section.continue' : 'section.start')}: {loc(next.title, next.titleZh)}
                </span>
              </Link>
            ) : s.total ? (
              <span className="badge bg-success-soft text-success">{t('section.complete')}</span>
            ) : (
              <span className="badge">{t('common.comingSoon')}</span>
            )}
          </div>
        </section>

        <div className="grid gap-3">
          {section.subtopics.map(sub => {
            const ss = stats(sub.lessons, progress);
            const subTitle = loc(sub.title, sub.titleZh);
            return (
              <details key={sub.id} open className="group overflow-hidden rounded-card border border-border">
                <summary className="flex list-none items-center gap-3 bg-surface px-4.5 py-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="text-muted transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                  <span className="min-w-0 flex-1 font-semibold">{subTitle}</span>
                  <span className="text-[13px] tabular-nums text-muted">{ss.total ? `${ss.completed} / ${ss.total}` : t('section.planned')}</span>
                  <ProgressBar pct={ss.pct} size="mini" label={t('dash.progressOf', { title: subTitle })} />
                </summary>
                {sub.lessons.map(l =>
                  l.available ? (
                    <div key={l.id} className="flex items-center gap-2 border-t border-border pl-3.5 hover:bg-surface">
                      <StatusIcon
                        status={lessonStatus(progress, l.id)}
                        onMarkUnread={() => {
                          markUnread(l.id);
                          toast(t('progress.markedUnread'));
                        }}
                      />
                      <Link
                        to={`/lesson/${section.id}/${l.id}`}
                        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 pr-4.5 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                      >
                        <span className="text-[15px]">{loc(l.title, l.titleZh)}</span>
                        <span className="hidden gap-1.5 md:flex"><BlockBadges blocks={l.blocks} /></span>
                        <span className="min-w-[52px] text-right text-[13px] tabular-nums text-muted">{t('common.minutes', { n: l.estimatedMinutes })}</span>
                      </Link>
                    </div>
                  ) : (
                    <div key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-border py-3 pl-3.5 pr-4.5 text-muted">
                      <StatusIcon status="soon" />
                      <span className="text-[15px]">{loc(l.title, l.titleZh)}</span>
                      <span className="text-[12px]">{t('common.comingSoon')}</span>
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
