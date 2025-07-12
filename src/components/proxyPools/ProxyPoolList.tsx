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
import { proxyPoolsApi, type components } from "@/lib/api-client/client";

type ProxyPool = components['schemas']['ProxyPool'];
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
    try {
      const pools = await proxyPoolsApi.listProxyPools();
      setPools(pools.data.filter((pool: { id?: unknown }) => pool.id) as ProxyPool[]);
    } catch (error) {
      console.error('Failed to load proxy pools:', error);
    }
  };

  useEffect(() => {
    loadPools();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await proxyPoolsApi.deleteProxyPool(id);
      toast({ title: "Deleted" });
      loadPools();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete",
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
                      onClick={() => p.id && handleDelete(p.id)}
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
