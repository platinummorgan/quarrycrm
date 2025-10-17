'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Clock, Database, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface TimingData {
  route: string;
  method: string;
  totalDuration: number;
  sqlDuration: number;
  handlerDuration: number;
  timestamp: number;
}

interface TimingStats {
  total: number;
  avgTotal: number;
  avgSql: number;
  avgHandler: number;
  slowest: TimingData[];
}

export default function DebugTimingsPage() {
  const [timings, setTimings] = useState<TimingData[]>([]);
  const [stats, setStats] = useState<TimingStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTimings() {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/timings');
      const data = await response.json();
      setTimings(data.timings);
      setStats(data.stats);
    } catch (error) {
      toast.error('Failed to load timing data');
    } finally {
      setLoading(false);
    }
  }

  async function clearTimings() {
    try {
      await fetch('/api/debug/timings', { method: 'DELETE' });
      toast.success('Timing data cleared');
      loadTimings();
    } catch (error) {
      toast.error('Failed to clear timing data');
    }
  }

  useEffect(() => {
    loadTimings();
  }, []);

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-blue-500';
      case 'POST':
        return 'bg-green-500';
      case 'PUT':
      case 'PATCH':
        return 'bg-yellow-500';
      case 'DELETE':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDurationColor = (duration: number) => {
    if (duration < 100) return 'text-green-600';
    if (duration < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Server Timing Debug</h1>
        <p className="text-muted-foreground">
          Monitor API route performance with Server-Timing headers
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Total Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgTotal.toFixed(2)}ms</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg SQL Time</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgSql.toFixed(2)}ms</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Handler Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgHandler.toFixed(2)}ms</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <Button onClick={loadTimings} disabled={loading} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button onClick={clearTimings} variant="outline">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Data
        </Button>
      </div>

      {/* Timings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Request Timings</CardTitle>
          <CardDescription>
            Sorted by total duration (slowest first). Limited to last 100 requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : timings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No timing data yet. Make some API requests to see them here.
            </p>
          ) : (
            <div className="space-y-2">
              {timings.map((timing, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Badge className={getMethodColor(timing.method)}>
                      {timing.method}
                    </Badge>
                    <span className="font-mono text-sm">{timing.route}</span>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-muted-foreground text-xs">SQL</div>
                      <div className={getDurationColor(timing.sqlDuration)}>
                        {timing.sqlDuration.toFixed(2)}ms
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-muted-foreground text-xs">Handler</div>
                      <div className={getDurationColor(timing.handlerDuration)}>
                        {timing.handlerDuration.toFixed(2)}ms
                      </div>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <div className="text-muted-foreground text-xs">Total</div>
                      <div className={`font-bold ${getDurationColor(timing.totalDuration)}`}>
                        {timing.totalDuration.toFixed(2)}ms
                      </div>
                    </div>

                    <div className="text-muted-foreground text-xs">
                      {new Date(timing.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Read Timings */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How to Read Server-Timing Headers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">In Browser DevTools:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Open DevTools (F12) → Network tab</li>
              <li>Click on any API request</li>
              <li>Go to the "Timing" or "Headers" tab</li>
              <li>Look for "Server-Timing" in Response Headers</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Timing Metrics:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                <strong>sql</strong> - Time spent on database queries
              </li>
              <li>
                <strong>handler</strong> - Time spent in application logic (excluding SQL)
              </li>
              <li>
                <strong>total</strong> - Total request processing time
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Performance Guidelines:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>🟢 &lt;100ms - Excellent</li>
              <li>🟡 100-500ms - Good</li>
              <li>🔴 &gt;500ms - Needs optimization</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
