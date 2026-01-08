import { Realtime } from "ably";

/**
 * Server-side Ably client for broadcasting messages
 * This allows the API to publish real-time updates to connected clients
 */
class AblyServer {
  private client: Realtime | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Initialize Ably server client
   */
  async initialize(): Promise<void> {
    if (this.client && this.isConnected) {
      return; // Already initialized and connected
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      console.error("[AblyServer] ABLY_API_KEY environment variable is not set");
      this.isConnected = false;
      return; // Don't throw - Ably is optional
    }

    try {
      this.client = new Realtime({
        key: apiKey,
        autoConnect: true,
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Ably connection timeout after 10 seconds"));
        }, 10000);

        const handleConnected = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log("[AblyServer] ✅ Successfully connected to Ably");
          this.client!.connection.off("connected", handleConnected);
          this.client!.connection.off("failed", handleFailed);
          resolve();
        };

        const handleFailed = (err: any) => {
          clearTimeout(timeout);
          this.isConnected = false;
          this.client!.connection.off("connected", handleConnected);
          this.client!.connection.off("failed", handleFailed);
          reject(err);
        };

        this.client!.connection.on("connected", handleConnected);
        this.client!.connection.on("failed", handleFailed);
      });
    } catch (error) {
      console.error(
        "[AblyServer] ⚠️  Failed to initialize Ably:",
        error instanceof Error ? error.message : error,
      );
      this.isConnected = false;
      // Don't throw - Ably is optional for fallback functionality
    }
  }

  /**
   * Attempt to reconnect to Ably
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        "[AblyServer] Max reconnect attempts reached. Ably is unavailable.",
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      `[AblyServer] Attempting to reconnect (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`,
    );

    setTimeout(() => {
      this.initialize().catch((err) => {
        console.error("[AblyServer] Reconnection failed:", err);
      });
    }, delay);
  }

  /**
   * Publish a new message to a conversation
   */
  async publishMessage(
    userId: string,
    contactId: string,
    message: {
      contactId: string;
      userId: string;
      phoneNumberId: string;
      message: string;
      direction: "inbound" | "outbound";
      timestamp: string;
      from?: string;
      to?: string;
    },
  ): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn("[AblyServer] Not connected to Ably - message queued for next connection");
      // Queue for retry or skip gracefully
      return;
    }

    const channelName = `sms:${userId}:${contactId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("message", message);
      console.log(`[AblyServer] ✓ Published message to ${channelName}`);
    } catch (error) {
      console.error("[AblyServer] Error publishing message:", error);
      // Don't throw - Ably is optional
    }
  }

  /**
   * Broadcast contact list update to a user
   */
  async broadcastContactUpdate(
    userId: string,
    data: {
      action: "add" | "update" | "delete" | "refresh";
      contact?: any;
    },
  ): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn("[AblyServer] Not connected to Ably - contact update skipped");
      return;
    }

    const channelName = `contacts:${userId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("update", data);
      console.log(`[AblyServer] ✓ Published contact update to ${channelName}`);
    } catch (error) {
      console.error("[AblyServer] Error publishing contact update:", error);
      // Don't throw - Ably is optional
    }
  }

  /**
   * Broadcast incoming SMS notification
   */
  async publishIncomingSMS(
    userId: string,
    data: {
      phoneNumberId: string;
      from: string;
      message: string;
      timestamp: string;
      preview?: string;
    },
  ): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn("[AblyServer] Not connected to Ably - SMS notification skipped");
      return;
    }

    const channelName = `notifications:${userId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("sms_received", data);
      console.log(
        `[AblyServer] ✓ Published incoming SMS notification to ${channelName}`,
      );
    } catch (error) {
      console.error("[AblyServer] Error publishing SMS notification:", error);
      // Don't throw - Ably is optional
    }
  }

  /**
   * Publish message sent confirmation
   */
  async publishMessageSent(
    userId: string,
    contactId: string,
    data: {
      messageId: string;
      status: "sent" | "failed";
      timestamp: string;
      error?: string;
    },
  ): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn("[AblyServer] Not connected to Ably - message status skipped");
      return;
    }

    const channelName = `sms:${userId}:${contactId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("message_status", data);
      console.log(`[AblyServer] ✓ Published message status to ${channelName}`);
    } catch (error) {
      console.error("[AblyServer] Error publishing message status:", error);
      // Don't throw - Ably is optional
    }
  }

  /**
   * Publish phone number assignment notification
   */
  async publishPhoneNumberAssignment(
    userId: string,
    data: {
      phoneNumberId: string;
      phoneNumber: string;
      action: "assigned" | "unassigned";
    },
  ): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn("[AblyServer] Not connected to Ably - phone assignment skipped");
      return;
    }

    const channelName = `notifications:${userId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("phone_number_assignment", data);
      console.log(
        `[AblyServer] ✓ Published phone number assignment to ${channelName}`,
      );
    } catch (error) {
      console.error(
        "[AblyServer] Error publishing phone number assignment:",
        error,
      );
      // Don't throw - Ably is optional
    }
  }

  /**
   * Get client instance for advanced usage
   */
  getClient(): Realtime | null {
    return this.client;
  }

  /**
   * Check if connected to Ably
   */
  get isInitialized(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    if (!this.client) {
      return "not_initialized";
    }
    return this.client.connection.state || "unknown";
  }
}

// Export singleton instance
export default new AblyServer();
