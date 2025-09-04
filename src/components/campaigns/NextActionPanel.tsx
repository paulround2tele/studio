"use client";
import React, { useMemo } from 'react';
import { usePhaseReadiness } from '@/hooks/usePhaseReadiness';
import { useAppSelector } from '@/store/hooks';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const NextActionPanel: React.FC<{ campaignId: string }> = ({ campaignId }) => {
  const fullSequence = useAppSelector(s => s.campaignUI?.byId?.[campaignId]?.fullSequenceMode);
  const { phases } = usePhaseReadiness(campaignId);
  const next = useMemo(() => phases.find(p => !p.configured) || phases.find(p => p.canStart) , [phases]);
  if (fullSequence) return null;
  if (!next) return null;
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Next Recommended Step</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-700">
        {next.configured ? (
          <span>Start <strong>{next.phase}</strong> when ready.</span>
        ) : (
          <span>Configure <strong>{next.phase}</strong> to progress toward full readiness.</span>
        )}
      </CardContent>
    </Card>
  );
};