import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertCircle,
  Loader2,
  Check,
  Mail,
  User,
  Calendar,
  Shield,
  Lock,
  CheckCircle2,
  Copy,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { User as UserType, TwilioCredentials } from "@shared/api";

interface CredentialsForm {
  accountSid: string;
  authToken: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", email: "" });
  const [connectedCredentials, setConnectedCredentials] =
    useState<TwilioCredentials | null>(null);
  const [isCredentialsLoading, setIsCredentialsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "profile" | "credentials" | "account"
  >("profile");
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsForm>();

  useEffect(() => {
    fetchUserProfile();
    fetchCredentials();
  }, [navigate]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setEditData({ name: userData.name, email: userData.email });
      } else {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch profile");
        const data = await response.json();
        setUser(data.user);
        setEditData({ name: data.user.name, email: data.user.email });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCredentials = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/admin/credentials", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.credentials) {
          setConnectedCredentials(data.credentials);
        }
      }
    } catch (err) {
      console.error("Failed to fetch credentials:", err);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/delete-account", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Failed to delete account: ${error.error || "Unknown error"}`);
        setIsDeleting(false);
        return;
      }

      // Account deleted successfully
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    } catch (error) {
      alert("Error deleting account. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editData.name.trim()) {
      setError("Name is required");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      setIsEditing(false);
      setSuccess("✅ Profile updated successfully!");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsSubmit = async (data: CredentialsForm) => {
    if (!data.accountSid.trim()) {
      setError("Please enter your Account SID");
      return;
    }
    if (!data.authToken.trim()) {
      setError("Please enter your Auth Token");
      return;
    }

    setIsCredentialsLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accountSid: data.accountSid.trim(),
          authToken: data.authToken.trim(),
        }),
      });

      if (response.status === 401) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to connect Twilio credentials",
        );
      }

      const responseData = await response.json();
      setConnectedCredentials(responseData.credentials);
      setSuccess("✅ Twilio credentials connected successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while validating credentials",
      );
    } finally {
      setIsCredentialsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disconnect Twilio credentials? Team members will no longer be able to send SMS.",
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }

      const response = await fetch("/api/admin/credentials", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to disconnect credentials");
      }

      setConnectedCredentials(null);
      setSuccess("✅ Twilio credentials disconnected successfully!");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while disconnecting credentials",
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  if ((isLoading || !user) && activeTab === "profile") {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile, account, and Twilio credentials
          </p>
        </div>

        {error && (
          <Card
            className={`p-6 bg-red-50 border-red-200 mb-8 ${
              error.includes("Failed") ? "animate-shake" : ""
            }`}
          >
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700">{error}</p>
                {error.includes("Failed to connect") && (
                  <details className="text-xs text-red-700 cursor-pointer mt-2">
                    <summary className="font-medium hover:text-red-800">
                      What to check?
                    </summary>
                    <ul className="mt-2 ml-2 space-y-1">
                      <li>
                        ✓ Account SID should start with "AC" and be 34
                        characters long
                      </li>
                      <li>✓ Auth Token should be at least 32 characters</li>
                      <li>
                        ✓ Copy both values from Twilio Console (Account
                        Settings)
                      </li>
                      <li>✓ Make sure there are no extra spaces</li>
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </Card>
        )}

        {success && (
          <Card className="p-6 bg-green-50 border-green-200 mb-8 flex items-center gap-4">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          {[
            { id: "profile", label: "Profile" },
            { id: "credentials", label: "Twilio Credentials" },
            { id: "account", label: "Account Info" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="p-8 border-primary/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-semibold">
                    Personal Information
                  </h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <Input
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                        placeholder="Your name"
                        className="h-10"
                        disabled={isLoading}
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="font-medium">{user.name || "N/A"}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Email Address
                    </label>
                    {isEditing ? (
                      <Input
                        value={editData.email}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                        type="email"
                        placeholder="your@email.com"
                        className="h-10"
                        disabled={isLoading}
                      />
                    ) : (
                      <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{user.email || "N/A"}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={isLoading}
                          className="bg-gradient-to-r from-primary to-secondary"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            if (user) {
                              setEditData({
                                name: user.name,
                                email: user.email,
                              });
                            }
                          }}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6 border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Account Status</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          user.role === "admin"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role === "admin"
                          ? "Administrator"
                          : "Team Member"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Account ID
                    </p>
                    <p className="text-sm font-mono bg-muted p-2 rounded break-all">
                      {user.id || "N/A"}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Account Timeline</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Member Since
                    </p>
                    <p className="text-sm font-medium">
                      {user.createdAt ? formatDate(user.createdAt) : "N/A"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Credentials Tab */}
        {activeTab === "credentials" && (
          <div>
            {connectedCredentials && (
              <Card className="p-6 bg-green-50 border-green-200 mb-8">
                <div className="flex gap-4 justify-between items-start">
                  <div className="flex gap-4 flex-1">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-900 mb-1">
                        Credentials Connected
                      </h3>
                      <p className="text-sm text-green-700 mb-2">
                        Twilio account is connected and active. Team members can
                        send and receive SMS.
                      </p>
                      <p className="text-xs text-green-600">
                        Connected:{" "}
                        {new Date(
                          connectedCredentials.connectedAt,
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="text-destructive border-destructive hover:bg-destructive hover:text-white flex-shrink-0"
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Disconnect
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}

            <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
              <div className="flex gap-4">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Important Security Notice
                  </h3>
                  <p className="text-sm text-blue-700">
                    Your Twilio credentials are stored securely and encrypted.
                    They are only used to connect to Twilio's API on your
                    behalf. Never share these credentials with anyone.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8 border-2">
              <form
                onSubmit={handleSubmit(handleCredentialsSubmit)}
                className="space-y-6"
              >
                <div>
                  <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Account SID
                  </label>
                  <Input
                    {...register("accountSid", {
                      required: "Account SID is required",
                      pattern: {
                        value: /^AC.{32}$/,
                        message: "Invalid Account SID format",
                      },
                    })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="h-10 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: Must start with "AC" and be exactly 34 characters
                    long
                  </p>
                  {errors.accountSid && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.accountSid.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Auth Token
                  </label>
                  <Input
                    {...register("authToken", {
                      required: "Auth Token is required",
                      minLength: {
                        value: 32,
                        message: "Auth Token must be at least 32 characters",
                      },
                    })}
                    type="password"
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 32 characters. Never share this!
                  </p>
                  {errors.authToken && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.authToken.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isCredentialsLoading}
                  className="w-full h-10 bg-gradient-to-r from-primary to-secondary"
                >
                  {isCredentialsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect Twilio Account"
                  )}
                </Button>
              </form>

              <div className="mt-12 pt-8 border-t border-border">
                <h3 className="text-lg font-semibold mb-6">
                  How to find your Twilio Credentials
                </h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary flex-shrink-0">
                      1.
                    </span>
                    <span>
                      Go to{" "}
                      <a
                        href="https://www.twilio.com/console"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-medium hover:underline"
                      >
                        Twilio Console
                      </a>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary flex-shrink-0">
                      2.
                    </span>
                    <span>
                      In the left sidebar, click on <strong>Account</strong>{" "}
                      &gt; <strong>API Keys & Tokens</strong>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary flex-shrink-0">
                      3.
                    </span>
                    <span>
                      Copy your <strong>Account SID</strong> (starts with "AC")
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary flex-shrink-0">
                      4.
                    </span>
                    <span>
                      Copy your <strong>Auth Token</strong> (the long string of
                      characters)
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary flex-shrink-0">
                      5.
                    </span>
                    <span>
                      Paste both into the form above and click Connect
                    </span>
                  </li>
                </ol>
              </div>
            </Card>
          </div>
        )}

        {/* Account Info Tab */}
        {activeTab === "account" && user && (
          <div>
            <Card className="p-8 max-w-2xl mb-8">
              <div className="flex items-start gap-6 mb-8">
                <div className="p-4 bg-gradient-to-br from-primary to-secondary rounded-lg flex-shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{user.name}</h2>
                  <p className="text-muted-foreground mt-1">
                    {user.role === "admin" ? "Admin" : "Team Member"}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                    <code className="flex-1 font-mono text-sm">
                      {user.email}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(user.email)}
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Account ID
                  </label>
                  <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                    <code className="flex-1 font-mono text-sm">{user.id}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(user.id)}
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Account Created
                  </label>
                  <p className="p-4 bg-muted rounded-lg">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Role
                  </label>
                  <p className="p-4 bg-muted rounded-lg">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary text-white">
                      {user.role === "admin" ? "Admin" : "Team Member"}
                    </span>
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card className="p-6 bg-blue-50 border-blue-200">
                <div className="flex gap-4">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Admin Role
                    </h3>
                    <p className="text-sm text-blue-700">
                      As an admin, you have full control over your team, phone
                      numbers, and Twilio credentials.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-purple-50 border-purple-200">
                <div className="flex gap-4">
                  <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-2">
                      Security
                    </h3>
                    <p className="text-sm text-purple-700">
                      Keep your credentials secure and never share your account
                      credentials with others.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <h3 className="font-semibold text-destructive mb-4">
                Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. All your
                data, including phone numbers, messages, and team members will
                be permanently deleted. Please be certain.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and all associated data (phone numbers,
                      messages, team members, and credentials).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="bg-destructive/10 border border-destructive/30 rounded p-3 mb-4">
                    <p className="text-sm font-semibold text-destructive">
                      Are you absolutely sure?
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Account"
                      )}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
