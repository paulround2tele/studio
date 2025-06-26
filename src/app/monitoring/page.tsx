'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { performanceMonitor, type PerformanceReport } from '@/lib/monitoring/performance-monitor';

interface ChartPoint {
  timestamp: string;
  value: number;
}

export default function MonitoringPage() {
  const [apiData, setApiData] = useState<ChartPoint[]>([]);
  const [memoryData, setMemoryData] = useState<ChartPoint[]>([]);
  const [pageLoadData, setPageLoadData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    const loadMetrics = async () => {
      let reports: PerformanceReport[] = performanceMonitor.getMetrics();

      if (reports.length === 0) {
        try {
          const res = await fetch('/api/v2/monitoring/metrics');
          if (res.ok) {
            const data = await res.json();
            reports = data.reports || [];
          }
        } catch (err) {
          console.error('Failed to fetch metrics', err);
        }
      }

      const apiPoints: ChartPoint[] = [];
      const memPoints: ChartPoint[] = [];
      const loadPoints: ChartPoint[] = [];

      reports.forEach((report) => {
        report.metrics.forEach((m) => {
          if (m.name === 'api_call_duration') {
            apiPoints.push({
              timestamp: new Date(m.timestamp).toLocaleTimeString(),
              value: m.value,
            });
          }
          if (m.name === 'memory_used') {
            memPoints.push({
              timestamp: new Date(m.timestamp).toLocaleTimeString(),
              value: Math.round(m.value / (1024 * 1024)),
            });
          }
          if (m.name === 'page_load_time') {
            loadPoints.push({
              timestamp: new Date(m.timestamp).toLocaleTimeString(),
              value: m.value,
            });
          }
        });
      });

      setApiData(apiPoints.slice(-20));
      setMemoryData(memPoints.slice(-20));
      setPageLoadData(loadPoints.slice(-20));
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Monitoring Metrics</h1>
        <p className="text-muted-foreground">Recent performance metrics from the application.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Call Timing</CardTitle>
          <CardDescription>Response times for recent API requests</CardDescription>
        </CardHeader>
        <CardContent>
          {apiData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={apiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" name="Duration (ms)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Alert>
              <AlertTitle>No API metrics</AlertTitle>
              <AlertDescription>API timing metrics are not available yet.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
          <CardDescription>Browser memory consumption (MB)</CardDescription>
        </CardHeader>
        <CardContent>
          {memoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={memoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#82ca9d" name="Memory (MB)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Alert>
              <AlertTitle>No memory metrics</AlertTitle>
              <AlertDescription>Memory usage metrics are not available.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page Load Times</CardTitle>
          <CardDescription>Recorded load times for recent navigations</CardDescription>
        </CardHeader>
        <CardContent>
          {pageLoadData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pageLoadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#ffc658" name="Load Time (ms)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Alert>
              <AlertTitle>No page load metrics</AlertTitle>
              <AlertDescription>Page load statistics are not available.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
