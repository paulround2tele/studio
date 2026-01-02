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
import { ExternalLinkIcon, CopyIcon, CheckLineIcon, ClockIcon } from '@/icons';
import { cn } from '@/lib/utils';
import Badge from '@/components/ta/ui/badge/Badge';
import type { DomainRow } from '@/types/explorer/state';

// ============================================================================
// STATUS BADGE LOGIC
// ============================================================================

interface StatusConfig {
  label: string;
  color: 'success' | 'warning' | 'error' | 'light' | 'info';
}

function getStatusConfig(status: string | undefined, _type: 'dns' | 'http' | 'lead'): StatusConfig {
  const normalizedStatus = (status ?? '').toLowerCase();
  
  // Success states
  if (normalizedStatus === 'valid' || normalizedStatus === 'reachable' || normalizedStatus === 'extracted') {
    return { 
      label: status ?? 'Unknown', 
      color: 'success',
    };
  }
  
  // Pending states
  if (normalizedStatus === 'pending' || normalizedStatus === 'queued') {
    return { 
      label: status ?? 'Pending', 
      color: 'info',
    };
  }
  
  // Failed states
  if (normalizedStatus === 'invalid' || normalizedStatus === 'unreachable' || normalizedStatus === 'failed') {
    return { 
      label: status ?? 'Failed', 
      color: 'error',
    };
  }
  
  // Skipped/not applicable
  if (normalizedStatus === 'skipped' || normalizedStatus === 'n/a') {
    return { 
      label: status ?? 'Skipped', 
      color: 'light',
    };
  }
  
  // Unknown/default
  return { 
    label: status ?? 'Unknown', 
    color: 'light',
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
            className="text-lg font-semibold truncate text-gray-800 dark:text-white"
            title={domain.domain}
            data-testid="domain-drawer-domain-name"
          >
            {domain.domain ?? 'Unknown Domain'}
          </h2>
          {domain.id && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
              ID: {domain.id}
            </p>
          )}
        </div>
        
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title={copied ? 'Copied!' : 'Copy domain'}
            data-testid="domain-drawer-copy-button"
          >
            {copied ? (
              <CheckLineIcon className="h-4 w-4 text-green-600" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </button>

          <a 
            href={`https://${domain.domain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Open in new tab"
            data-testid="domain-drawer-external-link"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Status badges */}
      <div 
        className="flex flex-wrap gap-2"
        data-testid="domain-drawer-status-badges"
      >
        <Badge 
          color={dnsConfig.color}
          size="sm"
        >
          DNS: {dnsConfig.label}
        </Badge>

        <Badge 
          color={httpConfig.color}
          size="sm"
        >
          HTTP: {httpConfig.label}
        </Badge>

        {leadConfig && (
          <Badge 
            color={leadConfig.color}
            size="sm"
          >
            Lead: {leadConfig.label}
          </Badge>
        )}
      </div>

      {/* Timestamp */}
      {domain.createdAt && (
        <div 
          className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
          data-testid="domain-drawer-timestamp"
        >
          <ClockIcon className="h-3.5 w-3.5" />
          <span>Generated: {formatDate(domain.createdAt)}</span>
        </div>
      )}
    </div>
  );
});

DomainDrawerHeader.displayName = 'DomainDrawerHeader';
