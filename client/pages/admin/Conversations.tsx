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
  AlertCircle,
  Pin,
  PinOff,
  ArrowRight,
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
  const [activeTab, setActiveTab] = useState<"general" | "sales">("general");

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
  const [loadError, setLoadError] = useState<string | null>(null);

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
  const [showMoveContact, setShowMoveContact] = useState(false);
  const [editingContact, setEditingContact] =
    useState<ConversationContact | null>(null);
  const [deletingContact, setDeletingContact] =
    useState<ConversationContact | null>(null);
  const [movingContact, setMovingContact] =
    useState<ConversationContact | null>(null);
  const [newContactName, setNewContactName] = useState("");
  const [moveToCategory, setMoveToCategory] = useState<"general" | "sales">(
    "sales",
  );

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
    console.log("[Conversations] Initializing component...");
    loadInitialData();
    requestNotificationPermission();

    // Set theme on document root
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    console.log(
      `[Conversations] Theme initialized: ${isDarkMode ? "dark" : "light"}`,
    );

    return () => {
      try {
        ablyService.disconnect();
      } catch (error) {
        console.error("Error during Conversations cleanup:", error);
      }
    };
  }, []);

  // Update document theme when isDarkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Initialize Ably separately with better lifecycle management
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await initializeAbly();
      } catch (error) {
        console.error("Ably initialization error:", error);
        if (isMounted) {
          // Don't block UI if Ably fails - real-time updates are nice-to-have
          toast.warning(
            "Real-time updates not available, but app will work normally",
          );
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Re-subscribe to messages when selected contact changes
  useEffect(() => {
    if (selectedContactId && ablyService.connected) {
      const storedUser = localStorage.getItem("user");
      const userProfile = storedUser ? JSON.parse(storedUser) : null;
      const userId = userProfile?.id;

      if (userId) {
        console.log(
          `[Conversations] Subscribing to messages for contact: ${selectedContactId}`,
        );
        const unsubscribe = ablyService.subscribeToConversation(
          selectedContactId,
          userId,
          (message: any) => {
            console.log("📱 Real-time message received:", message);

            // Update messages immediately
            if (message.contactId === selectedContactId) {
              loadMessages(selectedContactId);
            }

            // Reload contacts to update UI
            const currentActivePhone = activePhoneNumberRef.current;
            if (currentActivePhone) {
              const phoneNum = phoneNumbersRef.current.find(
                (p) => p.phoneNumber === currentActivePhone,
              );
              if (phoneNum) {
                loadContactsForPhoneNumber(phoneNum.id);
              }
            }

            // Show notification
            const currentNotifications = notificationsRef.current;
            if (currentNotifications && message.direction === "inbound") {
              showNotification(
                "New Message",
                `${message.from}: ${message.message.substring(0, 50)}`,
              );
            }

            updatePageTitle();
          },
        );

        return unsubscribe;
      }
    }
  }, [selectedContactId]);

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
      setLoadError(null);

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
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load initial data. Please refresh the page.";
      console.error("Error loading initial data:", error);
      setLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeAbly = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No auth token found for Ably connection");
        return;
      }

      setIsConnecting(true);
      console.log("🔌 Initializing Ably for real-time messaging...");

      // Connect to Ably service with timeout
      const connectionPromise = ablyService.connect(token);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.warn("Ably connection timeout");
          resolve(false);
        }, 15000); // 15 second timeout
      });

      const connected = await Promise.race([connectionPromise, timeoutPromise]);

      setIsConnecting(false);

      if (!connected) {
        console.warn("Ably connection failed or timed out");
        // Don't show error toast - just silently continue
        // Real-time updates are optional
        return;
      }

      console.log("✅ Ably connected successfully");

      // Subscribe to contact updates once connected
      try {
        setupAblyListeners();
      } catch (listenerError) {
        console.error("Error setting up Ably listeners:", listenerError);
        // Continue anyway - core functionality doesn't require listeners
      }
    } catch (error) {
      console.error("Error initializing Ably:", error);
      setIsConnecting(false);
      // Don't show error - real-time updates are optional
    }
  };

  const setupAblyListeners = () => {
    try {
      const storedUser = localStorage.getItem("user");
      const userProfile = storedUser ? JSON.parse(storedUser) : null;
      const userId = userProfile?.id;

      if (!userId) {
        console.error("No user ID found for Ably subscriptions");
        return () => {};
      }

      // Subscribe to contact updates for the current user
      // This will be called whenever a new message arrives to update the contact list
      const unsubscribeContacts = ablyService.subscribeToContactUpdates(
        userId,
        (data: any) => {
          console.log("👥 Contact list updated via Ably:", data);
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

      // Cleanup function - unsubscribe from contacts
      return () => {
        unsubscribeContacts?.();
      };
    } catch (error) {
      console.error("Error initializing Ably listeners:", error);
      toast.error("Failed to initialize real-time listeners");
      return () => {};
    }
  };

  const loadContactsForPhoneNumber = async (phoneNumberId: string) => {
    try {
      const contactsData = await ApiService.getContacts(phoneNumberId);
      setContacts((prevContacts) => {
        // Merge with existing data to preserve only optimistic read state
        const updatedContacts = (contactsData || []).map((freshContact) => {
          const existingContact = prevContacts.find(
            (c) => c.id === freshContact.id,
          );
          // Only preserve unreadCount if we marked as read optimistically
          // Use fresh data from server for all other fields (category, isPinned, name)
          if (existingContact) {
            // Keep unreadCount from local state if it's lower (we marked as read)
            const unreadCount =
              freshContact.unreadCount > existingContact.unreadCount
                ? existingContact.unreadCount
                : freshContact.unreadCount;

            // Use fresh data from server, only override unreadCount if we marked as read
            return {
              ...freshContact,
              unreadCount,
            };
          }
          return freshContact;
        });
        return updatedContacts;
      });
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
      // Don't show error toast to avoid blocking UI
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (contactId: string) => {
    try {
      console.log(`[markMessagesAsRead] Marking contact ${contactId} as read`);

      // Update UI immediately (optimistic update)
      setContacts((prev) => {
        const updated = prev.map((contact) =>
          contact.id === contactId ? { ...contact, unreadCount: 0 } : contact,
        );
        console.log(
          `[markMessagesAsRead] UI updated, new state:`,
          updated.find((c) => c.id === contactId),
        );
        return updated;
      });

      // Then call server
      await ApiService.markAsRead(contactId);
      console.log(
        `[markMessagesAsRead] Server confirmed contact ${contactId} as read`,
      );

      updatePageTitle();
    } catch (error) {
      console.error("Error marking messages as read:", error);
      // Show error toast but don't update UI (keep optimistic update)
      toast.error("Failed to update read status, but continuing...");
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

    const messageToSend = newMessage.trim();
    const selectedContact = contacts.find((c) => c.id === selectedContactId);

    if (!selectedContact) {
      toast.error("Selected contact not found");
      return;
    }

    const phoneNum = phoneNumbers.find(
      (p) => p.phoneNumber === activePhoneNumber,
    );
    if (!phoneNum) {
      toast.error("Phone number not found");
      return;
    }

    // Optimistic update - add message to UI immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      phoneNumberId: phoneNum.id,
      from: activePhoneNumber,
      to: selectedContact.phoneNumber,
      body: messageToSend,
      direction: "outbound",
      timestamp: new Date().toISOString(),
      sid: "",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setIsSending(true);

    try {
      await ApiService.sendSMS(
        selectedContact.phoneNumber,
        messageToSend,
        phoneNum.id,
      );

      // Reload messages and contacts in background
      await Promise.all([
        loadMessages(selectedContactId),
        loadContactsForPhoneNumber(phoneNum.id),
      ]);

      toast.success("Your message has been sent successfully");
    } catch (error: any) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      // Restore message text on error
      setNewMessage(messageToSend);
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

    try {
      const newContact = await ApiService.addContact(
        name,
        phoneNumber,
        currentActivePhoneId,
      );
      await loadContactsForPhoneNumber(currentActivePhoneId);

      // Auto-select the newly added contact
      if (newContact?.id) {
        setSelectedContactId(newContact.id);
        console.log(
          `[addContactFromDialog] Auto-opening chat for new contact: ${newContact.id}`,
        );
        toast.success(`Contact "${name}" added and chat opened!`);
      }
    } catch (error: any) {
      console.error("Error adding contact:", error);
      throw error;
    }
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

  const togglePinContact = async (contactId: string) => {
    try {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;

      // Optimistic update
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, isPinned: !c.isPinned } : c,
        ),
      );

      // Update on server
      await ApiService.updateContact(contactId, {
        isPinned: !contact.isPinned,
      } as any);

      const pinStatus = !contact.isPinned;
      toast.success(
        pinStatus
          ? `${contact.name || contact.phoneNumber} pinned`
          : "Unpinned",
      );

      // Reload fresh data from server to ensure consistency
      const phoneNum = phoneNumbers.find(
        (p) => p.phoneNumber === activePhoneNumber,
      );
      if (phoneNum) {
        await loadContactsForPhoneNumber(phoneNum.id);
      }
    } catch (error: any) {
      console.error("Error toggling pin:", error);
      toast.error(error.message || "Failed to toggle pin");
      // Revert optimistic update on error
      const phoneNum = phoneNumbers.find(
        (p) => p.phoneNumber === activePhoneNumber,
      );
      if (phoneNum) {
        await loadContactsForPhoneNumber(phoneNum.id);
      }
    }
  };

  const moveContact = async () => {
    if (!movingContact) return;

    try {
      setShowMoveContact(false);

      // Optimistic update
      setContacts((prev) =>
        prev.map((c) =>
          c.id === movingContact.id ? { ...c, category: moveToCategory } : c,
        ),
      );

      // Update on server
      await ApiService.updateContact(movingContact.id, {
        category: moveToCategory,
      } as any);

      toast.success(
        `Contact moved to ${moveToCategory === "sales" ? "Sales" : "General"}`,
      );
      setMovingContact(null);
      setMoveToCategory("sales");
    } catch (error: any) {
      console.error("Error moving contact:", error);
      toast.error(error.message || "Failed to move contact");
      // Revert optimistic update
      const phoneNum = phoneNumbers.find(
        (p) => p.phoneNumber === activePhoneNumber,
      );
      if (phoneNum) {
        await loadContactsForPhoneNumber(phoneNum.id);
      }
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
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMM d, yyyy");
    }
  };

  const formatMessageTimeFull = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  // Filter contacts based on search term and active tab
  const filteredContacts = contacts
    .filter((contact) => {
      // Filter by category
      const contactCategory = contact.category || "general";
      if (contactCategory !== activeTab) return false;

      // Filter by search term
      return (
        (contact.name &&
          contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        contact.phoneNumber.includes(searchTerm)
      );
    })
    .sort((a, b) => {
      // Sort pinned contacts to the top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const totalUnreadCount = contacts.reduce(
    (sum, contact) => sum + contact.unreadCount,
    0,
  );

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Failed to Load Connectlify
            </h3>
            <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          </div>
          <div className="space-y-2">
            <Button
              onClick={() => {
                setLoadError(null);
                setIsLoading(true);
                loadInitialData();
              }}
              className="w-full"
            >
              Retry
            </Button>
            <Button
              onClick={() => navigate("/login")}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
      className={`h-screen flex flex-col relative overflow-hidden ${isDarkMode ? "dark" : ""}`}
    >
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Top Navigation Bar - STICKY */}
      <div className="sticky top-0 z-20">
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
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex w-full flex-1 overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
        {/* Left Sidebar - Contact List & Controls */}
        <div className="w-80 bg-card/60 backdrop-blur-2xl border-r border-border/60 flex flex-col overflow-hidden shadow-xl">
          {/* Header Section */}
          <div className="p-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-secondary/5 backdrop-blur-sm">
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

          {/* Category Tabs */}
          <div className="px-2 pt-3 border-b border-border/40">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  setActiveTab("general");
                  setSearchTerm("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "general"
                    ? "bg-primary text-white"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                General
              </button>
              <button
                onClick={() => {
                  setActiveTab("sales");
                  setSearchTerm("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "sales"
                    ? "bg-primary text-white"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                Sales
              </button>
            </div>
          </div>

          {/* Add Contact Button */}
          <div className="p-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-secondary/5">
            <Button
              className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
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
                    className={`mb-2 cursor-pointer transition-all duration-300 border-0 ${
                      selectedContactId === contact.id
                        ? "bg-gradient-to-r from-primary/20 to-secondary/20 shadow-md ring-2 ring-primary/40"
                        : "bg-muted/30 hover:bg-muted/60 hover:shadow-md"
                    }`}
                    onClick={() => setSelectedContactId(contact.id)}
                  >
                    <CardContent className="p-3 relative">
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(contact.name || contact.phoneNumber)
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Name, Time, Pin */}
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate text-sm flex-1">
                              {contact.name || contact.phoneNumber}
                            </h4>
                            {contact.isPinned && (
                              <Pin className="w-3 h-3 text-primary flex-shrink-0" />
                            )}
                            {contact.lastMessageTime && (
                              <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                {formatMessageTime(contact.lastMessageTime)}
                              </span>
                            )}
                          </div>

                          {/* Phone number */}
                          <p className="text-xs text-muted-foreground font-mono truncate mb-1">
                            {contact.phoneNumber}
                          </p>

                          {/* Last message - allow wrapping instead of truncate */}
                          {contact.lastMessage && (
                            <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                              {contact.lastMessage}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {contact.unreadCount > 0 &&
                            selectedContactId !== contact.id && (
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
                                Edit Name
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinContact(contact.id);
                                }}
                              >
                                {contact.isPinned ? (
                                  <>
                                    <PinOff className="w-4 h-4 mr-2" />
                                    Unpin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="w-4 h-4 mr-2" />
                                    Pin to Top
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMovingContact(contact);
                                  const currentCategory =
                                    contact.category || "general";
                                  setMoveToCategory(
                                    currentCategory === "general"
                                      ? "sales"
                                      : "general",
                                  );
                                  setShowMoveContact(true);
                                }}
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Move to{" "}
                                {(contact.category || "general") === "general"
                                  ? "Sales"
                                  : "General"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

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
              {/* Chat Header - STICKY */}
              <div className="sticky top-0 z-10 p-4 border-b border-border/40 bg-gradient-to-r from-card via-card to-card/80 backdrop-blur-xl shadow-sm">
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

              {/* Messages Area - SCROLLABLE */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center mb-4">
                    <Badge variant="secondary" className="text-xs">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Loading messages...
                    </Badge>
                  </div>
                )}
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
                              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 ${
                                message.direction === "outbound"
                                  ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md"
                                  : "bg-muted/70 backdrop-blur-sm border border-border/40"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {message.body}
                              </p>
                              <div className="flex items-center justify-between mt-2 gap-2">
                                <span
                                  className={`text-xs ${message.direction === "outbound" ? "opacity-75" : "opacity-70"}`}
                                >
                                  {format(
                                    new Date(message.timestamp),
                                    "h:mm a",
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
              </ScrollArea>

              {/* Message Input - STICKY */}
              <div className="sticky bottom-0 z-10 p-4 border-t border-border/40 bg-gradient-to-t from-card via-card to-card/80 backdrop-blur-xl shadow-2xl">
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
                    className="flex-1 bg-muted/50 border-border/40 focus:border-primary/60 focus:ring-primary/20 rounded-lg"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    size="sm"
                    className="px-6 bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all duration-300"
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

        {/* Move Contact Dialog */}
        <Dialog open={showMoveContact} onOpenChange={setShowMoveContact}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Move{" "}
                <strong>
                  {movingContact?.name || movingContact?.phoneNumber}
                </strong>{" "}
                to which category?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMoveToCategory("general")}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    moveToCategory === "general"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  <p className="font-semibold text-sm">General</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Regular contacts
                  </p>
                </button>
                <button
                  onClick={() => setMoveToCategory("sales")}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    moveToCategory === "sales"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:bg-muted/60"
                  }`}
                >
                  <p className="font-semibold text-sm">Sales</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sales contacts
                  </p>
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowMoveContact(false)}
              >
                Cancel
              </Button>
              <Button onClick={moveContact}>Move Contact</Button>
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
