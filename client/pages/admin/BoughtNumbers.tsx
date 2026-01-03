import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Phone, Loader2, Search, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneNumber, TeamMember } from "@shared/api";

export default function BoughtNumbers() {
  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchNumbers();
    fetchTeamMembers();
  }, []);

  const fetchNumbers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/numbers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch numbers");
      const data = await response.json();
      setNumbers(data.numbers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
      }
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    }
  };

  const handleAssignClick = (phoneNumberId: string) => {
    setSelectedNumberId(phoneNumberId);
    const number = numbers.find((n) => n.id === phoneNumberId);
    if (number?.assignedTo) {
      setSelectedMemberId(number.assignedTo);
    } else {
      setSelectedMemberId("");
    }
    setShowAssignModal(true);
  };

  const handleAssignNumber = async () => {
    if (!selectedNumberId) return;

    setIsAssigning(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/assign-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumberId: selectedNumberId,
          teamMemberId: selectedMemberId || undefined,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to assign number";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setNumbers(
        numbers.map((n) => (n.id === selectedNumberId ? data.phoneNumber : n)),
      );

      setShowAssignModal(false);
      setSelectedNumberId(null);
      setSelectedMemberId("");

      const actionText =
        selectedMemberId === "" ? "unassigned from" : "assigned to";
      setSuccess(
        `✅ Number ${data.phoneNumber.phoneNumber} ${actionText} team member!`,
      );

      setTimeout(() => {
        fetchNumbers();
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredNumbers = numbers.filter((num) =>
    num.phoneNumber.includes(searchTerm),
  );

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bought Numbers</h1>
            <p className="text-muted-foreground">
              Manage your phone numbers and assign them to team members
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/buy-numbers")}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            Buy New Number
          </Button>
        </div>

        {/* Assign Number Modal */}
        {showAssignModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowAssignModal(false)}
            />
            <Card
              className="p-6 border-primary/30 fixed inset-0 m-auto w-96 h-fit z-50 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Assign Phone Number</h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedNumberId(null);
                    setSelectedMemberId("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Select Team Member
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
                    disabled={isAssigning}
                  >
                    <option value="">-- Unassign Number --</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                  {teamMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No team members yet. Create one in Team Management.
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleAssignNumber}
                    disabled={isAssigning}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Confirm
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedNumberId(null);
                      setSelectedMemberId("");
                    }}
                    disabled={isAssigning}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Info Card */}
        {numbers.length === 0 && (
          <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  No Numbers Yet
                </h3>
                <p className="text-sm text-blue-700">
                  You haven't bought any phone numbers yet. Click "Buy New
                  Number" to get started, or connect your Twilio credentials in
                  Settings.
                </p>
              </div>
            </div>
          </Card>
        )}

        {error && !showAssignModal && (
          <Card className="p-6 bg-red-50 border-red-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {success && !showAssignModal && (
          <Card className="p-6 bg-green-50 border-green-200 mb-8 flex items-center gap-4">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </Card>
        )}

        {/* Search */}
        {numbers.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search phone numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>
        )}

        {/* Numbers List */}
        {isLoading ? (
          <Card className="p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading numbers...</p>
            </div>
          </Card>
        ) : filteredNumbers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNumbers.map((num, index) => (
              <Card
                key={num.id || `phone-${index}`}
                className="p-6 border-primary/20 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-lg">
                      {num.phoneNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Purchased {new Date(num.purchasedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg mb-4 border">
                  {num.assignedTo ? (
                    <>
                      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                        Assigned To
                      </p>
                      <p className="text-sm font-semibold text-green-700">
                        {teamMembers.find((m) => m.id === num.assignedTo)
                          ?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {teamMembers.find((m) => m.id === num.assignedTo)
                          ?.email || ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-amber-700">
                      Not yet assigned to any team member
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => handleAssignClick(num.id)}
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                >
                  {num.assignedTo ? "Change Assignment" : "Assign Number"}
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Phone className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No numbers found</p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
