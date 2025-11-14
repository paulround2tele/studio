"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ServerSettingsApi } from '@/lib/api-client/apis/server-settings-api';
import { apiConfiguration } from '@/lib/api/config';

type Props = {
  className?: string;
};

export function StealthToggle({ className }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(false);

  const apiRef = useRef<ServerSettingsApi>(new ServerSettingsApi(apiConfiguration));
  const api = apiRef.current;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.configGetStealth();
      // API now returns direct payload: { enabled: boolean }
      const data = res.data;
      setEnabled(Boolean(data?.enabled));
    } catch (_e) {
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
    } catch (_e) {
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
