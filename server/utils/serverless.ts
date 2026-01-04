/**
 * Serverless utilities for Netlify Functions optimization
 * Handles connection caching, timeouts, and memory optimization
 */

/**
 * Configuration for serverless environment
 */
export const serverlessConfig = {
  // Database connection settings
  db: {
    // Maximum time to wait for initial connection
    connectTimeoutMS: 10000,
    // Socket timeout for long-running queries
    socketTimeoutMS: 45000,
    // Server selection timeout
    serverSelectionTimeoutMS: 10000,
    // Connection pool sizes
    maxPoolSize: 10,
    minPoolSize: 2,
  },

  // Request handling settings
  request: {
    // Maximum request timeout (29s, leaving 1s buffer for Netlify)
    timeout: 29000,
    // Maximum request body size
    maxBodySize: "10mb",
  },

  // Cache settings
  cache: {
    // Enable in-memory caching for static data
    enabled: true,
    // TTL for cached items (in seconds)
    ttl: 300,
  },

  // Feature flags
  features: {
    // Enable detailed logging
    detailedLogging: process.env.NODE_ENV === "development",
    // Enable request tracking
    requestTracking: true,
    // Enable performance metrics
    performanceMetrics: true,
  },
};

/**
 * Request timeout wrapper
 * Automatically enforces timeout on promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = serverlessConfig.request.timeout,
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Simple in-memory cache for serverless (reused across invocations)
 */
class ServerlessCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  get(key: string): any | null {
    const item = this.cache.get(key);

    if (!item) return null;

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: any, ttlSeconds: number = 300): void {
    if (!serverlessConfig.cache.enabled) return;

    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired items periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new ServerlessCache();

/**
 * Logger with context information
 */
export class ServerlessLogger {
  private context: Record<string, any> = {};

  setContext(context: Record<string, any>): void {
    this.context = context;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = Object.entries(this.context)
      .map(([key, value]) => `${key}=${value}`)
      .join(" ");

    return `[${timestamp}] [${level}]${contextStr ? ` [${contextStr}]` : ""} ${message}`;
  }

  info(message: string, data?: any): void {
    if (serverlessConfig.features.detailedLogging) {
      console.log(this.formatMessage("INFO", message), data || "");
    }
  }

  warn(message: string, data?: any): void {
    console.warn(this.formatMessage("WARN", message), data || "");
  }

  error(message: string, error?: any): void {
    console.error(this.formatMessage("ERROR", message), error || "");
  }

  debug(message: string, data?: any): void {
    if (serverlessConfig.features.detailedLogging) {
      console.debug(this.formatMessage("DEBUG", message), data || "");
    }
  }
}

export const logger = new ServerlessLogger();

/**
 * Performance metrics tracker
 */
export class PerformanceTracker {
  private metrics = new Map<string, number[]>();

  record(name: string, durationMs: number): void {
    if (!serverlessConfig.features.performanceMetrics) return;

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(durationMs);
  }

  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
  } | null {
    const durations = this.metrics.get(name);
    if (!durations || durations.length === 0) return null;

    return {
      count: durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    };
  }

  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, durations] of this.metrics.entries()) {
      if (durations.length > 0) {
        stats[name] = {
          count: durations.length,
          min: Math.min(...durations),
          max: Math.max(...durations),
          avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        };
      }
    }

    return stats;
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const tracker = new PerformanceTracker();

/**
 * Error handler for consistent error responses
 */
export function handleServerlessError(error: any) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  logger.error("Unhandled serverless error", error);

  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      error: "Internal server error",
      message:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "An unexpected error occurred",
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Middleware for performance monitoring
 */
export function createPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Track request
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      tracker.record(`${req.method} ${req.path}`, duration);

      if (serverlessConfig.features.requestTracking) {
        logger.info(`Request completed`, {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
        });
      }
    });

    next();
  };
}

export default {
  serverlessConfig,
  withTimeout,
  cache,
  logger,
  tracker,
  handleServerlessError,
  createPerformanceMiddleware,
};
