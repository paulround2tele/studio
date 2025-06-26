'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/types';
import { listAuditLogs } from '@/lib/services/adminService';
import { formatters } from '@/lib/utils/performance-optimization';

export default function SecurityPage() {
  const { hasPermission } = useAuth();
  const canViewAudit =
    hasPermission('security:audit_logs') || hasPermission('admin:all');

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!canViewAudit) return;
    setIsLoading(true);
    try {
      const result = await listAuditLogs({ page: 1, limit: 50 });
      setLogs(result.auditLogs);
    } catch (error) {
      console.error(error);
      setErrorMessage('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [canViewAudit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  if (!canViewAudit) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertDescription>
            You don&apos;t have permission to view audit logs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Security Center</h1>
        <p className="text-muted-foreground">
          View audit log of system actions.
        </p>
      </div>
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Recent security events</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.resource || '-'}</TableCell>
                    <TableCell>{log.userId || 'system'}</TableCell>
                    <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                    <TableCell>{formatters.formatDate(log.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div>
        <Link href="/admin">
          <span className="text-sm text-blue-600 hover:underline">&larr; Back to Admin Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
