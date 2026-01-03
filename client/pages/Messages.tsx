import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TeamMemberLayout from "@/components/TeamMemberLayout";
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
    fetchContacts();
    fetchAssignedPhoneNumber();
  }, [navigate]);

  const fetchAssignedPhoneNumber = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/assigned-phone-number", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedPhoneNumbers(data.phoneNumbers || []);
      }
    } catch {
      // Error handled silently
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
    if (!messageText.trim() || !conversation.contact) return;

    setIsSending(true);
    setError("");
    try {
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
          phoneNumberId: conversation.contact.phoneNumberId || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      setMessageText("");

      // If this was a new conversation, refresh contacts
      if (conversation.contact.id.startsWith("temp-")) {
        await fetchContacts();
      } else {
        await fetchMessages(conversation.contact.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.phoneNumber.includes(searchTerm) ||
      contact.name?.includes(searchTerm),
  );

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
