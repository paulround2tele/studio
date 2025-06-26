"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function SettingsHomePage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground">Manage server configuration.</p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Select a configuration area to edit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Link href="/admin/settings/dns">
              <Button className="w-full">DNS Settings</Button>
            </Link>
            <Link href="/admin/settings/http">
              <Button className="w-full">HTTP Settings</Button>
            </Link>
            <Link href="/admin/settings/logging">
              <Button className="w-full">Logging Settings</Button>
            </Link>
            <Link href="/admin/settings/worker">
              <Button className="w-full">Worker Settings</Button>
            </Link>
            <Link href="/admin/settings/rate-limiter">
              <Button className="w-full">Rate Limiter Settings</Button>
            </Link>
            <Link href="/admin/settings/proxies">
              <Button className="w-full">Proxy Manager Settings</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      <div>
        <Link href="/admin">
          <span className="text-sm text-blue-600 hover:underline">
            &larr; Back to Admin Dashboard
          </span>
        </Link>
      </div>
    </div>
  );
}
