import React from 'react';
import Badge from '@/components/ta/ui/badge/Badge';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  AlertCircleIcon, 
  SearchIcon, 
  DnaIcon,
  ShieldQuestionIcon,
  HelpCircleIcon 
} from '@/icons';

export type DomainActivityStatus = 
  | 'validated' 
  | 'not_validated' 
  | 'Failed' 
  | 'Pending' 
  | 'generating' 
  | 'scanned' 
  | 'no_leads' 
  | 'n_a';

interface StatusBadgeProps {
  status: DomainActivityStatus;
  score?: number;
}

/**
 * Shared StatusBadge component - used by both LatestActivityTable and DomainStreamingTable
 * Ensures consistent status display across all components
 */
export const StatusBadge = React.memo<StatusBadgeProps>(function StatusBadge({ status, score: _score }) {
  let Icon;
  let color: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark' = 'light';
  let text: string = status;

  switch (status) {
    case 'validated':
      Icon = CheckCircleIcon;
      color = 'success';
      text = 'Validated';
      break;
    case 'generating':
      Icon = DnaIcon;
      color = 'info';
      text = 'Generating';
      break;
    case 'scanned':
      Icon = SearchIcon;
      color = 'success';
      text = 'Scanned';
      break;
    case 'not_validated':
      Icon = XCircleIcon;
      color = 'error';
      text = 'Not Validated';
      break;
    case 'Failed':
      Icon = AlertCircleIcon;
      color = 'error';
      text = 'Failed';
      break;
    case 'no_leads':
      Icon = ShieldQuestionIcon;
      color = 'dark';
      text = 'No Leads';
      break;
    case 'Pending':
      Icon = ClockIcon;
      color = 'warning';
      text = 'Pending';
      break;
    case 'n_a':
    default:
      Icon = HelpCircleIcon;
      color = 'light';
      text = 'N/A';
      break;
  }

  return (
    <Badge color={color} size="sm">
      <Icon className="mr-1 h-3 w-3" />
      {text}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';