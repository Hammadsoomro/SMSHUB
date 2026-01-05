import { Realtime } from 'ably';

let ably: Realtime | null = null;

export async function initializeAbly(): Promise<Realtime> {
  if (ably) {
    return ably;
  }

  try {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error('ABLY_API_KEY environment variable is not set');
    }

    console.log('[Ably] Initializing Ably realtime with API key...');

    // Initialize Ably with API key for server-side authentication
    ably = new Realtime({
      key: apiKey,
      autoConnect: true,
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const checkConnection = () => {
        if (ably!.connection.state === 'connected') {
          console.log('[Ably] Server connected to Ably');
          resolve();
        } else if (ably!.connection.state === 'failed') {
          reject(new Error('Failed to connect to Ably'));
        }
      };

      ably!.connection.on('connected', () => {
        console.log('[Ably] Server connection established');
        resolve();
      });

      ably!.connection.on('failed', (err) => {
        console.error('[Ably] Server connection failed:', err);
        reject(err);
      });

      // Check immediately in case connection is already established
      checkConnection();
    });

    return ably;
  } catch (error) {
    console.error('[Ably] Failed to initialize Ably:', error);
    throw error;
  }
}

export async function getAbly(): Promise<Realtime> {
  if (!ably) {
    return initializeAbly();
  }
  return ably;
}

/**
 * Publish a message to a channel
 */
export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: any,
): Promise<void> {
  try {
    const client = await getAbly();
    const channel = client.channels.get(channelName);

    await new Promise<void>((resolve, reject) => {
      channel.publish(eventName, data, (err) => {
        if (err) {
          console.error(
            `[Ably] Error publishing to ${channelName}:${eventName}:`,
            err,
          );
          reject(err);
        } else {
          console.log(
            `[Ably] Published to ${channelName}:${eventName}`,
          );
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('[Ably] Failed to publish message:', error);
    // Don't throw - allow server to continue even if realtime fails
  }
}

/**
 * Emit a new message event
 */
export async function emitNewMessage(userId: string, messageData: any): Promise<void> {
  await publishToChannel(`new_message`, 'new_message', {
    ...messageData,
    userId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a contact update event
 */
export async function emitContactUpdated(
  phoneNumberId: string,
  contactData: any,
): Promise<void> {
  await publishToChannel(`contacts`, 'contact_updated', {
    ...contactData,
    phoneNumberId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a message status update
 */
export async function emitMessageStatusUpdate(
  contactId: string,
  statusData: any,
): Promise<void> {
  await publishToChannel(`message_status`, 'messageStatusUpdate', {
    ...statusData,
    contactId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit an unread count update
 */
export async function emitUnreadUpdated(unreadData: any): Promise<void> {
  await publishToChannel(`notifications`, 'unreadUpdated', {
    ...unreadData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit a phone number assignment event to a specific user
 */
export async function emitPhoneNumberAssigned(
  userId: string,
  assignmentData: any,
): Promise<void> {
  await publishToChannel(`user:${userId}`, 'phone_number_assigned', {
    ...assignmentData,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit an incoming SMS notification to admin
 */
export async function emitIncomingSMSNotification(
  adminId: string,
  smsData: any,
): Promise<void> {
  await publishToChannel(`admin:${adminId}`, 'incoming_sms_notification', {
    ...smsData,
    timestamp: new Date().toISOString(),
  });
}

export async function closeAbly(): Promise<void> {
  if (ably) {
    await ably.close();
    ably = null;
    console.log('[Ably] Closed Ably connection');
  }
}
