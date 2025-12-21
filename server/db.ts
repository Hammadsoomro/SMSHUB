import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI;

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    console.log("Already connected to MongoDB");
    return;
  }

  if (!MONGODB_URI) {
    console.warn("MONGODB_URI environment variable not set. Database features will not be available.");
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log("Connected to MongoDB successfully");
  } catch (error) {
    console.warn("Failed to connect to MongoDB:", error);
  }
}

export function getDBStatus() {
  return isConnected;
}

export default mongoose;
