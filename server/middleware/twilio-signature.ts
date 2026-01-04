import { RequestHandler } from "express";
import crypto from "crypto";

/**
 * Middleware to validate Twilio webhook signatures
 * This ensures that incoming webhooks are actually from Twilio
 *
 * From Twilio docs: https://www.twilio.com/docs/libraries/node/how-validate-twilio-request
 */
export const validateTwilioSignature: RequestHandler = (req, res, next) => {
  const twilio_signature = req.headers["x-twilio-signature"] as string;
  const auth_token = process.env.TWILIO_AUTH_TOKEN || "";

  // If no auth token is configured, skip validation (for development only)
  if (!auth_token) {
    console.warn(
      "TWILIO_AUTH_TOKEN not set. Webhook signature validation is disabled.",
    );
    return next();
  }

  // If no signature provided, reject
  if (!twilio_signature) {
    return res.status(403).json({ error: "Webhook signature missing" });
  }

  const url =
    process.env.NODE_ENV === "production"
      ? `https://${req.get("host")}${req.originalUrl}`
      : `http://${req.get("host")}${req.originalUrl}`;

  // Reconstruct the request body for signature verification
  const data = req.body;

  // Create a string with the URL and request body parameters
  let requestBody = "";
  const keys = Object.keys(data).sort();

  for (const key of keys) {
    requestBody += key + data[key];
  }

  const fullUrl = url + requestBody;

  // Compute the signature using Twilio's auth token
  const hash = crypto
    .createHmac("sha1", auth_token)
    .update(fullUrl, "utf8")
    .digest("base64");

  // Compare signatures
  if (hash !== twilio_signature) {
    console.error("Invalid Twilio webhook signature");
    return res.status(403).json({ error: "Invalid webhook signature" });
  }

  // Signature is valid, continue
  next();
};
