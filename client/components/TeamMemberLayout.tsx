import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, LogOut, Sun, Moon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ablyService from "@/services/ablyService";

interface TeamMemberLayoutProps {
  children: ReactNode;
}

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  assignedTo?: string;
  active: boolean;
}

export default function TeamMemberLayout({ children }: TeamMemberLayoutProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark";
  });
  const [assignedNumbers, setAssignedNumbers] = useState<PhoneNumber[]>([]);
  const [isLoadingNumbers, setIsLoadingNumbers] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    fetchAssignedNumbers();
  }, []);

  useEffect(() => {
    // Connect to Ably and listen for phone number assignment updates
    const initializeAbly = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      const userProfile = storedUser ? JSON.parse(storedUser) : null;
      const userId = userProfile?.id;

      if (!token || !userId) {
        console.error("No token or user ID found for Ably connection");
        return;
      }

      try {
        // Connect to Ably
        const connected = await ablyService.connect(token);
        if (!connected) {
          console.warn("Ably connection failed for phone number assignments");
          return;
        }

        // Subscribe to phone number assignments
        const unsubscribe = ablyService.subscribeToPhoneNumberAssignments(
          userId,
          (data: any) => {
            console.log("📞 Phone number assignment updated:", data);
            if (data.action === "assigned") {
              toast.success(
                `📞 Phone number ${data.phoneNumber} assigned to you`,
              );
            } else {
              toast.info(
                `📞 Phone number ${data.phoneNumber} unassigned from you`,
              );
            }
            // Refresh assigned numbers
            fetchAssignedNumbers();
          },
        );

        return unsubscribe;
      } catch (error) {
        console.error("Error initializing Ably for team member:", error);
      }
    };

    let unsubscribe: (() => void) | undefined;
    initializeAbly().then((fn) => {
      unsubscribe = fn;
    });

    return () => {
      unsubscribe?.();
      ablyService.disconnect();
    };
  }, []);

  const fetchAssignedNumbers = async () => {
    try {
      setIsLoadingNumbers(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/messages/assigned-phone-number", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignedNumbers(data.phoneNumbers || []);
      }
    } catch (err) {
      console.error("Failed to fetch assigned numbers:", err);
    } finally {
      setIsLoadingNumbers(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  return (
    <div className={`flex h-screen bg-background ${isDarkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 border-r border-sidebar-border/50 overflow-hidden flex flex-col">
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-sidebar-border/30">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
            Connectlify
          </span>
        </div>

        {/* Assigned Numbers Section */}
        <div className="px-4 py-6 border-b border-sidebar-border/30">
          <h3 className="text-xs font-semibold uppercase text-sidebar-foreground/60 mb-3">
            Assigned Numbers
          </h3>
          {isLoadingNumbers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-sidebar-foreground/40" />
            </div>
          ) : assignedNumbers.length > 0 ? (
            <div className="space-y-2">
              {assignedNumbers.map((number) => (
                <Link
                  key={number.id}
                  to="/messages"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/30 hover:bg-sidebar-accent/50 transition-colors group"
                >
                  <Phone className="w-4 h-4 text-sidebar-foreground/70 group-hover:text-sidebar-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-sidebar-foreground truncate">
                      {number.phoneNumber}
                    </p>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded mt-1 ${
                        number.active
                          ? "bg-green-100/30 text-green-700"
                          : "bg-gray-100/30 text-gray-700"
                      }`}
                    >
                      {number.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sidebar-foreground/60">
              No assigned numbers yet
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          <Link
            to="/messages"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/40 transition-all duration-200 group"
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0 text-sidebar-foreground/70 group-hover:text-sidebar-foreground" />
            <span className="font-medium text-sm">Messages</span>
          </Link>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border/30 p-3 space-y-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/40"
            title="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span className="ml-2">{isDarkMode ? "Light" : "Dark"} Mode</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/40 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b border-border/50 bg-background/95 backdrop-blur-sm h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                Team Member Dashboard
              </p>
              <p className="text-xs text-muted-foreground">
                Manage your messages and conversations
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
