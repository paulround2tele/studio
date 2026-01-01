"use client";

import type { Proxy as ProxyType } from '@/lib/api-client/models/proxy';
import { useState } from 'react';

// Define proxy status type based on common proxy states
type ProxyStatus = 'Active' | 'Disabled' | 'Failed';
import { TableCell, TableRow } from '@/components/ta/ui/table';
import Badge from '@/components/ta/ui/badge/Badge';
import Button from '@/components/ta/ui/button/Button';
import { Dropdown } from '@/components/ta/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ta/ui/dropdown/DropdownItem';
import { MoreVerticalIcon, Edit3Icon, TrashBinIcon, TestTubeIcon, PowerOffIcon, AlertCircleIcon, CheckCircleIcon, HelpCircleIcon } from '@/icons';
import { format } from 'date-fns';

interface ProxyListItemProps {
  proxy: ProxyType;
  onEdit: (proxy: ProxyType) => void;
  onDelete: (proxy: ProxyType) => void;
  onTest: (proxyId: string) => void;
  onToggleStatus: (proxy: ProxyType, newStatus: 'Active' | 'Disabled') => void;
  isLoading?: boolean;
}

const getStatusBadgeInfo = (status: ProxyStatus): { color: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark', icon: JSX.Element, text: string } => {
  switch (status) {
    case 'Active':
      return { color: 'success', icon: <CheckCircleIcon className="h-3.5 w-3.5" />, text: 'Active' };
    case 'Disabled':
      return { color: 'dark', icon: <PowerOffIcon className="h-3.5 w-3.5" />, text: 'Disabled' };
    case 'Failed':
      return { color: 'error', icon: <AlertCircleIcon className="h-3.5 w-3.5" />, text: 'Failed' };
    default:
      return { color: 'light', icon: <HelpCircleIcon className="h-3.5 w-3.5" />, text: status };
  }
};

export default function ProxyListItem({ proxy, onEdit, onDelete, onTest, onToggleStatus, isLoading }: ProxyListItemProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const derivedStatus: ProxyStatus = proxy.isEnabled
    ? (proxy.isHealthy ? 'Active' : 'Failed')
    : 'Disabled';
  const statusInfo = getStatusBadgeInfo(derivedStatus);

  const handleToggle = () => {
    const newStatus = derivedStatus === 'Active' ? 'Disabled' : 'Active';
    onToggleStatus(proxy, newStatus);
  };
  
  const canToggle = derivedStatus === 'Active' || derivedStatus === 'Disabled' || derivedStatus === 'Failed';

  return (
    <TableRow className={isLoading ? "opacity-50 pointer-events-none" : ""}>
      <TableCell className="px-6 py-4">
        <div className="font-medium text-gray-800 dark:text-white/90 truncate max-w-xs" title={proxy.name}>{proxy.name}</div>
        {proxy.description && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs" title={proxy.description}>{proxy.description}</div>}
      </TableCell>
      <TableCell className="px-6 py-4">
        <div className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs" title={proxy.address}>{proxy.address}</div>
        {proxy.username && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs"><span className="font-medium text-gray-500 dark:text-gray-400">User:</span> {proxy.username}</div>}
        {proxy.notes && <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs" title={proxy.notes}>{proxy.notes}</div>}
      </TableCell>
      <TableCell className="px-6 py-4"><Badge color="light" size="sm">{proxy.protocol}</Badge></TableCell>
      <TableCell className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300">{proxy.countryCode || '-'}</TableCell>
      <TableCell className="px-6 py-4">
        <Badge color={statusInfo.color} size="sm">
          {statusInfo.icon}
          <span className="ml-1">{statusInfo.text}</span>
        </Badge>
      </TableCell>
      <TableCell className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
        {proxy.lastTested ? format(new Date(proxy.lastTested), 'PPp') : 'Never'}
      </TableCell>
      <TableCell className="px-6 py-4 text-xs">
        <span className="text-green-600 dark:text-green-500">{proxy.successCount}</span> / <span className="text-red-600 dark:text-red-500">{proxy.failureCount}</span>
      </TableCell>
      <TableCell className="px-6 py-4 text-xs text-red-500 dark:text-red-400 truncate max-w-[150px]">
        <span title={proxy.lastError}>{proxy.lastError || 'None'}</span>
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          {/* Toggle button instead of Switch */}
          <button
            onClick={handleToggle}
            disabled={isLoading || !canToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              derivedStatus === 'Active' 
                ? 'bg-green-500' 
                : 'bg-gray-300 dark:bg-gray-600'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={`Toggle proxy ${proxy.address} status`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                derivedStatus === 'Active' ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
          
          {/* Dropdown menu */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isLoading}
              className="h-8 w-8 p-0 dropdown-toggle"
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
            <Dropdown isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)}>
              <div className="p-1 min-w-[120px]">
                <DropdownItem onClick={() => { onEdit(proxy); setIsDropdownOpen(false); }}>
                  <span className="flex items-center">
                    <Edit3Icon className="mr-2 h-4 w-4" /> Edit
                  </span>
                </DropdownItem>
                <DropdownItem onClick={() => { if (proxy.id) { onTest(proxy.id); } setIsDropdownOpen(false); }}>
                  <span className="flex items-center">
                    <TestTubeIcon className="mr-2 h-4 w-4" /> Test
                  </span>
                </DropdownItem>
                <DropdownItem 
                  onClick={() => { onDelete(proxy); setIsDropdownOpen(false); }}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <span className="flex items-center">
                    <TrashBinIcon className="mr-2 h-4 w-4" /> Delete
                  </span>
                </DropdownItem>
              </div>
            </Dropdown>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
