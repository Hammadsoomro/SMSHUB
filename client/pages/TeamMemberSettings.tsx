import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  Copy,
  CheckCircle2,
  Eye,
  EyeOff,
  MessageSquare,
  Send,
  LogOut,
  Sun,
  Moon,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { User as UserType, PhoneNumber } from "@shared/api";

interface TeamMemberProfile extends UserType {
  adminId?: string;
  adminName?: string;
}

interface MessageInsights {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  sentToday: number;
  receivedToday: number;
  responseRate: number;
}

export default function TeamMemberSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<TeamMemberProfile | null>(null);
  const [assignedNumbers, setAssignedNumbers] = useState<PhoneNumber[]>([]);
  const [messageInsights, setMessageInsights] = useState<MessageInsights | null>(
    null,
  );
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark";
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    fetchUserData();
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.role !== "team_member") {
          navigate("/admin");
          return;
        }
        setUser(userData);
        setFormData((prev) => ({
          ...prev,
          name: userData.name,
          email: userData.email,
        }));

        // Fetch admin name if adminId exists
        if (userData.adminId) {
          try {
            const adminResponse = await fetch(
              `/api/admin/user/${userData.adminId}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (adminResponse.ok) {
              const adminData = await adminResponse.json();
              setUser((prev) =>
                prev
                  ? { ...prev, adminName: adminData.name || "Unknown Admin" }
                  : null,
              );
            }
          } catch (err) {
            console.error("Error fetching admin name:", err);
          }
        }
      }

      // Fetch assigned phone numbers
      const numbersResponse = await fetch(
        "/api/messages/assigned-phone-number",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (numbersResponse.ok) {
        const data = await numbersResponse.json();
        setAssignedNumbers(data.phoneNumbers || []);
      }

      // Fetch message insights
      await fetchMessageInsights(token);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load settings";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessageInsights = async (token: string) => {
    try {
      const response = await fetch("/api/messages/insights", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessageInsights(data);
      }
    } catch (err) {
      console.error("Failed to fetch message insights:", err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
    setSuccess("");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Name and email are required");
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const data = await response.json();
      const updatedUser = { ...data.user };
      setUser((prev) =>
        prev ? { ...prev, name: updatedUser.name, email: updatedUser.email } : null,
      );
      // Store in localStorage for persistence across page reloads
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setSuccess("Profile updated successfully");
      toast.success("Profile updated successfully");
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setError("All password fields are required");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to change password");
      }

      setSuccess("Password changed successfully");
      toast.success("Password changed successfully");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to change password";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Loading Settings</h3>
            <p className="text-sm text-muted-foreground">
              Please wait while we load your account settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-background flex flex-col ${isDarkMode ? "dark" : ""}`}
    >
      {/* Header/Navbar */}
      <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Left side - Logo and title */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/messages")}
              className="mr-2"
              title="Back to messages"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Account Settings</h1>
              <p className="text-xs text-muted-foreground">Manage your profile</p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="p-2"
              title="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Logout Confirmation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to logout? You'll need to login again
                    to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    Logout
                  </AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 dark:bg-green-950/30 dark:border-green-900">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700 dark:text-green-400">
                {success}
              </p>
            </div>
          )}

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="account">Account Info</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your name and email address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        disabled={isSaving}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@example.com"
                        disabled={isSaving}
                        className="h-10"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-10"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="currentPassword"
                        className="flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Current Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type={showPassword ? "text" : "password"}
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          placeholder="Enter your current password"
                          disabled={isSaving}
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="newPassword"
                        className="flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          placeholder="Enter your new password"
                          disabled={isSaving}
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmPassword"
                        className="flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your new password"
                        disabled={isSaving}
                        className="h-10"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-10"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Info Tab */}
            <TabsContent value="account" className="space-y-6">
              {/* Your Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Your Information
                  </CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Name</span>
                    </div>
                    <span className="font-medium">{user?.name || "N/A"}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email</span>
                    </div>
                    <span className="font-medium text-right break-all">
                      {user?.email || "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Administrator Information */}
              {user?.adminName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Administrator
                    </CardTitle>
                    <CardDescription>Your account administrator</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Admin Name</span>
                      </div>
                      <span className="font-medium">{user.adminName}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Assigned Phone Numbers */}
              {assignedNumbers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Assigned Phone Numbers
                    </CardTitle>
                    <CardDescription>
                      Phone numbers assigned to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {assignedNumbers.map((number) => (
                      <div
                        key={number.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="font-mono font-medium text-sm truncate">
                              {number.phoneNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {number.active ? (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  Inactive
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(number.phoneNumber)}
                          className="p-2 hover:bg-background rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          title="Copy phone number"
                        >
                          {copied ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Message Insights */}
              {messageInsights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Message Insights
                    </CardTitle>
                    <CardDescription>
                      Your messaging statistics and analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-900">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
                            Total Messages
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {messageInsights.totalMessages}
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-2 mb-2">
                          <Send className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">
                            Sent Today
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {messageInsights.sentToday}
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-900">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">
                            Received Today
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {messageInsights.receivedToday}
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-900">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase">
                            Response Rate
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                          {messageInsights.responseRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Total Sent
                          </p>
                          <p className="text-lg font-semibold">
                            {messageInsights.sentMessages}
                          </p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">
                            Total Received
                          </p>
                          <p className="text-lg font-semibold">
                            {messageInsights.receivedMessages}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
