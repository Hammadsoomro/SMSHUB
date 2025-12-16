import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI;

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
