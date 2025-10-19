'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Activity,
  Zap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  PlayCircle,
  Database,
} from 'lucide-react'

interface BenchmarkResult {
  endpoint: string
  samples: number
  p50: number
  p95: number
  p99: number
  min: number
  max: number
  avg: number
  passed: boolean
  target: number
  serverMs?: number
  clientRenderMs?: number
}

interface SystemInfo {
  contacts: number
  companies: number
  deals: number
  userAgent: string
  timestamp: string
}

interface PerformanceMetrics {
  metrics: Record<
    string,
    {
      operation: string
      measurements: any[]
      stats: {
        count: number
        min: number
        max: number
        avg: number
        p50: number
        p95: number
        p99: number
      }
      latest: any
    }
  >
  timestamp: string
}

export default function SpeedPage() {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [uiRenderMetrics, setUiRenderMetrics] = useState<{
    contactsList: number
    companiesList: number
    dealsList: number
  } | null>(null)
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null)

  // Fetch system info on mount
  useEffect(() => {
    fetchSystemInfo()
    fetchPerformanceMetrics()
  }, [])

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('/api/speed/system-info')
      const data = await response.json()
      setSystemInfo(data)
    } catch (error) {
      console.error('Failed to fetch system info:', error)
    }
  }

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch('/api/speed/metrics')
      const data = await response.json()
      setPerformanceMetrics(data)
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error)
    }
  }

  const runBenchmarks = async () => {
    setRunning(true)
    setProgress(0)
    setResults([])

    const benchmarks = [
      {
        name: 'Contacts List (10k)',
        endpoint: '/api/speed/contacts/list',
        target: 120,
        weight: 25,
      },
      {
        name: 'Contacts Search',
        endpoint: '/api/speed/contacts/search',
        target: 150,
        weight: 25,
      },
      {
        name: 'Companies List (2k)',
        endpoint: '/api/speed/companies/list',
        target: 100,
        weight: 15,
      },
      {
        name: 'Companies Search',
        endpoint: '/api/speed/companies/search',
        target: 120,
        weight: 15,
      },
      {
        name: 'Deals List (800)',
        endpoint: '/api/speed/deals/list',
        target: 80,
        weight: 10,
      },
      {
        name: 'Deals Search',
        endpoint: '/api/speed/deals/search',
        target: 100,
        weight: 10,
      },
    ]

    let completedWeight = 0
    const newResults: BenchmarkResult[] = []

    for (const benchmark of benchmarks) {
      const result = await runSingleBenchmark(
        benchmark.endpoint,
        benchmark.target
      )
      newResults.push(result)
      setResults([...newResults])

      completedWeight += benchmark.weight
      setProgress(completedWeight)
    }

    // Measure UI render times
    await measureUIRenderTimes()

    // Fetch updated performance metrics
    await fetchPerformanceMetrics()

    setRunning(false)
  }

  const runSingleBenchmark = async (
    endpoint: string,
    target: number
  ): Promise<BenchmarkResult> => {
    const samples = 20 // Run 20 samples for statistical significance
    const latencies: number[] = []

    for (let i = 0; i < samples; i++) {
      const start = performance.now()

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: 1,
            pageSize: 50,
            ...(endpoint.includes('search') && { query: 'test' }),
          }),
        })

        await response.json()
        const end = performance.now()
        const latency = end - start

        latencies.push(latency)

        // Add performance mark for DevTools
        performance.mark(`${endpoint}-sample-${i}`)
      } catch (error) {
        console.error(`Benchmark failed for ${endpoint}:`, error)
      }

      // Small delay between samples to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Calculate percentiles
    latencies.sort((a, b) => a - b)
    const p50 = percentile(latencies, 50)
    const p95 = percentile(latencies, 95)
    const p99 = percentile(latencies, 99)
    const min = Math.min(...latencies)
    const max = Math.max(...latencies)
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length

    // Check if target is met (p95 should be below target)
    const passed = p95 <= target

    return {
      endpoint: endpoint.split('/').pop() || endpoint,
      samples,
      p50: Math.round(p50),
      p95: Math.round(p95),
      p99: Math.round(p99),
      min: Math.round(min),
      max: Math.round(max),
      avg: Math.round(avg),
      passed,
      target,
    }
  }

  const measureUIRenderTimes = async () => {
    // Measure UI render times using Performance API
    // These would be measured in the actual components during navigation
    const renderMetrics = {
      contactsList: 0,
      companiesList: 0,
      dealsList: 0,
    }

    // Check for existing performance marks
    const marks = performance.getEntriesByType('mark')
    const measures = performance.getEntriesByType('measure')

    marks.forEach((mark) => {
      if (mark.name.includes('contacts-list-render')) {
        // Get the associated measure
        const measure = measures.find((m) => m.name.includes('contacts-list'))
        if (measure) {
          renderMetrics.contactsList = measure.duration
        }
      } else if (mark.name.includes('companies-list-render')) {
        const measure = measures.find((m) => m.name.includes('companies-list'))
        if (measure) {
          renderMetrics.companiesList = measure.duration
        }
      } else if (mark.name.includes('deals-list-render')) {
        const measure = measures.find((m) => m.name.includes('deals-list'))
        if (measure) {
          renderMetrics.dealsList = measure.duration
        }
      }
    })

    setUiRenderMetrics(renderMetrics)
  }

  const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0
    const index = (p / 100) * (arr.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1

    if (lower === upper) return arr[lower]
    return arr[lower] * (1 - weight) + arr[upper] * weight
  }

  const allPassed = results.every((r) => r.passed)

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <Zap className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Performance Benchmarks</h1>
        </div>
        <p className="text-muted-foreground">
          Reproducible latency benchmarks for list and search endpoints
        </p>
      </div>

      {/* System Information */}
      {systemInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Test Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Contacts</p>
                <p className="text-2xl font-bold">
                  {systemInfo.contacts.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Companies</p>
                <p className="text-2xl font-bold">
                  {systemInfo.companies.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Deals</p>
                <p className="text-2xl font-bold">
                  {systemInfo.deals.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Timestamp</p>
                <p className="font-mono text-sm">
                  {new Date(systemInfo.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Benchmarks Button */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-1 font-semibold">Run Performance Tests</h3>
              <p className="text-sm text-muted-foreground">
                Executes 20 samples per endpoint to measure p50, p95, p99
                latencies
              </p>
            </div>
            <Button
              onClick={runBenchmarks}
              disabled={running}
              size="lg"
              className="gap-2"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Run Benchmarks
                </>
              )}
            </Button>
          </div>
          {running && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                {progress}% complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Tabs defaultValue="results" className="mb-6">
          <TabsList>
            <TabsTrigger value="results">Benchmark Results</TabsTrigger>
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            {/* Overall Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {allPassed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Overall Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">
                  {allPassed ? (
                    <span className="font-semibold text-green-600">
                      ✓ All benchmarks passed target latencies
                    </span>
                  ) : (
                    <span className="font-semibold text-red-600">
                      ✗ Some benchmarks exceeded target latencies
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Individual Results */}
            {results.map((result, index) => {
              // Get server metrics for this endpoint
              const serverMetrics =
                performanceMetrics?.metrics?.[
                  `${result.endpoint.replace('/', '-')}`
                ]?.stats
              const clientRenderMetric =
                uiRenderMetrics?.[
                  result.endpoint as keyof typeof uiRenderMetrics
                ]

              return (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {result.endpoint}
                      </CardTitle>
                      <Badge
                        variant={result.passed ? 'default' : 'destructive'}
                      >
                        {result.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                    <CardDescription>
                      Target: &lt;{result.target}ms (p95) • {result.samples}{' '}
                      samples
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 grid grid-cols-3 gap-4 md:grid-cols-7">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Min
                        </p>
                        <p className="font-mono text-lg">{result.min}ms</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          p50
                        </p>
                        <p className="font-mono text-lg font-semibold">
                          {result.p50}ms
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          p95
                        </p>
                        <p
                          className={`font-mono text-lg font-semibold ${result.passed ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {result.p95}ms
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          p99
                        </p>
                        <p className="font-mono text-lg">{result.p99}ms</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Max
                        </p>
                        <p className="font-mono text-lg">{result.max}ms</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Avg
                        </p>
                        <p className="font-mono text-lg">{result.avg}ms</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Status
                        </p>
                        <div className="flex items-center gap-1">
                          {result.passed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Server and Client Metrics */}
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="mb-1 text-sm text-muted-foreground">
                            Server Response
                          </p>
                          <p className="font-mono text-lg">
                            {serverMetrics
                              ? `${Math.round(serverMetrics.avg)}ms`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-sm text-muted-foreground">
                            Client Render
                          </p>
                          <p className="font-mono text-lg">
                            {clientRenderMetric && clientRenderMetric > 0
                              ? `${Math.round(clientRenderMetric)}ms`
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* UI Render Metrics */}
            {uiRenderMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    UI Render Times
                  </CardTitle>
                  <CardDescription>
                    Client-side rendering measured with Performance API
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        Contacts List
                      </p>
                      <p className="font-mono text-xl">
                        {uiRenderMetrics.contactsList > 0
                          ? `${Math.round(uiRenderMetrics.contactsList)}ms`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        Companies List
                      </p>
                      <p className="font-mono text-xl">
                        {uiRenderMetrics.companiesList > 0
                          ? `${Math.round(uiRenderMetrics.companiesList)}ms`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        Deals List
                      </p>
                      <p className="font-mono text-xl">
                        {uiRenderMetrics.dealsList > 0
                          ? `${Math.round(uiRenderMetrics.dealsList)}ms`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Note: Navigate to respective pages to capture render metrics
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="methodology">
            <Card>
              <CardHeader>
                <CardTitle>Benchmark Methodology</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="mb-2 flex items-center gap-2 font-semibold">
                    <TrendingUp className="h-4 w-4" />
                    Test Approach
                  </h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    <li>
                      20 samples per endpoint for statistical significance
                    </li>
                    <li>
                      100ms delay between samples to avoid server overload
                    </li>
                    <li>Standard pagination (50 items per page)</li>
                    <li>
                      Search queries use term &quot;test&quot; for consistency
                    </li>
                    <li>
                      Results measured using{' '}
                      <code className="rounded bg-muted px-1">
                        performance.now()
                      </code>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Success Criteria</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    <li>
                      <strong>p95 latency</strong> must be below target (95% of
                      requests faster)
                    </li>
                    <li>Contacts list: &lt;120ms</li>
                    <li>Contacts search: &lt;150ms</li>
                    <li>Companies list: &lt;100ms</li>
                    <li>Companies search: &lt;120ms</li>
                    <li>Deals list: &lt;80ms</li>
                    <li>Deals search: &lt;100ms</li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Reproducibility</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Demo data seeded with fixed seed (12345)</li>
                    <li>10,000 contacts, 2,000 companies, 800 deals</li>
                    <li>Database indexes on critical fields</li>
                    <li>Run on same hardware for comparable results</li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-2 font-semibold">Limitations</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    <li>Network latency varies based on connection quality</li>
                    <li>Database performance depends on hardware and load</li>
                    <li>Browser performance affects client-side metrics</li>
                    <li>Cold starts may show higher initial latency</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
