"use client";
import React from "react";
import { Modal } from "@/components/ta/ui/modal";
import Button from "@/components/ta/ui/button/Button";

/**
 * DialogAdapter - Thin translation layer from shadcn AlertDialog API to TailAdmin Modal.
 * 
 * Maps shadcn AlertDialog props to TailAdmin Modal:
 * - isOpen → isOpen (direct)
 * - onOpenChange → onClose (inverted logic)
 * - title, description → rendered content
 * - onConfirm, confirmLabel, cancelLabel → action buttons
 * 
 * Does NOT modify business logic.
 */

export interface DialogAdapterProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when open state should change */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description?: string;
  /** Called when confirm button is clicked */
  onConfirm?: () => void;
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Variant for confirm button */
  confirmVariant?: "primary" | "outline";
  /** Destructive action - shows error color */
  destructive?: boolean;
  /** Additional class name for the modal */
  className?: string;
  /** Children to render in the dialog body */
  children?: React.ReactNode;
}

const DialogAdapter: React.FC<DialogAdapterProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  destructive = false,
  className = "",
  children,
}) => {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onOpenChange(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className={`max-w-md p-6 lg:p-8 ${className}`}
      showCloseButton={false}
    >
      <div className="text-center">
        {/* Icon for destructive actions */}
        {destructive && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <svg
              className="h-6 w-6 text-error-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        )}

        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}

        {/* Custom children content */}
        {children && <div className="mb-6">{children}</div>}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={handleClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            className={
              destructive
                ? "bg-error-500 hover:bg-error-600 border-error-500"
                : ""
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DialogAdapter;
