import { RequestHandler } from "express";
import { storage } from "../storage";
import { decrypt } from "../crypto";
import { SendMessageRequest, Message, Contact, PhoneNumber } from "@shared/api";
import { TwilioClient } from "../twilio";

export const handleGetAssignedPhoneNumber: RequestHandler = async (
  req,
  res,
) => {
  try {
    const userId = req.userId!;
    const user = await storage.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Determine the admin ID
    let adminId = userId;
    if (user.role === "team_member" && user.adminId) {
      adminId = user.adminId;
    }

    // Get phone numbers assigned to this user
    const allPhoneNumbers = await storage.getPhoneNumbersByAdminId(adminId);
    const assignedPhoneNumbers = allPhoneNumbers.filter(
      (pn) => pn.assignedTo === userId,
    );

    res.json({ phoneNumbers: assignedPhoneNumbers });
  } catch (error) {
    console.error("Get assigned phone number error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetContacts: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId!;
    const { phoneNumberId } = req.query;

    const user = await storage.getUserById(userId);

    // Determine the admin ID
    let adminId = userId;
    if (user?.role === "team_member" && user.adminId) {
      adminId = user.adminId;
    }

    if (!phoneNumberId) {
      return res.status(400).json({ error: "Phone number ID is required" });
    }

    // Get phone number and verify access
    const phoneNumber = await storage.getPhoneNumberById(
      phoneNumberId as string,
    );
    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    // Verify user has access to this phone number
    if (phoneNumber.adminId !== adminId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // For team members, verify they are assigned to this number
    if (user?.role === "team_member" && phoneNumber.assignedTo !== userId) {
      return res
        .status(403)
        .json({ error: "This number is not assigned to you" });
    }

    // Get contacts for this specific phone number
    const phoneContacts = await storage.getContactsByPhoneNumber(
      phoneNumberId as string,
    );

    // Ensure all contacts have IDs
    const contactsWithIds = phoneContacts.map((contact) => {
      if (!contact.id) {
        console.warn("Contact missing ID:", contact);
        contact.id = `contact-${Math.random().toString(36).substr(2, 9)}`;
      }
      return contact;
    });

    console.log(
      `Returning ${contactsWithIds.length} contacts for phone number ${phoneNumberId}`,
    );
    res.json({ contacts: contactsWithIds });
  } catch (error) {
    console.error("Get contacts error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetConversation: RequestHandler = async (req, res) => {
  try {
    const { contactId } = req.params;
    console.log("Looking for contact with ID:", contactId);

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      console.warn("Contact not found with ID:", contactId);
      return res.status(404).json({
        error: "Contact not found",
        contactId,
      });
    }

    console.log("[getConversation] Found contact:", contact.phoneNumber);
    console.log("[getConversation] Phone number ID:", contact.phoneNumberId);

    const messages = await storage.getMessagesByPhoneNumber(
      contact.phoneNumberId,
    );
    console.log(
      "[getConversation] Total messages for phone number:",
      messages.length,
    );

    const conversation = messages.filter(
      (m) => m.from === contact.phoneNumber || m.to === contact.phoneNumber,
    );

    console.log(
      "[getConversation] Filtered messages count:",
      conversation.length,
    );
    console.log(
      "[getConversation] Looking for messages with phone number:",
      contact.phoneNumber,
    );

    res.json({ messages: conversation });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleSendMessage: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId!;
    const { to, body, phoneNumberId } = req.body as SendMessageRequest;

    if (!to || !body || !phoneNumberId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get phone number details
    const phoneNumber = await storage.getPhoneNumberById(phoneNumberId);
    if (!phoneNumber) {
      return res.status(404).json({ error: "Phone number not found" });
    }

    // Determine the admin ID - either the user is admin or a team member
    const user = await storage.getUserById(userId);
    let adminId = userId;
    if (user?.role === "team_member" && user.adminId) {
      adminId = user.adminId;
    }

    // Verify the phone number belongs to this admin
    if (phoneNumber.adminId !== adminId) {
      return res
        .status(403)
        .json({ error: "Unauthorized to use this phone number" });
    }

    // Get admin's Twilio credentials
    const credentials = await storage.getTwilioCredentialsByAdminId(adminId);
    if (!credentials) {
      return res.status(400).json({
        error:
          "Twilio credentials not connected. Please have the admin connect their credentials first.",
      });
    }

    // Decrypt the auth token
    const decryptedAuthToken = decrypt(credentials.authToken);

    // Send SMS via Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      decryptedAuthToken,
    );
    const twilioResponse = await twilioClient.sendSMS(
      to,
      phoneNumber.phoneNumber,
      body,
    );

    if (twilioResponse.error || twilioResponse.error_message) {
      return res
        .status(400)
        .json({ error: twilioResponse.error_message || twilioResponse.error });
    }

    // Store message in database
    const message: Message = {
      id: Math.random().toString(36).substr(2, 9),
      phoneNumberId,
      from: phoneNumber.phoneNumber,
      to,
      body,
      direction: "outbound",
      timestamp: new Date().toISOString(),
      sid: twilioResponse.sid,
    };

    console.log("[handleSendMessage] Storing outbound message");
    console.log("[handleSendMessage] From:", message.from);
    console.log("[handleSendMessage] To:", message.to);
    console.log("[handleSendMessage] Phone Number ID:", phoneNumberId);

    await storage.addMessage(message);
    console.log("[handleSendMessage] Message stored with ID:", message.id);

    // Check if contact exists, if not create it
    const existingContacts =
      await storage.getContactsByPhoneNumber(phoneNumberId);
    console.log(
      "[handleSendMessage] Found",
      existingContacts.length,
      "existing contacts",
    );
    console.log("[handleSendMessage] Looking for contact with phone:", to);

    const existingContact = existingContacts.find((c) => c.phoneNumber === to);

    if (!existingContact) {
      const contact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        phoneNumberId,
        phoneNumber: to,
        unreadCount: 0,
      };
      console.log("[handleSendMessage] Creating new contact:", contact.id);
      await storage.addContact(contact);
      console.log("[handleSendMessage] Contact created successfully");
    } else {
      console.log("[handleSendMessage] Contact exists, updating...");
      // Update last message info
      await storage.updateContact({
        ...existingContact,
        lastMessage: body.substring(0, 50),
        lastMessageTime: message.timestamp,
      });
      console.log("[handleSendMessage] Contact updated");
    }

    console.log("[handleSendMessage] ✅ Message sent and stored successfully");
    res.json({ message });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleMarkAsRead: RequestHandler = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Update contact to mark as read
    await storage.updateContact({
      ...contact,
      unreadCount: 0,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleAddContact: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId!;
    const { name, phoneNumber, phoneNumberId } = req.body;

    if (!phoneNumber || !phoneNumberId) {
      return res
        .status(400)
        .json({ error: "Phone number and phone number ID are required" });
    }

    // Verify phone number belongs to user's admin
    const user = await storage.getUserById(userId);
    let adminId = userId;
    if (user?.role === "team_member" && user.adminId) {
      adminId = user.adminId;
    }

    const phoneNum = await storage.getPhoneNumberById(phoneNumberId);
    if (!phoneNum || phoneNum.adminId !== adminId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Check if contact already exists
    const existingContacts =
      await storage.getContactsByPhoneNumber(phoneNumberId);
    if (existingContacts.some((c) => c.phoneNumber === phoneNumber)) {
      return res.status(400).json({ error: "Contact already exists" });
    }

    const contact: Contact = {
      id: Math.random().toString(36).substr(2, 9),
      phoneNumberId,
      phoneNumber,
      name: name || phoneNumber,
      unreadCount: 0,
    };

    await storage.addContact(contact);
    res.json({ contact });
  } catch (error) {
    console.error("Add contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleUpdateContact: RequestHandler = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name } = req.body;

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const updatedContact: Contact = {
      ...contact,
      ...(name && { name }),
    };

    await storage.updateContact(updatedContact);
    res.json({ contact: updatedContact });
  } catch (error) {
    console.error("Update contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleDeleteContact: RequestHandler = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await storage.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Delete contact from storage
    await storage.deleteContact(contactId);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const handleGetMessageInsights: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId!;
    const user = await storage.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Determine the admin ID
    let adminId = userId;
    if (user.role === "team_member" && user.adminId) {
      adminId = user.adminId;
    }

    // Get phone numbers assigned to this user
    const allPhoneNumbers = await storage.getPhoneNumbersByAdminId(adminId);
    let phoneNumbers = allPhoneNumbers;

    // For team members, filter to only assigned numbers
    if (user.role === "team_member") {
      phoneNumbers = allPhoneNumbers.filter((pn) => pn.assignedTo === userId);
    }

    if (phoneNumbers.length === 0) {
      return res.json({
        totalMessages: 0,
        sentMessages: 0,
        receivedMessages: 0,
        sentToday: 0,
        receivedToday: 0,
        responseRate: 0,
      });
    }

    // Collect all messages for assigned phone numbers
    let allMessages: any[] = [];
    for (const phoneNumber of phoneNumbers) {
      const messages = await storage.getMessagesByPhoneNumber(
        phoneNumber.id || phoneNumber._id,
      );
      allMessages = allMessages.concat(messages || []);
    }

    if (allMessages.length === 0) {
      return res.json({
        totalMessages: 0,
        sentMessages: 0,
        receivedMessages: 0,
        sentToday: 0,
        receivedToday: 0,
        responseRate: 0,
      });
    }

    // Helper function to safely parse message dates
    const getMessageDate = (message: any, now?: Date): Date => {
      if (message.timestamp) {
        return new Date(message.timestamp);
      }
      if (message.createdAt) {
        return new Date(message.createdAt);
      }
      return now || new Date();
    };

    // Calculate metrics
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const totalMessages = allMessages.length;

    const sentMessages = allMessages.filter(
      (m) => m.direction === "outbound" || m.from,
    );
    const receivedMessages = allMessages.filter(
      (m) => m.direction === "inbound" || m.to,
    );

    const sentToday = sentMessages.filter(
      (m) => getMessageDate(m, now) >= todayStart,
    ).length;

    const receivedToday = receivedMessages.filter(
      (m) => getMessageDate(m, now) >= todayStart,
    ).length;

    // Calculate response rate
    const responseRate =
      sentMessages.length > 0
        ? (receivedMessages.length / sentMessages.length) * 100
        : 0;

    res.json({
      totalMessages,
      sentMessages: sentMessages.length,
      receivedMessages: receivedMessages.length,
      sentToday,
      receivedToday,
      responseRate: Math.round(responseRate * 10) / 10, // Round to 1 decimal place
    });
  } catch (error) {
    console.error("Get message insights error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
