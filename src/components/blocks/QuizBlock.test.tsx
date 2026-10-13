import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../Toast';
import { ProgressProvider } from '../../progress/ProgressProvider';
import { createMockStore } from '../../progress/mockStore';
import { QuizBlock } from './QuizBlock';

const renderQuiz = (data: Parameters<typeof QuizBlock>[0]['data']) =>
  render(
    <ToastProvider>
      <ProgressProvider store={createMockStore('quiz-test', undefined, { persist: false })}>
        <QuizBlock data={data} lessonId="l1" />
      </ProgressProvider>
    </ToastProvider>,
  );

describe('QuizBlock', () => {
  it('uses real radio inputs and shows the explanation when correct', async () => {
    renderQuiz({ id: 'q1', question: 'Pick B', options: ['A', 'B'], answer: 1, explanation: 'Because B.' });
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await userEvent.click(screen.getByLabelText('A'));
    await userEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    expect(screen.queryByText('Because B.')).toBeNull();
    await userEvent.click(screen.getByLabelText('B'));
    await userEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('Because B.')).toBeInTheDocument();
    expect(screen.getByText(/2 attempts/)).toBeInTheDocument();
  });

  it('uses checkboxes for multi-answer questions', async () => {
    renderQuiz({ id: 'q2', question: 'Pick A and C', options: ['A', 'B', 'C'], type: 'multi', answer: [0, 2] });
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await userEvent.click(screen.getByLabelText('A'));
    await userEvent.click(screen.getByLabelText('C'));
    await userEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });
});
