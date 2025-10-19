/**
 * Performance metrics utilities for measuring and tracking application performance
 */

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

export interface LatencyMeasurement {
  operation: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

/**
 * High-precision timer for measuring operation latency
 */
export class PerformanceTimer {
  private measurements: LatencyMeasurement[] = []
  private activeMeasurements: Map<string, LatencyMeasurement> = new Map()

  /**
   * Start timing an operation
   */
  start(operation: string, metadata?: Record<string, any>): void {
    const measurement: LatencyMeasurement = {
      operation,
      startTime: performance.now(),
      metadata,
    }

    this.activeMeasurements.set(operation, measurement)
  }

  /**
   * End timing an operation and record the measurement
   */
  end(operation: string): number | null {
    const measurement = this.activeMeasurements.get(operation)
    if (!measurement) {
      console.warn(`No active measurement found for operation: ${operation}`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - measurement.startTime

    const completedMeasurement: LatencyMeasurement = {
      ...measurement,
      endTime,
      duration,
    }

    this.measurements.push(completedMeasurement)
    this.activeMeasurements.delete(operation)

    return duration
  }

  /**
   * Measure a synchronous operation
   */
  measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): { result: T; duration: number } {
    this.start(operation, metadata)
    const result = fn()
    const duration = this.end(operation) || 0

    return { result, duration }
  }

  /**
   * Measure an asynchronous operation
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> {
    this.start(operation, metadata)
    const result = await fn()
    const duration = this.end(operation) || 0

    return { result, duration }
  }

  /**
   * Add a completed measurement
   */
  addMeasurement(measurement: LatencyMeasurement): void {
    this.measurements.push(measurement)
  }

  /**
   * Get all completed measurements
   */
  getMeasurements(): LatencyMeasurement[] {
    return [...this.measurements]
  }

  /**
   * Get measurements for a specific operation
   */
  getMeasurementsFor(operation: string): LatencyMeasurement[] {
    return this.measurements.filter((m) => m.operation === operation)
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements = []
    this.activeMeasurements.clear()
  }

  /**
   * Get statistics for measurements
   */
  getStats(operation?: string): {
    count: number
    min: number
    max: number
    avg: number
    p50: number
    p95: number
    p99: number
  } | null {
    const measurements = operation
      ? this.getMeasurementsFor(operation)
      : this.measurements

    const durations = measurements
      .filter((m) => m.duration !== undefined)
      .map((m) => m.duration!)
      .sort((a, b) => a - b)

    if (durations.length === 0) return null

    const count = durations.length
    const min = durations[0]
    const max = durations[durations.length - 1]
    const avg = durations.reduce((sum, d) => sum + d, 0) / count

    const p50 = percentile(durations, 50)
    const p95 = percentile(durations, 95)
    const p99 = percentile(durations, 99)

    return { count, min, max, avg, p50, p95, p99 }
  }
}

/**
 * Global performance timer instance
 */
export const globalTimer = new PerformanceTimer()

/**
 * Utility functions for performance measurement
 */
export const PerformanceUtils = {
  /**
   * Measure server-side operation latency
   */
  measureServerOperation: async <T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; duration: number }> => {
    return globalTimer.measureAsync(operation, fn, metadata)
  },

  /**
   * Measure client-side operation latency
   */
  measureClientOperation: <T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): { result: T; duration: number } => {
    return globalTimer.measureSync(operation, fn, metadata)
  },

  /**
   * Record a performance metric
   */
  recordMetric: (
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): void => {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    }

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[METRIC] ${name}: ${value}ms`, metadata)
    }

    // Store in global timer for retrieval
    const measurement: LatencyMeasurement = {
      operation: name,
      startTime: 0,
      endTime: value,
      duration: value,
      metadata,
    }
    globalTimer.addMeasurement(measurement)
  },

  /**
   * Get performance statistics
   */
  getStats: (operation?: string) => {
    return globalTimer.getStats(operation)
  },

  /**
   * Get all performance metrics
   */
  getMetrics: () => {
    const allMeasurements = globalTimer.getMeasurements()
    const metricsByOperation: Record<string, any> = {}

    // Group measurements by operation
    allMeasurements.forEach((measurement) => {
      if (!metricsByOperation[measurement.operation]) {
        metricsByOperation[measurement.operation] = {
          operation: measurement.operation,
          measurements: [],
          stats: null,
        }
      }
      metricsByOperation[measurement.operation].measurements.push(measurement)
    })

    // Calculate stats for each operation
    Object.keys(metricsByOperation).forEach((operation) => {
      const measurements = metricsByOperation[operation].measurements
      const durations = measurements.map((m: LatencyMeasurement) => m.duration)
      metricsByOperation[operation].stats = globalTimer.getStats(operation)
      metricsByOperation[operation].count = measurements.length
      metricsByOperation[operation].latest =
        measurements[measurements.length - 1]
    })

    return metricsByOperation
  },

  /**
   * Clear all performance data
   */
  clear: () => {
    globalTimer.clear()
  },
}

/**
 * React hook for measuring component render time
 */
export function useRenderTime(componentName: string) {
  const startTime = performance.now()

  React.useEffect(() => {
    const endTime = performance.now()
    const duration = endTime - startTime

    PerformanceUtils.recordMetric(`${componentName}-render`, duration, {
      type: 'render',
      component: componentName,
    })
  })
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0

  const index = (p / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1

  if (lower === upper) return sortedArray[lower]

  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
}

// Re-export React for the hook
import * as React from 'react'
