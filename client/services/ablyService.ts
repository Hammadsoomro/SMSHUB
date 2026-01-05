import * as Ably from 'ably';

interface ChannelListener {
  [eventName: string]: (...args: any[]) => void;
}

class AblyService {
  private realtime: Ably.Realtime | null = null;
  private channels: Map<string, Ably.RealtimeChannel> = new Map();
  private listeners: Map<string, ChannelListener> = new Map();
  private isConnecting = false;
  private userId: string | null = null;

  async connect(token: string): Promise<Ably.Realtime | null> {
    // Return existing connection if already connected or connecting
    if (this.realtime && this.realtime.connection.state === 'connected') {
      console.log('[AblyService] Already connected to Ably');
      return this.realtime;
    }

    if (this.isConnecting) {
      console.log('[AblyService] Connection already in progress, waiting...');
      return null;
    }

    try {
      this.isConnecting = true;
      console.log('[AblyService] Creating new Ably connection...');

      // Extract userId from token (JWT format: header.payload.signature)
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          this.userId = payload.userId;
        } catch (e) {
          console.warn('Could not extract userId from token');
        }
      }

      // Initialize Ably Realtime with token auth
      this.realtime = new Ably.Realtime({
        authUrl: '/api/auth/ably-token', // We'll create this endpoint
        authMethod: 'GET',
        autoConnect: true,
      });

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const onConnect = () => {
          this.realtime?.connection.off('connected', onConnect);
          this.realtime?.connection.off('failed', onError);
          console.log('[AblyService] Connected to Ably successfully');
          this.isConnecting = false;
          resolve();
        };

        const onError = (err: any) => {
          this.realtime?.connection.off('connected', onConnect);
          this.realtime?.connection.off('failed', onError);
          console.error('[AblyService] Ably connection error:', err);
          this.isConnecting = false;
          reject(err);
        };

        if (this.realtime?.connection.state === 'connected') {
          console.log('[AblyService] Already connected');
          this.isConnecting = false;
          resolve();
        } else {
          this.realtime?.connection.on('connected', onConnect);
          this.realtime?.connection.on('failed', onError);
        }
      });

      // Set up connection state listeners
      this.realtime.connection.on('state', (stateChange: any) => {
        console.log(`[AblyService] Connection state: ${stateChange.current}`);
      });

      return this.realtime;
    } catch (error) {
      console.error('[AblyService] Error creating Ably connection:', error);
      this.isConnecting = false;
      return null;
    }
  }

  disconnect(): void {
    try {
      // Close all channels
      this.channels.forEach((channel) => {
        channel.unsubscribe();
      });
      this.channels.clear();
      this.listeners.clear();

      // Close connection
      if (this.realtime) {
        this.realtime.close();
        this.realtime = null;
      }

      console.log('[AblyService] Disconnected from Ably');
    } catch (error) {
      console.error('[AblyService] Error during disconnect:', error);
    }
  }

  /**
   * Subscribe to a channel and listen for messages
   */
  on(
    channelName: string,
    eventName: string,
    callback: (...args: any[]) => void,
  ): void {
    try {
      if (!this.realtime) {
        console.warn('[AblyService] Not connected to Ably');
        return;
      }

      // Get or create channel
      let channel = this.channels.get(channelName);
      if (!channel) {
        channel = this.realtime.channels.get(channelName);
        this.channels.set(channelName, channel);
      }

      // Store listener reference
      if (!this.listeners.has(channelName)) {
        this.listeners.set(channelName, {});
      }
      const channelListeners = this.listeners.get(channelName)!;
      channelListeners[eventName] = callback;

      // Subscribe to event
      channel.subscribe(eventName, (message: any) => {
        callback(message.data);
      });

      console.log(
        `[AblyService] Subscribed to ${channelName}:${eventName}`,
      );
    } catch (error) {
      console.error('[AblyService] Error subscribing to event:', error);
    }
  }

  /**
   * Unsubscribe from a specific event on a channel
   */
  off(channelName: string, eventName?: string): void {
    try {
      const channel = this.channels.get(channelName);
      if (!channel) {
        return;
      }

      if (eventName) {
        // Unsubscribe from specific event
        const channelListeners = this.listeners.get(channelName);
        if (channelListeners) {
          delete channelListeners[eventName];
        }
        channel.unsubscribe(eventName);
        console.log(`[AblyService] Unsubscribed from ${channelName}:${eventName}`);
      } else {
        // Unsubscribe from all events on channel
        channel.unsubscribe();
        this.channels.delete(channelName);
        this.listeners.delete(channelName);
        console.log(`[AblyService] Unsubscribed from all events on ${channelName}`);
      }
    } catch (error) {
      console.error('[AblyService] Error unsubscribing:', error);
    }
  }

  /**
   * Publish a message to a channel
   */
  emit(
    channelName: string,
    eventName: string,
    data?: any,
  ): void {
    try {
      if (!this.realtime) {
        console.warn('[AblyService] Not connected to Ably');
        return;
      }

      const channel = this.realtime.channels.get(channelName);
      channel.publish(eventName, data, (err) => {
        if (err) {
          console.error(
            `[AblyService] Error publishing to ${channelName}:${eventName}:`,
            err,
          );
        } else {
          console.log(
            `[AblyService] Published to ${channelName}:${eventName}`,
          );
        }
      });
    } catch (error) {
      console.error('[AblyService] Error emitting event:', error);
    }
  }

  /**
   * Join a phone number room (for receiving updates about that phone)
   */
  joinPhoneNumber(phoneNumber: string): void {
    const channelName = `phone:${phoneNumber}`;
    try {
      if (!this.realtime) {
        console.warn('[AblyService] Not connected to Ably');
        return;
      }

      const channel = this.realtime.channels.get(channelName);
      console.log(`[AblyService] Joined phone channel: ${channelName}`);
      // Channel presence is implicit when subscribing
      this.channels.set(channelName, channel);
    } catch (error) {
      console.error('[AblyService] Error joining phone number:', error);
    }
  }

  /**
   * Leave a phone number room
   */
  leavePhoneNumber(phoneNumber: string): void {
    const channelName = `phone:${phoneNumber}`;
    this.off(channelName);
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.realtime?.connection.state === 'connected';
  }

  /**
   * Get the Ably realtime instance
   */
  getRealtimeInstance(): Ably.Realtime | null {
    return this.realtime;
  }

  /**
   * Get a specific channel
   */
  getChannel(channelName: string): Ably.RealtimeChannel | null {
    return this.channels.get(channelName) || null;
  }
}

export default new AblyService();
