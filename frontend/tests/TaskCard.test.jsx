import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import TaskCard from '../src/components/marketplace/TaskCard.jsx';

const task = {
  onChainId: 7,
  title: 'Build a Soroban landing page',
  description: 'Responsive marketing site for a testnet launch.',
  status: 'open',
  category: 'development',
  amount: '25000000',
  tags: ['react', 'stellar', 'tailwind'],
};

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('TaskCard', () => {
  test('renders the task title and status', () => {
    renderWithRouter(<TaskCard task={task} />);
    expect(screen.getByText(task.title)).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  test('formats the escrow amount from stroops to XLM', () => {
    renderWithRouter(<TaskCard task={task} />);
    expect(screen.getByText(/2.5 XLM/)).toBeInTheDocument();
  });

  test('links to the task detail route', () => {
    renderWithRouter(<TaskCard task={task} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/marketplace/7');
  });
});
