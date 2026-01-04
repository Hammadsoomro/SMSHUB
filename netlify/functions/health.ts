import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import mongoose from "mongoose";

/**
 * Health check endpoint for monitoring the Netlify deployment
 * Verifies API and database connectivity
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext,
) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const startTime = Date.now();
  const checks: Record<string, boolean | string> = {};

  try {
    // Check environment
    checks.environment = process.env.NODE_ENV || "unknown";

    // Check MongoDB connection
    const readyState = mongoose.connection.readyState;
    checks.database =
      readyState === 1 ? "connected" : `disconnected (state: ${readyState})`;

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine overall health
    const isHealthy = checks.database === "connected" && responseTime < 5000;

    return {
      statusCode: isHealthy ? 200 : 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: JSON.stringify({
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
        responseTime: `${responseTime}ms`,
        version: "1.0.0",
      }),
    };
  } catch (error) {
    console.error("[HEALTH_CHECK_ERROR]", error);

    const responseTime = Date.now() - startTime;

    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
      body: JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: `${responseTime}ms`,
      }),
    };
  }
};

export default handler;
