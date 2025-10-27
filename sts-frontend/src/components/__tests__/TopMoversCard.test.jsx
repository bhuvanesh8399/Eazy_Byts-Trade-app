// src/components/__tests__/TopMoversCard.test.jsx
import { render, screen } from '@testing-library/react';
import TopMoversCard from '../../components/TopMoversCard';

describe('TopMoversCard', () => {
  it('renders gainers and losers', () => {
    const quotes = {
      AAPL: { changePct: 2 },
      TSLA: { changePct: -3 },
      MSFT: { changePct: 1 },
    };
    render(<TopMoversCard quotes={quotes} />);
    expect(screen.getByText('Top Movers')).toBeInTheDocument();
  });
});

