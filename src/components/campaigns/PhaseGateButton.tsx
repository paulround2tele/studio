"use client";

import Button from '@/components/ta/ui/button/Button';
import { LoaderIcon } from '@/icons';
import type { ComponentType } from 'react';

interface PhaseGateButtonProps {
  label: string;
  onClick: () => Promise<void> | void;
  disabled?: boolean;
  isLoading?: boolean;
  Icon?: ComponentType<{ className?: string }>;
  variant?: "primary" | "outline";
  className?: string;
}

export default function PhaseGateButton({
  label,
  onClick,
  disabled = false,
  isLoading = false,
  Icon,
  variant = "primary",
  className
}: PhaseGateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      className={className}
    >
      {isLoading ? (
        <LoaderIcon className="mr-2 h-4 w-4" />
      ) : (
        Icon && <Icon className="mr-2 h-4 w-4" />
      )}
      {isLoading ? "Processing..." : label}
    </Button>
  );
}
