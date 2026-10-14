import { act, render } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nProvider';
import { ToastProvider } from '../components/Toast';
import { createMockStore } from './mockStore';
import { ProgressProvider, type ProgressContextValue } from './ProgressProvider';
import { useProgress } from './useProgress';

function setup() {
  const ref: { current: ProgressContextValue | null } = { current: null };
  function Probe() {
    ref.current = useProgress();
    return null;
  }
  render(
    <I18nProvider>
      <ToastProvider>
        <ProgressProvider store={createMockStore('provider-test', { displayName: 'T' }, { persist: false })}>
          <Probe />
        </ProgressProvider>
      </ToastProvider>
    </I18nProvider>,
  );
  return ref;
}

describe('ProgressProvider', () => {
  it('marks a lesson unread but keeps quiz history, and re-marks it visited on the next visit', async () => {
    const ref = setup();
    await act(async () => {
      ref.current!.visit('l1');
      ref.current!.recordQuiz('l1', 'q1', true);
      ref.current!.setCompleted('l1', true);
    });
    expect(ref.current!.progress.get('l1')?.status).toBe('completed');

    await act(async () => ref.current!.markUnread('l1'));
    const p = ref.current!.progress.get('l1')!;
    expect(p.status).toBe('unvisited');
    expect(p.completedAt).toBeNull();
    expect(p.quiz.q1).toEqual({ correct: true, attempts: 1 });

    await act(async () => ref.current!.visit('l1'));
    expect(ref.current!.progress.get('l1')?.status).toBe('visited');
  });
});
