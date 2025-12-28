import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Send,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  MessageSquare,
  Users,
  Loader2,
  Settings,
  LogOut,
  Phone,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import ApiService from "@/services/api";
import socketService from "@/services/socketService";
import AddContactDialog from "@/components/AddContactDialog";
import { Message, Contact, PhoneNumber, User as UserType } from "@shared/api";

interface ConversationContact extends Contact {
  lastMessage?: string;
  lastMessageTime?: string;
}

export default function TeamMemberConversations() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Core State
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [assignedPhoneNumber, setAssignedPhoneNumber] =
    useState<PhoneNumber | null>(null);
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // UI State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark";
  });

  // Profile and Modals
  const [profile, setProfile] = useState<UserType>({
    id: "",
    name: "",
    email: "",
    role: "team_member",
    createdAt: "",
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [showEditContact, setShowEditContact] = useState(false);
  const [showDeleteContact, setShowDeleteContact] = useState(false);
  const [editingContact, setEditingContact] =
    useState<ConversationContact | null>(null);
  const [deletingContact, setDeletingContact] =
    useState<ConversationContact | null>(null);
  const [newContactName, setNewContactName] = useState("");

  // Refs for socket handlers
  const selectedContactIdRef = useRef<string | null>(null);
  const assignedPhoneNumberRef = useRef<PhoneNumber | null>(null);
  const contactsRef = useRef<ConversationContact[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  useEffect(() => {
    assignedPhoneNumberRef.current = assignedPhoneNumber;
  }, [assignedPhoneNumber]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  // Initialize everything
  useEffect(() => {
    loadInitialData();

    // Set theme
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    return () => {
      try {
        if (assignedPhoneNumberRef.current) {
          socketService.leavePhoneNumber(assignedPhoneNumberRef.current.phoneNumber);
        }
        socketService.disconnect();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    };
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    initializeSocketIO();
  }, []);

  // Load contacts when assigned phone number is set
  useEffect(() => {
    if (assignedPhoneNumber) {
      loadContactsForPhoneNumber(assignedPhoneNumber.id);
      socketService.joinPhoneNumber(assignedPhoneNumber.phoneNumber);
    }
  }, [assignedPhoneNumber]);

  // Load messages when contact is selected
  useEffect(() => {
    if (selectedContactId) {
      loadMessages(selectedContactId);
      markMessagesAsRead(selectedContactId);
    }
  }, [selectedContactId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // Load profile from localStorage or API
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (storedUser) {
        setProfile(JSON.parse(storedUser));
      } else {
        try {
          const userProfile = await ApiService.getProfile();
          setProfile(userProfile);
          localStorage.setItem("user", JSON.stringify(userProfile));
        } catch (profileError) {
          console.error("Error loading profile:", profileError);
          if (
            profileError instanceof Error &&
            profileError.message.includes("session has expired")
          ) {
            navigate("/login");
            return;
          }
        }
      }

      // Load assigned phone number
      try {
        const response = await fetch("/api/messages/assigned-phone-number", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.phoneNumbers && data.phoneNumbers.length > 0) {
            setAssignedPhoneNumber(data.phoneNumbers[0]);
          } else {
            toast.error("No phone number assigned to your account");
          }
        } else {
          toast.error("Failed to load assigned phone number");
        }
      } catch (error) {
        console.error("Error loading assigned phone number:", error);
        toast.error("Failed to load phone number");
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocketIO = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No auth token found for Socket.IO connection");
      return;
    }

    try {
      setIsConnecting(true);
      const socket = socketService.connect(token);

      if (!socket) {
        setIsConnecting(false);
        toast.error("Unable to establish socket connection");
        return;
      }

      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");

      const handleConnect = () => {
        console.log("✅ Socket.IO connected");
        setIsConnecting(false);
        toast.success("Real-time messaging is now active");
      };

      const handleDisconnect = () => {
        console.log("❌ Socket.IO disconnected");
        setIsConnecting(false);
      };

      const handleError = (error: any) => {
        console.error("Socket.IO connection error:", error);
        setIsConnecting(false);
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("connect_error", handleError);

      if (socket.connected) {
        setIsConnecting(false);
      }

      // Set up event listeners
      socketService.on("new_message", (data: any) => {
        console.log("📱 New message received:", data);

        if (assignedPhoneNumberRef.current) {
          loadContactsForPhoneNumber(assignedPhoneNumberRef.current.id);
        }

        const currentSelectedContactId = selectedContactIdRef.current;
        if (currentSelectedContactId === data.contactId) {
          loadMessages(currentSelectedContactId);
        }
      });

      socketService.on("contact_updated", (data: any) => {
        console.log("👥 Contacts updated:", data);
        if (assignedPhoneNumberRef.current) {
          loadContactsForPhoneNumber(assignedPhoneNumberRef.current.id);
        }
      });
    } catch (error) {
      console.error("Error initializing Socket.IO:", error);
      setIsConnecting(false);
    }
  };

  const loadContactsForPhoneNumber = async (phoneNumberId: string) => {
    try {
      const contactsData = await ApiService.getContacts(phoneNumberId);
      setContacts(contactsData || []);
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast.error("Failed to load contacts");
    }
  };

  const loadMessages = async (contactId: string) => {
    try {
      setIsLoadingMessages(true);
      const messagesData = await ApiService.getMessages(
        contactId,
        assignedPhoneNumber?.phoneNumber,
      );
      setMessages(messagesData || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (contactId: string) => {
    try {
      await ApiService.markAsRead(contactId);
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === contactId ? { ...contact, unreadCount: 0 } : contact,
        ),
      );
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContactId || !assignedPhoneNumber || isSending) {
      return;
    }

    try {
      setIsSending(true);
      const selectedContact = contacts.find((c) => c.id === selectedContactId);

      if (!selectedContact) {
        throw new Error("Selected contact not found");
      }

      await ApiService.sendSMS(
        selectedContact.phoneNumber,
        newMessage.trim(),
        assignedPhoneNumber.id,
      );

      setNewMessage("");
      await Promise.all([
        loadMessages(selectedContactId),
        loadContactsForPhoneNumber(assignedPhoneNumber.id),
      ]);

      toast.success("Message sent successfully");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const addContactFromDialog = async (name: string, phoneNumber: string) => {
    try {
      if (!assignedPhoneNumber) {
        throw new Error("No phone number assigned to your account. Contact your admin.");
      }

      await ApiService.addContact(name, phoneNumber, assignedPhoneNumber.id);
      await loadContactsForPhoneNumber(assignedPhoneNumber.id);
      toast.success("Contact added successfully");
    } catch (error: any) {
      console.error("Error adding contact:", error);
      throw error;
    }
  };

  const editContact = async () => {
    if (!editingContact || !newContactName.trim()) return;

    try {
      await ApiService.updateContact(editingContact.id, {
        name: newContactName.trim(),
      } as any);

      setNewContactName("");
      setShowEditContact(false);
      setEditingContact(null);

      if (assignedPhoneNumber) {
        await loadContactsForPhoneNumber(assignedPhoneNumber.id);
      }

      toast.success("Contact updated successfully");
    } catch (error: any) {
      console.error("Error editing contact:", error);
      toast.error(error.message || "Failed to update contact");
    }
  };

  const deleteContact = async () => {
    if (!deletingContact) return;

    try {
      setShowDeleteContact(false);
      setDeletingContact(null);

      if (selectedContactId === deletingContact.id) {
        setSelectedContactId(null);
        setMessages([]);
      }

      toast.success("Contact deleted successfully");
      await ApiService.deleteContact(deletingContact.id);

      if (assignedPhoneNumber) {
        await loadContactsForPhoneNumber(assignedPhoneNumber.id);
      }

      setContacts((prev) =>
        prev.filter((contact) => contact.id !== deletingContact.id),
      );
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(error.message || "Failed to delete contact");
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "HH:mm");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "dd/MM/yyyy");
    }
  };

  const formatMessageTimeFull = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy HH:mm");
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      (contact.name &&
        contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      contact.phoneNumber.includes(searchTerm),
  );

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const totalUnreadCount = contacts.reduce(
    (sum, contact) => sum + contact.unreadCount,
    0,
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Loading conversations</h3>
            <p className="text-sm text-muted-foreground">
              Setting up your messages...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col relative ${isDarkMode ? "dark" : ""}`}
    >
      {/* Top Navigation Bar */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>

              <div className="flex-1">
                <h1 className="font-semibold text-lg">Messages</h1>
                {assignedPhoneNumber && (
                  <div className="flex items-center space-x-2 mt-1">
                    <Phone className="w-3 h-3 text-primary" />
                    <p className="text-xs font-mono font-semibold text-primary">
                      {assignedPhoneNumber.phoneNumber}
                    </p>
                    <Badge variant="secondary" className="text-xs h-5 py-0">
                      Active
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              {totalUnreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {totalUnreadCount} unread
                </Badge>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={toggleTheme}
                    className="cursor-pointer"
                  >
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex w-full flex-1 overflow-hidden">
        {/* Left Sidebar - Contact List */}
        <div className="w-80 bg-card/50 border-r border-border flex flex-col">
          {/* Search Section */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Add Contact Button */}
          <div className="p-3 border-b border-border">
            <Button
              className="w-full"
              size="sm"
              onClick={() => setShowAddContact(true)}
              disabled={!assignedPhoneNumber}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>

          {/* Contacts List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No contacts</p>
                  <p className="text-sm">
                    {searchTerm ? "Try a different search" : "Add a contact to start"}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    className={`mb-2 cursor-pointer transition-all ${
                      selectedContactId === contact.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedContactId(contact.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={contact.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {(contact.name || contact.phoneNumber)
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium truncate text-sm">
                                {contact.name || contact.phoneNumber}
                              </h4>
                              {contact.lastMessageTime && (
                                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {formatMessageTime(contact.lastMessageTime)}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {contact.phoneNumber}
                            </p>

                            {contact.lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {contact.lastMessage}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {contact.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs h-5 min-w-[20px]">
                              {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                            </Badge>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-1 h-auto opacity-60 hover:opacity-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingContact(contact);
                                  setNewContactName(contact.name || "");
                                  setShowEditContact(true);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingContact(contact);
                                  setShowDeleteContact(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 flex flex-col bg-background/50">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedContact.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(selectedContact.name || selectedContact.phoneNumber)
                          .substring(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {selectedContact.name || selectedContact.phoneNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedContact.phoneNumber}
                      </p>
                    </div>
                  </div>

                  {isConnecting && (
                    <Badge variant="secondary" className="text-xs">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Connecting...
                    </Badge>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">
                      Loading messages...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No messages yet</p>
                        <p className="text-sm">
                          Send a message to start the conversation
                        </p>
                      </div>
                    ) : (
                      messages.map((message, index) => {
                        const showDateSeparator =
                          index === 0 ||
                          (!isToday(new Date(message.timestamp)) &&
                            !isToday(new Date(messages[index - 1]?.timestamp)));

                        return (
                          <div key={message.id}>
                            {showDateSeparator && (
                              <div className="flex items-center my-4">
                                <Separator className="flex-1" />
                                <span className="px-3 text-xs text-muted-foreground bg-background">
                                  {formatMessageTimeFull(message.timestamp)}
                                </span>
                                <Separator className="flex-1" />
                              </div>
                            )}

                            <div
                              className={`flex ${
                                message.direction === "outbound"
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${
                                  message.direction === "outbound"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.body}
                                </p>
                                <span className="text-xs opacity-70 mt-2 block">
                                  {format(new Date(message.timestamp), "HH:mm")}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    size="sm"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-12 h-12 text-primary" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome</h2>
                  <p className="text-muted-foreground">
                    Select a contact to start messaging, or add a new contact to begin.
                  </p>
                </div>

                {assignedPhoneNumber && (
                  <div className="bg-card rounded-lg p-4 border">
                    <h3 className="font-semibold text-sm mb-2">Your Phone Number</h3>
                    <p className="text-sm font-mono text-primary">
                      {assignedPhoneNumber.phoneNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      All messages will be sent from this number
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditContact} onOpenChange={setShowEditContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editContactName">Contact Name</Label>
              <Input
                id="editContactName"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Enter contact name"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                value={editingContact?.phoneNumber || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Phone number cannot be changed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditContact(false)}>
              Cancel
            </Button>
            <Button onClick={editContact} disabled={!newContactName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Dialog */}
      <Dialog open={showDeleteContact} onOpenChange={setShowDeleteContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <strong>
              {deletingContact?.name || deletingContact?.phoneNumber}
            </strong>
            ? This will delete all message history.
          </p>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ This action cannot be undone
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteContact(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteContact}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddContact}
        onOpenChange={setShowAddContact}
        onAddContact={addContactFromDialog}
      />
    </div>
  );
}
