'use client';

import { useAuth } from '@/contexts/AuthContext';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/shared/PageHeader';
import { Briefcase, Users, PlayCircle, ArrowRight } from 'lucide-react';
import LatestActivityTable from '@/components/dashboard/LatestActivityTable';
import ProductionReadinessCheck from '@/components/system/ProductionReadinessCheck';

export default function DashboardPage() {
  const { user } = useAuth();

  // REMOVED: Client-side authentication redirects - middleware handles all auth
  // This prevents race conditions between middleware and client-side auth logic

  // Loading removed - middleware handles authentication

  // SIMPLIFIED: If middleware let us through, render dashboard
  // Don't get stuck waiting for user data that might not load

  // Render dashboard for authenticated users ONLY
  return (
    <div className="container mx-auto">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name}` : user?.email ? `, ${user.email}` : ''}`}
        description="Orchestrate your domain intelligence and lead generation campaigns."
        icon={PlayCircle}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Campaigns</CardTitle>
            </div>
            <CardDescription>Manage, monitor, and launch new domain campaigns. Track progress through generation, validation, and lead discovery.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Start by creating a new campaign or view the status of your existing ones.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full"><Link href="/campaigns">Go to Campaigns <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Personas</CardTitle>
            </div>
            <CardDescription>Create and manage synthetic personas for advanced HTTP validation and stealth operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define custom HTTP headers, TLS, and HTTP2 configurations for your personas.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full"><Link href="/personas">Manage Personas <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 md:col-span-2 lg:col-span-1">
           <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <PlayCircle className="h-8 w-8 text-accent" />
              <CardTitle className="text-2xl">Quick Start</CardTitle>
            </div>
            <CardDescription>Ready to dive in? Launch your first comprehensive lead generation campaign.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This will guide you through setting up a campaign to find new domains and generate leads.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="default" className="w-full bg-accent text-accent-foreground hover:bg-accent/90"><Link href="/campaigns/new?type=Lead%20Generation">Start New Lead Gen Campaign <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </CardFooter>
        </Card>
      </div>

      {/* System Status Check */}
      <div className="mb-8">
        <ProductionReadinessCheck />
      </div>

      {/* Latest Activity Table Section - Only render for authenticated users */}
      <div className="mt-8">
        <LatestActivityTable />
      </div>
    </div>
  );
}