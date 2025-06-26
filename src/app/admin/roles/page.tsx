'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import type { ModelsRoleAPI } from '@/lib/types/models-aligned';
import { listRoles, deleteRole } from '@/lib/services/adminService';

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users:manage_roles') || hasPermission('admin:all');
  const canView = hasPermission('users:read') || hasPermission('admin:all');

  const [roles, setRoles] = useState<ModelsRoleAPI[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRoles = useCallback(async (page: number = 1) => {
    if (!canView) return;
    setIsLoading(true);
    try {
      const result = await listRoles({ page, limit: 20 });
      setRoles(result.roles);
      setCurrentPage(result.pagination.page);
      setTotalRoles(Number(result.pagination.total));
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleDelete = useCallback(async (role: ModelsRoleAPI) => {
    if (!canManage) return;
    if (!confirm(`Delete role "${role.displayName || role.name}"?`)) return;
    setIsLoading(true);
    try {
      await deleteRole(role.id);
      await loadRoles(currentPage);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to delete role');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, currentPage, loadRoles]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles</h1>
          <p className="text-muted-foreground">Manage application roles</p>
        </div>
        {canManage && (
          <Link href="/admin/roles/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> New Role
            </Button>
          </Link>
        )}
      </div>
      {errorMessage && (
        <Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Role List</CardTitle>
          <CardDescription>Existing roles</CardDescription>
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
                {roles.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.displayName || r.name}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="text-right">
                      {canManage && (
                        <>
                          <Link href={`/admin/roles/${r.id}/edit`}><Button variant="ghost" className="h-8 w-8 p-0 mr-2"><Edit className="h-4 w-4" /></Button></Link>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDelete(r)}><Trash2 className="h-4 w-4" /></Button>
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
      {roles.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {roles.length} of {totalRoles} roles</p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => loadRoles(currentPage - 1)} disabled={currentPage <= 1 || isLoading}>Previous</Button>
            <span className="text-sm">Page {currentPage}</span>
            <Button variant="outline" size="sm" onClick={() => loadRoles(currentPage + 1)} disabled={roles.length < 20 || isLoading}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
