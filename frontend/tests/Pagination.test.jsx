import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import Pagination from '../src/components/ui/Pagination.jsx';

describe('Pagination', () => {
  test('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination pagination={{ page: 1, pages: 1, total: 5 }} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing when pagination is not yet loaded', () => {
    const { container } = render(<Pagination pagination={null} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('disables "Previous" on the first page and "Next" on the last page', () => {
    const { rerender } = render(
      <Pagination pagination={{ page: 1, pages: 3, total: 30 }} onPageChange={() => {}} />,
    );
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();

    rerender(<Pagination pagination={{ page: 3, pages: 3, total: 30 }} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
  });

  test('calls onPageChange with the next/previous page number', () => {
    const onPageChange = vi.fn();
    render(<Pagination pagination={{ page: 2, pages: 5, total: 50 }} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
