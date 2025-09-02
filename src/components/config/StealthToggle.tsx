"use client";

import { useEffect, useState, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ServerSettingsApi } from '@/lib/api-client/apis/server-settings-api';
import { apiConfiguration } from '@/lib/api/config';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';

type Props = {
  className?: string;
};

export function StealthToggle({ className }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(false);

  const api = new ServerSettingsApi(apiConfiguration);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.configGetStealth();
      const data = extractResponseData<{ enabled?: boolean }>(res);
      setEnabled(Boolean(data?.enabled));
    } catch (e) {
      toast({ title: 'Failed to load stealth setting', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const onToggle = async (next: boolean) => {
    try {
      setEnabled(next);
      await api.configUpdateStealth({ enabled: next });
      toast({ title: `Stealth ${next ? 'enabled' : 'disabled'}` });
    } catch (e) {
      setEnabled(!next);
      toast({ title: 'Failed to update stealth setting', variant: 'destructive' });
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label className="text-sm font-medium">Stealth mode</Label>
          <div className="text-xs text-muted-foreground">Randomized, stealth-optimized execution for DNS/HTTP phases</div>
        </div>
        <Switch checked={enabled} disabled={loading} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

export default StealthToggle;
