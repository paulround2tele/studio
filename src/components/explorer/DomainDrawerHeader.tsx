/**
 * DomainDrawerHeader - Domain identification and status display
 * 
 * Shows:
 * - Domain name (primary identifier)
 * - DNS status badge
 * - HTTP status badge
 * - Lead status badge (if available)
 * - Creation timestamp
 * 
 * @see Phase 7.3 Drawer Integration
 */

'use client';

import React from 'react';
import { ExternalLink, Copy, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DomainRow } from '@/types/explorer/state';

// ============================================================================
// STATUS BADGE LOGIC
// ============================================================================

interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

function getStatusConfig(status: string | undefined, _type: 'dns' | 'http' | 'lead'): StatusConfig {
  const normalizedStatus = (status ?? '').toLowerCase();
  
  // Success states
  if (normalizedStatus === 'valid' || normalizedStatus === 'reachable' || normalizedStatus === 'extracted') {
    return { 
      label: status ?? 'Unknown', 
      variant: 'default',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
  }
  
  // Pending states
  if (normalizedStatus === 'pending' || normalizedStatus === 'queued') {
    return { 
      label: status ?? 'Pending', 
      variant: 'secondary',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };
  }
  
  // Failed states
  if (normalizedStatus === 'invalid' || normalizedStatus === 'unreachable' || normalizedStatus === 'failed') {
    return { 
      label: status ?? 'Failed', 
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
  }
  
  // Skipped/not applicable
  if (normalizedStatus === 'skipped' || normalizedStatus === 'n/a') {
    return { 
      label: status ?? 'Skipped', 
      variant: 'outline',
      className: 'text-muted-foreground',
    };
  }
  
  // Unknown/default
  return { 
    label: status ?? 'Unknown', 
    variant: 'outline',
    className: '',
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export interface DomainDrawerHeaderProps {
  /** Domain data from explorer state */
  domain: DomainRow;
  /** Additional className */
  className?: string;
}

/**
 * Domain drawer header with identification and status
 */
export const DomainDrawerHeader = React.memo(function DomainDrawerHeader({
  domain,
  className,
}: DomainDrawerHeaderProps) {
  const [copied, setCopied] = React.useState(false);
  
  const handleCopy = React.useCallback(async () => {
    if (!domain.domain) return;
    
    try {
      await navigator.clipboard.writeText(domain.domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
      console.warn('Failed to copy to clipboard');
    }
  }, [domain.domain]);

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const dnsConfig = getStatusConfig(domain.dnsStatus, 'dns');
  const httpConfig = getStatusConfig(domain.httpStatus, 'http');
  const leadConfig = domain.leadStatus ? getStatusConfig(domain.leadStatus, 'lead') : null;

  return (
    <div 
      className={cn("space-y-4", className)}
      data-testid="domain-drawer-header"
    >
      {/* Domain name with actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 
            className="text-lg font-semibold truncate"
            title={domain.domain}
            data-testid="domain-drawer-domain-name"
          >
            {domain.domain ?? 'Unknown Domain'}
          </h2>
          {domain.id && (
            <p className="text-xs text-muted-foreground font-mono truncate">
              ID: {domain.id}
            </p>
          )}
        </div>
        
        <div className="flex gap-1 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                  data-testid="domain-drawer-copy-button"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? 'Copied!' : 'Copy domain'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  asChild
                  data-testid="domain-drawer-external-link"
                >
                  <a 
                    href={`https://${domain.domain}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Status badges */}
      <div 
        className="flex flex-wrap gap-2"
        data-testid="domain-drawer-status-badges"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={dnsConfig.variant}
                className={cn("text-xs", dnsConfig.className)}
                data-testid="domain-drawer-dns-status"
              >
                DNS: {dnsConfig.label}
              </Badge>
            </TooltipTrigger>
            {domain.dnsReason && (
              <TooltipContent>{domain.dnsReason}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={httpConfig.variant}
                className={cn("text-xs", httpConfig.className)}
                data-testid="domain-drawer-http-status"
              >
                HTTP: {httpConfig.label}
              </Badge>
            </TooltipTrigger>
            {domain.httpReason && (
              <TooltipContent>{domain.httpReason}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {leadConfig && (
          <Badge 
            variant={leadConfig.variant}
            className={cn("text-xs", leadConfig.className)}
            data-testid="domain-drawer-lead-status"
          >
            Lead: {leadConfig.label}
          </Badge>
        )}
      </div>

      {/* Timestamp */}
      {domain.createdAt && (
        <div 
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          data-testid="domain-drawer-timestamp"
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Generated: {formatDate(domain.createdAt)}</span>
        </div>
      )}
    </div>
  );
});

DomainDrawerHeader.displayName = 'DomainDrawerHeader';
