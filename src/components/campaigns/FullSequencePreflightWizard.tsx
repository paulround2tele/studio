"use client";
import React from 'react';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPreflightOpen } from '@/store/ui/campaignUiSlice';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props { campaignId: string; onClose?: () => void; }

export const FullSequencePreflightWizard: React.FC<Props> = ({ campaignId, onClose }) => {
  const selectOverview = React.useMemo(()=>pipelineSelectors.overview(campaignId),[campaignId]);
  const overview = useAppSelector(selectOverview);
  const phases = overview.phases;
  const allConfigured = overview.config.allConfigured;
  const firstUnconfigured = overview.config.firstMissing;
  const dispatch = useAppDispatch();
  const open = useAppSelector(s => s.campaignUI?.byId?.[campaignId]?.preflightOpen);

  const close = () => { dispatch(setPreflightOpen({ campaignId, open: false })); onClose?.(); };

  return (
    <Dialog open={!!open} onOpenChange={(o)=>{ if(!o) close(); }}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle size="default">Full Sequence Readiness</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Review phase readiness before chaining begins.</p>
          <ul className="space-y-2">
            {phases.map((p) => (
              <li key={p.key} className="flex items-center justify-between border rounded px-3 py-2 text-sm">
                <span className="font-medium capitalize">{p.key}</span>
                <span className="text-xs">{p.statusRaw || p.execState} {p.configState === 'valid' ? '✅' : '⚠️'}</span>
              </li>
            ))}
          </ul>
          {!allConfigured && (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">Configure <strong>{firstUnconfigured}</strong> to enable full automatic chaining.</div>
          )}
          <div className="flex gap-2 pt-2 justify-end">
            <Button variant="outline" onClick={close}>Close</Button>
            <Button onClick={() => { close(); }}>Continue</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
