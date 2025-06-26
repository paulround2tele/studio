'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import type { ModelsPermissionAPI } from '@/lib/types/models-aligned';
import { listPermissions, deletePermission } from '@/lib/services/adminService';

export default function PermissionsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users:manage_permissions') || hasPermission('admin:all');
  const canView = hasPermission('users:read') || hasPermission('admin:all');

  const [perms, setPerms] = useState<ModelsPermissionAPI[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPermissions = useCallback(async (page: number = 1) => {
    if (!canView) return;
    setIsLoading(true);
    try {
      const result = await listPermissions({ page, limit: 20 });
      setPerms(result.permissions);
      setCurrentPage(result.pagination.page);
      setTotal(Number(result.pagination.total));
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => { loadPermissions(); }, [loadPermissions]);

  const handleDelete = useCallback(async (p: ModelsPermissionAPI) => {
    if (!canManage) return;
    if (!confirm(`Delete permission "${p.displayName || p.name}"?`)) return;
    setIsLoading(true);
    try {
      await deletePermission(p.id);
      await loadPermissions(currentPage);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to delete permission');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, currentPage, loadPermissions]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permissions</h1>
        </div>
        {canManage && (
          <Link href="/admin/permissions/new">
            <Button><Plus className="h-4 w-4 mr-2" /> New Permission</Button>
          </Link>
        )}
      </div>
      {errorMessage && (<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
      <Card>
        <CardHeader>
          <CardTitle>Permission List</CardTitle>
          <CardDescription>Existing permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perms.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.displayName || p.name}</TableCell>
                    <TableCell>{p.description}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <>
                          <Link href={`/admin/permissions/${p.id}/edit`}><Button variant="ghost" className="h-8 w-8 p-0 mr-2"><Edit className="h-4 w-4" /></Button></Link>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDelete(p)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {perms.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {perms.length} of {total} permissions</p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => loadPermissions(currentPage - 1)} disabled={currentPage <= 1 || isLoading}>Previous</Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button variant="outline" size="sm" onClick={() => loadPermissions(currentPage + 1)} disabled={perms.length < 20 || isLoading}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
