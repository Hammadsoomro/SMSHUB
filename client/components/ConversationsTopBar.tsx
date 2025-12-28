import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  Plus,
  Bell,
  User,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import ProfileSettingsDialog from "./ProfileSettingsDialog";
import AdminDashboard from "./AdminDashboard";
import WalletComponent from "./WalletComponent";
import ApiService from "@/services/api";

interface PhoneNumber {
  id: string;
  number: string;
  isActive: boolean;
}

interface Profile {
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface SMSNavbarProps {
  unreadCount: number;
  phoneNumbers: PhoneNumber[];
  activeNumber: string | null;
  profile: Profile;
  onSelectNumber: (numberId: string) => void;
  onBuyNewNumber: () => void;
  onUpdateProfile: (profile: Profile) => void;
  onLogout: () => void;
}

export default function SMSNavbar({
  unreadCount,
  phoneNumbers,
  activeNumber,
  profile,
  onSelectNumber,
  onBuyNewNumber,
  onUpdateProfile,
  onLogout,
}: SMSNavbarProps) {
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isAdmin = profile.role === "admin";
  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-md">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Connectify</h1>
        </div>

        {/* Phone Numbers */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Active Number:
            </span>
          </div>

          <Select value={activeNumber || ""} onValueChange={onSelectNumber}>
            <SelectTrigger className="w-48 h-9 font-mono text-sm">
              <SelectValue placeholder="Select a number..." />
            </SelectTrigger>
            <SelectContent>
              {phoneNumbers.map((phone) => (
                <SelectItem
                  key={phone.id}
                  value={phone.id}
                  className="font-mono"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{phone.number}</span>
                    {phone.isActive && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Button
              onClick={onBuyNewNumber}
              size="sm"
              variant="ghost"
              className="text-primary hover:text-primary/80"
            >
              <Plus className="w-4 h-4 mr-1" />
              Buy New
            </Button>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/*  Balance (User only) */}
          {profile.role === "user" && (
            <WalletComponent
              trigger={
                <Button variant="outline" size="sm">
                  <Wallet className="w-4 h-4 mr-2" />
                  Balance:
                  {"WalletComponent.getFormattedBalance(profile.balance)} "}
                </Button>
              }
            />
          )}

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 rounded-full"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback className="bg-primary/10">
                    {profile.avatar ? (
                      <User className="h-4 w-4" />
                    ) : (
                      getInitials(profile.name)
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{profile.name}</p>
                    {isAdmin && (
                      <Badge variant="default" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileDialogOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile Settings</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuItem
                    onClick={() => setIsAdminDashboardOpen(true)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ProfileSettingsDialog
            open={isProfileDialogOpen}
            onOpenChange={setIsProfileDialogOpen}
            profile={profile}
            onUpdateProfile={onUpdateProfile}
          />

          {isAdmin && (
            <AdminDashboard
              open={isAdminDashboardOpen}
              onOpenChange={setIsAdminDashboardOpen}
            />
          )}
        </div>
      </div>
    </nav>
  );
}