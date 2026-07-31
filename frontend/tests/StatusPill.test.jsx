import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import StatusPill from '../src/components/ui/StatusPill.jsx';

describe('StatusPill', () => {
  test('renders the human-readable label for a known status', () => {
    render(<StatusPill status="in_progress" />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  test('falls back to the raw status if unrecognized', () => {
    render(<StatusPill status="mystery" />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });

  test('renders completed status with its label', () => {
    render(<StatusPill status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
