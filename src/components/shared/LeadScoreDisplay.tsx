import React from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import { PercentIcon, HelpCircleIcon } from '@/icons';

interface LeadScoreDisplayProps {
  score: number | undefined;
  className?: string;
}

/**
 * Shared LeadScoreDisplay component - used by both LatestActivityTable and DomainStreamingTable
 * Ensures consistent lead score display format across all components
 */
export const LeadScoreDisplay = React.memo<LeadScoreDisplayProps>(function LeadScoreDisplay({ 
  score, 
  className: _className = "" 
}) {
  const getScoreColor = (score: number | undefined): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark' => {
    if (score === undefined) return "light";
    if (score > 75) return "success";
    if (score > 50) return "primary";
    if (score > 25) return "warning";
    return "error";
  };

  if (score !== undefined) {
    return (
      <Badge color={getScoreColor(score)} size="sm">
        <PercentIcon className="mr-1 h-3 w-3" />
        {score}%
      </Badge>
    );
  }

  return (
    <Badge color="light" size="sm">
      <HelpCircleIcon className="mr-1 h-3 w-3" />
      N/A
    </Badge>
  );
});

LeadScoreDisplay.displayName = 'LeadScoreDisplay';