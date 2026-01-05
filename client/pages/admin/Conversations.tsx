import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Send,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Search,
  MessageSquare,
  Users,
  Loader2,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import ApiService from "@/services/api";
import ablyService from "@/services/ablyService";
import AdBanner from "@/components/AdBanner";
import AnimatedBackground from "@/components/AnimatedBackground";
import AddContactDialog from "@/components/AddContactDialog";
import ConversationsTopBar from "@/components/ConversationsTopBar";
import { Message, Contact, PhoneNumber, User as UserType } from "@shared/api";

interface ConversationContact extends Contact {
  lastMessage?: string;
  lastMessageTime?: string;
}

export default function Conversations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Core State
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null,
  );
  const [activePhoneNumber, setActivePhoneNumber] = useState<string | null>(
    null,
  );
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
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
  const [notifications, setNotifications] = useState(() => {
    return Notification.permission === "granted";
  });

  // Profile and Modals
  const [profile, setProfile] = useState<UserType>({
    id: "",
    name: "",
    email: "",
    role: "admin",
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

  // Refs for socket handlers to always have current state
  const activePhoneNumberRef = useRef<string | null>(null);
  const phoneNumbersRef = useRef<PhoneNumber[]>([]);
  const selectedContactIdRef = useRef<string | null>(null);
  const notificationsRef = useRef(false);
  const contactsRef = useRef<ConversationContact[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    activePhoneNumberRef.current = activePhoneNumber;
  }, [activePhoneNumber]);

  useEffect(() => {
    phoneNumbersRef.current = phoneNumbers;
  }, [phoneNumbers]);

  useEffect(() => {
    selectedContactIdRef.current = selectedContactId;
  }, [selectedContactId]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  // Initialize everything
  useEffect(() => {
    loadInitialData();
    requestNotificationPermission();

    // Set theme
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    return () => {
      try {
        ablyService.disconnect();
      } catch (error) {
        console.error("Error during Conversations cleanup:", error);
      }
    };
  }, []);

  // Initialize Ably separately with better lifecycle management
  useEffect(() => {
    initializeAbly();
  }, []);

  // Handle phone number URL parameter
  useEffect(() => {
    const phoneNumberFromUrl = searchParams.get("phoneNumber");
    if (phoneNumberFromUrl && phoneNumbers.length > 0) {
      const foundPhone = phoneNumbers.find(
        (p) => p.phoneNumber === phoneNumberFromUrl,
      );
      if (foundPhone && foundPhone.phoneNumber !== activePhoneNumber) {
        switchPhoneNumber(foundPhone.phoneNumber);
      }
    } else if (phoneNumbers.length > 0 && !activePhoneNumber) {
      const activePhone = phoneNumbers.find((p) => p.active) || phoneNumbers[0];
      setActivePhoneNumber(activePhone.phoneNumber);
      loadContactsForPhoneNumber(activePhone.id);
    }
  }, [phoneNumbers, searchParams]);

  // Load contacts when active phone number changes
  useEffect(() => {
    if (activePhoneNumber) {
      const phoneNum = phoneNumbers.find(
        (p) => p.phoneNumber === activePhoneNumber,
      );
      if (phoneNum) {
        loadContactsForPhoneNumber(phoneNum.id);
      }
    }
  }, [activePhoneNumber, phoneNumbers]);

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
        // No token found, redirect to login
        console.warn("No authentication token found. Redirecting to login...");
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
          // If profile load fails due to auth, redirect to login
          if (
            profileError instanceof Error &&
            profileError.message.includes("session has expired")
          ) {
            navigate("/login");
            return;
          }
          throw new Error(
            `Failed to load profile: ${profileError instanceof Error ? profileError.message : "Unknown error"}`,
          );
        }
      }

      // Load phone numbers accessible to user
      // Admin: all numbers, Team member: only assigned number
      try {
        const phoneNumbersData = await ApiService.getAccessiblePhoneNumbers();
        const processedPhones = phoneNumbersData.map((phone: any) => ({
          ...phone,
        }));

        setPhoneNumbers(processedPhones);

        // Set active phone number if we have phones but no active one
        if (processedPhones.length > 0 && !activePhoneNumber) {
          const activePhone =
            processedPhones.find((p) => p.active) || processedPhones[0];
          setActivePhoneNumber(activePhone.phoneNumber);
        }
      } catch (numbersError) {
        console.error("Error loading phone numbers:", numbersError);
        throw new Error(
          `Failed to load phone numbers: ${numbersError instanceof Error ? numbersError.message : "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load initial data. Please refresh the page.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAbly = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No auth token found for Ably connection");
      return;
    }

    try {
      setIsConnecting(true);
      console.log("🔌 Initializing Ably for real-time messaging...");

      // Connect to Ably service
      const connected = await ablyService.connect(token);

      if (!connected) {
        console.warn("Ably connection failed");
        setIsConnecting(false);
        toast.warning(
          "Real-time messaging connection failed, but app will still work",
        );
        return;
      }

      // Show success message
      setIsConnecting(false);
      toast.success(
        "✨ Real-time messaging connected - SMS updates in real-time!",
      );

      // Subscribe to contact updates once connected
      setupAblyListeners();
    } catch (error) {
      console.error("Error initializing Ably:", error);
      setIsConnecting(false);
      toast.error("Failed to initialize real-time connection");
    }
  };

  const setupAblyListeners = () => {
    try {
      const storedUser = localStorage.getItem("user");
      const userProfile = storedUser ? JSON.parse(storedUser) : null;
      const userId = userProfile?.id;

      if (!userId) {
        console.error("No user ID found for Ably subscriptions");
        return;
      }

      // Subscribe to contact updates for the current user
      const unsubscribeContacts = ablyService.subscribeToContactUpdates(
        userId,
        (data: any) => {
          console.log("👥 Contacts updated:", data);
          const currentActivePhone = activePhoneNumberRef.current;
          if (currentActivePhone) {
            const phoneNum = phoneNumbersRef.current.find(
              (p) => p.phoneNumber === currentActivePhone,
            );
            if (phoneNum) {
              loadContactsForPhoneNumber(phoneNum.id);
            }
          }
        },
      );

      // Subscribe to messages for the currently selected contact
      const subscribeToMessages = () => {
        const currentSelectedContactId = selectedContactIdRef.current;
        if (currentSelectedContactId) {
          const unsubscribeMessages = ablyService.subscribeToConversation(
            currentSelectedContactId,
            userId,
            (message: any) => {
              console.log("📱 New message received:", message);

              // Reload messages for the current contact
              if (currentSelectedContactId === message.contactId) {
                loadMessages(currentSelectedContactId);
              }

              // Reload contacts to update last message and unread count
              const currentActivePhone = activePhoneNumberRef.current;
              if (currentActivePhone) {
                const phoneNum = phoneNumbersRef.current.find(
                  (p) => p.phoneNumber === currentActivePhone,
                );
                if (phoneNum) {
                  loadContactsForPhoneNumber(phoneNum.id);
                }
              }

              // Show notification for incoming messages
              const currentNotifications = notificationsRef.current;
              if (currentNotifications && message.direction === "inbound") {
                showNotification(
                  "New Message",
                  `${message.from}: ${message.message.substring(0, 50)}`,
                );
              }

              // Update page title
              updatePageTitle();
            },
          );

          return unsubscribeMessages;
        }
        return () => {};
      };

      let unsubscribeMessages = subscribeToMessages();

      // Update message subscription when contact changes
      const originalSelectedContactId = selectedContactIdRef.current;
      const messageSubscriptionEffect = setInterval(() => {
        const currentSelectedContactId = selectedContactIdRef.current;
        if (currentSelectedContactId !== originalSelectedContactId) {
          // Contact changed, resubscribe
          unsubscribeMessages?.();
          unsubscribeMessages = subscribeToMessages();
        }
      }, 500);

      // Cleanup subscriptions on unmount
      return () => {
        clearInterval(messageSubscriptionEffect);
        unsubscribeContacts?.();
        unsubscribeMessages?.();
      };
    } catch (error) {
      console.error("Error initializing Ably listeners:", error);
      toast.error("Failed to initialize real-time listeners");
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
        activePhoneNumber || undefined,
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

      // Update contact unread count in UI
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === contactId ? { ...contact, unreadCount: 0 } : contact,
        ),
      );

      updatePageTitle();
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async () => {
    if (
      !newMessage.trim() ||
      !selectedContactId ||
      !activePhoneNumber ||
      isSending
    ) {
      return;
    }

    try {
      setIsSending(true);
      const selectedContact = contacts.find((c) => c.id === selectedContactId);

      if (!selectedContact) {
        throw new Error("Selected contact not found");
      }

      const phoneNum = phoneNumbers.find(
        (p) => p.phoneNumber === activePhoneNumber,
      );
      if (!phoneNum) {
        throw new Error("Phone number not found");
      }

      await ApiService.sendSMS(
        selectedContact.phoneNumber,
        newMessage.trim(),
        phoneNum.id,
      );

      setNewMessage("");

      // Reload messages and contacts to show the sent message
      await Promise.all([
        loadMessages(selectedContactId),
        loadContactsForPhoneNumber(phoneNum.id),
      ]);

      toast.success("Your message has been sent successfully");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const addContactFromDialog = async (name: string, phoneNumber: string) => {
    // Get the active phone number ID
    let currentActivePhoneId = phoneNumbers.find(
      (p) => p.phoneNumber === activePhoneNumber,
    )?.id;

    // If no active number, try to select the first available one
    if (!currentActivePhoneId && phoneNumbers.length > 0) {
      currentActivePhoneId = phoneNumbers[0].id;
      setActivePhoneNumber(phoneNumbers[0].phoneNumber);
    }

    // If still no phone number available, show helpful error
    if (!currentActivePhoneId) {
      throw new Error(
        "No phone numbers available. Please purchase a phone number first.",
      );
    }

    await ApiService.addContact(name, phoneNumber, currentActivePhoneId);
    await loadContactsForPhoneNumber(currentActivePhoneId);
  };

  const editContact = async () => {
    if (!editingContact || !newContactName.trim()) return;

    const contactName = newContactName.trim();

    try {
      await ApiService.updateContact(editingContact.id, {
        name: contactName,
      } as any);

      setNewContactName("");
      setShowEditContact(false);
      setEditingContact(null);

      const phoneNum = phoneNumbers.find(
        (p) => p.phoneNumber === activePhoneNumber,
      );
      if (phoneNum) {
        await loadContactsForPhoneNumber(phoneNum.id);
      }

      toast.success("Contact has been updated successfully");
    } catch (error: any) {
      console.error("Error editing contact:", error);
      toast.error(
        error.message || "Failed to update contact. Please try again.",
      );
    }
  };

  const deleteContact = async () => {
    if (!deletingContact) return;

    const contactName = deletingContact.name;
    const contactId = deletingContact.id;

    try {
      // Clear UI state immediately
      setShowDeleteContact(false);
      setDeletingContact(null);

      // Clear selection if deleted contact was selected
      if (selectedContactId === contactId) {
        setSelectedContactId(null);
        setMessages([]);
      }

      // Show optimistic success message
      toast.success("Contact and all messages have been deleted");

      // Delete from server
      await ApiService.deleteContact(contactId);

      // Reload contacts to sync with server
      const phoneNum = phoneNumbers.find(
        (p) => p.phoneNumber === activePhoneNumber,
      );
      if (phoneNum) {
        await loadContactsForPhoneNumber(phoneNum.id);
      }

      // Immediately update local contacts list
      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      toast.error(
        error.message || "Failed to delete contact. Please try again.",
      );
    }
  };

  const switchPhoneNumber = async (phoneNumber: string) => {
    try {
      const phoneNumberObj = phoneNumbers.find(
        (p) => p.phoneNumber === phoneNumber,
      );
      if (phoneNumberObj) {
        await ApiService.setActiveNumber(phoneNumberObj.id);

        setActivePhoneNumber(phoneNumber);
        setSelectedContactId(null);
        setMessages([]);

        await loadContactsForPhoneNumber(phoneNumberObj.id);

        toast.success(`Now using ${phoneNumber}`);
      }
    } catch (error: any) {
      console.error("Error switching phone number:", error);
      toast.error(error.message || "Failed to switch phone number");
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
      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "sms-notification",
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    }
  };

  const updatePageTitle = () => {
    const totalUnread = contacts.reduce(
      (sum, contact) => sum + contact.unreadCount,
      0,
    );
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Connectlify - Messages`;
    } else {
      document.title = "Connectlify - Messages";
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  const toggleNotifications = async () => {
    if (!notifications && Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      setNotifications(permission === "granted");
    } else {
      setNotifications(!notifications);
    }
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

  // Filter contacts based on search term
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
            <h3 className="text-lg font-semibold">Loading Connectlify</h3>
            <p className="text-sm text-muted-foreground">
              Setting up your conversations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col relative overflow-hidden ${isDarkMode ? "dark" : ""}`}
    >
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Top Navigation Bar */}
      <ConversationsTopBar
        phoneNumbers={phoneNumbers}
        activePhoneNumber={activePhoneNumber}
        onPhoneNumberSelect={switchPhoneNumber}
        profile={profile}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        notifications={notifications}
        onToggleNotifications={toggleNotifications}
        totalUnreadCount={totalUnreadCount}
      />

      {/* Main Content */}
      <div className="relative z-10 flex w-full flex-1">
        {/* Left Sidebar - Contact List & Controls */}
        <div className="w-80 bg-card/80 backdrop-blur-xl border-r border-border flex flex-col">
          {/* Header Section */}
          <div className="p-4 border-b border-border bg-muted/20">
            {/* Search Contacts */}
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
              disabled={phoneNumbers.length === 0}
              title={
                phoneNumbers.length === 0
                  ? "No phone numbers available. Please purchase a phone number first."
                  : "Add new contact"
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Contact
            </Button>
            {phoneNumbers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                No phone numbers available
              </p>
            )}
          </div>

          {/* Contacts List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No contacts found</p>
                  <p className="text-sm">
                    {searchTerm
                      ? "Try a different search term"
                      : "Add a contact to start messaging"}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    className={`mb-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                      selectedContactId === contact.id
                        ? "bg-primary/10 border-primary shadow-sm"
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
                            <Badge
                              variant="destructive"
                              className="text-xs h-5 min-w-[20px]"
                            >
                              {contact.unreadCount > 99
                                ? "99+"
                                : contact.unreadCount}
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
                                Edit Contact
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingContact(contact);
                                  setShowDeleteContact(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Contact
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

          {/* Ad Banner at Bottom */}
          <div className="p-3 border-t border-border bg-muted/20">
            <div className="text-center mb-2">
              <span className="text-xs text-muted-foreground">
                Advertisement
              </span>
            </div>
            <AdBanner width={300} height={80} />
          </div>
        </div>

        {/* Right Side - Chat Area */}
        <div className="flex-1 flex flex-col bg-background/80 backdrop-blur-xl">
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
                      <h3 className="font-semibold text-lg">
                        {selectedContact.name || selectedContact.phoneNumber}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedContact.phoneNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Via {activePhoneNumber}
                    </Badge>
                    {isConnecting && (
                      <Badge variant="secondary" className="text-xs">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Connecting...
                      </Badge>
                    )}
                  </div>
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
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                                  message.direction === "outbound"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.body}
                                </p>
                                <div className="flex items-center justify-between mt-2 gap-2">
                                  <span className="text-xs opacity-70">
                                    {format(
                                      new Date(message.timestamp),
                                      "HH:mm",
                                    )}
                                  </span>
                                </div>
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
                    className="px-4"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                </div>
              </div>
            </>
          ) : (
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center bg-muted/5">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <MessageSquare className="w-12 h-12 text-primary" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Welcome to Connectlify
                  </h2>
                  <p className="text-muted-foreground">
                    Select a contact from the sidebar to start messaging, or add
                    a new contact to begin your conversation.
                  </p>
                </div>

                <div className="bg-card rounded-lg p-4 space-y-2 border">
                  <h3 className="font-semibold text-sm">Current Status</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Active Number:</span>
                      <span className="font-mono text-primary">
                        {activePhoneNumber || "None"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contacts:</span>
                      <span>{contacts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unread Messages:</span>
                      <span
                        className={
                          totalUnreadCount > 0
                            ? "text-destructive font-semibold"
                            : ""
                        }
                      >
                        {totalUnreadCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Large Ad Banner */}
                <div className="mt-8">
                  <div className="text-center mb-4">
                    <span className="text-xs text-muted-foreground">
                      Advertisement
                    </span>
                  </div>
                  <AdBanner width={728} height={90} />
                </div>
              </div>
            </div>
          )}
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
              <Button
                variant="outline"
                onClick={() => setShowEditContact(false)}
              >
                Cancel
              </Button>
              <Button onClick={editContact} disabled={!newContactName.trim()}>
                Save Changes
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
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <strong>
                  {deletingContact?.name || deletingContact?.phoneNumber}
                </strong>
                ? This will permanently delete the contact and all message
                history.
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ This action cannot be undone
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteContact(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteContact}>
                Delete Contact
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
    </div>
  );
}
