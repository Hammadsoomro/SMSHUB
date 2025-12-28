import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  Send,
  Settings,
  LogOut,
  Search,
  Plus,
  Loader2,
  Phone,
  AlertCircle,
  X,
} from "lucide-react";
import { Message, Contact } from "@shared/api";

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
  const [newConversationNumber, setNewConversationNumber] = useState("");
  const [assignedPhoneNumbers, setAssignedPhoneNumbers] = useState<
    PhoneNumber[]
  >([]);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) {
      navigate("/login");
      return;
    }
    const initializeData = async () => {
      await fetchAssignedPhoneNumber();
    };
    initializeData();
  }, [navigate]);

  // Fetch contacts when assigned phone numbers change
  useEffect(() => {
    if (assignedPhoneNumbers.length > 0) {
      fetchContactsForNumber(assignedPhoneNumbers[0].id);
    }
  }, [assignedPhoneNumbers]);

  const fetchAssignedPhoneNumber = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/assigned-phone-number", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedPhoneNumbers(data.phoneNumbers || []);
      } else {
        console.warn(
          `Failed to fetch assigned phone numbers: ${response.status}`
        );
      }
    } catch (err) {
      console.error("Error fetching assigned phone numbers:", err);
    }
  };

  const fetchContactsForNumber = async (phoneNumberId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/messages/contacts?phoneNumberId=${phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/messages/conversation/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setConversation({
        contact: conversation.contact,
        messages: data.messages || [],
      });
    } catch {
      // Error handled silently
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setNewConversationNumber("");
    setSearchTerm("");
    setConversation({ ...conversation, contact });
    fetchMessages(contact.id);
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
        phoneNumberId: "",
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

    if (!messageText.trim()) {
      setError("Please enter a message before sending");
      return;
    }

    if (!conversation.contact) {
      setError("Please select a contact first");
      return;
    }

    if (
      !conversation.contact.phoneNumberId &&
      !conversation.contact.id.startsWith("temp-")
    ) {
      setError(
        "This contact doesn't have an associated phone number. Please create a new conversation.",
      );
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session expired. Please refresh the page and try again.");
        return;
      }

      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: conversation.contact.phoneNumber,
          body: messageText.trim(),
          phoneNumberId: conversation.contact.phoneNumberId || "",
        }),
      });

      if (response.status === 401) {
        setError("Session expired. Please refresh the page and log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return;
      }

      if (response.status === 400) {
        const errorData = await response.json();
        setError(
          errorData.error ||
            "Failed to send message. Please check your input and try again.",
        );
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      setMessageText("");
      setError("");

      // If this was a new conversation, refresh contacts
      if (conversation.contact.id.startsWith("temp-")) {
        await fetchContacts();
      } else {
        await fetchMessages(conversation.contact.id);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again.";
      setError(errorMessage);
      console.error("Send message error:", err);
    } finally {
      setIsSending(false);
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
      contact.name?.includes(searchTerm),
  );

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold">SMSHub Messages</span>
        </div>

        {/* Search Bar in Header */}
        <div className="flex-1 max-w-md">
          <div className="relative flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search or paste phone number..."
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
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Error
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError("")}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r border-border bg-card overflow-hidden flex flex-col">
          {/* Assigned Phone Number Display */}
          {assignedPhoneNumbers.length > 0 && (
            <div className="p-4 border-b border-border bg-muted/50">
              <p className="text-xs text-muted-foreground mb-2 font-semibold">
                Assigned Number
              </p>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm">
                  {assignedPhoneNumbers[0].phoneNumber}
                </p>
              </div>
            </div>
          )}

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
                    className={`w-full text-left p-4 rounded-lg smooth-transition ${
                      conversation.contact?.id === contact.id
                        ? "bg-primary text-white"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-semibold text-sm">
                        {contact.name || contact.phoneNumber}
                      </p>
                      {contact.unreadCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-destructive text-white text-xs font-semibold">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs opacity-75 truncate">
                      {contact.lastMessage || "No messages yet"}
                    </p>
                    {contact.lastMessageTime && (
                      <p className="text-xs opacity-50 mt-1">
                        {new Date(contact.lastMessageTime).toLocaleDateString()}
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
                conversation.messages.map((msg) => (
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
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
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
              className="sticky bottom-0 z-10 border-t border-border bg-card p-4 space-y-2"
            >
              {error && (
                <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    if (error) setError(""); // Clear error when user starts typing
                  }}
                  placeholder="Type a message..."
                  className="flex-1 h-10"
                  disabled={isSending}
                  maxLength={1600}
                  aria-label="Message input"
                />
                <Button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="bg-gradient-to-r from-primary to-secondary"
                  size="sm"
                  title={
                    !messageText.trim()
                      ? "Please type a message"
                      : "Send message"
                  }
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Press Enter to send • Max 1600 characters</span>
                <span>{messageText.length}/1600</span>
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
}
