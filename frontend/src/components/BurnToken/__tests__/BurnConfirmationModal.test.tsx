import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { BurnConfirmationModal } from '../BurnConfirmationModal';

function renderModal(overrides?: Partial<ComponentProps<typeof BurnConfirmationModal>>) {
  const defaultProps: ComponentProps<typeof BurnConfirmationModal> = {
    isOpen: true,
    burnAmount: '100',
    currentBalance: '1000',
    currentSupply: '2000',
    totalBurned: '300',
    tokenSymbol: 'NOVA',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  const props = { ...defaultProps, ...overrides };
  render(<BurnConfirmationModal {...props} />);
  return props;
}

describe('BurnConfirmationModal', () => {
  it('renders core sections and summary values', () => {
    renderModal();

    expect(screen.getByText('Confirm Token Burn')).toBeInTheDocument();
    expect(screen.getByText('Burn Summary')).toBeInTheDocument();
    expect(screen.getByText('Supply Impact')).toBeInTheDocument();
    expect(screen.getByText('100 NOVA')).toBeInTheDocument();
    expect(screen.getByText('900 NOVA')).toBeInTheDocument();
    expect(screen.getByText('1,900 NOVA')).toBeInTheDocument();
    expect(screen.getByText('5.00%')).toBeInTheDocument();
  });

  it('shows notice warning when burn is above 10% of supply', () => {
    renderModal({ burnAmount: '220', currentSupply: '2000' });
    expect(
      screen.getByText(/Notice: This burn removes more than 10%/)
    ).toBeInTheDocument();
  });

  it('shows high warning when burn is above 25% of supply', () => {
    renderModal({ burnAmount: '600', currentSupply: '2000' });
    expect(
      screen.getByText(/High impact: This burn removes more than 25%/)
    ).toBeInTheDocument();
  });

  it('shows critical warning when burn is above 50% of supply', () => {
    renderModal({ burnAmount: '1100', currentSupply: '2000' });
    expect(
      screen.getByText(/Critical: This burn removes more than 50%/)
    ).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /confirm burn transaction/i }));
    expect(props.onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onCancel).toHaveBeenCalledOnce();
  });

  it('shows loading state and transaction progress', () => {
    renderModal({
      isLoading: true,
      transactionStatus: 'Broadcasting transaction...',
      transactionProgress: 45,
    });

    expect(screen.getByText('Broadcasting transaction...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('renders error message gracefully', () => {
    renderModal({ error: 'Transaction failed. Please retry.' });
    expect(
      screen.getByText('Transaction failed. Please retry.')
    ).toBeInTheDocument();
  });

  it('supports escape key to close when not loading', () => {
    const props = renderModal();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(props.onCancel).toHaveBeenCalledOnce();
  });

  it('does not close on escape while loading', () => {
    const props = renderModal({ isLoading: true });
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('traps tab focus within the modal', () => {
    renderModal();

    const closeButton = screen.getByRole('button', {
      name: 'Close burn confirmation',
    });
    const confirmButton = screen.getByRole('button', {
      name: /confirm burn transaction/i,
    });

    confirmButton.focus();
    expect(confirmButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true });
    expect(confirmButton).toHaveFocus();
  });
});
