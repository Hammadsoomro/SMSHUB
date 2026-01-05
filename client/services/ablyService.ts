import { Realtime, Types } from "ably";

interface AblyMessage {
  contactId: string;
  userId: string;
  phoneNumberId: string;
  message: string;
  direction: "inbound" | "outbound";
  timestamp: string;
  from?: string;
  to?: string;
}

class AblyService {
  private client: Realtime | null = null;
  private channels: Map<string, Types.RealtimeChannel> = new Map();
  private isConnecting = false;
  private connectionTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize Ably connection with API key
   */
  async connect(token: string): Promise<boolean> {
    if (this.client && this.client.connection.state === "connected") {
      console.log("[AblyService] Already connected to Ably");
      return true;
    }

    if (this.isConnecting) {
      console.log("[AblyService] Connection in progress...");
      return false;
    }

    try {
      this.isConnecting = true;
      console.log("[AblyService] Connecting to Ably...");

      const apiKey = import.meta.env.VITE_ABLY_API_KEY;
      if (!apiKey) {
        throw new Error("VITE_ABLY_API_KEY environment variable is not set");
      }

      // Initialize Ably client with API key (SAS authentication)
      // Note: Using API key directly for client-side. In production, consider token auth for security.
      this.client = new Realtime({
        key: apiKey,
        clientId: this.generateClientId(),
        disconnectedRetryTimeout: 15000, // 15 seconds
        realtimeRequestTimeout: 10000,
        transportParams: {
          heartbeatInterval: 30000,
        },
      });

      // Set up connection event listeners
      this.client.connection.on("connected", () => {
        console.log("✅ [AblyService] Connected to Ably!");
        this.isConnecting = false;
        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      });

      this.client.connection.on("disconnected", () => {
        console.warn("[AblyService] Disconnected from Ably, will reconnect...");
        this.isConnecting = false;
      });

      this.client.connection.on("failed", (err: any) => {
        const errorMsg = err?.message || JSON.stringify(err);
        console.error("[AblyService] Connection failed:", errorMsg);
        this.isConnecting = false;
      });

      // Wait for connection with timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("[AblyService] Connection timeout after 10s");
          resolve(false);
        }, 10000);

        this.client!.connection.once("connected", () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          resolve(true);
        });
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : JSON.stringify(error);
      console.error("[AblyService] Error connecting to Ably:", errorMsg);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Subscribe to messages for a specific conversation
   */
  subscribeToConversation(
    contactId: string,
    userId: string,
    callback: (message: AblyMessage) => void,
  ): () => void {
    if (!this.client) {
      console.error("[AblyService] Not connected to Ably");
      return () => {};
    }

    // Create channel name based on contactId and userId
    const channelName = `sms:${userId}:${contactId}`;

    try {
      // Get or create channel
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.client.channels.get(channelName);
        this.channels.set(channelName, channel);
        console.log(`[AblyService] Subscribing to channel: ${channelName}`);
      }

      // Subscribe to messages
      const handleMessage = (message: Types.Message) => {
        try {
          const data = message.data as AblyMessage;
          console.log("[AblyService] Received message:", data);
          callback(data);
        } catch (error) {
          console.error("[AblyService] Error processing message:", error);
        }
      };

      channel.subscribe("message", handleMessage);

      // Return unsubscribe function
      return () => {
        channel!.unsubscribe("message", handleMessage);
        console.log(`[AblyService] Unsubscribed from channel: ${channelName}`);
      };
    } catch (error) {
      console.error("[AblyService] Error subscribing to channel:", error);
      return () => {};
    }
  }

  /**
   * Subscribe to contact list updates
   */
  subscribeToContactUpdates(
    userId: string,
    callback: (data: any) => void,
  ): () => void {
    if (!this.client) {
      console.error("[AblyService] Not connected to Ably");
      return () => {};
    }

    const channelName = `contacts:${userId}`;

    try {
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.client.channels.get(channelName);
        this.channels.set(channelName, channel);
        console.log(
          `[AblyService] Subscribing to contacts channel: ${channelName}`,
        );
      }

      const handleUpdate = (message: Types.Message) => {
        callback(message.data);
      };

      channel.subscribe("update", handleUpdate);

      return () => {
        channel!.unsubscribe("update", handleUpdate);
      };
    } catch (error) {
      console.error("[AblyService] Error subscribing to contacts:", error);
      return () => {};
    }
  }

  /**
   * Subscribe to phone number assignment notifications
   */
  subscribeToPhoneNumberAssignments(
    userId: string,
    callback: (data: any) => void,
  ): () => void {
    if (!this.client) {
      console.error("[AblyService] Not connected to Ably");
      return () => {};
    }

    const channelName = `notifications:${userId}`;

    try {
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.client.channels.get(channelName);
        this.channels.set(channelName, channel);
        console.log(
          `[AblyService] Subscribing to notifications channel: ${channelName}`,
        );
      }

      const handleAssignment = (message: Types.Message) => {
        if (message.name === "phone_number_assignment") {
          callback(message.data);
        }
      };

      channel.subscribe(handleAssignment);

      return () => {
        channel!.unsubscribe(handleAssignment);
      };
    } catch (error) {
      console.error(
        "[AblyService] Error subscribing to phone number assignments:",
        error,
      );
      return () => {};
    }
  }

  /**
   * Publish a message to a specific conversation
   */
  async publishMessage(
    contactId: string,
    userId: string,
    message: AblyMessage,
  ): Promise<void> {
    if (!this.client) {
      throw new Error("Not connected to Ably");
    }

    const channelName = `sms:${userId}:${contactId}`;
    const channel = this.client.channels.get(channelName);

    try {
      await channel.publish("message", message);
      console.log("[AblyService] Message published to", channelName);
    } catch (error) {
      console.error("[AblyService] Error publishing message:", error);
      throw error;
    }
  }

  /**
   * Broadcast contact list update
   */
  async broadcastContactUpdate(userId: string, data: any): Promise<void> {
    if (!this.client) {
      throw new Error("Not connected to Ably");
    }

    const channelName = `contacts:${userId}`;
    const channel = this.client.channels.get(channelName);

    try {
      await channel.publish("update", data);
      console.log("[AblyService] Contact update published to", channelName);
    } catch (error) {
      console.error("[AblyService] Error publishing contact update:", error);
      throw error;
    }
  }

  /**
   * Check if connected to Ably
   */
  get connected(): boolean {
    return this.client?.connection.state === "connected";
  }

  /**
   * Get connection state
   */
  get connectionState(): string {
    return this.client?.connection.state || "disconnected";
  }

  /**
   * Disconnect from Ably
   */
  disconnect(): void {
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);

    // Unsubscribe from all channels
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();

    // Close client connection
    if (this.client) {
      this.client.connection.close();
      this.client = null;
    }

    console.log("[AblyService] Disconnected from Ably");
  }

  /**
   * Generate unique client ID based on user and device
   */
  private generateClientId(): string {
    const token = localStorage.getItem("token");
    const deviceId = localStorage.getItem("deviceId") || this.createDeviceId();

    return `user-${token?.substring(0, 8) || "anon"}-${deviceId}`;
  }

  /**
   * Create and store unique device ID
   */
  private createDeviceId(): string {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = `device-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  }

  /**
   * Get client instance (for advanced usage)
   */
  getClient(): Realtime | null {
    return this.client;
  }
}

// Export singleton instance
export default new AblyService();
