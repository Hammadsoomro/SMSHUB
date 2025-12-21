import { RequestHandler } from "express";
import { storage } from "../storage";
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
    const { phoneNumber: phoneNumberParam } = req.query;
    const user = await storage.getUserById(userId);

    // Determine the admin ID
    let adminId = userId;
    if (user?.role === "team_member" && user.adminId) {
      adminId = user.adminId;
    }

    // Get phone numbers for this admin
    const phoneNumbers = await storage.getPhoneNumbersByAdminId(adminId);

    let contacts: Contact[] = [];

    // If a specific phone number is requested, filter to just that one
    let targetPhoneNumbers = phoneNumbers;
    if (phoneNumberParam) {
      targetPhoneNumbers = phoneNumbers.filter((pn) => pn.phoneNumber === phoneNumberParam);
    }

    for (const phoneNumber of targetPhoneNumbers) {
      const phoneContacts = await storage.getContactsByPhoneNumber(
        phoneNumber.id,
      );
      // Ensure all contacts have IDs
      const contactsWithIds = phoneContacts.map((contact) => {
        if (!contact.id) {
          console.warn("Contact missing ID:", contact);
          contact.id = `contact-${Math.random().toString(36).substr(2, 9)}`;
        }
        return contact;
      });
      contacts = contacts.concat(contactsWithIds);
    }

    console.log(`Returning ${contacts.length} contacts`);
    res.json({ contacts });
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

    console.log("Found contact:", contact.phoneNumber);
    const messages = await storage.getMessagesByPhoneNumber(
      contact.phoneNumberId,
    );
    const conversation = messages.filter(
      (m) => m.from === contact.phoneNumber || m.to === contact.phoneNumber,
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

    // Send SMS via Twilio
    const twilioClient = new TwilioClient(
      credentials.accountSid,
      credentials.authToken,
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

    await storage.addMessage(message);

    // Check if contact exists, if not create it
    const existingContact = (
      await storage.getContactsByPhoneNumber(phoneNumberId)
    ).find((c) => c.phoneNumber === to);

    if (!existingContact) {
      const contact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        phoneNumberId,
        phoneNumber: to,
        name: to,
        unreadCount: 0,
      };
      await storage.addContact(contact);
    } else {
      // Update last message info
      await storage.updateContact({
        ...existingContact,
        lastMessage: body.substring(0, 50),
        lastMessageTime: message.timestamp,
      });
    }

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
