import { render, screen } from '@testing-library/react';
import ReactMarkdown from 'react-markdown';
import { remarkCallouts } from './remarkCallouts';

describe('remarkCallouts', () => {
  it('turns > [!TIP] Title into an aside with that title', () => {
    const { container } = render(
      <ReactMarkdown remarkPlugins={[remarkCallouts]}>{'> [!TIP] Interview tips\n> - Ask about ties'}</ReactMarkdown>,
    );
    const aside = container.querySelector('aside.callout-tip');
    expect(aside).not.toBeNull();
    expect(aside?.getAttribute('data-title')).toBe('Interview tips');
    expect(screen.getByText('Ask about ties')).toBeInTheDocument();
    expect(container.textContent).not.toContain('[!TIP]');
  });

  it('leaves plain blockquotes alone', () => {
    const { container } = render(<ReactMarkdown remarkPlugins={[remarkCallouts]}>{'> just a quote'}</ReactMarkdown>);
    expect(container.querySelector('blockquote')).not.toBeNull();
  });
});
