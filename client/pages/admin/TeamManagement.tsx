import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Users,
  Loader2,
  Plus,
  Trash2,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { TeamMember, CreateTeamMemberRequest } from "@shared/api";

interface InviteForm {
  email: string;
  name: string;
  password: string;
}

export default function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>();

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch team members");
      const data = await response.json();
      setTeamMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: InviteForm) => {
    setIsInviting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const payload: CreateTeamMemberRequest = {
        email: data.email,
        name: data.name,
        password: data.password,
      };

      const response = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to invite team member");
      }

      setSuccess("Team member invited successfully!");
      reset();
      setShowInviteForm(false);
      fetchTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) {
      return;
    }

    setIsRemoving(memberId);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/team/${memberId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove team member");
      }

      setSuccess("Team member removed successfully!");
      fetchTeamMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsRemoving(null);
    }
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your team members and their access
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-primary to-secondary"
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        </div>

        {/* Messages */}
        {error && (
          <Card className="p-6 bg-red-50 border-red-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {success && (
          <Card className="p-6 bg-green-50 border-green-200 mb-8">
            <div className="flex gap-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </Card>
        )}

        {/* Invite Form */}
        {showInviteForm && (
          <Card className="p-8 mb-8 border-primary/20">
            <h3 className="text-lg font-semibold mb-6">
              Invite New Team Member
            </h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Full Name
                </label>
                <Input
                  {...register("name", { required: "Name is required" })}
                  placeholder="John Doe"
                  className="h-10"
                />
                {errors.name && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email address",
                    },
                  })}
                  type="email"
                  placeholder="member@example.com"
                  className="h-10"
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Password
                </label>
                <Input
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                  type="password"
                  placeholder="••••••••"
                  className="h-10"
                />
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Inviting...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Team Members List */}
        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading team members...</p>
            </div>
          </Card>
        ) : teamMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <Card
                key={member.id}
                className="p-6 border-primary/20 hover:shadow-lg smooth-transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <Users className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      member.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {member.status === "active" ? "Active" : "Pending"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Joined {new Date(member.createdAt).toLocaleDateString()}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveMember(member.id)}
                  disabled={isRemoving === member.id}
                >
                  {isRemoving === member.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </>
                  )}
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground mb-6">No team members yet</p>
            <Button
              className="bg-gradient-to-r from-primary to-secondary"
              onClick={() => setShowInviteForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite First Member
            </Button>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
