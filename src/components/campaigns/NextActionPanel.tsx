"use client";
import React, { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const NextActionPanel: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const selectAuto = React.useMemo(()=>pipelineSelectors.autoAdvanceEnabled(campaignId),[campaignId]);
  const selectNext = React.useMemo(()=>pipelineSelectors.nextUserAction(campaignId),[campaignId]);
  const auto = useAppSelector(selectAuto);
  const nextAction = useAppSelector(selectNext);
  if (auto) return null;
  if (!nextAction) return null;
  if (nextAction.type === 'wait' || nextAction.type === 'watch') return null;
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Next Recommended Step</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-700">
        {nextAction.type === 'configure' && (
          <span>Configure <strong>{nextAction.phase}</strong> to progress toward full readiness.</span>
        )}
        {nextAction.type === 'start' && (
          <span>Start <strong>{nextAction.phase}</strong> when ready.</span>
        )}
      </CardContent>
    </Card>
  );
};