import mongoose, { Schema, Document } from "mongoose";
import {
  User,
  TwilioCredentials,
  PhoneNumber,
  TeamMember,
  Message,
  Contact,
} from "@shared/api";

// User Schema
export interface IUser extends Document, User {
  password: string;
}

const userSchema = new Schema<IUser>(
  {
    id: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "team_member"], required: true },
    adminId: { type: String, sparse: true },
    createdAt: { type: String, required: true },
  },
  { collection: "users" },
);

export const UserModel = mongoose.model<IUser>("User", userSchema);

// Twilio Credentials Schema
export interface ITwilioCredentials extends Document, TwilioCredentials {}

const twilioCredentialsSchema = new Schema<ITwilioCredentials>(
  {
    adminId: { type: String, required: true, unique: true },
    accountSid: { type: String, required: true },
    authToken: { type: String, required: true },
    connectedAt: { type: String, required: true },
  },
  { collection: "twilio_credentials" },
);

export const TwilioCredentialsModel = mongoose.model<ITwilioCredentials>(
  "TwilioCredentials",
  twilioCredentialsSchema,
);

// Phone Number Schema
export interface IPhoneNumber extends Document, PhoneNumber {}

const phoneNumberSchema = new Schema<IPhoneNumber>(
  {
    id: { type: String, required: true, unique: true },
    adminId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    assignedTo: { type: String, sparse: true },
    purchasedAt: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { collection: "phone_numbers" },
);

export const PhoneNumberModel = mongoose.model<IPhoneNumber>(
  "PhoneNumber",
  phoneNumberSchema,
);

// Team Member Schema
export interface ITeamMember extends Document {
  id: string;
  email: string;
  name: string;
  password: string;
  adminId: string;
  status: "pending" | "active";
  createdAt: string;
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    adminId: { type: String, required: true },
    status: { type: String, enum: ["pending", "active"], default: "active" },
    createdAt: { type: String, required: true },
  },
  { collection: "team_members" },
);

export const TeamMemberModel = mongoose.model<ITeamMember>(
  "TeamMember",
  teamMemberSchema,
);

// Message Schema
export interface IMessage extends Document, Message {}

const messageSchema = new Schema<IMessage>(
  {
    id: { type: String, required: true, unique: true },
    phoneNumberId: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    body: { type: String, required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    timestamp: { type: String, required: true },
    sid: { type: String, sparse: true },
  },
  { collection: "messages" },
);

messageSchema.index({ phoneNumberId: 1, timestamp: -1 });

export const MessageModel = mongoose.model<IMessage>("Message", messageSchema);

// Contact Schema
export interface IContact extends Document, Contact {}

const contactSchema = new Schema<IContact>(
  {
    id: { type: String, required: true, unique: true },
    phoneNumberId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    name: { type: String, sparse: true },
    lastMessage: { type: String, sparse: true },
    lastMessageTime: { type: String, sparse: true },
    unreadCount: { type: Number, default: 0 },
  },
  { collection: "contacts" },
);

contactSchema.index({ phoneNumberId: 1 });

export const ContactModel = mongoose.model<IContact>("Contact", contactSchema);
