import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
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
  Bell,
} from "lucide-react";
import { Message, Contact, PhoneNumber } from "@shared/api";
import { toast } from "sonner";

interface ConversationState {
  contact: Contact | null;
  messages: Message[];
}

export default function Conversations() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [conversation, setConversation] = useState<ConversationState>({
    contact: null,
    messages: [],
  });
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>("");
  const [error, setError] = useState("");
  const [newConversationNumber, setNewConversationNumber] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    fetchData();

    // Start polling for new messages
    const interval = setInterval(() => {
      if (conversation.contact) {
        fetchMessages(conversation.contact.id);
      }
      fetchData();
    }, 3000); // Poll every 3 seconds

    pollIntervalRef.current = interval;

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [navigate, conversation.contact?.id]);

  useEffect(() => {
    // Calculate total unread
    const unread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    setTotalUnread(unread);
  }, [contacts]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Fetch contacts
      const contactsRes = await fetch("/api/messages/contacts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        const newContacts = data.contacts || [];
        
        // Check for new unread messages and show notification
        const oldContacts = contacts;
        newContacts.forEach((newContact) => {
          const oldContact = oldContacts.find((c) => c.id === newContact.id);
          if (
            oldContact &&
            newContact.unreadCount > oldContact.unreadCount &&
            conversation.contact?.id !== newContact.id
          ) {
            toast.message(`📱 New message from ${newContact.phoneNumber}`, {
              description: newContact.lastMessage || "New message",
            });
          }
        });

        setContacts(newContacts);
      }

      // Fetch phone numbers
      const numbersRes = await fetch("/api/admin/numbers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (numbersRes.ok) {
        const data = await numbersRes.json();
        setPhoneNumbers(data.numbers || []);
        if (data.numbers && data.numbers.length > 0 && !selectedPhoneNumber) {
          setSelectedPhoneNumber(data.numbers[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
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
      const newMessages = data.messages || [];

      // Check if we have new messages
      if (
        conversation.messages.length > 0 &&
        newMessages.length > conversation.messages.length
      ) {
        const lastOldMessage =
          conversation.messages[conversation.messages.length - 1];
        const newMsg = newMessages.find((m) => m.timestamp > lastOldMessage.timestamp);
        if (newMsg && newMsg.direction === "inbound") {
          toast("🔔 New message received!", {
            description: newMsg.body.substring(0, 50),
          });
        }
      }

      setConversation({
        contact: conversation.contact,
        messages: newMessages,
      });
    } catch (err) {
      console.error("Error fetching messages:", err);
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
        phoneNumberId: selectedPhoneNumber,
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
          phoneNumberId: selectedPhoneNumber,
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

      // If this was a new conversation, add it to contacts
      if (conversation.contact.id.startsWith("temp-")) {
        await fetchData();
      } else {
        await fetchMessages(conversation.contact.id);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to send message";
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

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.phoneNumber.includes(searchTerm) ||
      contact.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className="h-screen -m-4 md:-m-8 flex flex-col bg-card">
        {/* Sticky Header */}
        <div className="sticky top-0 z-40 border-b border-border bg-background p-4 md:p-6 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl md:text-3xl font-bold">Conversations</h1>
              {/* Notification Bell */}
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

            {/* Phone Number Selection and Search */}
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
              <select
                value={selectedPhoneNumber}
                onChange={(e) => setSelectedPhoneNumber(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-foreground"
              >
                {phoneNumbers.map((num, index) => (
                  <option key={num.id || `phone-${index}`} value={num.id}>
                    {num.phoneNumber}
                  </option>
                ))}
              </select>
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
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Contacts Sidebar */}
          <div className="hidden md:flex w-72 border-r border-border bg-card flex-col overflow-hidden">
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
              {/* Chat Header - Sticky */}
              <div className="sticky top-0 z-30 border-b border-border bg-background h-16 flex items-center justify-between px-4 md:px-6 shadow-sm">
                <div className="flex-1">
                  <p className="font-semibold">
                    {conversation.contact.name ||
                      conversation.contact.phoneNumber}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Phone className="w-3 h-3" />
                    {conversation.contact.phoneNumber}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setConversation({ contact: null, messages: [] });
                    setSearchTerm("");
                  }}
                  className="md:hidden p-2 hover:bg-muted rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages - Scrollable */}
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

              {/* Message Input - Sticky */}
              <form
                onSubmit={handleSendMessage}
                className="sticky bottom-0 z-30 border-t border-border bg-background p-4 md:p-6 shadow-sm"
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
    </AdminLayout>
  );
}
