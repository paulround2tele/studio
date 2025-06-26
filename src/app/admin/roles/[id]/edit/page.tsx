'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { ModelsPermissionAPI, ModelsRoleAPI } from '@/lib/types/models-aligned';
import { listPermissions, getRoleById, updateRole } from '@/lib/services/adminService';

export default function EditRolePage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users:manage_roles') || hasPermission('admin:all');

  const [role, setRole] = useState<ModelsRoleAPI | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<ModelsPermissionAPI[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const roleId = params.id as string;
        const [roleRes, permRes] = await Promise.all([
          getRoleById(roleId),
          listPermissions({ page: 1, limit: 100 })
        ]);
        setRole(roleRes);
        setDisplayName(roleRes.displayName);
        setDescription(roleRes.description || '');
        setSelected(new Set(roleRes.permissions?.map(p => p.id)));
        setPermissions(permRes.permissions);
      } catch (e) {
        console.error(e);
        setErrorMessage('Failed to load role');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  const togglePermission = useCallback((id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !role) return;
    setIsLoading(true);
    try {
      await updateRole(role.id, { displayName, description, permissionIds: Array.from(selected) });
      setSuccessMessage('Role updated');
      setTimeout(() => router.push('/admin/roles'), 500);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to update role');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, role, displayName, description, selected, router]);

  if (isLoading) {
    return <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }
  if (!role) {
    return <div className="p-6">Role not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/roles"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Role</h1>
        </div>
      </div>
      {successMessage && (<Alert><AlertDescription>{successMessage}</AlertDescription></Alert>)}
      {errorMessage && (<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
          <CardDescription>Update role details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid gap-2 max-h-60 overflow-y-auto border p-2 rounded">
                {permissions.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => togglePermission(p.id)} />
                    {p.displayName || `${p.resource}:${p.action}`}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
