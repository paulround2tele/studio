"use client";
import React from 'react';
import { pipelineSelectors } from '@/store/selectors/pipelineSelectors';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setPreflightOpen } from '@/store/ui/campaignUiSlice';
import Button from '@/components/ta/ui/button/Button';
import { Modal } from '@/components/ta/ui/modal';

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
    <Modal isOpen={!!open} onClose={close} className="max-w-md p-6 lg:p-8">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Full Sequence Readiness</h3>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Review phase readiness before chaining begins.</p>
        <ul className="space-y-2">
          {phases.map((p) => (
            <li key={p.key} className="flex items-center justify-between border rounded px-3 py-2 text-sm dark:border-gray-700">
              <span className="font-medium capitalize">{p.key}</span>
              <span className="text-xs">{p.statusRaw || p.execState} {p.configState === 'valid' ? '✅' : '⚠️'}</span>
            </li>
          ))}
        </ul>
        {!allConfigured && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">Configure <strong>{firstUnconfigured}</strong> to enable full automatic chaining.</div>
        )}
        <div className="flex gap-2 pt-2 justify-end">
          <Button variant="outline" onClick={close}>Close</Button>
          <Button onClick={() => { close(); }}>Continue</Button>
        </div>
      </div>
    </Modal>
  );
};
