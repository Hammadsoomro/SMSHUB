import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Lock, Loader2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { TwilioCredentialsRequest, TwilioCredentials } from "@shared/api";

interface CredentialsForm {
  accountSid: string;
  authToken: string;
}

export default function Credentials() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [connectedCredentials, setConnectedCredentials] =
    useState<TwilioCredentials | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsForm>();

  // Validate authentication on component mount and fetch credentials
  useEffect(() => {
    const validateAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        // Fetch existing credentials
        const response = await fetch("/api/admin/credentials", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.credentials) {
            setConnectedCredentials(data.credentials);
          }
        }

        setIsAuthLoading(false);
      } catch {
        navigate("/login", { replace: true });
      }
    };

    validateAuth();
  }, [navigate]);

  const onSubmit = async (data: CredentialsForm) => {
    // Client-side validation
    if (!data.accountSid.trim()) {
      setError("Please enter your Account SID");
      return;
    }
    if (!data.authToken.trim()) {
      setError("Please enter your Auth Token");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }

      const payload: TwilioCredentialsRequest = {
        accountSid: data.accountSid.trim(),
        authToken: data.authToken.trim(),
      };

      const response = await fetch("/api/admin/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
      setIsLoading(false);
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

  if (isAuthLoading) {
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
        <h1 className="text-3xl font-bold mb-8">Twilio Credentials</h1>

        {/* Connection Status Card */}
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

        {/* Info Card */}
        <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
          <div className="flex gap-4">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Important Security Notice
              </h3>
              <p className="text-sm text-blue-700">
                Your Twilio credentials are stored securely and encrypted. They
                are only used to connect to Twilio's API on your behalf. Never
                share these credentials with anyone.
              </p>
            </div>
          </div>
        </Card>

        {/* Success Message */}
        {success && (
          <Card className="p-6 bg-green-50 border-green-200 mb-8">
            <div className="flex gap-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Success</h3>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="p-6 bg-red-50 border-2 border-red-300 mb-8 animate-shake">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-2">
                  ❌ Connection Failed
                </h3>
                <p className="text-sm text-red-800 mb-3">{error}</p>
                <details className="text-xs text-red-700 cursor-pointer">
                  <summary className="font-medium hover:text-red-800">
                    What to check?
                  </summary>
                  <ul className="mt-2 ml-2 space-y-1">
                    <li>
                      ✓ Account SID should start with "AC" and be 34 characters
                      long
                    </li>
                    <li>✓ Auth Token should be at least 32 characters</li>
                    <li>
                      ✓ Copy both values from Twilio Console (Account Settings)
                    </li>
                    <li>✓ Make sure there are no extra spaces</li>
                    <li>
                      ✓ If session expired, please login again before retrying
                    </li>
                  </ul>
                </details>
              </div>
            </div>
          </Card>
        )}

        {/* Form Card */}
        <Card className="p-8 border-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                Format: Must start with "AC" and be exactly 34 characters long
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
              disabled={isLoading}
              className="w-full h-10 bg-gradient-to-r from-primary to-secondary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Twilio Account"
              )}
            </Button>
          </form>

          {/* Help Section */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-6">
              How to find your Twilio Credentials
            </h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary flex-shrink-0">1.</span>
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
                <span className="font-bold text-primary flex-shrink-0">2.</span>
                <span>
                  In the left sidebar, click on <strong>Account</strong> &gt;{" "}
                  <strong>API Keys & Tokens</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary flex-shrink-0">3.</span>
                <span>
                  Copy your <strong>Account SID</strong> (starts with "AC")
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary flex-shrink-0">4.</span>
                <span>
                  Copy your <strong>Auth Token</strong> (the long string of
                  characters)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary flex-shrink-0">5.</span>
                <span>Paste both into the form above and click Connect</span>
              </li>
            </ol>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
