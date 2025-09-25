'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TestUIPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">UI Components Test Page</h1>
        <Badge variant="secondary">Test Environment</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buttons Section */}
        <Card data-component="buttons-section">
          <CardHeader>
            <CardTitle>Button Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="default" data-component="primary-button">Primary</Button>
              <Button variant="secondary" data-component="secondary-button">Secondary</Button>
              <Button variant="outline" data-component="outline-button">Outline</Button>
              <Button variant="destructive" data-component="destructive-button">Destructive</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" data-component="small-button">Small</Button>
              <Button size="default" data-component="default-button">Default</Button>
              <Button size="lg" data-component="large-button">Large</Button>
            </div>
          </CardContent>
        </Card>

        {/* Form Section */}
        <Card data-component="form-section">
          <CardHeader>
            <CardTitle>Form Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" data-component="email-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" data-component="password-input" />
            </div>
            <Button className="w-full" data-component="submit-button">Submit Form</Button>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card data-component="table-section">
        <CardHeader>
          <CardTitle>Table Component</CardTitle>
        </CardHeader>
        <CardContent>
          <Table data-component="data-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Component 1</TableCell>
                <TableCell><Badge variant="default">Active</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">Edit</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Component 2</TableCell>
                <TableCell><Badge variant="secondary">Inactive</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">Edit</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
