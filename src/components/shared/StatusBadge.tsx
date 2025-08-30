import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Search, 
  Dna,
  ShieldQuestion,
  HelpCircle 
} from 'lucide-react';

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
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let text: string = status;
  let className = '';

  switch (status) {
    case 'validated':
      Icon = CheckCircle;
      variant = 'default';
      text = 'Validated';
      className = 'bg-green-500 text-white hover:bg-green-600';
      break;
    case 'generating':
      Icon = Dna;
      variant = 'secondary';
      text = 'Generating';
      className = 'bg-blue-500 text-white hover:bg-blue-600';
      break;
    case 'scanned':
      Icon = Search;
      variant = 'default';
      text = 'Scanned';
      className = 'bg-emerald-500 text-white hover:bg-emerald-600';
      break;
    case 'not_validated':
      Icon = XCircle;
      variant = 'destructive';
      text = 'Not Validated';
      className = 'bg-red-500 text-white hover:bg-red-600';
      break;
    case 'Failed':
      Icon = AlertCircle;
      variant = 'destructive';
      text = 'Failed';
      className = 'bg-red-600 text-white hover:bg-red-700';
      break;
    case 'no_leads':
      Icon = ShieldQuestion;
      variant = 'secondary';
      text = 'No Leads';
      className = 'bg-gray-500 text-white hover:bg-gray-600';
      break;
    case 'Pending':
      Icon = Clock;
      variant = 'secondary';
      text = 'Pending';
      className = 'bg-yellow-500 text-white hover:bg-yellow-600';
      break;
    case 'n_a':
    default:
      Icon = HelpCircle;
      variant = 'outline';
      text = 'N/A';
      className = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
      break;
  }

  return (
    <Badge variant={variant} className={`text-xs ${className}`}>
      <Icon className="mr-1 h-3 w-3" />
      {text}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';