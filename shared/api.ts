/**
 * Shared code between client and server
 * Useful to share types between client and server
 */

// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "team_member";
  adminId?: string; // If team member, which admin they belong to
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Twilio Credentials
export interface TwilioCredentials {
  id: string;
  adminId: string;
  accountSid: string;
  authToken: string;
  connectedAt: string;
}

export interface TwilioCredentialsRequest {
  accountSid: string;
  authToken: string;
}

// Phone Numbers
export interface PhoneNumber {
  id: string;
  adminId: string;
  phoneNumber: string;
  assignedTo?: string; // team member id if assigned
  purchasedAt: string;
  active: boolean;
}

export interface PhoneNumberAssignment {
  phoneNumberId: string;
  teamMemberId?: string; // undefined means unassign
}

// Team Management
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  adminId: string;
  status: "pending" | "active";
  createdAt: string;
}

export interface CreateTeamMemberRequest {
  email: string;
  name: string;
  password: string;
}

// Messages
export interface Message {
  id: string;
  phoneNumberId: string;
  from: string;
  to: string;
  body: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  sid?: string; // Twilio SID
}

export interface Contact {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  name?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export interface SendMessageRequest {
  to: string;
  body: string;
  phoneNumberId: string;
}

export interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality?: string;
  region?: string;
  postalCode?: string;
  countryCode: string;
  cost: string;
  capabilities?: {
    SMS?: boolean;
    MMS?: boolean;
    voice?: boolean;
    fax?: boolean;
  };
}

export interface PurchaseNumberRequest {
  phoneNumber: string;
  cost: number;
}

// API Responses
export interface DemoResponse {
  message: string;
}

export interface ApiError {
  error: string;
  code?: string;
}
