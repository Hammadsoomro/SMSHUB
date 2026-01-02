import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Phone,
  Loader2,
  Plus,
  Check,
  X,
  Users,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneNumber, TeamMember } from "@shared/api";
import socketService from "@/services/socketService";

interface TeamMemberWithNumbers extends TeamMember {
  assignedNumbers: PhoneNumber[];
}

export default function NumbersAssigned() {
  const [allPhoneNumbers, setAllPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithNumbers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      // Fetch numbers
      const numbersRes = await fetch("/api/admin/numbers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!numbersRes.ok) throw new Error("Failed to fetch numbers");
      const numbersData = await numbersRes.json();
      setAllPhoneNumbers(numbersData.numbers || []);

      // Fetch team members
      const teamRes = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!teamRes.ok) throw new Error("Failed to fetch team members");
      const teamData = await teamRes.json();
      
      // Organize numbers by team member
      const membersWithNumbers: TeamMemberWithNumbers[] = (teamData.members || []).map((member: TeamMember) => ({
        ...member,
        assignedNumbers: (numbersData.numbers || []).filter((num: PhoneNumber) => num.assignedTo === member.id),
      }));

      setTeamMembers(membersWithNumbers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberAssignmentUpdate = (data: any) => {
    const { phoneNumberId, teamMemberId } = data;
    
    // Update the phone numbers list
    setAllPhoneNumbers(prev => 
      prev.map(num => 
        num.id === phoneNumberId ? { ...num, assignedTo: teamMemberId } : num
      )
    );

    // Update team members with numbers
    setTeamMembers(prev =>
      prev.map(member => ({
        ...member,
        assignedNumbers: member.id === teamMemberId
          ? [...member.assignedNumbers, allPhoneNumbers.find(n => n.id === phoneNumberId)!]
          : member.assignedNumbers.filter(n => n.id !== phoneNumberId),
      }))
    );
  };

  const handleNumberUnassignmentUpdate = (data: any) => {
    const { phoneNumberId, previousMemberId } = data;
    
    // Update the phone numbers list
    setAllPhoneNumbers(prev =>
      prev.map(num =>
        num.id === phoneNumberId ? { ...num, assignedTo: undefined } : num
      )
    );

    // Update team members with numbers
    setTeamMembers(prev =>
      prev.map(member =>
        member.id === previousMemberId
          ? { ...member, assignedNumbers: member.assignedNumbers.filter(n => n.id !== phoneNumberId) }
          : member
      )
    );
  };

  const handleAssignClick = (phoneNumberId: string) => {
    setSelectedNumberId(phoneNumberId);
    setSelectedMemberId("");
    setShowAssignModal(true);
  };

  const handleAssignNumber = async () => {
    if (!selectedNumberId || !selectedMemberId) {
      setError("Please select a team member");
      return;
    }

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
          teamMemberId: selectedMemberId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign number");
      }

      const data = await response.json();
      
      // Update local state
      setAllPhoneNumbers(prev =>
        prev.map(n => n.id === selectedNumberId ? data.phoneNumber : n)
      );

      // Emit Socket.io event for real-time update
      socketService.emit("number_assigned", {
        phoneNumberId: selectedNumberId,
        teamMemberId: selectedMemberId,
        phoneNumber: data.phoneNumber.phoneNumber,
      });

      setShowAssignModal(false);
      setSelectedNumberId(null);
      setSelectedMemberId("");

      const memberName = teamMembers.find(m => m.id === selectedMemberId)?.name || "Team member";
      setSuccess(`✅ Number assigned to ${memberName}!`);

      setTimeout(() => setSuccess(""), 3000);
      
      // Refresh data
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignNumber = async (phoneNumberId: string) => {
    if (!confirm("Are you sure you want to unassign this number?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/assign-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumberId,
          teamMemberId: undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to unassign number");
      }

      const data = await response.json();
      const previousMemberId = allPhoneNumbers.find(n => n.id === phoneNumberId)?.assignedTo;

      // Update local state
      setAllPhoneNumbers(prev =>
        prev.map(n => n.id === phoneNumberId ? data.phoneNumber : n)
      );

      // Emit Socket.io event
      socketService.emit("number_unassigned", {
        phoneNumberId,
        previousMemberId,
      });

      setSuccess("✅ Number unassigned successfully!");
      setTimeout(() => setSuccess(""), 3000);
      
      // Refresh data
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const unassignedNumbers = allPhoneNumbers.filter(num => !num.assignedTo);
  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Numbers Assigned</h1>
          <p className="text-muted-foreground">
            Assign phone numbers to your team members for handling conversations
          </p>
        </div>

        {/* Messages */}
        {error && (
          <Card className="p-6 bg-red-50 border-red-200 mb-6">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        {success && (
          <Card className="p-6 bg-green-50 border-green-200 mb-6">
            <div className="flex gap-4">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </Card>
        )}

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
                    <option value="">-- Select Member --</option>
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
                    disabled={isAssigning || !selectedMemberId}
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
                        Assign
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
        {teamMembers.length === 0 && !isLoading && (
          <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  No Team Members
                </h3>
                <p className="text-sm text-blue-700">
                  Create team members first in Team Management to assign phone numbers.
                </p>
              </div>
            </div>
          </Card>
        )}

        {allPhoneNumbers.length === 0 && !isLoading && (
          <Card className="p-6 bg-blue-50 border-blue-200 mb-8">
            <div className="flex gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  No Numbers Yet
                </h3>
                <p className="text-sm text-blue-700">
                  First purchase or add phone numbers in Buy Numbers section.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-12 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          </Card>
        )}

        {!isLoading && teamMembers.length > 0 && (
          <>
            {/* Search */}
            {filteredMembers.length > 0 && (
              <div className="mb-6">
                <Input
                  placeholder="Search team members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10"
                />
              </div>
            )}

            {/* Team Members Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className="p-6 border-primary/20 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <span
                      className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                        member.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {member.status === "active" ? "Active" : "Pending"}
                    </span>
                  </div>

                  {/* Assigned Numbers */}
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Assigned Numbers ({member.assignedNumbers.length})
                    </p>
                    {member.assignedNumbers.length > 0 ? (
                      <div className="space-y-2">
                        {member.assignedNumbers.map((num) => (
                          <div
                            key={num.id}
                            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-green-600" />
                              <span className="font-mono font-semibold text-green-900">
                                {num.phoneNumber}
                              </span>
                            </div>
                            <button
                              onClick={() => handleUnassignNumber(num.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="Unassign number"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No numbers assigned yet
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Unassigned Numbers Section */}
            {unassignedNumbers.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">Available Numbers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unassignedNumbers.map((num) => (
                    <Card
                      key={num.id}
                      className="p-4 border-primary/20 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Phone className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-lg">
                              {num.phoneNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Purchased {new Date(num.purchasedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            num.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {num.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-primary to-secondary"
                        onClick={() => handleAssignClick(num.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Assign to Member
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {unassignedNumbers.length === 0 && (
              <div className="mt-12 text-center">
                <Card className="p-12 bg-blue-50 border-blue-200">
                  <Phone className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold text-blue-900 mb-2">
                    All Numbers Assigned
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Great! All your available numbers have been assigned to team members.
                  </p>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
