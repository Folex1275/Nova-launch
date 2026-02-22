import { useEffect, useMemo, useRef } from 'react';
import { Button } from '../UI/Button';
import { FireIcon } from '../UI/Icons';
import './BurnConfirmationModal.css';

type BurnWarningLevel = 'notice' | 'high' | 'critical' | null;

interface BurnConfirmationModalProps {
  isOpen: boolean;
  burnAmount: string;
  currentBalance: string;
  currentSupply: string;
  totalBurned: string;
  tokenSymbol?: string;
  isLoading?: boolean;
  transactionProgress?: number;
  transactionStatus?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function toNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: number, tokenSymbol: string): string {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${tokenSymbol}`;
}

function getWarning(percentOfSupply: number): {
  level: BurnWarningLevel;
  message: string | null;
} {
  if (percentOfSupply > 50) {
    return {
      level: 'critical',
      message: 'Critical: This burn removes more than 50% of current supply.',
    };
  }

  if (percentOfSupply > 25) {
    return {
      level: 'high',
      message: 'High impact: This burn removes more than 25% of current supply.',
    };
  }

  if (percentOfSupply > 10) {
    return {
      level: 'notice',
      message: 'Notice: This burn removes more than 10% of current supply.',
    };
  }

  return { level: null, message: null };
}

export function BurnConfirmationModal({
  isOpen,
  burnAmount,
  currentBalance,
  currentSupply,
  totalBurned,
  tokenSymbol = 'TOKENS',
  isLoading = false,
  transactionProgress,
  transactionStatus,
  error = null,
  onConfirm,
  onCancel,
}: BurnConfirmationModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const burn = useMemo(() => Math.max(0, toNumber(burnAmount)), [burnAmount]);
  const balance = useMemo(
    () => Math.max(0, toNumber(currentBalance)),
    [currentBalance]
  );
  const supply = useMemo(() => Math.max(0, toNumber(currentSupply)), [currentSupply]);
  const burned = useMemo(() => Math.max(0, toNumber(totalBurned)), [totalBurned]);

  const newBalance = Math.max(0, balance - burn);
  const newSupply = Math.max(0, supply - burn);
  const newTotalBurned = burned + burn;
  const percentOfSupply = supply > 0 ? (burn / supply) * 100 : 0;

  const { level: warningLevel, message: warningMessage } = getWarning(percentOfSupply);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const initialFocus = dialogRef.current?.querySelector<HTMLElement>(
      '[data-initial-focus="true"]'
    );
    initialFocus?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const root = dialogRef.current;
      if (!root) {
        return;
      }

      const focusableElements = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) {
    return null;
  }

  const warningClass =
    warningLevel === 'critical'
      ? 'burn-warning-critical'
      : warningLevel === 'high'
      ? 'burn-warning-high'
      : 'burn-warning-notice';

  return (
    <div
      className="burn-confirmation-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="burn-confirm-title"
      aria-describedby="burn-confirm-description"
      onClick={() => {
        if (!isLoading) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="burn-confirmation-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <h2 id="burn-confirm-title" className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FireIcon className="w-6 h-6 text-red-600" />
            Confirm Token Burn
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close burn confirmation"
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {warningMessage && (
          <div className={`burn-warning-banner ${warningClass}`} role="status">
            {warningMessage}
          </div>
        )}

        <div id="burn-confirm-description" className="burn-confirmation-section">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Burn Summary</h3>
          <div className="burn-summary-grid text-sm text-gray-700">
            <div className="burn-summary-row">
              <span>Burn Amount</span>
              <span className="font-semibold text-gray-900">
                {formatAmount(burn, tokenSymbol)}
              </span>
            </div>
            <div className="burn-summary-row">
              <span>Current Balance</span>
              <span>{formatAmount(balance, tokenSymbol)}</span>
            </div>
            <div className="burn-summary-row">
              <span>New Balance</span>
              <span>{formatAmount(newBalance, tokenSymbol)}</span>
            </div>
          </div>
        </div>

        <div className="burn-confirmation-section">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Supply Impact</h3>
          <div className="burn-summary-grid text-sm text-gray-700">
            <div className="burn-summary-row">
              <span>Current Supply</span>
              <span>{formatAmount(supply, tokenSymbol)}</span>
            </div>
            <div className="burn-summary-row">
              <span>New Supply</span>
              <span>{formatAmount(newSupply, tokenSymbol)}</span>
            </div>
            <div className="burn-summary-row">
              <span>% of Supply Burned</span>
              <span>{percentOfSupply.toFixed(2)}%</span>
            </div>
            <div className="burn-summary-row">
              <span>Total Burned (After)</span>
              <span>{formatAmount(newTotalBurned, tokenSymbol)}</span>
            </div>
          </div>
        </div>

        <div className="burn-permanent-warning" role="alert">
          This is a permanent action and cannot be undone.
        </div>

        {error && (
          <div className="burn-error-banner" role="alert">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="burn-progress" aria-live="polite">
            <div>{transactionStatus ?? 'Submitting burn transaction...'}</div>
            {typeof transactionProgress === 'number' && (
              <div className="burn-progress-track">
                <div
                  className="burn-progress-bar"
                  style={{ width: `${Math.min(Math.max(transactionProgress, 0), 100)}%` }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(Math.max(transactionProgress, 0), 100)}
                  aria-label="Burn transaction progress"
                />
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            loading={isLoading}
            aria-label="Confirm burn transaction"
            data-initial-focus="true"
          >
            Confirm Burn
          </Button>
        </div>
      </div>
    </div>
  );
}
