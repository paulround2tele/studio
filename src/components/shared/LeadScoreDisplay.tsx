import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Percent, HelpCircle } from 'lucide-react';

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
  className = "" 
}) {
  const getSimilarityBadgeVariant = (score: number | undefined) => {
    if (score === undefined) return "outline";
    if (score > 75) return "default";
    if (score > 50) return "secondary" as any;
    if (score > 25) return "outline";
    return "destructive";
  };

  if (score !== undefined) {
    return (
      <Badge 
        variant={getSimilarityBadgeVariant(score)} 
        className={`text-xs ${className}`}
      >
        <Percent className="mr-1 h-3 w-3" />
        {score}%
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      <HelpCircle className="mr-1 h-3 w-3" />
      N/A
    </Badge>
  );
});

LeadScoreDisplay.displayName = 'LeadScoreDisplay';