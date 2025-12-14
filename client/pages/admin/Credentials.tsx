import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { TwilioCredentialsRequest } from "@shared/api";

interface CredentialsForm {
  accountSid: string;
  authToken: string;
}

export default function Credentials() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasCredentials, setHasCredentials] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsForm>();

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to connect Twilio credentials",
        );
      }

      setHasCredentials(true);
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

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Twilio Credentials</h1>

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
                    <li>✓ Check your internet connection</li>
                  </ul>
                </details>
              </div>
            </div>
          </Card>
        )}

        {/* Credentials Form */}
        <Card className="p-8 max-w-2xl">
          {hasCredentials && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900">
                  Credentials Connected
                </p>
                <p className="text-sm text-green-700">
                  Your Twilio account is connected and ready to use.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Account SID
              </label>
              <Input
                {...register("accountSid", {
                  required: "Account SID is required",
                  pattern: {
                    value: /^AC[a-f0-9]{32}$/i,
                    message:
                      "Invalid format (must start with AC and be 34 characters)",
                  },
                })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={`h-10 ${errors.accountSid ? "border-red-500 focus:border-red-500" : ""}`}
              />
              {errors.accountSid && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  ⚠️ {errors.accountSid.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Format: Must start with "AC" and be exactly 34 characters long
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
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
                className={`h-10 ${errors.authToken ? "border-red-500 focus:border-red-500" : ""}`}
              />
              {errors.authToken && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  ⚠️ {errors.authToken.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Must be at least 32 characters. Never share this!
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-secondary"
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
        </Card>

        {/* Help Section */}
        <Card className="p-6 mt-8 bg-muted">
          <h3 className="font-semibold mb-4">
            How to find your Twilio Credentials
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="font-semibold text-foreground flex-shrink-0">
                1.
              </span>
              <span>
                Go to{" "}
                <a
                  href="https://console.twilio.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Twilio Console
                </a>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-foreground flex-shrink-0">
                2.
              </span>
              <span>Click on your account name in the top-left corner</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-foreground flex-shrink-0">
                3.
              </span>
              <span>Select "Account Settings"</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-foreground flex-shrink-0">
                4.
              </span>
              <span>Find your Account SID and Auth Token on that page</span>
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-foreground flex-shrink-0">
                5.
              </span>
              <span>
                Copy and paste them here (Auth Token is marked as "AUTH TOKEN")
              </span>
            </li>
          </ol>
        </Card>
      </div>
    </AdminLayout>
  );
}
