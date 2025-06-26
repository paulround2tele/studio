'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getPermissionById, updatePermission } from '@/lib/services/adminService';
import type { ModelsPermissionAPI } from '@/lib/types/models-aligned';

export default function EditPermissionPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users:manage_permissions') || hasPermission('admin:all');

  const [perm, setPerm] = useState<ModelsPermissionAPI | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const p = await getPermissionById(params.id as string);
        setPerm(p);
        setDisplayName(p.displayName);
        setResource(p.resource);
        setAction(p.action);
        setDescription(p.description || '');
      } catch (e) {
        console.error(e);
        setErrorMessage('Failed to load permission');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !perm) return;
    setIsLoading(true);
    try {
      await updatePermission(perm.id, { displayName, resource, action, description });
      setSuccessMessage('Permission updated');
      setTimeout(() => router.push('/admin/permissions'), 500);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to update permission');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, perm, displayName, resource, action, description, router]);

  if (isLoading) {
    return <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }
  if (!perm) {
    return <div className="p-6">Permission not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/permissions"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
        <div><h1 className="text-3xl font-bold">Edit Permission</h1></div>
      </div>
      {successMessage && (<Alert><AlertDescription>{successMessage}</AlertDescription></Alert>)}
      {errorMessage && (<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Permission Information</CardTitle>
          <CardDescription>Update permission</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resource">Resource</Label>
              <Input id="resource" value={resource} onChange={e => setResource(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Input id="action" value={action} onChange={e => setAction(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
