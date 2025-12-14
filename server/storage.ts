/**
 * Simple in-memory database for MVP
 * Can be swapped out with a real database like PostgreSQL or MongoDB
 */
import { User, TwilioCredentials, PhoneNumber, TeamMember, Message, Contact } from "@shared/api";

interface StorageData {
  users: Map<string, User & { password: string }>;
  twilioCredentials: Map<string, TwilioCredentials>;
  phoneNumbers: Map<string, PhoneNumber>;
  teamMembers: Map<string, TeamMember>;
  messages: Map<string, Message>;
  contacts: Map<string, Contact>;
}

class Storage {
  private data: StorageData = {
    users: new Map(),
    twilioCredentials: new Map(),
    phoneNumbers: new Map(),
    teamMembers: new Map(),
    messages: new Map(),
    contacts: new Map(),
  };

  // User operations
  createUser(user: User & { password: string }): void {
    this.data.users.set(user.id, user);
  }

  getUserByEmail(email: string): (User & { password: string }) | undefined {
    return Array.from(this.data.users.values()).find((u) => u.email === email);
  }

  getUserById(id: string): User | undefined {
    const user = this.data.users.get(id);
    if (!user) return undefined;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  // Twilio Credentials
  setTwilioCredentials(credentials: TwilioCredentials): void {
    this.data.twilioCredentials.set(credentials.id, credentials);
  }

  getTwilioCredentialsByAdminId(adminId: string): TwilioCredentials | undefined {
    return Array.from(this.data.twilioCredentials.values()).find(
      (c) => c.adminId === adminId
    );
  }

  // Phone Numbers
  addPhoneNumber(number: PhoneNumber): void {
    this.data.phoneNumbers.set(number.id, number);
  }

  getPhoneNumbersByAdminId(adminId: string): PhoneNumber[] {
    return Array.from(this.data.phoneNumbers.values()).filter(
      (n) => n.adminId === adminId
    );
  }

  getPhoneNumberById(id: string): PhoneNumber | undefined {
    return this.data.phoneNumbers.get(id);
  }

  updatePhoneNumber(number: PhoneNumber): void {
    this.data.phoneNumbers.set(number.id, number);
  }

  // Team Members
  addTeamMember(member: TeamMember & { password: string }): void {
    this.data.teamMembers.set(member.id, member);
  }

  getTeamMembersByAdminId(adminId: string): TeamMember[] {
    return Array.from(this.data.teamMembers.values())
      .filter((m) => m.adminId === adminId)
      .map(({ password, ...member }) => member as TeamMember);
  }

  getTeamMemberById(id: string): TeamMember | undefined {
    const member = this.data.teamMembers.get(id);
    if (!member) return undefined;
    const { password, ...memberWithoutPassword } = member;
    return memberWithoutPassword as TeamMember;
  }

  // Messages
  addMessage(message: Message): void {
    this.data.messages.set(message.id, message);
  }

  getMessagesByPhoneNumber(phoneNumberId: string): Message[] {
    return Array.from(this.data.messages.values()).filter(
      (m) => m.phoneNumberId === phoneNumberId
    );
  }

  // Contacts
  addContact(contact: Contact): void {
    this.data.contacts.set(contact.id, contact);
  }

  getContactsByPhoneNumber(phoneNumberId: string): Contact[] {
    return Array.from(this.data.contacts.values()).filter(
      (c) => c.phoneNumberId === phoneNumberId
    );
  }

  getContactById(id: string): Contact | undefined {
    return this.data.contacts.get(id);
  }

  updateContact(contact: Contact): void {
    this.data.contacts.set(contact.id, contact);
  }

  // Utility
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const storage = new Storage();
