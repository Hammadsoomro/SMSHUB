import { RequestHandler } from "express";
import { storage } from "../storage";
import { Message, Contact } from "@shared/api";
import { getSocketIOInstance } from "../index";

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
  console.log("\n\n🔔 ===== TWILIO WEBHOOK HIT ===== 🔔");
  console.log("⏰ Timestamp:", new Date().toISOString());
  console.log("📤 Request Method:", req.method);
  console.log("📨 Full request body:", JSON.stringify(req.body, null, 2));
  console.log("🔔 ===== WEBHOOK RECEIVED ===== 🔔\n\n");

  try {
    const { From, To, Body, MessageSid } = req.body;

    // Validate required fields
    if (!From || !To || !Body) {
      console.warn("Missing required fields in Twilio webhook:", {
        From,
        To,
        Body,
      });
      return res.status(400).send("Missing required fields");
    }

    console.log(`✅ Received inbound SMS from ${From} to ${To}: ${Body}`);

    // Find the phone number in the database
    const phoneNumber = await storage.getPhoneNumberByPhoneNumber(To);
    if (!phoneNumber) {
      console.error(`❌ Phone number ${To} not found in database`);
      console.error(
        "This means the Twilio number hasn't been added to your account",
      );
      return res.status(404).send("Phone number not found");
    }
    console.log(
      `✅ Found phone number: ${phoneNumber.phoneNumber} (ID: ${phoneNumber.id})`,
    );

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

    await storage.addMessage(message);
    console.log(`✅ Message saved to database: ${message.id}`);

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

    // Emit socket.io events to notify connected clients in real-time
    const io = getSocketIOInstance();
    if (io && phoneNumber.assignedTo) {
      console.log(
        `📡 Emitting socket.io event to user ${phoneNumber.assignedTo}`,
      );
      io.to(`user:${phoneNumber.assignedTo}`).emit("new_message", {
        id: message.id,
        phoneNumberId: phoneNumber.id,
        from: From,
        to: To,
        body: Body,
        direction: "inbound",
        timestamp: message.timestamp,
        sid: MessageSid,
      });

      // Also emit contact update event
      io.to(`user:${phoneNumber.assignedTo}`).emit("contact_updated", {
        id: savedContact.id,
        phoneNumberId: savedContact.phoneNumberId,
        phoneNumber: savedContact.phoneNumber,
        name: savedContact.name,
        lastMessage: savedContact.lastMessage,
        lastMessageTime: savedContact.lastMessageTime,
        unreadCount: savedContact.unreadCount,
      });
    } else if (io && phoneNumber.adminId) {
      // If no assignee, emit to admin
      console.log(`📡 No assignee, emitting to admin ${phoneNumber.adminId}`);
      io.to(`admin:${phoneNumber.adminId}`).emit("new_message", {
        id: message.id,
        phoneNumberId: phoneNumber.id,
        from: From,
        to: To,
        body: Body,
        direction: "inbound",
        timestamp: message.timestamp,
        sid: MessageSid,
      });

      io.to(`admin:${phoneNumber.adminId}`).emit("contact_updated", {
        id: savedContact.id,
        phoneNumberId: savedContact.phoneNumberId,
        phoneNumber: savedContact.phoneNumber,
        name: savedContact.name,
        lastMessage: savedContact.lastMessage,
        lastMessageTime: savedContact.lastMessageTime,
        unreadCount: savedContact.unreadCount,
      });
    } else {
      console.warn(`⚠️ No socket.io instance available or no assignee/admin`);
    }

    // Return TwiML response to Twilio
    // This tells Twilio the webhook was received successfully
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    console.log(`✅✅✅ WEBHOOK PROCESSED SUCCESSFULLY ✅✅✅`);
    res.type("application/xml").send(twimlResponse);
  } catch (error) {
    console.error("❌ Inbound SMS webhook error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).send("Internal server error");
  }
};
