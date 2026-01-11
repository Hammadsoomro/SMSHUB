import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  Phone,
  AlertCircle,
  LogOut,
  Bell,
} from "lucide-react";
import { Message, Contact } from "@shared/api";
import { toast } from "sonner";

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

export default function Messages() {
  const navigate = useNavigate();
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
  const [assignedPhoneNumbers, setAssignedPhoneNumbers] = useState<
    PhoneNumber[]
  >([]);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const memoizedFetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch contacts
      const contactsRes = await fetch("/api/messages/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        const newContacts = data.contacts || [];

        // Check for new unread messages and show notification
        setContacts((prevContacts) => {
          prevContacts.forEach((oldContact) => {
            const newContact = newContacts.find((c) => c.id === oldContact.id);
            if (newContact && newContact.unreadCount > oldContact.unreadCount) {
              toast.message(`📱 New message from ${newContact.phoneNumber}`, {
                description: newContact.lastMessage || "New message",
              });
            }
          });
          return newContacts;
        });
      }

      // Fetch assigned phone numbers
      const numbersRes = await fetch("/api/messages/assigned-phone-number", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (numbersRes.ok) {
        const data = await numbersRes.json();
        setAssignedPhoneNumbers(data.phoneNumbers || []);
        if (
          data.phoneNumbers &&
          data.phoneNumbers.length > 0 &&
          !selectedPhoneNumber
        ) {
          setSelectedPhoneNumber(data.phoneNumbers[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPhoneNumber]);

  const memoizedFetchMessages = useCallback(async (contactId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`/api/messages/conversation/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `Failed to fetch messages: ${response.status}`,
          errorData,
        );
        if (response.status === 404) {
          setError("Contact not found. Please select another contact.");
        } else {
          setError("Failed to load conversation. Please try again.");
        }
        return;
      }
      const data = await response.json();
      const newMessages = data.messages || [];

      setConversation((prev) => ({
        ...prev,
        messages: newMessages,
      }));
      setError("");
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError("Error loading conversation. Please try again.");
    }
  }, []);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }

    // Initial fetch
    memoizedFetchData();

    // Start polling for new messages
    const interval = setInterval(() => {
      memoizedFetchData();
      // Refresh current conversation if one is selected
      if (
        conversation.contact?.id &&
        !conversation.contact.id.startsWith("temp-")
      ) {
        memoizedFetchMessages(conversation.contact.id);
      }
    }, 3000); // Poll every 3 seconds

    pollIntervalRef.current = interval;

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [
    navigate,
    memoizedFetchData,
    memoizedFetchMessages,
    conversation.contact?.id,
  ]);

  useEffect(() => {
    // Calculate total unread
    const unread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    setTotalUnread(unread);
  }, [contacts]);

  const handleSelectContact = (contact: Contact) => {
    setSearchTerm("");
    setConversation({ ...conversation, contact });
    memoizedFetchMessages(contact.id);
  };

  const handleStartNewConversation = (phoneNumber: string) => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number");
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
        phoneNumberId: selectedPhoneNumber,
        phoneNumber,
        unreadCount: 0,
      };
      setConversation({
        contact: tempContact,
        messages: [],
      });
      setSearchTerm("");
    }
    setError("");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !conversation.contact) return;

    setIsSending(true);
    setError("");
    try {
      const phoneNumberId =
        conversation.contact.phoneNumberId || selectedPhoneNumber;

      if (!phoneNumberId) {
        throw new Error("No phone number assigned. Please contact your admin.");
      }

      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: conversation.contact.phoneNumber,
          body: messageText,
          phoneNumberId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      setMessageText("");
      toast.success("Message sent!", {
        description: `Message sent to ${conversation.contact.phoneNumber}`,
      });

      // If this was a new conversation, refresh contacts
      if (conversation.contact.id.startsWith("temp-")) {
        await memoizedFetchData();
      } else {
        await memoizedFetchMessages(conversation.contact.id);
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errMsg);
      toast.error("Failed to send message", {
        description: errMsg,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSearchNumberSelection = () => {
    if (searchTerm.trim()) {
      handleStartNewConversation(searchTerm);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.phoneNumber.includes(searchTerm) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex h-screen bg-background flex-col">
      {/* Header with Assigned Number and Logout */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">SMSHub</span>
          </div>
          {assignedPhoneNumbers.length > 0 && (
            <div className="flex items-center gap-2 pl-4 border-l border-border">
              <Phone className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm">
                {assignedPhoneNumbers[0].phoneNumber}
              </p>
            </div>
          )}
        </div>
        <Button onClick={handleLogout} variant="ghost" size="sm">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-40 border-b border-border bg-background px-6 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">Conversations</h1>
            <div className="relative">
              <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                <Bell className="w-6 h-6" />
                {totalUnread > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
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
                >
                  Start Chat
                </Button>
              )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Contacts Sidebar */}
          <div className="w-72 border-r border-border bg-card flex flex-col overflow-hidden flex-shrink-0">
            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length > 0 ? (
                <div className="space-y-1 p-2">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full text-left p-3 rounded-lg smooth-transition relative ${
                        conversation.contact?.id === contact.id
                          ? "bg-primary text-white"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-sm flex-1">
                          {contact.name || contact.phoneNumber}
                        </p>
                        {contact.unreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-destructive text-white text-xs font-bold flex-shrink-0">
                            {contact.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-75 truncate">
                        {contact.lastMessage || "No messages yet"}
                      </p>
                      {contact.lastMessageTime && (
                        <p className="text-xs opacity-50 mt-1">
                          {new Date(
                            contact.lastMessageTime,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </button>
                  ))}
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
              {/* Chat Header - Sticky Top */}
              <div className="sticky top-0 z-30 border-b border-border bg-background h-16 flex items-center justify-between px-6 shadow-sm flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {conversation.contact.name ||
                      conversation.contact.phoneNumber}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {conversation.contact.phoneNumber}
                    </span>
                  </p>
                </div>
              </div>

              {/* Messages - Scrollable Middle Section */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-background/50">
                {conversation.messages.length > 0 ? (
                  <>
                    {conversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.direction === "outbound"
                            ? "justify-end"
                            : "justify-start"
                        }`}
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
                            {new Date(msg.timestamp).toLocaleTimeString()}
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
                        No messages yet. Start a conversation!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input - Sticky Bottom */}
              <form
                onSubmit={handleSendMessage}
                className="sticky bottom-0 z-30 border-t border-border bg-background px-4 md:px-6 py-4 shadow-sm flex-shrink-0"
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
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="p-4 bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold mb-2">
                  Start a conversation
                </p>
                <p className="text-muted-foreground text-sm">
                  Search for or paste a phone number to begin messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
