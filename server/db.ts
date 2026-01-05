import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;
let isConnecting = false;
let connectPromise: Promise<typeof mongoose> | null = null;

// ✅ Circuit breaker pattern for DB failures
let connectionFailureCount = 0;
const MAX_FAILURES = 3;
let circuitBreakerOpen = false;
let circuitBreakerResetTime = 0;

/**
 * Serverless-optimized MongoDB connection
 * Reuses connections across warm invocations and handles timeouts
 */
export async function connectDB() {
  // ✅ Circuit breaker: Reject requests if DB has repeated failures
  if (circuitBreakerOpen) {
    if (Date.now() < circuitBreakerResetTime) {
      const remainingWait = Math.ceil(
        (circuitBreakerResetTime - Date.now()) / 1000,
      );
      throw new Error(
        `Database circuit breaker is OPEN due to repeated failures. ` +
          `Please retry in ${remainingWait} seconds. Database appears to be down.`,
      );
    } else {
      // Try to reset the circuit breaker
      console.log("[DB] Attempting to reset circuit breaker");
      circuitBreakerOpen = false;
      connectionFailureCount = 0;
    }
  }

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
    connectionFailureCount = 0; // ✅ Reset counter on successful connection

    // Set up connection event handlers
    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] Disconnected from MongoDB");
      isConnected = false;
    });

    mongoose.connection.on("error", (error) => {
      console.error("[DB] Connection error:", error);
      isConnected = false;
      connectionFailureCount++; // ✅ Increment failure count
    });

    console.log("[DB] Connected to MongoDB successfully");
    return mongoose;
  } catch (error) {
    isConnecting = false;
    connectPromise = null;
    isConnected = false;

    // ✅ Increment failure counter
    connectionFailureCount++;

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[DB] Failed to connect to MongoDB (attempt ${connectionFailureCount}/${MAX_FAILURES}):`,
      error,
    );

    // ✅ Open circuit breaker if too many failures
    if (connectionFailureCount >= MAX_FAILURES) {
      circuitBreakerOpen = true;
      circuitBreakerResetTime = Date.now() + 30000; // 30 second timeout
      console.error(
        "[DB] CIRCUIT BREAKER OPENED - Database unavailable. Failing fast on new requests.",
      );
    }

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
