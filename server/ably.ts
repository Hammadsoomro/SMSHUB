import { Realtime } from "ably";

/**
 * Server-side Ably client for broadcasting messages
 * This allows the API to publish real-time updates to connected clients
 */
class AblyServer {
  private client: Realtime | null = null;

  /**
   * Initialize Ably server client
   */
  async initialize(): Promise<void> {
    if (this.client) {
      return; // Already initialized
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error("ABLY_API_KEY environment variable is required");
    }

    try {
      this.client = new Realtime({ key: apiKey });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Ably connection timeout"));
        }, 10000);

        this.client!.connection.on("connected", () => {
          clearTimeout(timeout);
          console.log("[AblyServer] Connected to Ably");
          resolve();
        });

        this.client!.connection.on("failed", (err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } catch (error) {
      console.error("[AblyServer] Failed to initialize Ably:", error);
      throw error;
    }
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
    if (!this.client) {
      console.error("[AblyServer] Ably not initialized");
      return;
    }

    const channelName = `sms:${userId}:${contactId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("message", message);
      console.log(`[AblyServer] Published message to ${channelName}`);
    } catch (error) {
      console.error("[AblyServer] Error publishing message:", error);
      throw error;
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
    if (!this.client) {
      console.error("[AblyServer] Ably not initialized");
      return;
    }

    const channelName = `contacts:${userId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("update", data);
      console.log(`[AblyServer] Published contact update to ${channelName}`);
    } catch (error) {
      console.error("[AblyServer] Error publishing contact update:", error);
      throw error;
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
    if (!this.client) {
      console.error("[AblyServer] Ably not initialized");
      return;
    }

    const channelName = `notifications:${userId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("sms_received", data);
      console.log(
        `[AblyServer] Published incoming SMS notification to ${channelName}`,
      );
    } catch (error) {
      console.error("[AblyServer] Error publishing SMS notification:", error);
      throw error;
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
    if (!this.client) {
      console.error("[AblyServer] Ably not initialized");
      return;
    }

    const channelName = `sms:${userId}:${contactId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("message_status", data);
      console.log(`[AblyServer] Published message status to ${channelName}`);
    } catch (error) {
      console.error("[AblyServer] Error publishing message status:", error);
      throw error;
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
    if (!this.client) {
      console.error("[AblyServer] Ably not initialized");
      return;
    }

    const channelName = `notifications:${userId}`;

    try {
      const channel = this.client.channels.get(channelName);
      await channel.publish("phone_number_assignment", data);
      console.log(
        `[AblyServer] Published phone number assignment to ${channelName}`,
      );
    } catch (error) {
      console.error(
        "[AblyServer] Error publishing phone number assignment:",
        error,
      );
      throw error;
    }
  }

  /**
   * Get client instance for advanced usage
   */
  getClient(): Realtime | null {
    return this.client;
  }

  /**
   * Check if initialized
   */
  get isInitialized(): boolean {
    return this.client !== null;
  }
}

// Export singleton instance
export default new AblyServer();
