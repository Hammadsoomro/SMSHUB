import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TeamMemberLayout from "@/components/TeamMemberLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  Phone,
  AlertCircle,
  X,
} from "lucide-react";
import { Message, Contact } from "@shared/api";
import ablyService from "@/services/ablyService";
import { notificationAudioManager } from "@/lib/notification-audio";

interface ConversationState {
  contact: Contact | null;
  messages: Message[];
}

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  assignedTo?: string;
  active: boolean;
}

interface MessageCache {
  [contactId: string]: Message[];
}

export default function Messages() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [conversation, setConversation] = useState<ConversationState>({
    contact: null,
    messages: [],
  });
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [newConversationNumber, setNewConversationNumber] = useState("");
  const [assignedPhoneNumbers, setAssignedPhoneNumbers] = useState<
    PhoneNumber[]
  >([]);
  const [activePhoneNumberId, setActivePhoneNumberId] = useState<string | null>(
    null,
  );
  const [notifications, setNotifications] = useState(() => {
    return Notification.permission === "granted";
  });
  const messagesCacheRef = useRef<MessageCache>({});
  const contactsCacheRef = useRef<Contact[]>([]);
  const notificationsRef = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages]);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }

    // Request notification permission
    requestNotificationPermission();

    initializeMessages();

    // Cleanup on unmount
    return () => {
      try {
        ablyService.disconnect();
      } catch (error) {
        console.error("Error during Messages cleanup:", error);
      }
    };
  }, [navigate]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const initializeMessages = async () => {
    try {
      setIsLoading(true);

      // Initialize Ably connection first
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const connected = await ablyService.connect(token);
          if (connected) {
            console.log("✅ [Messages] Ably connected for real-time updates");
            // Setup contact update listeners once Ably is connected
            setupAblyListeners();
          }
        } catch (ablyError) {
          console.warn(
            "[Messages] Ably connection failed, app will work with polling:",
            ablyError
          );
          // Continue anyway - app works without Ably
        }
      }

      // Then load assigned phone numbers
      await fetchAssignedPhoneNumbers();
    } finally {
      setIsLoading(false);
    }
  };

  const setupAblyListeners = () => {
    try {
      const storedUser = localStorage.getItem("user");
      const userProfile = storedUser ? JSON.parse(storedUser) : null;
      const userId = userProfile?.id;

      if (!userId) {
        console.error("[Messages] No user ID found for Ably subscriptions");
        return;
      }

      // Subscribe to contact updates so new messages update the contact list in real-time
      ablyService.subscribeToContactUpdates(userId, (data: any) => {
        console.log("[Messages] Contact update received:", data);
        // Reload contacts to reflect new messages
        if (activePhoneNumberId) {
          fetchContacts(activePhoneNumberId);
        }
      });
    } catch (error) {
      console.error("[Messages] Error setting up Ably listeners:", error);
      // Continue anyway - core functionality doesn't require listeners
    }
  };

  const fetchAssignedPhoneNumbers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/assigned-phone-number", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const phoneNumbers = data.phoneNumbers || [];
        setAssignedPhoneNumbers(phoneNumbers);

        // Set first phone number as active and load its contacts
        if (phoneNumbers.length > 0) {
          const firstPhone = phoneNumbers[0];
          setActivePhoneNumberId(firstPhone.id);
          await fetchContacts(firstPhone.id);
        }
      }
    } catch (err) {
      console.error("Error fetching phone numbers:", err);
      setError("Failed to load phone numbers");
    }
  };

  const fetchContacts = async (phoneNumberId: string) => {
    if (!phoneNumberId) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/messages/contacts?phoneNumberId=${encodeURIComponent(phoneNumberId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      const contactsData = data.contacts || [];

      // Sort contacts: unread first, then by last message time (newest first)
      const sortedContacts = contactsData.sort((a: Contact, b: Contact) => {
        // 1. Sort contacts with unread messages above read ones
        const aHasUnread = a.unreadCount > 0;
        const bHasUnread = b.unreadCount > 0;
        if (aHasUnread && !bHasUnread) return -1;
        if (!aHasUnread && bHasUnread) return 1;

        // 2. Sort by last message time (most recent first)
        const aTime = a.lastMessageTime
          ? new Date(a.lastMessageTime).getTime()
          : 0;
        const bTime = b.lastMessageTime
          ? new Date(b.lastMessageTime).getTime()
          : 0;
        return bTime - aTime;
      });

      setContacts(sortedContacts);
      contactsCacheRef.current = sortedContacts;
    } catch (err) {
      console.error("Error fetching contacts:", err);
      setError("Failed to load contacts");
    }
  };

  const fetchMessages = async (contactId: string, skipNotification = false) => {
    // Check if messages are cached
    if (messagesCacheRef.current[contactId]) {
      setConversation((prev) => ({
        ...prev,
        messages: messagesCacheRef.current[contactId],
      }));
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/messages/conversation/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      const messages = data.messages || [];

      // Check for new inbound messages
      if (!skipNotification && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.direction === "inbound") {
          const contact = contacts.find((c) => c.id === contactId);
          if (contact && notificationsRef.current) {
            showNotification(
              "New Message",
              `${contact.name || contact.phoneNumber}: ${lastMessage.body.substring(0, 50)}`,
            );
          }
        }
      }

      messagesCacheRef.current[contactId] = messages;
      setConversation((prev) => ({
        ...prev,
        messages,
      }));
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Failed to load messages");
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setNewConversationNumber("");
    setSearchTerm("");
    setError("");

    // Show cached messages immediately if available
    const cachedMessages = messagesCacheRef.current[contact.id] || [];
    setConversation({ contact, messages: cachedMessages });

    // Mark as read optimistically
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, unreadCount: 0 } : c)),
    );

    // Fetch fresh messages in the background
    fetchMessages(contact.id);

    // Mark as read on server
    if (contact.unreadCount > 0) {
      const token = localStorage.getItem("token");
      fetch(`/api/messages/mark-read/${contact.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Silently fail
      });
    }

    // Subscribe to real-time updates
    const storedUser = localStorage.getItem("user");
    const userProfile = storedUser ? JSON.parse(storedUser) : null;
    if (userProfile?.id) {
      ablyService.subscribeToConversation(contact.id, userProfile.id, () => {
        // Refresh messages when new ones arrive
        fetchMessages(contact.id);
      });
    }
  };

  const handleStartNewConversation = (phoneNumber: string) => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    if (!activePhoneNumberId) {
      setError("No phone number assigned. Please contact your administrator.");
      return;
    }

    // Check if contact already exists
    const existingContact = contacts.find((c) => c.phoneNumber === phoneNumber);

    if (existingContact) {
      handleSelectContact(existingContact);
    } else {
      // Create temporary contact object for new conversation
      const tempContact: Contact = {
        id: `temp-${Date.now()}`,
        phoneNumberId: activePhoneNumberId,
        phoneNumber,
        unreadCount: 0,
      };
      setConversation({
        contact: tempContact,
        messages: [],
      });
      setNewConversationNumber("");
      setSearchTerm("");
    }
    setError("");
  };

  const handleSearchNumberSelection = () => {
    if (searchTerm.trim()) {
      handleStartNewConversation(searchTerm);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !conversation.contact || !activePhoneNumberId)
      return;

    const messageToSend = messageText;
    const contactId = conversation.contact.id;
    const currentTime = new Date().toISOString();
    setMessageText("");
    setError("");
    setIsSending(true);

    try {
      // Optimistic update - show message immediately
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        phoneNumberId: activePhoneNumberId,
        from:
          assignedPhoneNumbers.find((p) => p.id === activePhoneNumberId)
            ?.phoneNumber || "",
        to: conversation.contact.phoneNumber,
        body: messageToSend,
        direction: "outbound",
        timestamp: currentTime,
        sid: "",
      };

      setConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, optimisticMessage],
      }));

      // Update contact with new message time (optimistic)
      setContacts((prev) =>
        prev
          .map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  lastMessage: messageToSend.substring(0, 50),
                  lastMessageTime: currentTime,
                }
              : c,
          )
          .sort((a, b) => {
            // 1. Sort contacts with unread messages above read ones
            const aHasUnread = a.unreadCount > 0;
            const bHasUnread = b.unreadCount > 0;
            if (aHasUnread && !bHasUnread) return -1;
            if (!aHasUnread && bHasUnread) return 1;

            // 2. Sort by last message time (most recent first)
            const aTime = a.lastMessageTime
              ? new Date(a.lastMessageTime).getTime()
              : 0;
            const bTime = b.lastMessageTime
              ? new Date(b.lastMessageTime).getTime()
              : 0;
            return bTime - aTime;
          }),
      );

      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: conversation.contact.phoneNumber,
          body: messageToSend,
          phoneNumberId: activePhoneNumberId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      // Clear message cache to force refresh
      messagesCacheRef.current[contactId] = [];

      // Refresh messages after sending
      await fetchMessages(contactId);

      // If this was a new conversation, refresh contacts
      if (contactId.startsWith("temp-")) {
        await fetchContacts(activePhoneNumberId);
        // Clear contacts cache to force refresh
        contactsCacheRef.current = [];
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Restore message text on error
      setMessageText(messageToSend);
      // Remove optimistic message on error
      setConversation((prev) => ({
        ...prev,
        messages: prev.messages.filter((m) => !m.id.startsWith("temp-")),
      }));
    } finally {
      setIsSending(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotifications(permission === "granted");
    }
  };

  const showNotification = (title: string, body: string) => {
    if (notifications && Notification.permission === "granted") {
      // Play notification sound with unique ringtone
      notificationAudioManager.playNotificationTone().catch(() => {
        // Silently fail if audio can't play
      });

      const notification = new Notification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: "sms-notification",
        requireInteraction: true,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Keep notification visible longer for better UX
      setTimeout(() => {
        try {
          notification.close();
        } catch (e) {
          // Notification may have already been closed
        }
      }, 8000);
    }
  };

  const filteredContacts = contacts
    .filter(
      (contact) =>
        contact.phoneNumber.includes(searchTerm) ||
        contact.name?.includes(searchTerm),
    )
    .sort((a, b) => {
      // 1. Sort contacts with unread messages above read ones
      const aHasUnread = a.unreadCount > 0;
      const bHasUnread = b.unreadCount > 0;
      if (aHasUnread && !bHasUnread) return -1;
      if (!aHasUnread && bHasUnread) return 1;

      // 2. Sort by last message time (most recent first)
      const aTime = a.lastMessageTime
        ? new Date(a.lastMessageTime).getTime()
        : 0;
      const bTime = b.lastMessageTime
        ? new Date(b.lastMessageTime).getTime()
        : 0;
      return bTime - aTime;
    });

  const messagesContent = (
    <div className="h-full bg-background flex flex-col">
      {/* Search Bar */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts or paste phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && searchTerm.trim()) {
                    handleSearchNumberSelection();
                  }
                }}
                className="pl-10 h-10"
              />
            </div>
            {searchTerm &&
              !filteredContacts.some((c) => c.phoneNumber === searchTerm) && (
                <Button
                  onClick={handleSearchNumberSelection}
                  className="bg-gradient-to-r from-primary to-secondary"
                  size="sm"
                >
                  Start Chat
                </Button>
              )}
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r border-border bg-card overflow-hidden flex flex-col">
          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="space-y-0.5 p-2">
                {filteredContacts.flatMap((contact, index) => {
                  const items: any[] = [
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        conversation.contact?.id === contact.id
                          ? "bg-gradient-to-r from-primary to-secondary text-white shadow-md"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {contact.name || contact.phoneNumber}
                          </p>
                          <p className="text-xs opacity-75 truncate mt-0.5">
                            {contact.lastMessage || "No messages yet"}
                          </p>
                        </div>
                        {contact.unreadCount > 0 &&
                          conversation.contact?.id !== contact.id && (
                            <Badge
                              variant="destructive"
                              className="text-xs h-5 min-w-[20px] flex-shrink-0"
                            >
                              {contact.unreadCount > 99
                                ? "99+"
                                : contact.unreadCount}
                            </Badge>
                          )}
                      </div>
                      {contact.lastMessageTime && (
                        <p className="text-xs opacity-50 mt-1">
                          {new Date(contact.lastMessageTime).toLocaleDateString()}
                        </p>
                      )}
                    </button>,
                  ];
                  return items;
                }).flat()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center px-4">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                  <p className="text-muted-foreground text-sm">
                    {searchTerm
                      ? "No contacts match your search"
                      : "No contacts yet"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {conversation.contact ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header - Sticky */}
            <div className="sticky top-0 z-10 border-b border-border bg-card h-16 flex items-center justify-between px-6">
              <div>
                <p className="font-semibold">
                  {conversation.contact.name ||
                    conversation.contact.phoneNumber}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <Phone className="w-3 h-3" />
                  {conversation.contact.phoneNumber}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {conversation.messages.length > 0 ? (
                <>
                  {conversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.direction === "outbound"
                            ? "bg-primary text-white"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-sm break-words">{msg.body}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                    <p className="text-muted-foreground text-sm">
                      No messages yet
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input - Sticky */}
            <form
              onSubmit={handleSendMessage}
              className="sticky bottom-0 z-10 border-t border-border bg-card p-4"
            >
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-10"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="bg-gradient-to-r from-primary to-secondary"
                  size="sm"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-card">
            <div className="text-center">
              <div className="p-4 bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold mb-2">
                {filteredContacts.length > 0 && !searchTerm
                  ? "Select a contact"
                  : "Start a conversation"}
              </p>
              <p className="text-muted-foreground text-sm">
                {filteredContacts.length > 0
                  ? "Choose a contact from the list or search for a phone number"
                  : "Enter or paste a phone number to begin"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return <TeamMemberLayout>{messagesContent}</TeamMemberLayout>;
}
