import { RequestHandler } from "express";
import { storage } from "../storage";
import { SendMessageRequest, Message, Contact } from "@shared/api";

export const handleGetContacts: RequestHandler = (req, res) => {
  try {
    const userId = req.userId!;
    
    // Get phone numbers assigned to this team member
    const user = storage.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // TODO: Get phone numbers assigned to this team member
    // For now, return empty array
    const contacts: Contact[] = [];

    res.json({ contacts });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetConversation: RequestHandler = (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Get messages for this contact
    const messages = storage.getMessagesByPhoneNumber(contactId);
    
    // Sort by timestamp
    messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    res.json({ messages });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleSendMessage: RequestHandler = (req, res) => {
  try {
    const userId = req.userId!;
    const { to, body, phoneNumberId } = req.body as SendMessageRequest;

    if (!to || !body || !phoneNumberId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify that the user has access to this phone number
    const phoneNumber = storage.getPhoneNumberById(phoneNumberId);
    if (!phoneNumber || phoneNumber.assignedTo !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messageId = storage.generateId();
    const message: Message = {
      id: messageId,
      phoneNumberId,
      from: phoneNumber.phoneNumber,
      to,
      body,
      direction: "outbound",
      timestamp: new Date().toISOString(),
    };

    storage.addMessage(message);

    // Update or create contact
    const existingContact = storage
      .getContactsByPhoneNumber(phoneNumberId)
      .find((c) => c.phoneNumber === to);

    if (existingContact) {
      existingContact.lastMessage = body;
      existingContact.lastMessageTime = message.timestamp;
      storage.updateContact(existingContact);
    } else {
      const contactId = storage.generateId();
      const contact: Contact = {
        id: contactId,
        phoneNumberId,
        phoneNumber: to,
        lastMessage: body,
        lastMessageTime: message.timestamp,
        unreadCount: 0,
      };
      storage.addContact(contact);
    }

    res.json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
