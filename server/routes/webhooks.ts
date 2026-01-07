import { RequestHandler } from "express";
import { storage } from "../storage";
import { Message, Contact } from "@shared/api";
import ablyServer from "../ably";

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

    // Store the message
    const message: Message = {
      id: MessageSid || Math.random().toString(36).substr(2, 9),
      phoneNumberId: phoneNumber.id,
      from: From,
      to: To,
      body: Body,
      direction: "inbound",
      timestamp: new Date().toISOString(),
      sid: MessageSid,
    };

    console.log("[handleInboundSMS] Storing message:", message.id);
    await storage.addMessage(message);
    console.log("[handleInboundSMS] Message stored successfully");

    // Get or create contact
    const contacts = await storage.getContactsByPhoneNumber(phoneNumber.id);
    const existingContact = contacts.find((c) => c.phoneNumber === From);

    let savedContact: Contact;
    if (!existingContact) {
      const contact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        phoneNumberId: phoneNumber.id,
        phoneNumber: From,
        lastMessage: Body.substring(0, 50),
        lastMessageTime: message.timestamp,
        unreadCount: 1,
      };
      await storage.addContact(contact);
      savedContact = contact;
      console.log(`✅ New contact created: ${From}`);
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
        `✅ Contact updated: ${From}, unread count: ${(existingContact.unreadCount || 0) + 1}`,
      );
    }

    // Publish Ably events to notify connected clients in real-time
    if (ablyServer.isInitialized && phoneNumber.assignedTo) {
      try {
        // Create a dummy contact ID for the message channel if not available
        const contactId = savedContact.id;

        await ablyServer.publishMessage(phoneNumber.assignedTo, contactId, {
          contactId: contactId,
          userId: phoneNumber.assignedTo,
          phoneNumberId: phoneNumber.id,
          message: Body,
          from: From,
          to: To,
          direction: "inbound" as const,
          timestamp: message.timestamp,
        });

        // Also publish contact update event
        await ablyServer.broadcastContactUpdate(phoneNumber.assignedTo, {
          action: "update",
          contact: {
            id: savedContact.id,
            phoneNumberId: savedContact.phoneNumberId,
            phoneNumber: savedContact.phoneNumber,
            name: savedContact.name,
            lastMessage: savedContact.lastMessage,
            lastMessageTime: savedContact.lastMessageTime,
            unreadCount: savedContact.unreadCount,
          },
        });
      } catch (error) {
        console.error("[Webhooks] Error publishing Ably message:", error);
        // Continue even if Ably fails - message is already stored
      }
    } else if (ablyServer.isInitialized && phoneNumber.adminId) {
      try {
        // If no assignee, publish to admin
        const contactId = savedContact.id;

        await ablyServer.publishMessage(phoneNumber.adminId, contactId, {
          contactId: contactId,
          userId: phoneNumber.adminId,
          phoneNumberId: phoneNumber.id,
          message: Body,
          from: From,
          to: To,
          direction: "inbound" as const,
          timestamp: message.timestamp,
        });

        await ablyServer.broadcastContactUpdate(phoneNumber.adminId, {
          action: "update",
          contact: {
            id: savedContact.id,
            phoneNumberId: savedContact.phoneNumberId,
            phoneNumber: savedContact.phoneNumber,
            name: savedContact.name,
            lastMessage: savedContact.lastMessage,
            lastMessageTime: savedContact.lastMessageTime,
            unreadCount: savedContact.unreadCount,
          },
        });
      } catch (error) {
        console.error(
          "[Webhooks] Error publishing Ably message to admin:",
          error,
        );
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
