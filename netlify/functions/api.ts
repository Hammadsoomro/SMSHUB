import "dotenv/config";
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import serverless from "serverless-http";
import { createServer } from "../../server";

// Global app instance (reused across warm Lambda invocations)
let cachedApp: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

/**
 * Initialize the Express app with database connection
 * Optimized for serverless with caching and connection pooling
 */
async function initializeApp() {
  if (cachedApp) {
    return cachedApp;
  }

  // Prevent multiple simultaneous initializations
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  try {
    initPromise = createServer();
    cachedApp = await initPromise;
    isInitializing = false;
    return cachedApp;
  } catch (error) {
    isInitializing = false;
    initPromise = null;
    cachedApp = null;
    console.error("Failed to initialize Express app:", error);
    throw error;
  }
}

/**
 * Main Netlify Function Handler
 * Handles all API routes with proper error handling and logging
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Set timeout context to maximum allowed
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Log incoming request for debugging
    console.log(`[${new Date().toISOString()}] ${event.httpMethod} ${event.path}`);

    // Initialize app on first invocation
    const app = await initializeApp();

    // Use serverless-http to convert the event to Express
    const serverlessHandler = serverless(app);
    const response = await serverlessHandler(event, context);

    // Add security headers
    if (!response.headers) {
      response.headers = {};
    }

    response.headers["X-Content-Type-Options"] = "nosniff";
    response.headers["X-Frame-Options"] = "DENY";
    response.headers["X-XSS-Protection"] = "1; mode=block";
    response.headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains";
    response.headers["Content-Security-Policy"] =
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    // Log response
    console.log(
      `[${new Date().toISOString()}] ${event.httpMethod} ${event.path} - ${response.statusCode}`
    );

    return response;
  } catch (error) {
    console.error("[ERROR]", error);

    // Return proper error response
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : "An unexpected error occurred",
      }),
    };
  }
};

/**
 * Health check function for monitoring
 * Can be called separately to verify the API is responding
 */
export const healthCheck: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const app = await initializeApp();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }),
    };
  } catch (error) {
    console.error("[HEALTH_CHECK_ERROR]", error);

    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "unhealthy",
        error:
          error instanceof Error ? error.message : "Unknown initialization error",
      }),
    };
  }
};

// Export default handler
export default handler;
