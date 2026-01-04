import { PhoneNumber, User } from "@shared/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  ChevronDown,
  Settings,
  Bell,
  BellOff,
  Sun,
  Moon,
  User as UserIcon,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface ConversationsTopBarProps {
  phoneNumbers: PhoneNumber[];
  activePhoneNumber: string | null;
  onPhoneNumberSelect: (phoneNumber: string) => void;
  profile: User;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  notifications: boolean;
  onToggleNotifications: () => void;
  totalUnreadCount: number;
}

export default function ConversationsTopBar({
  phoneNumbers,
  activePhoneNumber,
  onPhoneNumberSelect,
  profile,
  isDarkMode,
  onToggleTheme,
  notifications,
  onToggleNotifications,
  totalUnreadCount,
}: ConversationsTopBarProps) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const activePhone = phoneNumbers.find(
    (p) => p.phoneNumber === activePhoneNumber,
  );

  return (
    <div className="bg-card border-b border-border relative z-20">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left side: Navigation and Phone Selector */}
        <div className="flex items-center gap-4">
          {/* Navigation Buttons - Admin Only */}
          {profile.role === "admin" && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Go to dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">
                  Back
                </span>
              </Button>
            </div>
          )}

          {/* Phone Number Selector Dropdown */}
          <div className="flex items-center gap-2">
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 min-w-[180px] justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="font-mono text-xs">
                      {activePhone?.phoneNumber || "Select number"}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                {phoneNumbers.length === 0 ? (
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-muted-foreground">
                      No phone numbers available
                    </p>
                  </div>
                ) : (
                  <>
                    {profile.role === "admin" && (
                      <>
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium text-muted-foreground">
                            Your Numbers
                          </p>
                        </div>
                        {phoneNumbers.map((phone) => (
                          <DropdownMenuItem
                            key={phone.id}
                            onClick={() => {
                              onPhoneNumberSelect(phone.phoneNumber);
                              setIsMenuOpen(false);
                            }}
                            className="font-mono text-xs cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{phone.phoneNumber}</span>
                              {phone.phoneNumber === activePhoneNumber && (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}

                    {profile.role === "team_member" && (
                      <>
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium text-muted-foreground">
                            Assigned Number
                          </p>
                        </div>
                        {phoneNumbers.map((phone) => (
                          <DropdownMenuItem
                            key={phone.id}
                            onClick={() => {
                              onPhoneNumberSelect(phone.phoneNumber);
                              setIsMenuOpen(false);
                            }}
                            className="font-mono text-xs cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{phone.phoneNumber}</span>
                              {phone.phoneNumber === activePhoneNumber && (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {totalUnreadCount > 0 && (
              <Badge variant="destructive" className="text-xs h-5 min-w-[20px]">
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleNotifications}
            className="p-2 cursor-pointer"
            title={
              notifications ? "Disable notifications" : "Enable notifications"
            }
          >
            {notifications ? (
              <Bell className="w-4 h-4 text-green-600" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            className="p-2 cursor-pointer"
            title="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2 cursor-pointer">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => navigate("/admin/settings")}
                className="cursor-pointer"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              {profile.role === "admin" && (
                <>
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/buy-numbers")}
                    className="cursor-pointer"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Buy Phone Numbers
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => window.location.reload()}
                className="cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
