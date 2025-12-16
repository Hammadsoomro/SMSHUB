import mongoose from "mongoose";
import { PhoneNumberModel } from "./models";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI environment variable is not set. Please configure it in your .env file.",
  );
}

const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

async function cleanupPhoneNumbers() {
  try {
    // Fix phone numbers with empty string assignedTo - convert to null
    const result = await PhoneNumberModel.updateMany(
      { assignedTo: "" },
      { $unset: { assignedTo: 1 } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `Cleaned up ${result.modifiedCount} phone numbers with empty assignedTo`
      );
    }
  } catch (error) {
    console.error("Error cleaning up phone numbers:", error);
  }
}

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;

    // Clean up any invalid data
    await cleanupPhoneNumbers();
  } catch (error) {
    throw error;
  }
}

export function getDBStatus() {
  return isConnected;
}

export default mongoose;
