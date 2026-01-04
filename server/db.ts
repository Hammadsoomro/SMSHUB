import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;
let isConnecting = false;
let connectPromise: Promise<typeof mongoose> | null = null;

/**
 * Serverless-optimized MongoDB connection
 * Reuses connections across warm invocations and handles timeouts
 */
export async function connectDB() {
  // If already connected, return immediately
  if (isConnected) {
    return mongoose;
  }

  // If currently connecting, wait for the existing promise
  if (isConnecting && connectPromise) {
    return connectPromise;
  }

  // Validate MongoDB URI
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  isConnecting = true;

  try {
    connectPromise = mongoose.connect(MONGODB_URI, {
      // Serverless optimizations
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      // Connection pooling
      maxPoolSize: 10,
      minPoolSize: 2,
      // Reduce overhead
      retryReads: true,
    });

    await connectPromise;
    isConnected = true;
    isConnecting = false;

    // Set up connection event handlers
    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] Disconnected from MongoDB");
      isConnected = false;
    });

    mongoose.connection.on("error", (error) => {
      console.error("[DB] Connection error:", error);
      isConnected = false;
    });

    console.log("[DB] Connected to MongoDB successfully");
    return mongoose;
  } catch (error) {
    isConnecting = false;
    connectPromise = null;
    isConnected = false;

    console.error("[DB] Failed to connect to MongoDB:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw new Error(`MongoDB connection failed: ${errorMessage}`);
  }
}

/**
 * Check current database connection status
 */
export function getDBStatus() {
  return {
    isConnected,
    isConnecting,
    readyState: mongoose.connection.readyState,
  };
}

/**
 * Gracefully close the database connection (for serverless cleanup)
 * Only call this in exceptional cases, as connections should be reused
 */
export async function closeDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      isConnected = false;
      console.log("[DB] Disconnected from MongoDB");
    }
  } catch (error) {
    console.error("[DB] Error closing connection:", error);
  }
}

export default mongoose;
