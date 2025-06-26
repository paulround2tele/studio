'use client';
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { createPermission } from '@/lib/services/adminService';

export default function NewPermissionPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('users:manage_permissions') || hasPermission('admin:all');

  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setIsLoading(true);
    try {
      await createPermission({ name, displayName, resource, action, description });
      setSuccessMessage('Permission created');
      setTimeout(() => router.push('/admin/permissions'), 500);
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to create permission');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, name, displayName, resource, action, description, router]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/permissions"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">New Permission</h1>
        </div>
      </div>
      {successMessage && (<Alert><AlertDescription>{successMessage}</AlertDescription></Alert>)}
      {errorMessage && (<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Permission Information</CardTitle>
          <CardDescription>Create a new permission</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
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
            <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Permission</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
