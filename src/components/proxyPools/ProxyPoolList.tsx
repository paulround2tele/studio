"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import ProxyPoolForm from "./ProxyPoolForm";
import {
  listProxyPools,
  deleteProxyPool,
} from "@/lib/services/proxyPoolService.production";
import type { ProxyPool } from "@/lib/types/proxyPoolTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function ProxyPoolList() {
  const [pools, setPools] = useState<ProxyPool[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProxyPool | null>(null);
  const { toast } = useToast();

  const loadPools = async () => {
    const resp = await listProxyPools();
    if (resp.status === "success" && resp.data) {
      // Convert generated types to frontend types
      const convertedPools: ProxyPool[] = resp.data
        .filter(pool => pool.id) // Filter out pools without id
        .map(pool => ({
          id: pool.id!,
          name: pool.name || '',
          description: pool.description || undefined,
          isEnabled: pool.isEnabled ?? false,
          poolStrategy: pool.poolStrategy || undefined,
          healthCheckEnabled: pool.healthCheckEnabled ?? false,
          healthCheckIntervalSeconds: pool.healthCheckIntervalSeconds,
          maxRetries: pool.maxRetries,
          timeoutSeconds: pool.timeoutSeconds,
          createdAt: pool.createdAt || new Date().toISOString(),
          updatedAt: pool.updatedAt || new Date().toISOString(),
          // Omit proxies for now since table doesn't use them and they need complex conversion
          proxies: undefined
        }));
      setPools(convertedPools);
    }
  };

  useEffect(() => {
    loadPools();
  }, []);

  const handleDelete = async (id: string) => {
    const resp = await deleteProxyPool(id);
    if (resp.status === "success") {
      toast({ title: "Deleted" });
      loadPools();
    } else {
      toast({
        title: "Error",
        description: resp.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Proxy Pools</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Pool
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pools</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pools.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.description}</TableCell>
                  <TableCell>{p.isEnabled ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={formOpen} onOpenChange={(v) => setFormOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pool" : "New Pool"}</DialogTitle>
          </DialogHeader>
          <ProxyPoolForm
            pool={editing}
            onSuccess={() => {
              setFormOpen(false);
              loadPools();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
