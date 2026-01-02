/**
 * MongoDB-backed storage layer
 * Provides persistent data storage using MongoDB
 */
import {
  UserModel,
  TwilioCredentialsModel,
  PhoneNumberModel,
  TeamMemberModel,
  MessageModel,
  ContactModel,
  WalletModel,
  WalletTransactionModel,
} from "./models";
import {
  User,
  TwilioCredentials,
  PhoneNumber,
  TeamMember,
  Message,
  Contact,
  Wallet,
  WalletTransaction,
} from "@shared/api";

class Storage {
  // User operations
  async createUser(user: User & { password: string }): Promise<void> {
    const newUser = new UserModel(user);
    await newUser.save();
  }

  async getUserByEmail(
    email: string,
  ): Promise<(User & { password: string }) | undefined> {
    return (await UserModel.findOne({ email: email.toLowerCase() })) as
      | (User & { password: string })
      | null;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const user = (await UserModel.findById(id)) as any;
    if (!user) return undefined;
    const { password, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword as User;
  }

  async updateUser(user: User): Promise<void> {
    const { password, ...userWithoutPassword } = user as any;
    await UserModel.findByIdAndUpdate(user.id, userWithoutPassword, {
      new: true,
    });
  }

  // Twilio Credentials
  async setTwilioCredentials(credentials: TwilioCredentials): Promise<void> {
    await TwilioCredentialsModel.updateOne(
      { adminId: credentials.adminId },
      credentials,
      { upsert: true },
    );
  }

  async getTwilioCredentialsByAdminId(
    adminId: string,
  ): Promise<TwilioCredentials | undefined> {
    return (await TwilioCredentialsModel.findOne({
      adminId,
    })) as TwilioCredentials | null;
  }

  async removeTwilioCredentials(adminId: string): Promise<void> {
    await TwilioCredentialsModel.deleteOne({ adminId });
  }

  // Phone Numbers
  async addPhoneNumber(number: PhoneNumber): Promise<void> {
    const newNumber = new PhoneNumberModel(number);
    await newNumber.save();
  }

  async getPhoneNumbersByAdminId(adminId: string): Promise<PhoneNumber[]> {
    const numbers = await PhoneNumberModel.find({ adminId });
    return numbers.map((doc: any) => {
      const data = doc.toObject();
      // If id is missing, use MongoDB's _id as fallback
      if (!data.id && data._id) {
        data.id = data._id.toString();
      }
      return data as PhoneNumber;
    });
  }

  async getPhoneNumberById(id: string): Promise<PhoneNumber | undefined> {
    const doc = await PhoneNumberModel.findOne({ $or: [{ id }, { _id: id }] });
    if (!doc) return undefined;
    const data = doc.toObject() as any;
    if (!data.id && data._id) {
      data.id = data._id.toString();
    }
    return data as PhoneNumber;
  }

  async getPhoneNumberByPhoneNumber(
    phoneNumber: string,
  ): Promise<PhoneNumber | undefined> {
    const doc = await PhoneNumberModel.findOne({ phoneNumber });
    if (!doc) return undefined;
    const data = doc.toObject() as any;
    if (!data.id && data._id) {
      data.id = data._id.toString();
    }
    return data as PhoneNumber;
  }

  async updatePhoneNumber(number: PhoneNumber): Promise<void> {
    await PhoneNumberModel.findOneAndUpdate({ id: number.id }, number, {
      new: true,
    });
  }

  // Team Members
  async addTeamMember(
    member: TeamMember & { password: string },
  ): Promise<void> {
    const newMember = new TeamMemberModel(member);
    await newMember.save();
  }

  async getTeamMembersByAdminId(adminId: string): Promise<TeamMember[]> {
    const members = await TeamMemberModel.find({ adminId });
    return members.map((member) => {
      const { password, ...teamMember } = member.toObject() as any;
      return teamMember as TeamMember;
    });
  }

  async getTeamMemberById(id: string): Promise<TeamMember | undefined> {
    const member = await TeamMemberModel.findOne({ id });
    if (!member) return undefined;
    const { password, ...memberWithoutPassword } = member.toObject() as any;
    return memberWithoutPassword as TeamMember;
  }

  async getAdminIdByTeamMemberId(
    teamMemberId: string,
  ): Promise<string | undefined> {
    const member = await TeamMemberModel.findOne({ id: teamMemberId });
    return member?.adminId;
  }

  async removeTeamMember(memberId: string): Promise<void> {
    await UserModel.deleteOne({ id: memberId, role: "team_member" });
    await TeamMemberModel.deleteOne({ id: memberId });
  }

  // Messages
  async addMessage(message: Message): Promise<void> {
    const newMessage = new MessageModel(message);
    await newMessage.save();
  }

  async getMessagesByPhoneNumber(phoneNumberId: string): Promise<Message[]> {
    const messages = await MessageModel.find({ phoneNumberId }).sort({
      timestamp: 1,
    });
    return messages.map((doc: any) => {
      const data = doc.toObject();
      if (!data.id && data._id) {
        data.id = data._id.toString();
      }
      return data as Message;
    });
  }

  // Contacts
  async addContact(contact: Contact): Promise<void> {
    const newContact = new ContactModel(contact);
    await newContact.save();
  }

  async getContactsByPhoneNumber(phoneNumberId: string): Promise<Contact[]> {
    const contacts = await ContactModel.find({ phoneNumberId });
    return contacts.map((doc: any) => {
      const data = doc.toObject();
      if (!data.id && data._id) {
        data.id = data._id.toString();
      }
      return data as Contact;
    });
  }

  async getContactById(id: string): Promise<Contact | undefined> {
    // Try to find by custom id field first
    let doc = await ContactModel.findOne({ id });

    // If not found by custom id, try MongoDB's _id as fallback (only if it's a valid ObjectId)
    if (!doc && /^[0-9a-f]{24}$/i.test(id)) {
      try {
        doc = await ContactModel.findById(id);
      } catch (error) {
        // findById will throw if id is not a valid ObjectId, ignore it
      }
    }

    if (!doc) return undefined;

    const data = doc.toObject() as any;
    if (!data.id) {
      if (data._id) {
        data.id = data._id.toString();
      } else {
        console.warn("Contact has no ID field:", data);
      }
    }
    return data as Contact;
  }

  async updateContact(contact: Contact): Promise<void> {
    await ContactModel.findOneAndUpdate({ id: contact.id }, contact, {
      new: true,
    });
  }

  async deleteContact(id: string): Promise<void> {
    await ContactModel.deleteOne({ id });
  }

  // Wallet operations
  async getOrCreateWallet(adminId: string): Promise<Wallet> {
    let wallet = (await WalletModel.findOne({ adminId })) as Wallet | null;
    if (!wallet) {
      const newWallet = new WalletModel({
        adminId,
        balance: 0,
        currency: "USD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      wallet = (await newWallet.save()) as Wallet;
    }
    return wallet;
  }

  async getWallet(adminId: string): Promise<Wallet | undefined> {
    return (await WalletModel.findOne({ adminId })) as Wallet | null;
  }

  async updateWalletBalance(
    adminId: string,
    newBalance: number,
  ): Promise<void> {
    await WalletModel.updateOne(
      { adminId },
      {
        balance: newBalance,
        updatedAt: new Date().toISOString(),
      },
      { upsert: true },
    );
  }

  async addWalletTransaction(transaction: WalletTransaction): Promise<void> {
    const newTransaction = new WalletTransactionModel(transaction);
    await newTransaction.save();
  }

  async getWalletTransactions(
    adminId: string,
    limit: number = 50,
  ): Promise<WalletTransaction[]> {
    return (await WalletTransactionModel.find({ adminId })
      .sort({ createdAt: -1 })
      .limit(limit)) as WalletTransaction[];
  }

  // Utility
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const storage = new Storage();
