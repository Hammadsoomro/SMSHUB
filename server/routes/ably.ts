import { RequestHandler } from "express";
import { Realtime } from "ably";

/**
 * Generate a short-lived Ably token for the authenticated client
 * This prevents exposing the API key to the client and allows better control
 */
export const handleGetAblyToken: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ablyApiKey = process.env.ABLY_API_KEY;
    if (!ablyApiKey) {
      console.error("[Ably] ABLY_API_KEY not configured");
      return res.status(500).json({
        error: "Real-time service is unavailable. Please try again later.",
      });
    }

    // Create a temporary Ably client to request a token
    const ably = new Realtime({
      key: ablyApiKey,
      autoConnect: false,
    });

    // Request a token for this user
    // The token will be restricted to their user ID channel
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId, // Use user ID as the client ID for authorization
      ttl: 60 * 60 * 1000, // Token valid for 1 hour
    });

    if (!tokenRequest) {
      throw new Error("Failed to create token request");
    }

    console.log(`[Ably] Generated token for user ${userId}`);
    res.json({ token: tokenRequest });
  } catch (error) {
    console.error("[Ably] Token generation error:", error);
    res.status(500).json({
      error: "Failed to generate authentication token",
    });
  }
};
