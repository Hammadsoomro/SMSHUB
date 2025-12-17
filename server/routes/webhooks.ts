import { RequestHandler } from "express";
import { storage } from "../storage";
import { Message, Contact } from "@shared/api";

/**
 * Handle inbound SMS from Twilio webhook
 * Receives form data from Twilio and stores the message in the database
 */
export const handleInboundSMS: RequestHandler = async (req, res) => {
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

    console.log(`Received inbound SMS from ${From} to ${To}: ${Body}`);

    // Find the phone number in the database
    const phoneNumber = await storage.getPhoneNumberByPhoneNumber(To);
    if (!phoneNumber) {
      console.warn(`Phone number ${To} not found in database`);
      return res.status(404).send("Phone number not found");
    }

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

    // Get or create contact
    const contacts = await storage.getContactsByPhoneNumber(phoneNumber.id);
    const existingContact = contacts.find((c) => c.phoneNumber === From);

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
    } else {
      // Update last message info and increment unread count
      await storage.updateContact({
        ...existingContact,
        lastMessage: Body.substring(0, 50),
        lastMessageTime: message.timestamp,
        unreadCount: (existingContact.unreadCount || 0) + 1,
      });
    }

    // Return TwiML response to Twilio
    // This tells Twilio the webhook was received successfully
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    res.type("application/xml").send(twimlResponse);
  } catch (error) {
    console.error("Inbound SMS webhook error:", error);
    res.status(500).send("Internal server error");
  }
};
