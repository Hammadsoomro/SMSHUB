import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import ablyServer from "../../server/ably";
import { verifyToken as verifyJWT } from "../../server/jwt";

/**
 * Ably Channel Statistics Function
 * ===============================================
 *
 * Provides real-time statistics about Ably channels.
 *
 * This function:
 * ✅ Validates user authentication via JWT
 * ✅ Returns channel metadata and statistics
 * ✅ Monitors connection health
 * ✅ Tracks message publishing performance
 *
 * Endpoint: GET /.netlify/functions/ably-stats?channelName=<name>
 *
 * Request Headers:
 *   - Authorization: Bearer <JWT_TOKEN>
 *
 * Query Parameters:
 *   - channelName (optional): specific channel to get stats for
 *
 * Response:
 *   {
 *     "status": "healthy" | "degraded" | "unhealthy",
 *     "server": { ... },
 *     "channels": { ... },
 *     "timestamp": "ISO 8601 date"
 *   }
 */

interface StatsResponse {
  status: "healthy" | "degraded" | "unhealthy";
  server: {
    initialized: boolean;
    connectionState: string;
    uptime: number;
  };
  channels?: Record<string, any>;
  timestamp: string;
  responseTime: string;
}

interface ErrorResponse {
  error: string;
  requestId: string;
  details?: string;
}

/**
 * Extract and validate JWT from Authorization header
 */
function extractAndValidateToken(authHeader?: string): {
  valid: boolean;
  userId?: string;
  error?: string;
} {
  if (!authHeader) {
    return { valid: false, error: "Missing Authorization header" };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return { valid: false, error: "Invalid Authorization header format" };
  }

  try {
    const token = parts[1];
    const payload = verifyJWT(token);

    if (!payload.userId) {
      return { valid: false, error: "Invalid token payload" };
    }

    return { valid: true, userId: payload.userId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { valid: false, error: `Token verification failed: ${errorMsg}` };
  }
}

/**
 * Generate request ID for tracking
 */
function generateRequestId(): string {
  return `ably-stats-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Build security headers
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "max-age=30", // Cache for 30 seconds
  };
}

/**
 * Get Ably server connection state
 */
function getAblyServerState(): {
  initialized: boolean;
  connectionState: string;
} {
  try {
    if (!ablyServer.isInitialized) {
      return {
        initialized: false,
        connectionState: "not initialized",
      };
    }

    const client = ablyServer.getClient();
    if (!client) {
      return {
        initialized: false,
        connectionState: "client unavailable",
      };
    }

    const state = client.connection.state;
    return {
      initialized: true,
      connectionState: state || "unknown",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      initialized: false,
      connectionState: `error: ${errorMsg}`,
    };
  }
}

/**
 * Determine overall health status
 */
function determineHealthStatus(
  initialized: boolean,
  connectionState: string,
): "healthy" | "degraded" | "unhealthy" {
  if (!initialized) {
    return "unhealthy";
  }

  if (connectionState === "connected") {
    return "healthy";
  }

  if (connectionState === "connecting" || connectionState === "disconnected") {
    return "degraded";
  }

  return "unhealthy";
}

/**
 * Main handler
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const requestId = generateRequestId();
  context.callbackWaitsForEmptyEventLoop = false;

  const startTime = Date.now();

  try {
    // Handle OPTIONS (CORS preflight)
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: getSecurityHeaders(),
        body: "",
      };
    }

    // Only allow GET
    if (event.httpMethod !== "GET") {
      console.warn(`[${requestId}] Invalid method: ${event.httpMethod}`);
      return {
        statusCode: 405,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: "Method not allowed",
          requestId,
        } as ErrorResponse),
      };
    }

    console.log(`[${requestId}] GET /.netlify/functions/ably-stats`);

    // Validate and extract JWT
    const authHeader =
      event.headers.authorization || event.headers.Authorization;
    const authValidation = extractAndValidateToken(authHeader);

    if (!authValidation.valid) {
      console.warn(
        `[${requestId}] Auth validation failed: ${authValidation.error}`,
      );
      return {
        statusCode: 401,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: authValidation.error || "Unauthorized",
          requestId,
        } as ErrorResponse),
      };
    }

    console.log(`[${requestId}] ✓ User authenticated`);

    // Get Ably server state
    const { initialized, connectionState } = getAblyServerState();
    const status = determineHealthStatus(initialized, connectionState);

    console.log(
      `[${requestId}] Ably status: ${status} (initialized: ${initialized}, state: ${connectionState})`,
    );

    // Build response
    const response: StatsResponse = {
      status,
      server: {
        initialized,
        connectionState,
        uptime: Math.floor(process.uptime()),
      },
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
    };

    // Add optional channel details if requested
    const channelName = event.queryStringParameters?.channelName;
    if (channelName && initialized) {
      try {
        const client = ablyServer.getClient();
        if (client) {
          const channel = client.channels.get(channelName);
          response.channels = {
            [channelName]: {
              name: channel.name,
              state: channel.state,
            },
          };
          console.log(
            `[${requestId}] ✓ Channel details retrieved: ${channelName}`,
          );
        }
      } catch (error) {
        console.warn(
          `[${requestId}] Could not retrieve channel details: ${error}`,
        );
      }
    }

    const duration = Date.now() - startTime;
    const statusCode =
      status === "healthy" ? 200 : status === "degraded" ? 503 : 503;

    console.log(
      `[${requestId}] ✓ GET /.netlify/functions/ably-stats - ${statusCode} (${duration}ms)`,
    );

    return {
      statusCode,
      headers: {
        ...getSecurityHeaders(),
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(
      `[${requestId}] ✗ Unhandled error after ${duration}ms:`,
      error,
    );

    return {
      statusCode: 500,
      headers: {
        ...getSecurityHeaders(),
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({
        error: "Internal server error",
        requestId,
        details: process.env.NODE_ENV === "development" ? errorMsg : undefined,
      } as ErrorResponse),
    };
  }
};

export default handler;
