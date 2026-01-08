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
} from "./models";
import {
  User,
  TwilioCredentials,
  PhoneNumber,
  TeamMember,
  Message,
  Contact,
} from "@shared/api";
import { normalizePhoneNumber, phoneNumbersMatch } from "./utils/phone-normalizer";

class Storage {
  // User operations
  async createUser(user: User & { password: string }): Promise<void> {
    const newUser = new UserModel(user);
    await newUser.save();
  }

  async getUserByEmail(
    email: string,
  ): Promise<(User & { password: string }) | undefined> {
    const user = (await UserModel.findOne({
      email: email.toLowerCase(),
    })) as any;
    if (!user) return undefined;

    // Ensure user has an id field (for backward compatibility with existing users)
    if (!user.id && user._id) {
      user.id = user._id.toString();
      await user.save();
    }

    // Convert Mongoose document to plain JavaScript object
    const userObj = user.toObject();

    return userObj as User & { password: string };
  }

  async getUserById(id: string): Promise<User | undefined> {
    let user = (await UserModel.findOne({ id })) as any;

    // Fallback to MongoDB's _id for backward compatibility with existing users
    if (!user) {
      try {
        user = (await UserModel.findById(id)) as any;
      } catch (error) {
        // findById may fail if id is not a valid ObjectId
        return undefined;
      }

      // If found by _id but doesn't have custom id field, ensure it's set to _id
      if (user && !user.id) {
        user.id = user._id.toString();
        await user.save();
      }
    }

    if (!user) return undefined;
    const { password, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword as User;
  }

  async updateUser(user: User): Promise<void> {
    const { password, ...userWithoutPassword } = user as any;

    // Try to update by custom id field first
    let result = await UserModel.findOneAndUpdate(
      { id: user.id },
      userWithoutPassword,
      { new: true },
    );

    // Fallback to MongoDB's _id for backward compatibility
    if (!result) {
      try {
        result = await UserModel.findByIdAndUpdate(
          user.id,
          userWithoutPassword,
          {
            new: true,
          },
        );

        // If found by _id but doesn't have custom id field, ensure it's set to _id
        if (result && !result.id) {
          result.id = result._id.toString();
          await result.save();
        }
      } catch (error) {
        // findByIdAndUpdate may fail if id is not a valid ObjectId
        throw error;
      }
    }
  }

  async removeUser(userId: string): Promise<void> {
    // Try to delete by custom id field first
    let result = await UserModel.deleteOne({ id: userId });

    // If not found by custom id, try MongoDB's _id
    if (result.deletedCount === 0) {
      try {
        await UserModel.deleteOne({ _id: userId });
      } catch (error) {
        // If neither works, user doesn't exist
        // This is not necessarily an error for deletion
      }
    }
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
    // Normalize phone number to E.164 format for consistency
    const normalizedNumber = {
      ...number,
      phoneNumber: normalizePhoneNumber(number.phoneNumber),
    };
    const newNumber = new PhoneNumberModel(normalizedNumber);
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
    // Try exact match first
    let doc = await PhoneNumberModel.findOne({ phoneNumber });

    // If not found, try normalized match
    if (!doc) {
      const normalizedInput = normalizePhoneNumber(phoneNumber);
      const allNumbers = await PhoneNumberModel.find({});

      // Find by comparing normalized versions
      doc = allNumbers.find((num: any) =>
        phoneNumbersMatch(num.phoneNumber, phoneNumber),
      ) as any;
    }

    if (!doc) return undefined;

    const data = doc.toObject() as any;
    if (!data.id && data._id) {
      data.id = data._id.toString();
    }
    return data as PhoneNumber;
  }

  async updatePhoneNumber(number: PhoneNumber): Promise<void> {
    // Create update object, excluding undefined fields
    const updateObj: any = {};
    for (const [key, value] of Object.entries(number)) {
      if (value !== undefined) {
        updateObj[key] = value;
      }
    }
    await PhoneNumberModel.findOneAndUpdate({ id: number.id }, updateObj, {
      new: true,
    });
  }

  async updatePhoneNumberWithAssignment(
    phoneNumberId: string,
    teamMemberId?: string,
  ): Promise<void> {
    if (teamMemberId) {
      // Assign to team member
      await PhoneNumberModel.findOneAndUpdate(
        { id: phoneNumberId },
        { assignedTo: teamMemberId },
        { new: true },
      );
    } else {
      // Unassign - remove the assignedTo field
      await PhoneNumberModel.findOneAndUpdate(
        { id: phoneNumberId },
        { $unset: { assignedTo: "" } },
        { new: true },
      );
    }
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
      const memberObj = member.toObject() as any;
      const { password, ...teamMember } = memberObj;

      // Ensure team member has an id field for backward compatibility
      if (!teamMember.id && memberObj._id) {
        teamMember.id = memberObj._id.toString();
      }

      return teamMember as TeamMember;
    });
  }

  async getTeamMemberById(id: string): Promise<TeamMember | undefined> {
    let member = await TeamMemberModel.findOne({ id });

    // Fallback to MongoDB's _id for backward compatibility
    if (!member) {
      try {
        member = (await TeamMemberModel.findById(id)) as any;
      } catch (error) {
        return undefined;
      }
    }

    if (!member) return undefined;
    const memberObj = member.toObject() as any;
    const { password, ...memberWithoutPassword } = memberObj;

    // Ensure team member has an id field for backward compatibility
    if (!memberWithoutPassword.id && memberObj._id) {
      memberWithoutPassword.id = memberObj._id.toString();
    }
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

  // Utility
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Normalize all existing phone numbers in the database to E.164 format
   * This is a one-time migration to fix phone numbers stored in different formats
   */
  async normalizeAllPhoneNumbers(): Promise<void> {
    try {
      const allNumbers = await PhoneNumberModel.find({});
      let updatedCount = 0;

      for (const phoneNumberDoc of allNumbers) {
        const original = phoneNumberDoc.phoneNumber;
        const normalized = normalizePhoneNumber(original);

        if (original !== normalized) {
          console.log(
            `[Storage] Normalizing phone number: ${original} → ${normalized}`,
          );
          phoneNumberDoc.phoneNumber = normalized;
          await phoneNumberDoc.save();
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        console.log(
          `[Storage] ✅ Normalized ${updatedCount} phone numbers in database`,
        );
      } else {
        console.log(
          "[Storage] All phone numbers are already in E.164 format",
        );
      }
    } catch (error) {
      console.error(
        "[Storage] Error normalizing phone numbers:",
        error,
      );
    }
  }
}

export const storage = new Storage();
