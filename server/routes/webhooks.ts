import { RequestHandler } from "express";
import { storage } from "../storage";
import { Message, Contact } from "@shared/api";
import ablyServer from "../ably";
import { normalizePhoneNumber, phoneNumbersMatch } from "../utils/phone-normalizer";

/**
 * Health check endpoint - verify webhook is reachable
 */
export const handleWebhookHealth: RequestHandler = async (req, res) => {
  console.log("✅ Webhook health check - endpoint is reachable");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

/**
 * Handle inbound SMS from Twilio webhook
 * Receives form data from Twilio and stores the message in the database
 */
export const handleInboundSMS: RequestHandler = async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body;

    // Debug: Log all webhook data
    console.log("[handleInboundSMS] Webhook received");
    console.log("[handleInboundSMS] From:", From);
    console.log("[handleInboundSMS] To:", To);
    console.log("[handleInboundSMS] Body:", Body);
    console.log("[handleInboundSMS] MessageSid:", MessageSid);
    console.log(
      "[handleInboundSMS] Full request body:",
      JSON.stringify(req.body),
    );

    // Validate required fields
    if (!From || !To || !Body) {
      console.error(
        "[handleInboundSMS] Missing required fields - From:",
        !!From,
        "To:",
        !!To,
        "Body:",
        !!Body,
      );
      return res.status(400).send("Missing required fields");
    }

    // Find the phone number in the database
    console.log("[handleInboundSMS] Looking up phone number:", To);
    const phoneNumber = await storage.getPhoneNumberByPhoneNumber(To);

    if (!phoneNumber) {
      console.error(
        "[handleInboundSMS] Phone number not found in database:",
        To,
      );
      console.error(
        "[handleInboundSMS] Webhook received but phone number is not registered in the system",
      );
      return res.status(404).send("Phone number not found");
    }

    console.log("[handleInboundSMS] Phone number found:", phoneNumber.id);
    console.log("[handleInboundSMS] Assigned to:", phoneNumber.assignedTo);
    console.log("[handleInboundSMS] Admin ID:", phoneNumber.adminId);

    // Store the message - normalize phone numbers for consistency
    const message: Message = {
      id: MessageSid || Math.random().toString(36).substr(2, 9),
      phoneNumberId: phoneNumber.id,
      from: normalizePhoneNumber(From),
      to: normalizePhoneNumber(To),
      body: Body,
      direction: "inbound",
      timestamp: new Date().toISOString(),
      sid: MessageSid,
    };

    console.log("[handleInboundSMS] Storing message:", message.id);
    await storage.addMessage(message);
    console.log("[handleInboundSMS] Message stored successfully");

    // Get or create contact - use normalized phone numbers for matching
    const contacts = await storage.getContactsByPhoneNumber(phoneNumber.id);
    const normalizedFromNumber = normalizePhoneNumber(From);
    const existingContact = contacts.find((c) =>
      phoneNumbersMatch(c.phoneNumber, From)
    );

    let savedContact: Contact;
    if (!existingContact) {
      // Store contact with normalized phone number
      const contact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        phoneNumberId: phoneNumber.id,
        phoneNumber: normalizedFromNumber,
        lastMessage: Body.substring(0, 50),
        lastMessageTime: message.timestamp,
        unreadCount: 1,
      };
      await storage.addContact(contact);
      savedContact = contact;
      console.log(`✅ New contact created: ${From} (normalized: ${normalizedFromNumber})`);
    } else {
      // Update last message info and increment unread count
      const updatedContact = {
        ...existingContact,
        lastMessage: Body.substring(0, 50),
        lastMessageTime: message.timestamp,
        unreadCount: (existingContact.unreadCount || 0) + 1,
      };
      await storage.updateContact(updatedContact);
      savedContact = updatedContact;
      console.log(
        `✅ Contact updated: ${From} (normalized: ${normalizedFromNumber}), unread count: ${(existingContact.unreadCount || 0) + 1}`,
      );
    }

    // Publish Ably events to notify connected clients in real-time
    if (ablyServer.isInitialized) {
      const contactId = savedContact.id;
      const publishData = {
        contactId: contactId,
        phoneNumberId: phoneNumber.id,
        message: Body,
        from: From,
        to: To,
        direction: "inbound" as const,
        timestamp: message.timestamp,
      };

      const contactUpdate = {
        action: "update" as const,
        contact: {
          id: savedContact.id,
          phoneNumberId: savedContact.phoneNumberId,
          phoneNumber: savedContact.phoneNumber,
          name: savedContact.name,
          lastMessage: savedContact.lastMessage,
          lastMessageTime: savedContact.lastMessageTime,
          unreadCount: savedContact.unreadCount,
        },
      };

      try {
        // Always publish to admin so they see updates in real-time
        if (phoneNumber.adminId) {
          console.log(`[Webhooks] Publishing to admin: ${phoneNumber.adminId}`);
          await ablyServer.publishMessage(phoneNumber.adminId, contactId, {
            ...publishData,
            userId: phoneNumber.adminId,
          });
          await ablyServer.broadcastContactUpdate(
            phoneNumber.adminId,
            contactUpdate,
          );
        }

        // Also publish to assigned team member if assigned
        if (
          phoneNumber.assignedTo &&
          phoneNumber.assignedTo !== phoneNumber.adminId
        ) {
          console.log(
            `[Webhooks] Publishing to team member: ${phoneNumber.assignedTo}`,
          );
          await ablyServer.publishMessage(phoneNumber.assignedTo, contactId, {
            ...publishData,
            userId: phoneNumber.assignedTo,
          });
          await ablyServer.broadcastContactUpdate(
            phoneNumber.assignedTo,
            contactUpdate,
          );
        }
      } catch (error) {
        console.error("[Webhooks] Error publishing Ably events:", error);
        // Continue even if Ably fails - message is already stored
      }
    }

    // Return TwiML response to Twilio
    // This tells Twilio the webhook was received successfully
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    console.log(
      "[handleInboundSMS] ✅ Webhook processed successfully - message from",
      From,
      "to",
      To,
    );
    res.type("application/xml").send(twimlResponse);
  } catch (error) {
    console.error("[handleInboundSMS] ❌ Inbound SMS webhook error:", error);
    res.status(500).send("Internal server error");
  }
};
