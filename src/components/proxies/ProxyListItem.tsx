"use client";

import type { ModelsProxy as ProxyType } from '@/lib/api-client/models/models-proxy';

// Define proxy status type based on common proxy states
type ProxyStatus = 'Active' | 'Disabled' | 'Failed' | 'Testing';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit3, Trash2, TestTubeDiagonal, PowerOff, AlertCircle, CheckCircle, Clock, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProxyListItemProps {
  proxy: ProxyType;
  onEdit: (proxy: ProxyType) => void;
  onDelete: (proxy: ProxyType) => void;
  onTest: (proxyId: string) => void;
  onToggleStatus: (proxy: ProxyType, newStatus: 'Active' | 'Disabled') => void;
  isLoading?: boolean;
}

const getStatusBadgeInfo = (status: ProxyStatus): { variant: "default" | "secondary" | "destructive" | "outline", icon: JSX.Element, text: string } => {
  switch (status) {
    case 'Active':
      return { variant: 'default', icon: <CheckCircle className="h-3.5 w-3.5 text-green-500" />, text: 'Active' };
    case 'Disabled':
      return { variant: 'secondary', icon: <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />, text: 'Disabled' };
    case 'Testing':
      return { variant: 'outline', icon: <Clock className="h-3.5 w-3.5 text-blue-500 animate-spin" />, text: 'Testing' };
    case 'Failed':
      return { variant: 'destructive', icon: <AlertCircle className="h-3.5 w-3.5 text-destructive" />, text: 'Failed' };
    default:
      return { variant: 'outline', icon: <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />, text: status };
  }
};

export default function ProxyListItem({ proxy, onEdit, onDelete, onTest, onToggleStatus, isLoading }: ProxyListItemProps) {
  const statusInfo = getStatusBadgeInfo(proxy.status as ProxyStatus);

  const handleToggle = (checked: boolean) => {
    onToggleStatus(proxy, checked ? 'Active' : 'Disabled');
  };
  
  const canBeEnabled = proxy.status === 'Disabled' || proxy.status === 'Failed';
  const canBeDisabled = proxy.status === 'Active' || proxy.status === 'Testing';


  return (
    <TableRow className={cn(isLoading && "opacity-50 pointer-events-none")} data-testid={`proxy-row-${proxy.id || 'unknown'}`}>
      <TableCell data-testid="proxy-cell-name">
        <div className="font-medium truncate max-w-xs" title={proxy.name} data-testid="proxy-name">{proxy.name}</div>
        {proxy.description && <div className="text-xs text-muted-foreground truncate max-w-xs" title={proxy.description} data-testid="proxy-description">{proxy.description}</div>}
      </TableCell>
      <TableCell data-testid="proxy-cell-address">
        <div className="font-medium truncate max-w-xs" title={proxy.address} data-testid="proxy-address">{proxy.address}</div>
        {proxy.username && <div className="text-xs text-muted-foreground truncate max-w-xs" title={proxy.username} data-testid="proxy-username">User: {proxy.username}</div>}
        {proxy.notes && <div className="text-xs text-muted-foreground truncate max-w-xs" title={proxy.notes} data-testid="proxy-notes">{proxy.notes}</div>}
      </TableCell>
      <TableCell data-testid="proxy-cell-protocol"><Badge variant="outline" data-testid="proxy-protocol">{proxy.protocol}</Badge></TableCell>
      <TableCell className="text-xs" data-testid="proxy-cell-country">{proxy.countryCode || '-'}</TableCell>
      <TableCell data-testid="proxy-cell-status">
        <Badge variant={statusInfo.variant} className="text-xs" data-testid={`proxy-status-${statusInfo.text.toLowerCase()}`}>
          {statusInfo.icon}
          <span className="ml-1">{statusInfo.text}</span>
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground" data-testid="proxy-cell-last-tested">
        {proxy.lastTested ? format(new Date(proxy.lastTested), 'PPp') : 'Never'}
      </TableCell>
      <TableCell className="text-xs" data-testid="proxy-cell-success-failure">
        <span className="text-green-600" data-testid="proxy-success-count">{proxy.successCount}</span> / <span className="text-red-600" data-testid="proxy-failure-count">{proxy.failureCount}</span>
      </TableCell>
      <TableCell className="text-xs text-destructive truncate max-w-[150px]" title={proxy.lastError} data-testid="proxy-cell-last-error">
        {proxy.lastError || 'None'}
      </TableCell>
      <TableCell className="text-right" data-testid="proxy-cell-actions">
        <div className="flex items-center justify-end gap-1" data-testid="proxy-actions">
           <Switch
            checked={proxy.status === 'Active' || proxy.status === 'Testing'}
            onCheckedChange={handleToggle}
            disabled={isLoading || !(canBeEnabled || canBeDisabled) || proxy.status === 'Testing'}
            aria-label={`Toggle proxy ${proxy.address} status`}
            className={cn(
               (proxy.status === 'Active' || proxy.status === 'Testing') ? "data-[state=checked]:bg-green-500" : "data-[state=unchecked]:bg-muted-foreground/50",
            )}
            data-testid="proxy-toggle-status"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading} data-testid="proxy-menu-trigger">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="proxy-menu">
              <DropdownMenuItem onClick={() => onEdit(proxy)} disabled={isLoading} data-testid="proxy-menu-edit">
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => proxy.id && onTest(proxy.id)} disabled={isLoading || !proxy.id} data-testid="proxy-menu-test">
                <TestTubeDiagonal className="mr-2 h-4 w-4" /> Test
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(proxy)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive" disabled={isLoading} data-testid="proxy-menu-delete">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
