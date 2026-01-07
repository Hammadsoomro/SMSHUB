import "dotenv/config";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import serverless from "serverless-http";
import { createServer } from "../../server";

/**
 * Production-Grade Netlify Serverless API Handler
 * ================================================
 *
 * Features:
 * ✅ Global Express app caching
 * ✅ Timeout protection (hard limit 25s)
 * ✅ Request validation
 * ✅ Body size limits
 * ✅ CORS headers
 * ✅ Security headers
 * ✅ Error categorization
 * ✅ Request ID tracking
 * ✅ Environment validation
 * ✅ Graceful error handling
 * ✅ Connection leak prevention
 * ✅ OPTIONS method support
 */

// Configuration
const CONFIG = {
  // Timeouts (Netlify hard limit is 26.5s for Pro)
  FUNCTION_TIMEOUT_MS: 25000, // 25 seconds (buffer for cleanup)
  APP_INIT_TIMEOUT_MS: 15000, // 15 seconds for app initialization
  REQUEST_TIMEOUT_MS: 20000, // 20 seconds per request

  // Body limits
  MAX_BODY_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB

  // Paths that don't require authentication
  PUBLIC_PATHS: [
    "/api/auth/signup",
    "/api/auth/login",
    "/api/demo",
    "/api/ping",
    "/api/health",
    "/api/webhooks",
  ],
};

// Global state
let cachedApp: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;
let lastInitTime = 0;
let initError: Error | null = null;

// ✅ Request deduplication: Prevent duplicate processing of same request
// Maps idempotency key to response, expires after 24 hours
const idempotentResponseCache = new Map<
  string,
  { response: any; expiresAt: number }
>();

/**
 * Validate environment variables on startup
 */
function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const required = ["MONGODB_URI", "JWT_SECRET"];
  for (const key of required) {
    if (!process.env[key]) {
      errors.push(`Missing environment variable: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Initialize Express app with timeout protection
 * Reuses connection across warm Lambda invocations
 */
async function initializeApp(force: boolean = false): Promise<any> {
  // Return cached app if available
  if (cachedApp && !force) {
    return cachedApp;
  }

  // Return existing promise if already initializing
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // Prevent re-initialization if recent error
  if (initError && Date.now() - lastInitTime < 5000) {
    throw initError;
  }

  isInitializing = true;
  lastInitTime = Date.now();

  try {
    // Create initialization promise with timeout
    initPromise = Promise.race([
      createServer(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("App initialization timeout")),
          CONFIG.APP_INIT_TIMEOUT_MS,
        ),
      ),
    ]);

    cachedApp = await initPromise;
    isInitializing = false;
    initError = null;

    console.log("[API] Express app initialized successfully");
    return cachedApp;
  } catch (error) {
    isInitializing = false;
    initPromise = null;
    cachedApp = null;
    initError = error as Error;

    console.error("[API] Failed to initialize Express app:", error);
    throw error;
  }
}

/**
 * Validate request before processing
 */
function validateRequest(event: HandlerEvent): {
  valid: boolean;
  error?: string;
  statusCode?: number;
} {
  // Check body size if present
  if (event.body) {
    const bodySize = Buffer.byteLength(event.body, "utf-8");
    if (bodySize > CONFIG.MAX_BODY_SIZE_BYTES) {
      return {
        valid: false,
        error: "Request body exceeds maximum size",
        statusCode: 413, // Payload Too Large
      };
    }
  }

  // Validate HTTP method
  const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
  if (!validMethods.includes(event.httpMethod)) {
    return {
      valid: false,
      error: "Invalid HTTP method",
      statusCode: 405, // Method Not Allowed
    };
  }

  return { valid: true };
}

/**
 * Generate request ID for tracking
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Build CORS and security headers
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400", // 24 hours
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "geolocation=(), microphone=(), camera=(), payment=()",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

/**
 * Categorize errors for proper HTTP response codes
 */
function categorizeError(error: any): {
  statusCode: number;
  message: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Timeout errors
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
    return {
      statusCode: 504, // Gateway Timeout
      message: "Request timeout - operation took too long",
    };
  }

  // Database connection errors
  if (
    errorMessage.includes("MongoDB") ||
    errorMessage.includes("connection") ||
    errorMessage.includes("ECONNREFUSED")
  ) {
    return {
      statusCode: 503, // Service Unavailable
      message: "Database connection error",
    };
  }

  // Memory/resource errors
  if (
    errorMessage.includes("OutOfMemory") ||
    errorMessage.includes("ENOMEM") ||
    errorMessage.includes("heap")
  ) {
    return {
      statusCode: 503,
      message: "Service temporarily unavailable",
    };
  }

  // Authentication errors
  if (errorMessage.includes("Unauthorized") || errorMessage.includes("auth")) {
    return {
      statusCode: 401,
      message: "Authentication failed",
    };
  }

  // Default: Internal Server Error
  return {
    statusCode: 500,
    message: "Internal server error",
  };
}

/**
 * Main Netlify Function Handler
 * Processes all API requests with comprehensive error handling
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext,
) => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Disable callback waiting for better performance
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // ✅ Request deduplication for idempotent operations
    const isMutationRequest = ["POST", "PUT", "DELETE", "PATCH"].includes(
      event.httpMethod,
    );
    const idempotencyKey = isMutationRequest
      ? event.headers["idempotency-key"]
      : null;

    if (idempotencyKey) {
      const cached = idempotentResponseCache.get(idempotencyKey);

      if (cached && Date.now() < cached.expiresAt) {
        console.log(
          `[${requestId}] ✓ Cached response returned for idempotency key: ${idempotencyKey}`,
        );
        return cached.response;
      } else if (cached) {
        // Remove expired entry
        idempotentResponseCache.delete(idempotencyKey);
      }
    }

    // Log request with details
    console.log(
      `[${requestId}] → ${event.httpMethod} ${event.path} (path: ${event.rawPath || event.path})`,
    );

    // Debug: Log request details
    if (
      event.httpMethod === "POST" ||
      event.httpMethod === "PUT" ||
      event.httpMethod === "PATCH"
    ) {
      console.log(`[${requestId}] Body present: ${!!event.body}`);
      console.log(`[${requestId}] Base64 encoded: ${event.isBase64Encoded}`);
      console.log(
        `[${requestId}] Content-Type: ${event.headers["content-type"] || "not set"}`,
      );
      if (event.body) {
        console.log(`[${requestId}] Body length: ${event.body.length}`);
        console.log(
          `[${requestId}] Body preview: ${event.body.substring(0, 100)}`,
        );
      }
    }

    // Handle OPTIONS requests (CORS preflight)
    if (event.httpMethod === "OPTIONS") {
      console.log(`[${requestId}] ✓ OPTIONS preflight response`);
      return {
        statusCode: 204,
        headers: getSecurityHeaders(),
        body: "",
      };
    }

    // CRITICAL: Decode base64 body BEFORE processing
    if (event.isBase64Encoded && event.body) {
      try {
        event.body = Buffer.from(event.body, "base64").toString("utf-8");
        event.isBase64Encoded = false;
        console.log(`[${requestId}] ✓ Base64 body decoded`);
      } catch (decodeErr) {
        console.error(
          `[${requestId}] ✗ Failed to decode base64 body:`,
          decodeErr,
        );
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            ...getSecurityHeaders(),
          },
          body: JSON.stringify({
            error: "Invalid request encoding",
            requestId,
          }),
        };
      }
    }

    // Normalize headers to lowercase for consistency
    const normalizedHeaders: Record<string, string> = {};
    if (event.headers) {
      Object.entries(event.headers).forEach(([key, value]) => {
        normalizedHeaders[key.toLowerCase()] = value as string;
      });
    }

    // Ensure content-length header is set for body parsing
    if (event.body && !normalizedHeaders["content-length"]) {
      const bodyLength = Buffer.byteLength(event.body, "utf-8");
      normalizedHeaders["content-length"] = String(bodyLength);
      console.log(`[${requestId}] ✓ Set content-length header: ${bodyLength}`);
    }

    event.headers = normalizedHeaders as any;

    // Validate request
    const validation = validateRequest(event);
    if (!validation.valid) {
      console.warn(
        `[${requestId}] ✗ Request validation failed: ${validation.error}`,
      );
      return {
        statusCode: validation.statusCode || 400,
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders(),
        },
        body: JSON.stringify({
          error: validation.error,
          requestId,
        }),
      };
    }

    // Initialize Express app with timeout
    let app;
    try {
      app = await Promise.race([
        initializeApp(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Express initialization timeout")),
            CONFIG.APP_INIT_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (initErr) {
      console.error(`[${requestId}] ✗ App initialization failed:`, initErr);
      return {
        statusCode: 503,
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders(),
        },
        body: JSON.stringify({
          error: "Service temporarily unavailable",
          requestId,
          message:
            process.env.NODE_ENV === "development"
              ? initErr instanceof Error
                ? initErr.message
                : "Unknown initialization error"
              : undefined,
        }),
      };
    }

    // CRITICAL FIX: Pre-parse the body before passing to Express
    // This ensures both JSON and form-encoded requests work properly
    let parsedBody: any = event.body;
    const contentType = event.headers["content-type"] || "";

    if (event.body) {
      if (contentType.includes("application/json")) {
        // Parse JSON body
        try {
          parsedBody = JSON.parse(event.body);
          console.log(
            `[${requestId}] ✓ JSON body pre-parsed: ${JSON.stringify(parsedBody).substring(0, 100)}`,
          );
        } catch (parseErr) {
          console.error(`[${requestId}] ✗ Failed to pre-parse JSON:`, parseErr);
          // Continue with original body, let Express handle it
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        // Parse form-encoded body (for Twilio webhooks)
        try {
          const params = new URLSearchParams(event.body);
          parsedBody = Object.fromEntries(params);
          console.log(
            `[${requestId}] ✓ Form-encoded body parsed: ${JSON.stringify(parsedBody).substring(0, 100)}`,
          );

          // DEBUG: Log all fields for Twilio webhooks
          if (event.path?.includes("/webhooks")) {
            console.log(
              `[${requestId}] [Twilio Webhook] All fields:`,
              Object.keys(parsedBody).join(", "),
            );
            console.log(
              `[${requestId}] [Twilio Webhook] From: ${parsedBody.From}, To: ${parsedBody.To}, Body: ${parsedBody.Body?.substring(0, 50)}`,
            );
          }
        } catch (parseErr) {
          console.error(
            `[${requestId}] ✗ Failed to parse form-encoded body:`,
            parseErr,
          );
          // Continue with original body, let Express handle it
        }
      }
    }

    // Use serverless-http to convert Netlify event to Express
    const serverlessHandler = serverless(app, {
      // Preserve raw body for webhook signature validation
      request: (request: any, event: HandlerEvent) => {
        // Only attach body for requests that should have one
        const isMutationRequest = ["POST", "PUT", "PATCH"].includes(
          event.httpMethod,
        );
        const isWebhook = event.path?.includes("/webhooks");

        if ((isMutationRequest || isWebhook) && event.body) {
          // Store the raw body string for webhook signature validation
          request.rawBody = event.body;
          console.log(
            `[${requestId}] ✓ Raw body attached (${Buffer.byteLength(event.body, "utf-8")} bytes)`,
          );
        }

        // For all requests with parsed bodies, inject the parsed data
        // Mark as already parsed so middleware won't try to parse again
        if (parsedBody) {
          (request as any)._body = true;
          (request as any).body = parsedBody;
          console.log(
            `[${requestId}] ✓ Parsed body injected into request object`,
          );
        }
      },
    });

    // Execute handler with timeout protection
    let response: any;
    try {
      response = await Promise.race([
        serverlessHandler(event, context),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Request processing timeout")),
            CONFIG.REQUEST_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (handlerErr) {
      console.error(`[${requestId}] ✗ Handler error:`, handlerErr);
      const { statusCode, message } = categorizeError(handlerErr);

      return {
        statusCode,
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders(),
        },
        body: JSON.stringify({
          error: message,
          requestId,
          details:
            process.env.NODE_ENV === "development"
              ? handlerErr instanceof Error
                ? handlerErr.message
                : String(handlerErr)
              : undefined,
        }),
      };
    }

    // Ensure response has proper structure
    if (!response) {
      console.warn(`[${requestId}] ✗ Empty response from handler`);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders(),
        },
        body: JSON.stringify({
          error: "No response from handler",
          requestId,
        }),
      };
    }

    // Initialize headers if missing
    if (!response.headers) {
      response.headers = {};
    }

    // Add security headers to response
    response.headers = {
      ...response.headers,
      ...getSecurityHeaders(),
    };

    // Ensure Content-Type
    if (!response.headers["Content-Type"]) {
      response.headers["Content-Type"] = "application/json";
    }

    // Add request tracking header
    response.headers["X-Request-ID"] = requestId;

    // ✅ Cache response for idempotent requests
    if (
      idempotencyKey &&
      response.statusCode >= 200 &&
      response.statusCode < 300
    ) {
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      idempotentResponseCache.set(idempotencyKey, { response, expiresAt });
      response.headers["X-Idempotency-Key"] = idempotencyKey;
      console.log(
        `[${requestId}] ✓ Response cached for idempotency key: ${idempotencyKey}`,
      );
    }

    // Log response with timing
    const duration = Date.now() - startTime;
    const statusEmoji =
      response.statusCode >= 200 && response.statusCode < 300
        ? "✓"
        : response.statusCode >= 400
          ? "✗"
          : "→";

    console.log(
      `[${requestId}] ${statusEmoji} ${event.httpMethod} ${event.path} - ${response.statusCode} (${duration}ms)`,
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[${requestId}] ✗ Unhandled error after ${duration}ms:`,
      error,
    );

    // Last-resort error response
    try {
      const { statusCode, message } = categorizeError(error);

      return {
        statusCode,
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders(),
        },
        body: JSON.stringify({
          error: message,
          requestId,
          details:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.message
                : String(error)
              : undefined,
        }),
      };
    } catch (fallbackErr) {
      console.error(`[${requestId}] ✗ Error handler failed:`, fallbackErr);

      // Ultimate fallback
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
        body: JSON.stringify({
          error: "Internal server error",
          requestId,
        }),
      };
    }
  }
};

/**
 * OPTIONS handler for CORS preflight
 */
export const options: Handler = async (
  _event: HandlerEvent,
  context: HandlerContext,
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  return {
    statusCode: 204,
    headers: getSecurityHeaders(),
    body: "",
  };
};

/**
 * Health check endpoint
 */
export const health: Handler = async (
  _event: HandlerEvent,
  context: HandlerContext,
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const startTime = Date.now();

  try {
    // Validate environment
    const envValidation = validateEnvironment();
    if (!envValidation.valid) {
      console.error(
        "[HEALTH] Environment validation failed:",
        envValidation.errors,
      );
      return {
        statusCode: 503,
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders(),
        },
        body: JSON.stringify({
          status: "unhealthy",
          reason: "Environment not configured",
          errors: envValidation.errors,
        }),
      };
    }

    // Initialize app with timeout
    let app;
    try {
      app = await Promise.race([
        initializeApp(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Health check app init timeout")),
            CONFIG.APP_INIT_TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (err) {
      console.error("[HEALTH] App initialization failed:", err);
      return {
        statusCode: 503,
        headers: {
          "Content-Type": "application/json",
          ...getSecurityHeaders(),
        },
        body: JSON.stringify({
          status: "unhealthy",
          reason: "Service initialization failed",
          error:
            process.env.NODE_ENV === "development"
              ? err instanceof Error
                ? err.message
                : String(err)
              : undefined,
        }),
      };
    }

    const duration = Date.now() - startTime;

    // All checks passed
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...getSecurityHeaders(),
      },
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${duration}ms`,
        environment: process.env.NODE_ENV,
        version: "1.0.0",
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[HEALTH] Health check failed:", error);

    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json",
        ...getSecurityHeaders(),
      },
      body: JSON.stringify({
        status: "unhealthy",
        error:
          error instanceof Error ? error.message : "Unknown health check error",
        responseTime: `${duration}ms`,
      }),
    };
  }
};

// Export default handler
export default handler;
