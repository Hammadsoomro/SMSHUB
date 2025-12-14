import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Calendar, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { User as UserType } from "@shared/api";

export default function AccountInfo() {
  const [user, setUser] = useState<UserType | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Account Information</h1>

        {/* Profile Card */}
        <Card className="p-8 max-w-2xl">
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
            {/* Email */}
            <div>
              <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <code className="flex-1 font-mono text-sm">{user.email}</code>
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

            {/* Account ID */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Account ID</label>
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

            {/* Created Date */}
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

            {/* Role */}
            <div>
              <label className="text-sm font-semibold mb-2 block">Role</label>
              <p className="p-4 bg-muted rounded-lg">
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary text-white">
                  {user.role === "admin" ? "Admin" : "Team Member"}
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Admin Role</h3>
                <p className="text-sm text-blue-700">
                  As an admin, you have full control over your team, phone numbers, and Twilio credentials.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-purple-50 border-purple-200">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">Security</h3>
                <p className="text-sm text-purple-700">
                  Keep your credentials secure and never share your account credentials with others.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Danger Zone */}
        <Card className="p-6 mt-8 border-destructive/30 bg-destructive/5">
          <h3 className="font-semibold text-destructive mb-4">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10">
            Delete Account
          </Button>
        </Card>
      </div>
    </AdminLayout>
  );
}
