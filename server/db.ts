import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI environment variable is not set. Please configure it in your .env file.",
  );
}

const MONGODB_URI = process.env.MONGODB_URI;
let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    console.log("Already connected to MongoDB");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export function getDBStatus() {
  return isConnected;
}

export default mongoose;
