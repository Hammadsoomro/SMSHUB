import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import ablyServer from "../../server/ably";
import { verifyToken as verifyJWT } from "../../server/jwt";

/**
 * Ably Message Publishing Function
 * ==========================================
 *
 * Publishes messages to Ably channels with authorization checks.
 *
 * This function:
 * ✅ Validates user authentication via JWT
 * ✅ Verifies channel access permissions
 * ✅ Publishes messages to Ably channels
 * ✅ Handles concurrent publishing safely
 * ✅ Includes comprehensive error handling
 *
 * Endpoint: POST /.netlify/functions/ably-publish
 *
 * Request Headers:
 *   - Authorization: Bearer <JWT_TOKEN>
 *   - Content-Type: application/json
 *
 * Request Body:
 *   {
 *     "channelName": "sms:userId:contactId",
 *     "eventName": "message",
 *     "data": { ... }
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "channelName": "string",
 *     "messageId": "string",
 *     "timestamp": "ISO 8601 date"
 *   }
 */

interface PublishRequest {
  channelName: string;
  eventName: string;
  data: any;
}

interface PublishResponse {
  success: boolean;
  channelName: string;
  messageId: string;
  timestamp: string;
}

interface ErrorResponse {
  error: string;
  requestId: string;
  details?: string;
}

/**
 * Validate channel name format and permissions
 */
function validateChannelAccess(
  channelName: string,
  userId: string,
): { valid: boolean; error?: string } {
  if (!channelName || typeof channelName !== "string") {
    return { valid: false, error: "Invalid channel name" };
  }

  // Supported channel patterns
  const patterns = [
    /^sms:\w+:\w+$/, // sms:userId:contactId
    /^contacts:\w+$/, // contacts:userId
    /^notifications:\w+$/, // notifications:userId
  ];

  const isValidPattern = patterns.some((pattern) => pattern.test(channelName));
  if (!isValidPattern) {
    return {
      valid: false,
      error: "Invalid channel name format",
    };
  }

  // Verify user has access to the channel
  // Channel must be for the authenticated user
  const channelUserId = channelName.split(":")[1];
  if (channelUserId !== userId) {
    return {
      valid: false,
      error: "Unauthorized: Cannot publish to other users' channels",
    };
  }

  return { valid: true };
}

/**
 * Validate event name
 */
function validateEventName(eventName: string): boolean {
  const validEvents = [
    "message",
    "update",
    "sms_received",
    "message_status",
    "phone_number_assignment",
  ];
  return validEvents.includes(eventName);
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
  return `ably-pub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate message ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Build security headers
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };
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

    // Only allow POST
    if (event.httpMethod !== "POST") {
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

    console.log(`[${requestId}] POST /.netlify/functions/ably-publish`);

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

    const userId = authValidation.userId!;
    console.log(`[${requestId}] ✓ User authenticated: ${userId}`);

    // Parse request body
    let request: PublishRequest;
    try {
      if (!event.body) {
        throw new Error("Empty request body");
      }

      const body = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf-8")
        : event.body;

      request = JSON.parse(body);
      console.log(`[${requestId}] ✓ Request body parsed`);
    } catch (parseError) {
      const errorMsg =
        parseError instanceof Error ? parseError.message : "Invalid JSON";
      console.warn(`[${requestId}] Parse error: ${errorMsg}`);

      return {
        statusCode: 400,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: "Invalid request body",
          requestId,
          details:
            process.env.NODE_ENV === "development" ? errorMsg : undefined,
        } as ErrorResponse),
      };
    }

    // Validate request fields
    const { channelName, eventName, data } = request;

    if (!channelName || !eventName || !data) {
      console.warn(
        `[${requestId}] Missing required fields: channelName=${!!channelName}, eventName=${!!eventName}, data=${!!data}`,
      );

      return {
        statusCode: 400,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: "Missing required fields: channelName, eventName, data",
          requestId,
        } as ErrorResponse),
      };
    }

    // Validate channel access
    const channelValidation = validateChannelAccess(channelName, userId);
    if (!channelValidation.valid) {
      console.warn(
        `[${requestId}] Channel validation failed: ${channelValidation.error}`,
      );

      return {
        statusCode: 403,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: channelValidation.error || "Forbidden",
          requestId,
        } as ErrorResponse),
      };
    }

    console.log(`[${requestId}] ✓ Channel access validated: ${channelName}`);

    // Validate event name
    if (!validateEventName(eventName)) {
      console.warn(`[${requestId}] Invalid event name: ${eventName}`);

      return {
        statusCode: 400,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: "Invalid event name",
          requestId,
        } as ErrorResponse),
      };
    }

    console.log(`[${requestId}] ✓ Event name validated: ${eventName}`);

    // Check if Ably is initialized
    if (!ablyServer.isInitialized) {
      console.error(`[${requestId}] Ably server not initialized`);

      return {
        statusCode: 503,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: "Service temporarily unavailable",
          requestId,
        } as ErrorResponse),
      };
    }

    // Publish to Ably
    try {
      const client = ablyServer.getClient();
      if (!client) {
        throw new Error("Ably client not available");
      }

      const channel = client.channels.get(channelName);
      await channel.publish(eventName, data);

      console.log(
        `[${requestId}] ✓ Message published to ${channelName}/${eventName}`,
      );
    } catch (publishError) {
      const errorMsg =
        publishError instanceof Error
          ? publishError.message
          : String(publishError);

      console.error(`[${requestId}] Failed to publish message: ${errorMsg}`);

      return {
        statusCode: 500,
        headers: getSecurityHeaders(),
        body: JSON.stringify({
          error: "Failed to publish message",
          requestId,
          details:
            process.env.NODE_ENV === "development" ? errorMsg : undefined,
        } as ErrorResponse),
      };
    }

    // Build response
    const messageId = generateMessageId();
    const response: PublishResponse = {
      success: true,
      channelName,
      messageId,
      timestamp: new Date().toISOString(),
    };

    const duration = Date.now() - startTime;
    console.log(
      `[${requestId}] ✓ POST /.netlify/functions/ably-publish - 200 (${duration}ms)`,
    );

    return {
      statusCode: 200,
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
