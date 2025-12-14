import { RequestHandler } from "express";
import { storage } from "../storage";
import { SendMessageRequest, Message, Contact } from "@shared/api";
import { TwilioClient } from "../twilio";

export const handleGetContacts: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId!;

    // Get phone numbers assigned to this user
    const phoneNumbers = await storage.getPhoneNumbersByAdminId(userId);
    
    let contacts: Contact[] = [];
    for (const phoneNumber of phoneNumbers) {
      const phoneContacts = await storage.getContactsByPhoneNumber(phoneNumber.id);
      contacts = contacts.concat(phoneContacts);
    }

    res.json({ contacts });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetConversation: RequestHandler = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const messages = await storage.getMessagesByPhoneNumber(contact.phoneNumberId);
    const conversation = messages.filter(
      (m) => m.from === contact.phoneNumber || m.to === contact.phoneNumber
    );

    res.json({ messages: conversation });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleSendMessage: RequestHandler = async (req, res) => {
  try {
    const { to, body, phoneNumberId } = req.body as SendMessageRequest;

    if (!to || !body || !phoneNumberId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // In a real app, you would send this via Twilio
    // For now, we'll just store it in the database
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      phoneNumberId,
      from: "your-number", // This would come from the phone number object
      to,
      body,
      direction: "outbound",
      timestamp: new Date().toISOString(),
    };

    await storage.addMessage(message);

    res.json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
